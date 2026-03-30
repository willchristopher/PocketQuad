import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { getPublicSupabaseEnv, hasSupabasePublicEnv } from '@/lib/supabase/config';
export const hasSupabaseEnv = hasSupabasePublicEnv;
export async function createSupabaseServerClient() {
    const { url, anonKey } = getPublicSupabaseEnv();
    const cookieStore = await cookies();
    return createServerClient(url, anonKey, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options);
                    });
                }
                catch {
                    // Ignore in server components where cookie mutation is unavailable.
                }
            },
        },
    });
}
export async function createSupabaseRouteHandlerClient() {
    return createSupabaseServerClient();
}
export function createSupabaseMiddlewareClient(request, response) {
    const { url, anonKey } = getPublicSupabaseEnv();
    return createServerClient(url, anonKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => {
                    request.cookies.set(name, value);
                    response.cookies.set(name, value, options);
                });
            },
        },
    });
}
export function createSupabaseAdminClient() {
    const { url } = getPublicSupabaseEnv();
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRole) {
        throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
    }
    return createClient(url, serviceRole, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
