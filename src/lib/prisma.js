import { PrismaClient } from '@prisma/client';
/** @typedef {import('@prisma/client').PrismaClient} PrismaClientInstance */

/** @type {globalThis & { prisma?: PrismaClientInstance }} */
const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma ??
    new PrismaClient({
        log: process.env.PRISMA_LOG_QUERIES === 'true' ? ['query', 'error', 'warn'] : ['error'],
    });
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
