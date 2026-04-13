export const BUILDING_IMPORT_REQUIRED_HEADERS = [
    'name',
    'description',
    'address',
    'categories',
    'services',
    'departments',
];
export const BUILDING_IMPORT_OPTIONAL_HEADERS = [
    'latitude',
    'longitude',
    'monday_hours',
    'tuesday_hours',
    'wednesday_hours',
    'thursday_hours',
    'friday_hours',
    'saturday_hours',
    'sunday_hours',
    'notes',
];
export const BUILDING_IMPORT_ALLOWED_HEADERS = [
    ...BUILDING_IMPORT_REQUIRED_HEADERS,
    ...BUILDING_IMPORT_OPTIONAL_HEADERS,
];
export function normalizeBuildingImportHeader(header) {
    return header.trim().toLowerCase();
}
export function validateBuildingImportHeaders(headers) {
    const normalizedHeaders = headers.map(normalizeBuildingImportHeader).filter(Boolean);
    const requiredSet = new Set(BUILDING_IMPORT_REQUIRED_HEADERS);
    const allowedSet = new Set(BUILDING_IMPORT_ALLOWED_HEADERS);
    const missingHeaders = BUILDING_IMPORT_REQUIRED_HEADERS.filter((required) => !normalizedHeaders.includes(required));
    const unexpectedHeaders = normalizedHeaders.filter((header) => !allowedSet.has(header));
    const duplicateHeaders = normalizedHeaders.filter((header, index) => normalizedHeaders.indexOf(header) !== index);
    return {
        duplicateHeaders: Array.from(new Set(duplicateHeaders)),
        missingHeaders,
        normalizedHeaders,
        unexpectedHeaders: Array.from(new Set(unexpectedHeaders)),
        valid: missingHeaders.length === 0 &&
            unexpectedHeaders.length === 0 &&
            duplicateHeaders.length === 0,
    };
}
export function isEmptyCsvRow(row) {
    return !row || row.every((cell) => !cell?.trim());
}
export function extractBuildingImportRows(rows) {
    const firstNonEmptyRowIndex = rows.findIndex((row) => !isEmptyCsvRow(row));
    if (firstNonEmptyRowIndex === -1) {
        return {
            dataRows: [],
            headerRow: [],
            headerRowIndex: -1,
        };
    }
    return {
        headerRow: rows[firstNonEmptyRowIndex] ?? [],
        headerRowIndex: firstNonEmptyRowIndex,
        dataRows: rows.slice(firstNonEmptyRowIndex + 1).filter((row) => !isEmptyCsvRow(row)),
    };
}
export function parseBuildingListCell(value) {
    if (!value)
        return [];
    return value
        .split(';')
        .map((item) => item.trim())
        .filter(Boolean);
}
export function parseBuildingCoordinateCell(value, fieldName) {
    const normalized = value?.trim();
    if (!normalized) {
        return undefined;
    }
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) {
        throw new Error(`"${fieldName}" must be a valid number`);
    }
    if (fieldName === 'latitude' && (parsed < -90 || parsed > 90)) {
        throw new Error('"latitude" must be between -90 and 90');
    }
    if (fieldName === 'longitude' && (parsed < -180 || parsed > 180)) {
        throw new Error('"longitude" must be between -180 and 180');
    }
    return parsed;
}
