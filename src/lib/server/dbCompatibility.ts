import { Prisma } from '@prisma/client'

export function isMissingDatabaseFieldError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022'
  }

  return false
}
