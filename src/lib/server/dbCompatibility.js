import { Prisma } from '@prisma/client';
export function isMissingDatabaseFieldError(error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return error.code === 'P2021' || error.code === 'P2022';
    }
    return false;
}
export function isPrismaSchemaCompatibilityError(error) {
    if (isMissingDatabaseFieldError(error)) {
        return true;
    }
    if (error instanceof Prisma.PrismaClientValidationError) {
        return true;
    }
    if (error instanceof TypeError) {
        return /Cannot read properties of undefined|undefined is not an object/i.test(error.message);
    }
    if (error instanceof Error) {
        return /Unknown argument|Unknown field|Invalid .* invocation|Cannot select both '\\$scalars: true' and a specific scalar field/i.test(error.message);
    }
    return false;
}
