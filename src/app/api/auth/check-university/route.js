import { prisma } from '@/lib/prisma';
import { findDormantAccountByEmail, serializeDormantAccount } from '@/lib/auth/dormantAccounts';
import { handleApiError, successResponse } from '@/lib/api/utils';
export async function GET(request) {
    try {
        const domain = request.nextUrl.searchParams.get('domain');
        const email = request.nextUrl.searchParams.get('email')?.trim().toLowerCase();
        if (!domain && !email) {
            return successResponse({ university: null, dormantAccount: null });
        }
        const resolvedDomain = domain?.toLowerCase() ?? email?.split('@')[1] ?? null;
        const [university, dormantAccount] = await Promise.all([
            resolvedDomain
                ? prisma.university.findFirst({
                    where: { domain: resolvedDomain },
                    select: { id: true, name: true },
                })
                : Promise.resolve(null),
            email ? findDormantAccountByEmail(email) : Promise.resolve(null),
        ]);
        return successResponse({
            university,
            dormantAccount: serializeDormantAccount(dormantAccount),
        });
    }
    catch (error) {
        return handleApiError(error);
    }
}
