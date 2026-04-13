import { BUILDING_IMPORT_OPTIONAL_HEADERS, BUILDING_IMPORT_REQUIRED_HEADERS, extractBuildingImportRows, normalizeBuildingImportHeader, parseBuildingCoordinateCell, parseBuildingListCell, validateBuildingImportHeaders, } from '@/lib/buildingImport';
import { buildBuildingHoursPayload, buildBuildingHoursScheduleFromCsvRow, cleanBuildingOperationalNote } from '@/lib/buildingHours';
import { parseCsvText } from '@/lib/csv';
import { MURRAY_STATE_BUILDING_COORDINATES } from '@/lib/data/murrayStateBuildingCoordinates.mjs';
import { prisma } from '@/lib/prisma';
import { createCampusBuildingCompatible, updateCampusBuildingCompatible } from '@/lib/server/campusBuildings';
import { invalidateUniversityData, UNIVERSITY_DATA_TAGS } from '@/lib/server/universityData';
import { buildingImportRequestSchema } from '@/lib/validations/admin';
import { ApiError, getAuthenticatedAdmin, handleApiError, successResponse } from '@/lib/api/utils';
function normalizeBuildingName(name) {
    return name.trim().toLowerCase();
}
export async function POST(request) {
    try {
        await getAuthenticatedAdmin('ADMIN_TAB_BUILDING_IMPORT');
        const payload = buildingImportRequestSchema.parse(await request.json());
        const university = await prisma.university.findUnique({
            where: { id: payload.universityId },
            select: { id: true, slug: true },
        });
        if (!university) {
            throw new ApiError(404, 'University not found');
        }
        const rows = parseCsvText(payload.csvContent);
        if (rows.length === 0) {
            throw new ApiError(400, 'CSV file is empty');
        }
        const { headerRow, headerRowIndex, dataRows } = extractBuildingImportRows(rows);
        if (headerRow.length === 0) {
            throw new ApiError(400, 'CSV file is empty');
        }
        const headerValidation = validateBuildingImportHeaders(headerRow);
        if (!headerValidation.valid) {
            const details = [];
            if (headerValidation.missingHeaders.length > 0) {
                details.push(`Missing: ${headerValidation.missingHeaders.join(', ')}`);
            }
            if (headerValidation.unexpectedHeaders.length > 0) {
                details.push(`Unexpected: ${headerValidation.unexpectedHeaders.join(', ')}`);
            }
            if (headerValidation.duplicateHeaders.length > 0) {
                details.push(`Duplicate: ${headerValidation.duplicateHeaders.join(', ')}`);
            }
            throw new ApiError(400, `CSV must include: ${BUILDING_IMPORT_REQUIRED_HEADERS.join(', ')}. Optional columns: ${BUILDING_IMPORT_OPTIONAL_HEADERS.join(', ')}. ${details.join('. ')}`);
        }
        const headerIndex = new Map(headerRow.map((value, index) => [normalizeBuildingImportHeader(value), index]));
        const validationErrors = [];
        const parsedRows = dataRows
            .map((row, rowIndex) => {
            const sourceLine = headerRowIndex + rowIndex + 2;
            const getCellValue = (header) => (row[headerIndex.get(header) ?? -1] ?? '').trim();
            const name = getCellValue('name');
            const description = getCellValue('description');
            const address = getCellValue('address');
            const categories = parseBuildingListCell(getCellValue('categories'));
            const services = parseBuildingListCell(getCellValue('services'));
            const departments = parseBuildingListCell(getCellValue('departments'));
            const notes = cleanBuildingOperationalNote(getCellValue('notes'));
            let latitude;
            let longitude;
            const isCompletelyEmpty = !name &&
                !description &&
                !address &&
                categories.length === 0 &&
                services.length === 0 &&
                departments.length === 0;
            if (isCompletelyEmpty) {
                return null;
            }
            if (!name || !address) {
                validationErrors.push(`Line ${sourceLine}: "name" and "address" are required`);
                return null;
            }
            try {
                latitude = parseBuildingCoordinateCell(getCellValue('latitude'), 'latitude');
                longitude = parseBuildingCoordinateCell(getCellValue('longitude'), 'longitude');
            }
            catch (error) {
                validationErrors.push(`Line ${sourceLine}: ${error instanceof Error ? error.message : 'Coordinates are invalid'}`);
                return null;
            }
            if ((typeof latitude === 'number' && typeof longitude !== 'number') ||
                (typeof longitude === 'number' && typeof latitude !== 'number')) {
                validationErrors.push(`Line ${sourceLine}: "latitude" and "longitude" must both be provided when either is present`);
                return null;
            }
            const fallbackCoordinates = university.slug === 'murray-state-university'
                ? MURRAY_STATE_BUILDING_COORDINATES[name] ?? null
                : null;
            const operatingHoursSchedule = buildBuildingHoursScheduleFromCsvRow({
                Sunday_hours: getCellValue('sunday_hours'),
                Monday_hours: getCellValue('monday_hours'),
                Tuesday_hours: getCellValue('tuesday_hours'),
                Wednesday_hours: getCellValue('wednesday_hours'),
                Thursday_hours: getCellValue('thursday_hours'),
                Friday_hours: getCellValue('friday_hours'),
                Saturday_hours: getCellValue('saturday_hours'),
            });
            const hoursPayload = buildBuildingHoursPayload({
                operatingHoursSchedule,
                operatingHours: null,
            });
            return {
                address,
                categories,
                departments,
                description: description || null,
                latitude: latitude ?? fallbackCoordinates?.lat,
                longitude: longitude ?? fallbackCoordinates?.lng,
                mapQuery: [name, address].filter(Boolean).join(', '),
                name,
                operatingHours: hoursPayload.operatingHours,
                operatingHoursSchedule: hoursPayload.operatingHoursSchedule,
                operationalNote: notes,
                services,
                type: categories[0] ?? 'Campus',
            };
        })
            .filter((row) => Boolean(row));
        if (validationErrors.length > 0) {
            throw new ApiError(400, validationErrors.slice(0, 10).join('; '));
        }
        if (parsedRows.length === 0) {
            throw new ApiError(400, 'CSV has no importable data rows');
        }
        // Look up existing buildings BEFORE the transaction to reduce time spent
        // inside the interactive transaction (important for remote DBs / PgBouncer).
        const existingRows = await prisma.campusBuilding.findMany({
            where: { universityId: payload.universityId },
            select: { id: true, name: true },
        });
        const existingByName = new Map(existingRows.map((building) => [normalizeBuildingName(building.name), building.id]));
        const rowsToCreate = [];
        const rowsToUpdate = [];
        for (const row of parsedRows) {
            const existingId = existingByName.get(normalizeBuildingName(row.name));
            if (existingId) {
                rowsToUpdate.push({ id: existingId, data: row });
            }
            else {
                rowsToCreate.push(row);
            }
        }
        for (const row of rowsToCreate) {
            await createCampusBuildingCompatible({
                universityId: payload.universityId,
                address: row.address,
                categories: row.categories,
                departments: row.departments,
                description: row.description,
                latitude: row.latitude,
                longitude: row.longitude,
                mapQuery: row.mapQuery,
                name: row.name,
                operatingHours: row.operatingHours,
                operatingHoursSchedule: row.operatingHoursSchedule,
                operationalNote: row.operationalNote,
                services: row.services,
                type: row.type,
            });
        }
        for (const { id, data: row } of rowsToUpdate) {
            await updateCampusBuildingCompatible(id, {
                address: row.address,
                categories: row.categories,
                departments: row.departments,
                description: row.description,
                latitude: typeof row.latitude === 'number' ? row.latitude : undefined,
                longitude: typeof row.longitude === 'number' ? row.longitude : undefined,
                mapQuery: row.mapQuery,
                name: row.name,
                operatingHours: row.operatingHours,
                operatingHoursSchedule: row.operatingHoursSchedule,
                operationalNote: row.operationalNote,
                services: row.services,
                type: row.type,
            });
        }
        const result = {
            createdCount: rowsToCreate.length,
            optionalColumns: BUILDING_IMPORT_OPTIONAL_HEADERS,
            requiredColumns: BUILDING_IMPORT_REQUIRED_HEADERS,
            totalRows: parsedRows.length,
            updatedCount: rowsToUpdate.length,
        };
        invalidateUniversityData(UNIVERSITY_DATA_TAGS.buildings);
        return successResponse(result);
    }
    catch (error) {
        return handleApiError(error);
    }
}
