import { NextRequest } from 'next/server'

import {
  BUILDING_IMPORT_REQUIRED_HEADERS,
  normalizeBuildingImportHeader,
  parseBuildingListCell,
  validateBuildingImportHeaders,
} from '@/lib/buildingImport'
import { parseCsvText } from '@/lib/csv'
import { prisma } from '@/lib/prisma'
import { invalidateUniversityData, UNIVERSITY_DATA_TAGS } from '@/lib/server/universityData'
import { buildingImportRequestSchema } from '@/lib/validations/admin'
import { ApiError, getAuthenticatedAdmin, handleApiError, successResponse } from '@/lib/api/utils'

function normalizeBuildingName(name: string) {
  return name.trim().toLowerCase()
}

export async function POST(request: NextRequest) {
  try {
    await getAuthenticatedAdmin('ADMIN_TAB_BUILDING_IMPORT')
    const payload = buildingImportRequestSchema.parse(await request.json())

    const university = await prisma.university.findUnique({
      where: { id: payload.universityId },
      select: { id: true },
    })

    if (!university) {
      throw new ApiError(404, 'University not found')
    }

    const rows = parseCsvText(payload.csvContent)
    if (rows.length === 0) {
      throw new ApiError(400, 'CSV file is empty')
    }

    const headerRow = rows[0]
    const headerValidation = validateBuildingImportHeaders(headerRow)
    if (!headerValidation.valid) {
      const details: string[] = []
      if (headerValidation.missingHeaders.length > 0) {
        details.push(`Missing: ${headerValidation.missingHeaders.join(', ')}`)
      }
      if (headerValidation.unexpectedHeaders.length > 0) {
        details.push(`Unexpected: ${headerValidation.unexpectedHeaders.join(', ')}`)
      }
      if (headerValidation.duplicateHeaders.length > 0) {
        details.push(`Duplicate: ${headerValidation.duplicateHeaders.join(', ')}`)
      }

      throw new ApiError(
        400,
        `CSV columns must exactly match: ${BUILDING_IMPORT_REQUIRED_HEADERS.join(', ')}. ${details.join('. ')}`,
      )
    }

    const headerIndex = new Map(
      headerRow.map((value, index) => [normalizeBuildingImportHeader(value), index]),
    )
    const dataRows = rows.slice(1)
    const validationErrors: string[] = []
    const parsedRows = dataRows
      .map((row, rowIndex) => {
        const sourceLine = rowIndex + 2
        const name = (row[headerIndex.get('name') ?? -1] ?? '').trim()
        const description = (row[headerIndex.get('description') ?? -1] ?? '').trim()
        const address = (row[headerIndex.get('address') ?? -1] ?? '').trim()
        const categories = parseBuildingListCell(row[headerIndex.get('categories') ?? -1])
        const services = parseBuildingListCell(row[headerIndex.get('services') ?? -1])
        const departments = parseBuildingListCell(row[headerIndex.get('departments') ?? -1])

        const isCompletelyEmpty =
          !name &&
          !description &&
          !address &&
          categories.length === 0 &&
          services.length === 0 &&
          departments.length === 0

        if (isCompletelyEmpty) {
          return null
        }

        if (!name || !address) {
          validationErrors.push(`Line ${sourceLine}: "name" and "address" are required`)
          return null
        }

        return {
          address,
          categories,
          departments,
          description: description || null,
          mapQuery: [name, address].filter(Boolean).join(', '),
          name,
          services,
          type: categories[0] ?? 'Campus',
        }
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))

    if (validationErrors.length > 0) {
      throw new ApiError(400, validationErrors.slice(0, 10).join('; '))
    }

    if (parsedRows.length === 0) {
      throw new ApiError(400, 'CSV has no importable data rows')
    }

    // Look up existing buildings BEFORE the transaction to reduce time spent
    // inside the interactive transaction (important for remote DBs / PgBouncer).
    const existingRows = await prisma.campusBuilding.findMany({
      where: { universityId: payload.universityId },
      select: { id: true, name: true },
    })
    const existingByName = new Map<string, string>(
      existingRows.map((building) => [normalizeBuildingName(building.name), building.id]),
    )

    // Split rows into creates vs updates
    type ParsedRow = (typeof parsedRows)[number]
    const rowsToCreate: ParsedRow[] = []
    const rowsToUpdate: { id: string; data: ParsedRow }[] = []

    for (const row of parsedRows) {
      const existingId = existingByName.get(normalizeBuildingName(row.name))
      if (existingId) {
        rowsToUpdate.push({ id: existingId, data: row })
      } else {
        rowsToCreate.push(row)
      }
    }

    // Use a generous timeout for bulk operations against a remote database.
    // Batch creates with createMany (single query) and loop updates individually.
    const result = await prisma.$transaction(
      async (tx) => {
        if (rowsToCreate.length > 0) {
          await tx.campusBuilding.createMany({
            data: rowsToCreate.map((row) => ({
              universityId: payload.universityId,
              address: row.address,
              categories: row.categories,
              departments: row.departments,
              description: row.description,
              mapQuery: row.mapQuery,
              name: row.name,
              services: row.services,
              type: row.type,
            })),
          })
        }

        for (const { id, data: row } of rowsToUpdate) {
          await tx.campusBuilding.update({
            where: { id },
            data: {
              address: row.address,
              categories: row.categories,
              departments: row.departments,
              description: row.description,
              mapQuery: row.mapQuery,
              name: row.name,
              services: row.services,
              type: row.type,
            },
          })
        }

        return {
          createdCount: rowsToCreate.length,
          requiredColumns: BUILDING_IMPORT_REQUIRED_HEADERS,
          totalRows: parsedRows.length,
          updatedCount: rowsToUpdate.length,
        }
      },
      { timeout: 60_000 },
    )

    invalidateUniversityData(UNIVERSITY_DATA_TAGS.buildings)

    return successResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}
