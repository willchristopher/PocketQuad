import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { dashboardModuleIds } from '@/lib/studentData';

/** @typedef {import('./studentData.js').DashboardModuleId} DashboardModuleId */
/** @typedef {{ dashboard_modules: string[] | null }} DashboardModuleRow */

const dashboardModuleIdSet = new Set(dashboardModuleIds);

/**
 * @param {readonly string[] | null | undefined} values
 * @returns {DashboardModuleId[]}
 */
function sanitizeDashboardModules(values) {
    if (!values) {
        return [];
    }
    return values.filter((value) => dashboardModuleIdSet.has(value));
}
/**
 * @param {DashboardModuleId[]} values
 * @returns {ReturnType<typeof Prisma.sql>}
 */
function toTextArraySql(values) {
    if (values.length === 0) {
        return Prisma.sql `ARRAY[]::TEXT[]`;
    }
    return Prisma.sql `ARRAY[${Prisma.join(values.map((value) => Prisma.sql `${value}`))}]::TEXT[]`;
}
/**
 * @param {string} userId
 * @returns {Promise<DashboardModuleId[] | undefined>}
 */
export async function readDashboardModules(userId) {
    const rows = await prisma.$queryRaw(Prisma.sql `
    SELECT "dashboard_modules"
    FROM "notification_preferences"
    WHERE "user_id" = ${userId}
    LIMIT 1
  `);
    if (rows.length === 0) {
        return undefined;
    }
    return sanitizeDashboardModules(rows[0].dashboard_modules);
}
/**
 * @param {string} userId
 * @param {DashboardModuleId[]} modules
 */
export async function writeDashboardModules(userId, modules) {
    await prisma.$executeRaw(Prisma.sql `
    UPDATE "notification_preferences"
    SET "dashboard_modules" = ${toTextArraySql(modules)},
        "updated_at" = NOW()
    WHERE "user_id" = ${userId}
  `);
}
/**
 * @template T
 * @param {T | null} record
 * @returns {Promise<T | null>}
 */
export async function attachDashboardModules(record) {
    if (!record?.notificationPreferences) {
        return record;
    }
    const dashboardModules = await readDashboardModules(record.id);
    return {
        ...record,
        notificationPreferences: {
            ...record.notificationPreferences,
            ...(typeof dashboardModules !== 'undefined' ? { dashboardModules } : {}),
        },
    };
}
