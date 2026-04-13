import fs from 'fs'
import path from 'path'

import { PrismaClient } from '@prisma/client'

import { buildBuildingHoursPayload, buildBuildingHoursScheduleFromCsvRow, cleanBuildingOperationalNote } from '../src/lib/buildingHours.js'
import { extractBuildingImportRows, normalizeBuildingImportHeader } from '../src/lib/buildingImport.js'
import { parseCsvText } from '../src/lib/csv.js'
import { MURRAY_STATE_BUILDING_COORDINATES } from '../src/lib/data/murrayStateBuildingCoordinates.mjs'

const DEFAULT_CSV_PATH = '/Users/willchristopher/Downloads/murray_state_buildings_with_hours.csv'

function normalizeBuildingName(name) {
  return name.trim().toLowerCase()
}

async function main() {
  const csvPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_CSV_PATH
  const prisma = new PrismaClient()

  try {
    const text = fs.readFileSync(csvPath, 'utf8')
    const rows = parseCsvText(text)
    const { headerRow, dataRows } = extractBuildingImportRows(rows)
    const headerIndex = new Map(
      headerRow.map((value, index) => [normalizeBuildingImportHeader(value), index]),
    )

    const buildings = await prisma.campusBuilding.findMany({
      where: {
        university: {
          slug: 'murray-state-university',
        },
      },
      select: {
        id: true,
        name: true,
      },
    })

    const buildingIdByName = new Map(
      buildings.map((building) => [normalizeBuildingName(building.name), building.id]),
    )

    let updatedCount = 0
    const missingMatches = []

    for (const row of dataRows) {
      const getCellValue = (header) => (row[headerIndex.get(header) ?? -1] ?? '').trim()
      const name = getCellValue('name')
      if (!name) continue

      const buildingId = buildingIdByName.get(normalizeBuildingName(name))
      if (!buildingId) {
        missingMatches.push(name)
        continue
      }

      const operatingHoursSchedule = buildBuildingHoursScheduleFromCsvRow({
        Sunday_hours: getCellValue('sunday_hours'),
        Monday_hours: getCellValue('monday_hours'),
        Tuesday_hours: getCellValue('tuesday_hours'),
        Wednesday_hours: getCellValue('wednesday_hours'),
        Thursday_hours: getCellValue('thursday_hours'),
        Friday_hours: getCellValue('friday_hours'),
        Saturday_hours: getCellValue('saturday_hours'),
      })

      const hoursPayload = buildBuildingHoursPayload({
        operatingHoursSchedule,
        operatingHours: null,
      })

      const notes = cleanBuildingOperationalNote(getCellValue('notes'))
      const fallbackCoordinates = MURRAY_STATE_BUILDING_COORDINATES[name] ?? null

      await prisma.campusBuilding.update({
        where: { id: buildingId },
        data: {
          operatingHours: hoursPayload.operatingHours,
          operationalNote: notes,
          ...(fallbackCoordinates
            ? {
                latitude: fallbackCoordinates.lat,
                longitude: fallbackCoordinates.lng,
              }
            : {}),
        },
      })

      updatedCount += 1
    }

    console.log(
      JSON.stringify(
        {
          csvPath,
          updatedCount,
          missingMatches,
        },
        null,
        2,
      ),
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
