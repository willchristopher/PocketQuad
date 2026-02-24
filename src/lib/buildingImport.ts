export const BUILDING_IMPORT_REQUIRED_HEADERS = [
  'name',
  'description',
  'address',
  'categories',
  'services',
  'departments',
] as const

type BuildingImportHeaderValidation = {
  duplicateHeaders: string[]
  missingHeaders: string[]
  normalizedHeaders: string[]
  unexpectedHeaders: string[]
  valid: boolean
}

export function normalizeBuildingImportHeader(header: string) {
  return header.trim().toLowerCase()
}

export function validateBuildingImportHeaders(headers: string[]): BuildingImportHeaderValidation {
  const normalizedHeaders = headers.map(normalizeBuildingImportHeader).filter(Boolean)
  const requiredSet = new Set<string>(BUILDING_IMPORT_REQUIRED_HEADERS)

  const missingHeaders = BUILDING_IMPORT_REQUIRED_HEADERS.filter(
    (required) => !normalizedHeaders.includes(required),
  )
  const unexpectedHeaders = normalizedHeaders.filter((header) => !requiredSet.has(header))
  const duplicateHeaders = normalizedHeaders.filter(
    (header, index) => normalizedHeaders.indexOf(header) !== index,
  )

  return {
    duplicateHeaders: Array.from(new Set(duplicateHeaders)),
    missingHeaders,
    normalizedHeaders,
    unexpectedHeaders: Array.from(new Set(unexpectedHeaders)),
    valid:
      missingHeaders.length === 0 &&
      unexpectedHeaders.length === 0 &&
      duplicateHeaders.length === 0 &&
      normalizedHeaders.length === BUILDING_IMPORT_REQUIRED_HEADERS.length,
  }
}

export function parseBuildingListCell(value: string | undefined) {
  if (!value) return []

  return value
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
}
