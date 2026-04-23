import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const schemaPath = path.join(repoRoot, 'prisma', 'schema.prisma');
const outputDir = path.join(repoRoot, 'output', 'erd');
const htmlPath = path.join(outputDir, 'index.html');
const mermaidPath = path.join(outputDir, 'diagram.mmd');
const summaryPath = path.join(outputDir, 'schema-summary.json');
const shouldOpen = process.argv.includes('--open');

const SCALAR_TYPES = new Set([
  'String',
  'Int',
  'Float',
  'Boolean',
  'DateTime',
  'Json',
  'Bytes',
  'Decimal',
  'BigInt',
  'Unsupported',
]);

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function extractBlockEntries(schema) {
  const entries = [];
  const blockPattern = /^(enum|model)\s+(\w+)\s*\{([\s\S]*?)^\}/gm;

  for (const match of schema.matchAll(blockPattern)) {
    entries.push({
      kind: match[1],
      name: match[2],
      body: match[3],
    });
  }

  return entries;
}

function extractAttributeCall(line, attribute) {
  const start = line.indexOf(`${attribute}(`);
  if (start === -1) {
    return null;
  }

  let depth = 0;
  let content = '';

  for (let index = start + attribute.length; index < line.length; index += 1) {
    const character = line[index];

    if (character === '(') {
      depth += 1;
      if (depth === 1) {
        continue;
      }
    } else if (character === ')') {
      depth -= 1;
      if (depth === 0) {
        return content;
      }
    }

    if (depth >= 1) {
      content += character;
    }
  }

  return null;
}

function extractMappedName(line, attribute) {
  const call = extractAttributeCall(line, attribute);
  if (!call) {
    return null;
  }

  const match = call.match(/"([^"]+)"/);
  return match?.[1] ?? null;
}

function extractNamedArray(call, name) {
  const match = call?.match(new RegExp(`${name}:\\s*\\[([^\\]]*)\\]`));
  if (!match) {
    return [];
  }

  return match[1]
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function extractNamedIdentifier(call, name) {
  const match = call?.match(new RegExp(`${name}:\\s*([A-Za-z_][A-Za-z0-9_]*)`));
  return match?.[1] ?? null;
}

function parseField(line, modelNames, enumNames) {
  const match = line.match(/^(\w+)\s+([^\s]+)(.*)$/);
  if (!match) {
    return null;
  }

  const [, name, rawType, attributes] = match;
  const isList = rawType.endsWith('[]');
  const isOptional = rawType.endsWith('?');
  const baseType = rawType.replace(/\[\]$/, '').replace(/\?$/, '');
  const relationCall = extractAttributeCall(attributes, '@relation');
  const isRelation = modelNames.has(baseType);
  const isEnum = enumNames.has(baseType);

  return {
    name,
    rawType,
    baseType,
    columnName: extractMappedName(attributes, '@map') ?? name,
    isList,
    isOptional,
    isRequired: !isList && !isOptional,
    kind: isRelation ? 'relation' : isEnum ? 'enum' : SCALAR_TYPES.has(baseType) ? 'scalar' : 'unknown',
    isId: attributes.includes('@id'),
    isUnique: attributes.includes('@unique'),
    relation: relationCall
      ? {
          name: relationCall.match(/^\s*"([^"]+)"/)?.[1] ?? null,
          fields: extractNamedArray(relationCall, 'fields'),
          references: extractNamedArray(relationCall, 'references'),
          onDelete: extractNamedIdentifier(relationCall, 'onDelete'),
        }
      : null,
  };
}

function parseModel(entry, modelNames, enumNames) {
  const lines = entry.body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('//'));

  const fields = [];
  const indexes = [];
  const uniques = [];
  let tableName = entry.name;

  for (const line of lines) {
    if (line.startsWith('@@map')) {
      tableName = extractMappedName(line, '@@map') ?? tableName;
      continue;
    }

    if (line.startsWith('@@index')) {
      indexes.push(line);
      continue;
    }

    if (line.startsWith('@@unique')) {
      uniques.push(line);
      continue;
    }

    if (line.startsWith('@@')) {
      continue;
    }

    const field = parseField(line, modelNames, enumNames);
    if (field) {
      fields.push(field);
    }
  }

  return {
    name: entry.name,
    tableName,
    fields,
    fieldMap: new Map(fields.map((field) => [field.name, field])),
    indexes,
    uniques,
  };
}

function parseEnum(entry) {
  const values = entry.body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('//'));

  return {
    name: entry.name,
    values,
  };
}

function getOppositeField(sourceField, sourceModel, targetModel) {
  const candidates = targetModel.fields.filter(
    (candidate) => candidate.kind === 'relation' && candidate.baseType === sourceModel.name,
  );

  if (!candidates.length) {
    return null;
  }

  if (sourceField.relation?.name) {
    return candidates.find((candidate) => candidate.relation?.name === sourceField.relation.name) ?? null;
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  return candidates.find((candidate) => !candidate.relation?.name) ?? candidates[0];
}

function relationLeftCardinality(field) {
  return field.isOptional ? 'o|' : '||';
}

function relationRightCardinality(oppositeField) {
  if (!oppositeField) {
    return 'o{';
  }

  if (oppositeField.isList) {
    return 'o{';
  }

  return oppositeField.isOptional ? 'o|' : '||';
}

function normalizeMermaidType(field) {
  if (field.isList) {
    return `${field.baseType}List`;
  }

  return field.baseType;
}

function buildRelationships(models) {
  const modelsByName = new Map(models.map((model) => [model.name, model]));
  const relationships = [];
  const fkAnnotations = new Map();

  for (const model of models) {
    for (const field of model.fields) {
      if (field.kind !== 'relation' || !field.relation?.fields.length) {
        continue;
      }

      const targetModel = modelsByName.get(field.baseType);
      if (!targetModel) {
        continue;
      }

      const oppositeField = getOppositeField(field, model, targetModel);
      const fromColumns = field.relation.fields.map(
        (fieldName) => model.fieldMap.get(fieldName)?.columnName ?? fieldName,
      );
      const toColumns = field.relation.references.map(
        (fieldName) => targetModel.fieldMap.get(fieldName)?.columnName ?? fieldName,
      );

      relationships.push({
        id: `${model.name}.${field.name}`,
        principalModel: targetModel.name,
        principalTable: targetModel.tableName,
        dependentModel: model.name,
        dependentTable: model.tableName,
        leftCardinality: relationLeftCardinality(field),
        rightCardinality: relationRightCardinality(oppositeField),
        label: `${fromColumns.join(', ')} -> ${toColumns.join(', ')}`,
        relationField: field.name,
        oppositeField: oppositeField?.name ?? null,
        onDelete: field.relation.onDelete ?? null,
      });

      for (let index = 0; index < field.relation.fields.length; index += 1) {
        const sourceFieldName = field.relation.fields[index];
        const targetFieldName = field.relation.references[index];
        const annotationKey = `${model.name}.${sourceFieldName}`;
        fkAnnotations.set(annotationKey, {
          targetTable: targetModel.tableName,
          targetColumn: targetModel.fieldMap.get(targetFieldName)?.columnName ?? targetFieldName,
          targetModel: targetModel.name,
          relationField: field.name,
        });
      }
    }
  }

  relationships.sort((left, right) => left.id.localeCompare(right.id));

  return { relationships, fkAnnotations };
}

function buildMermaidSource(models, relationships, fkAnnotations) {
  const entityBlocks = models
    .map((model) => {
      const scalarFields = model.fields.filter((field) => field.kind !== 'relation');
      const rows = scalarFields.map((field) => {
        const tokens = [];
        if (field.isId) {
          tokens.push('PK');
        }
        if (field.isUnique) {
          tokens.push('UK');
        }

        if (fkAnnotations.has(`${model.name}.${field.name}`)) {
          tokens.push('FK');
        }

        const type = normalizeMermaidType(field);
        const suffix = tokens.length ? ` ${tokens.join(',')}` : '';
        return `    ${type} ${field.columnName}${suffix}`;
      });

      return [`  ${model.tableName} {`, ...rows, '  }'].join('\n');
    })
    .join('\n\n');

  const relationLines = relationships
    .map(
      (relationship) =>
        `  ${relationship.principalTable} ${relationship.leftCardinality}--${relationship.rightCardinality} ${relationship.dependentTable} : "${relationship.label}"`,
    )
    .join('\n');

  return ['erDiagram', entityBlocks, relationLines].filter(Boolean).join('\n\n');
}

function buildModelCards(models, enums, relationships, fkAnnotations) {
  const relationshipsByModel = new Map();

  for (const relationship of relationships) {
    const principalEntries = relationshipsByModel.get(relationship.principalModel) ?? [];
    principalEntries.push(
      `${relationship.principalModel}.${relationship.oppositeField ?? 'relation'} -> ${relationship.dependentModel}.${relationship.relationField} (${relationship.label}${relationship.onDelete ? `, onDelete ${relationship.onDelete}` : ''})`,
    );
    relationshipsByModel.set(relationship.principalModel, principalEntries);

    if (relationship.principalModel !== relationship.dependentModel) {
      const dependentEntries = relationshipsByModel.get(relationship.dependentModel) ?? [];
      dependentEntries.push(
        `${relationship.dependentModel}.${relationship.relationField} -> ${relationship.principalModel}.${relationship.oppositeField ?? 'relation'} (${relationship.label}${relationship.onDelete ? `, onDelete ${relationship.onDelete}` : ''})`,
      );
      relationshipsByModel.set(relationship.dependentModel, dependentEntries);
    }
  }

  const modelCards = models
    .map((model) => {
      const fieldRows = model.fields
        .map((field) => {
          const fk = fkAnnotations.get(`${model.name}.${field.name}`);
          const notes = [];

          if (field.isId) {
            notes.push('primary key');
          }

          if (field.isUnique) {
            notes.push('unique');
          }

          if (field.isList) {
            notes.push('list');
          } else if (field.isOptional) {
            notes.push('nullable');
          } else {
            notes.push('required');
          }

          if (field.kind === 'enum') {
            notes.push(`enum ${field.baseType}`);
          }

          if (fk) {
            notes.push(`fk -> ${fk.targetTable}.${fk.targetColumn}`);
          }

          if (field.kind === 'relation') {
            notes.push(`relation -> ${field.baseType}`);
          }

          return `
            <tr>
              <td><code>${escapeHtml(field.name)}</code></td>
              <td><code>${escapeHtml(field.rawType)}</code></td>
              <td><code>${escapeHtml(field.columnName)}</code></td>
              <td>${escapeHtml(notes.join(' • '))}</td>
            </tr>
          `;
        })
        .join('');

      const relationalNotes = Array.from(new Set(relationshipsByModel.get(model.name) ?? []))
        .sort((left, right) => left.localeCompare(right))
        .map((item) => `<li><code>${escapeHtml(item)}</code></li>`)
        .join('');

      const constraintList = [...model.uniques, ...model.indexes]
        .map((item) => `<li><code>${escapeHtml(item)}</code></li>`)
        .join('');

      return `
        <section class="card">
          <div class="card-header">
            <div>
              <h3>${escapeHtml(model.name)}</h3>
              <p><code>${escapeHtml(model.tableName)}</code></p>
            </div>
            <span>${model.fields.length} fields</span>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Prisma Field</th>
                  <th>Type</th>
                  <th>DB Column</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>${fieldRows}</tbody>
            </table>
          </div>
          <div class="meta-grid">
            <div>
              <h4>Relations</h4>
              ${relationalNotes ? `<ul>${relationalNotes}</ul>` : '<p class="empty">No direct relations</p>'}
            </div>
            <div>
              <h4>Indexes & Constraints</h4>
              ${constraintList ? `<ul>${constraintList}</ul>` : '<p class="empty">No secondary indexes or composite uniques</p>'}
            </div>
          </div>
        </section>
      `;
    })
    .join('\n');

  const enumCards = enums
    .map(
      (item) => `
        <section class="enum-card">
          <h3>${escapeHtml(item.name)}</h3>
          <ul>${item.values.map((value) => `<li><code>${escapeHtml(value)}</code></li>`).join('')}</ul>
        </section>
      `,
    )
    .join('\n');

  return { modelCards, enumCards };
}

function buildHtml({ generatedAt, models, enums, relationships, mermaidSource, modelCards, enumCards }) {
  const escapedMermaid = escapeHtml(mermaidSource);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>PocketQuad Local ERD</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f4f1ea;
        --panel: rgba(255, 255, 255, 0.92);
        --ink: #1f2937;
        --muted: #5b6471;
        --border: rgba(31, 41, 55, 0.12);
        --accent: #0f766e;
        --accent-soft: rgba(15, 118, 110, 0.12);
        --shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: "IBM Plex Sans", "Avenir Next", sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(15, 118, 110, 0.18), transparent 24%),
          radial-gradient(circle at top right, rgba(190, 24, 93, 0.12), transparent 20%),
          linear-gradient(180deg, #fcfbf7 0%, var(--bg) 100%);
      }

      main {
        width: min(1500px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 24px 0 56px;
      }

      .hero,
      .panel,
      .card,
      .enum-card {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 24px;
        box-shadow: var(--shadow);
        backdrop-filter: blur(10px);
      }

      .hero {
        padding: 28px;
      }

      h1,
      h2,
      h3,
      h4,
      p {
        margin: 0;
      }

      .hero h1 {
        font-size: clamp(2rem, 2.4vw, 3.25rem);
        font-family: "IBM Plex Serif", Georgia, serif;
        line-height: 1.05;
        margin-bottom: 12px;
      }

      .hero p {
        color: var(--muted);
        max-width: 72ch;
        line-height: 1.6;
      }

      .stats {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 20px;
      }

      .pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent);
        font-weight: 600;
      }

      .grid {
        display: grid;
        gap: 20px;
        grid-template-columns: minmax(0, 2.1fr) minmax(320px, 1fr);
        margin-top: 20px;
      }

      .panel {
        padding: 20px;
      }

      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        margin-bottom: 16px;
      }

      .panel-header p {
        color: var(--muted);
        font-size: 0.95rem;
      }

      #diagram {
        min-height: 720px;
        overflow: auto;
        border-radius: 18px;
        border: 1px dashed rgba(15, 118, 110, 0.35);
        background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(248,250,252,0.95));
        padding: 16px;
      }

      #diagram svg {
        width: max-content;
        min-width: 100%;
        height: auto;
      }

      .legend,
      .inventory {
        display: grid;
        gap: 12px;
      }

      .legend-item {
        border: 1px solid var(--border);
        border-radius: 18px;
        padding: 14px;
        background: rgba(255, 255, 255, 0.7);
      }

      .legend-item p {
        color: var(--muted);
        margin-top: 6px;
        font-size: 0.95rem;
      }

      .code-block {
        margin-top: 16px;
        padding: 14px;
        border-radius: 18px;
        background: #101828;
        color: #d1fae5;
        overflow: auto;
        font-size: 0.85rem;
        line-height: 1.5;
      }

      .section-title {
        margin-top: 28px;
        margin-bottom: 12px;
        font-size: 1.5rem;
        font-family: "IBM Plex Serif", Georgia, serif;
      }

      .cards,
      .enum-grid {
        display: grid;
        gap: 16px;
      }

      .card,
      .enum-card {
        padding: 18px;
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: start;
        gap: 16px;
        margin-bottom: 16px;
      }

      .card-header p,
      .card-header span,
      .empty {
        color: var(--muted);
      }

      .table-wrap {
        overflow: auto;
        border: 1px solid var(--border);
        border-radius: 18px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 680px;
      }

      th,
      td {
        text-align: left;
        vertical-align: top;
        padding: 12px 14px;
        border-bottom: 1px solid var(--border);
      }

      th {
        font-size: 0.82rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--muted);
      }

      tbody tr:last-child td {
        border-bottom: 0;
      }

      code {
        font-family: "SFMono-Regular", "SF Mono", Consolas, monospace;
        font-size: 0.9em;
      }

      .meta-grid {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin-top: 16px;
      }

      ul {
        margin: 10px 0 0;
        padding-left: 18px;
      }

      li {
        line-height: 1.55;
        margin-bottom: 6px;
      }

      .enum-grid {
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }

      .enum-card ul {
        margin-top: 12px;
      }

      .status {
        color: var(--muted);
      }

      @media (max-width: 1100px) {
        .grid,
        .meta-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <h1>PocketQuad Local ERD</h1>
        <p>
          Generated directly from <code>prisma/schema.prisma</code> so the diagram stays aligned with the source-of-truth schema.
          This output lives under <code>output/erd/</code>, is ignored by git, and is not wired into the public Next.js app.
        </p>
        <div class="stats">
          <span class="pill">${models.length} tables</span>
          <span class="pill">${relationships.length} foreign-key relationships</span>
          <span class="pill">${enums.length} enums</span>
          <span class="pill">Generated ${generatedAt}</span>
        </div>
      </section>

      <section class="grid">
        <section class="panel">
          <div class="panel-header">
            <div>
              <h2>ER Diagram</h2>
              <p>Rendered from Mermaid so you can open this file directly in a browser.</p>
            </div>
            <span id="diagram-status" class="status">Rendering diagram…</span>
          </div>
          <div id="diagram"></div>
          <pre class="code-block"><code>${escapedMermaid}</code></pre>
        </section>

        <aside class="panel">
          <div class="panel-header">
            <div>
              <h2>Legend</h2>
              <p>How to read the generated diagram and inventory.</p>
            </div>
          </div>
          <div class="legend">
            <section class="legend-item">
              <strong>Entity names</strong>
              <p>The diagram uses mapped database table names like <code>users</code> and <code>events</code>.</p>
            </section>
            <section class="legend-item">
              <strong>Field rows</strong>
              <p>Only database columns are shown inside each entity. Prisma relation fields are documented in the detailed inventory below.</p>
            </section>
            <section class="legend-item">
              <strong>PK / UK</strong>
              <p><code>PK</code> marks primary keys and <code>UK</code> marks scalar unique columns.</p>
            </section>
            <section class="legend-item">
              <strong>Relationship labels</strong>
              <p>Every edge is labeled with the foreign-key column mapping, for example <code>user_id -&gt; id</code>.</p>
            </section>
          </div>
        </aside>
      </section>

      <h2 class="section-title">Table Inventory</h2>
      <section class="cards">${modelCards}</section>

      <h2 class="section-title">Enum Inventory</h2>
      <section class="enum-grid">${enumCards}</section>
    </main>

    <script type="module">
      const mermaidSource = ${JSON.stringify(mermaidSource)};
      const target = document.getElementById('diagram');
      const status = document.getElementById('diagram-status');

      try {
        const mermaid = (await import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs')).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          theme: 'base',
          themeVariables: {
            primaryColor: '#f7fffd',
            primaryTextColor: '#0f172a',
            primaryBorderColor: '#0f766e',
            lineColor: '#0f766e',
            tertiaryColor: '#ecfeff',
            fontFamily: 'IBM Plex Sans, Avenir Next, sans-serif',
          },
        });

        const { svg } = await mermaid.render('pocketquad-erd', mermaidSource);
        target.innerHTML = svg;
        status.textContent = 'Diagram ready';
      } catch (error) {
        console.error(error);
        status.textContent = 'Diagram render failed';
        target.innerHTML = '<p class="empty">Mermaid could not render. The source diagram is still included below and in <code>diagram.mmd</code>.</p>';
      }
    </script>
  </body>
</html>
`;
}

async function maybeOpenFile(filePath) {
  if (!shouldOpen) {
    return;
  }

  if (process.platform === 'darwin') {
    await execFileAsync('open', [filePath]);
  }
}

async function main() {
  const schema = await fs.readFile(schemaPath, 'utf8');
  const entries = extractBlockEntries(schema);
  const modelNames = new Set(entries.filter((entry) => entry.kind === 'model').map((entry) => entry.name));
  const enumNames = new Set(entries.filter((entry) => entry.kind === 'enum').map((entry) => entry.name));
  const enums = entries.filter((entry) => entry.kind === 'enum').map(parseEnum);
  const models = entries
    .filter((entry) => entry.kind === 'model')
    .map((entry) => parseModel(entry, modelNames, enumNames))
    .sort((left, right) => left.tableName.localeCompare(right.tableName));
  const { relationships, fkAnnotations } = buildRelationships(models);
  const mermaidSource = buildMermaidSource(models, relationships, fkAnnotations);
  const { modelCards, enumCards } = buildModelCards(models, enums, relationships, fkAnnotations);
  const generatedAt = new Date().toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
  const summary = {
    generatedAt: new Date().toISOString(),
    sourceSchema: path.relative(repoRoot, schemaPath),
    modelCount: models.length,
    relationshipCount: relationships.length,
    enumCount: enums.length,
    models: models.map((model) => ({
      name: model.name,
      tableName: model.tableName,
      fields: model.fields,
      indexes: model.indexes,
      uniques: model.uniques,
    })),
    enums,
    relationships,
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(mermaidPath, `${mermaidSource}\n`, 'utf8');
  await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(
    htmlPath,
    buildHtml({ generatedAt, models, enums, relationships, mermaidSource, modelCards, enumCards }),
    'utf8',
  );

  await maybeOpenFile(htmlPath);

  console.log(`ERD written to ${path.relative(repoRoot, htmlPath)}`);
  console.log(`Mermaid source written to ${path.relative(repoRoot, mermaidPath)}`);
  console.log(`Schema summary written to ${path.relative(repoRoot, summaryPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
