import { prisma } from '@/lib/prisma';
import { dashboardModuleIds } from '@/lib/studentData';

/** @typedef {import('./studentData.js').DashboardModuleId} DashboardModuleId */
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
 * @param {string} userId
 * @returns {Promise<DashboardModuleId[] | undefined>}
 */
export async function readDashboardModules(userId) {
    const preferences = await prisma.notificationPreferences.findUnique({
        where: { userId },
        select: {
            dashboardModules: true,
        },
    });
    if (!preferences) {
        return undefined;
    }
    return sanitizeDashboardModules(preferences.dashboardModules);
}
/**
 * @param {string} userId
 * @param {DashboardModuleId[]} modules
 */
export async function writeDashboardModules(userId, modules) {
    await prisma.notificationPreferences.update({
        where: { userId },
        data: {
            dashboardModules: modules,
        },
    });
}
