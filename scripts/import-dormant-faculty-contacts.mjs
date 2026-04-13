#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const REQUIRED_HEADERS = ['Name', 'Department', 'Role', 'Email', 'Phone', 'Office'];
const DEFAULT_OFFICE_HOURS = 'Contact via email for current office hours.';
const DEFAULT_AVAILABILITY_NOTE = 'Imported directory contact. Contact via email for current availability.';

function parseArgs(argv) {
  const args = {
    files: [],
    universityDomain: null,
    universityId: null,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === '--university-domain') {
      args.universityDomain = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (value === '--university-id') {
      args.universityId = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (value === '--dry-run') {
      args.dryRun = true;
      continue;
    }

    args.files.push(value);
  }

  return args;
}

function parseCsvText(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        const next = text[index + 1];
        if (next === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }

    if (char !== '\r') {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length > 0 && rows[0].length > 0) {
    rows[0][0] = rows[0][0].replace(/^\uFEFF/, '');
  }

  return rows.filter((currentRow) => currentRow.some((cell) => cell.trim().length > 0));
}

function ensureHeaders(headerRow) {
  const missing = REQUIRED_HEADERS.filter((header) => !headerRow.includes(header));
  if (missing.length > 0) {
    throw new Error(`CSV is missing required columns: ${missing.join(', ')}`);
  }
}

function splitName(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? 'Faculty';
  const lastName = parts.slice(1).join(' ') || 'Member';
  return { firstName, lastName };
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function mapRows(headerRow, dataRows, sourceFile) {
  const headerIndex = new Map(headerRow.map((header, index) => [header, index]));
  return dataRows.map((row, rowIndex) => {
    const read = (header) => (row[headerIndex.get(header) ?? -1] ?? '').trim();
    return {
      sourceFile,
      sourceLine: rowIndex + 2,
      name: read('Name'),
      department: read('Department'),
      title: read('Role'),
      email: normalizeEmail(read('Email')),
      phone: read('Phone') || null,
      officeLocation: read('Office') || null,
    };
  });
}

function dedupeContacts(rows) {
  const byEmail = new Map();

  for (const row of rows) {
    if (!row.email || !row.name) {
      continue;
    }

    byEmail.set(row.email, row);
  }

  return Array.from(byEmail.values());
}

async function readContacts(files) {
  const allRows = [];

  for (const filePath of files) {
    const absolutePath = path.resolve(filePath);
    const text = await fs.readFile(absolutePath, 'utf8');
    const rows = parseCsvText(text);
    if (rows.length === 0) {
      throw new Error(`CSV file is empty: ${absolutePath}`);
    }

    const [headerRow, ...dataRows] = rows;
    ensureHeaders(headerRow);
    allRows.push(...mapRows(headerRow, dataRows, absolutePath));
  }

  return dedupeContacts(allRows);
}

function inferUniversityDomain(rows) {
  const counts = new Map();

  for (const row of rows) {
    const domain = row.email.split('@')[1] ?? '';
    if (!domain) {
      continue;
    }

    counts.set(domain, (counts.get(domain) ?? 0) + 1);
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
}

async function resolveUniversity({ universityId, universityDomain }) {
  if (universityId) {
    return prisma.university.findUnique({
      where: { id: universityId },
      select: { id: true, name: true, domain: true },
    });
  }

  if (!universityDomain) {
    return null;
  }

  return prisma.university.findFirst({
    where: { domain: universityDomain.toLowerCase() },
    select: { id: true, name: true, domain: true },
  });
}

function buildImportSummary() {
  return {
    createdUsers: 0,
    updatedUsers: 0,
    createdFacultyProfiles: 0,
    updatedFacultyProfiles: 0,
    skippedRows: [],
  };
}

async function importContacts(rows, university, dryRun) {
  const summary = buildImportSummary();

  for (const row of rows) {
    if (!row.email || !row.name) {
      summary.skippedRows.push(
        `${row.sourceFile}:${row.sourceLine} is missing a name or email and was skipped.`
      );
      continue;
    }

    const { firstName, lastName } = splitName(row.name);

    const operation = async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email: row.email },
        select: {
          id: true,
          role: true,
          lastLogin: true,
          facultyProfile: {
            select: {
              id: true,
              officeHours: true,
              availabilityStatus: true,
              availabilityNote: true,
              bio: true,
              courses: true,
              tags: true,
            },
          },
        },
      });

      if (existingUser && existingUser.role !== 'FACULTY') {
        summary.skippedRows.push(
          `${row.email} already belongs to a ${existingUser.role.toLowerCase()} account and was skipped.`
        );
        return;
      }

      const user = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              universityId: university.id,
              displayName: row.name,
              firstName,
              lastName,
              role: 'FACULTY',
              department: row.department || 'General',
            },
            select: { id: true },
          })
        : await tx.user.create({
            data: {
              universityId: university.id,
              email: row.email,
              displayName: row.name,
              firstName,
              lastName,
              role: 'FACULTY',
              department: row.department || 'General',
            },
            select: { id: true },
          });

      await tx.notificationPreferences.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      });

      if (existingUser?.facultyProfile) {
        await tx.faculty.update({
          where: { userId: user.id },
          data: {
            universityId: university.id,
            name: row.name,
            title: row.title || 'Faculty / Staff',
            department: row.department || 'General',
            email: row.email,
            phone: row.phone,
            officeLocation: row.officeLocation || 'Office location not listed',
          },
        });

        summary.updatedFacultyProfiles += 1;
      } else {
        await tx.faculty.create({
          data: {
            userId: user.id,
            universityId: university.id,
            name: row.name,
            title: row.title || 'Faculty / Staff',
            department: row.department || 'General',
            email: row.email,
            phone: row.phone,
            officeLocation: row.officeLocation || 'Office location not listed',
            officeHours: DEFAULT_OFFICE_HOURS,
            availabilityStatus: 'LIMITED',
            availabilityNote: DEFAULT_AVAILABILITY_NOTE,
            courses: [],
            tags: [],
          },
        });

        summary.createdFacultyProfiles += 1;
      }

      if (existingUser) {
        summary.updatedUsers += 1;
      } else {
        summary.createdUsers += 1;
      }
    };

    if (dryRun) {
      await prisma.$transaction(async (tx) => {
        await operation(tx);
        throw new Error('__DRY_RUN_ROLLBACK__');
      }).catch((error) => {
        if (error.message !== '__DRY_RUN_ROLLBACK__') {
          throw error;
        }
      });
    } else {
      await prisma.$transaction((tx) => operation(tx), { timeout: 60_000 });
    }
  }

  return summary;
}

function printUsage() {
  console.log(
    'Usage: node scripts/import-dormant-faculty-contacts.mjs <file.csv> [more.csv] [--university-domain domain] [--university-id cuid] [--dry-run]'
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.files.length === 0) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const rows = await readContacts(args.files);
  const universityDomain = args.universityDomain ?? inferUniversityDomain(rows);
  const university = await resolveUniversity({
    universityId: args.universityId,
    universityDomain,
  });

  if (!university) {
    throw new Error(
      `Unable to find a university for ${args.universityId ? `id ${args.universityId}` : `domain ${universityDomain}`}.`
    );
  }

  const summary = await importContacts(rows, university, args.dryRun);

  console.log(
    JSON.stringify(
      {
        university,
        files: args.files.map((file) => path.resolve(file)),
        totalContacts: rows.length,
        dryRun: args.dryRun,
        ...summary,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
