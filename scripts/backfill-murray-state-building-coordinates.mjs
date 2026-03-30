import { PrismaClient } from '@prisma/client'

import { MURRAY_STATE_BUILDING_COORDINATES } from '../src/lib/data/murrayStateBuildingCoordinates.mjs'

const prisma = new PrismaClient()

async function main() {
  const buildings = await prisma.campusBuilding.findMany({
    where: {
      university: {
        slug: 'murray-state-university',
      },
    },
    select: {
      id: true,
      name: true,
      latitude: true,
      longitude: true,
    },
    orderBy: {
      name: 'asc',
    },
  })

  const datasetNames = new Set(Object.keys(MURRAY_STATE_BUILDING_COORDINATES))
  const missingFromDataset = buildings
    .filter((building) => !datasetNames.has(building.name))
    .map((building) => building.name)

  if (missingFromDataset.length > 0) {
    console.error('Missing Murray State coordinate entries:')
    for (const name of missingFromDataset) {
      console.error(`- ${name}`)
    }
    process.exitCode = 1
    return
  }

  let updatedCount = 0
  let unchangedCount = 0

  for (const building of buildings) {
    const nextCoordinates = MURRAY_STATE_BUILDING_COORDINATES[building.name]
    if (!nextCoordinates) {
      continue
    }

    if (building.latitude === nextCoordinates.lat && building.longitude === nextCoordinates.lng) {
      unchangedCount += 1
      continue
    }

    await prisma.campusBuilding.update({
      where: { id: building.id },
      data: {
        latitude: nextCoordinates.lat,
        longitude: nextCoordinates.lng,
      },
    })

    updatedCount += 1
  }

  const coverage = await prisma.campusBuilding.count({
    where: {
      university: {
        slug: 'murray-state-university',
      },
      latitude: { not: null },
      longitude: { not: null },
    },
  })

  console.log(
    JSON.stringify(
      {
        totalBuildings: buildings.length,
        coordinateEntries: datasetNames.size,
        updatedCount,
        unchangedCount,
        coveredBuildings: coverage,
      },
      null,
      2,
    ),
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
