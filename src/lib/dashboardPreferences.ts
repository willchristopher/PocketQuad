import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { dashboardModuleIds, type DashboardModuleId } from '@/lib/studentData'

const dashboardModuleIdSet = new Set<DashboardModuleId>(dashboardModuleIds)

function sanitizeDashboardModules(values: readonly string[] | null | undefined): DashboardModuleId[] {
  if (!values) {
    return []
  }

  return values.filter((value): value is DashboardModuleId =>
    dashboardModuleIdSet.has(value as DashboardModuleId),
  )
}

function toTextArraySql(values: DashboardModuleId[]) {
  if (values.length === 0) {
    return Prisma.sql`ARRAY[]::TEXT[]`
  }

  return Prisma.sql`ARRAY[${Prisma.join(values.map((value) => Prisma.sql`${value}`))}]::TEXT[]`
}

export async function readDashboardModules(userId: string): Promise<DashboardModuleId[] | undefined> {
  const rows = await prisma.$queryRaw<Array<{ dashboard_modules: string[] | null }>>(Prisma.sql`
    SELECT "dashboard_modules"
    FROM "notification_preferences"
    WHERE "user_id" = ${userId}
    LIMIT 1
  `)

  if (rows.length === 0) {
    return undefined
  }

  return sanitizeDashboardModules(rows[0].dashboard_modules)
}

export async function writeDashboardModules(userId: string, modules: DashboardModuleId[]) {
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "notification_preferences"
    SET "dashboard_modules" = ${toTextArraySql(modules)},
        "updated_at" = NOW()
    WHERE "user_id" = ${userId}
  `)
}

export async function attachDashboardModules<
  T extends { id: string; notificationPreferences?: Record<string, unknown> | null },
>(record: T | null): Promise<T | null> {
  if (!record?.notificationPreferences) {
    return record
  }

  const dashboardModules = await readDashboardModules(record.id)

  return {
    ...record,
    notificationPreferences: {
      ...record.notificationPreferences,
      ...(typeof dashboardModules !== 'undefined' ? { dashboardModules } : {}),
    },
  }
}
