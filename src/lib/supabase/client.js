import { createBrowserClient } from '@supabase/ssr';
import { getPublicSupabaseEnv } from '@/lib/supabase/config';
let browserClient = null;
export function createSupabaseBrowserClient() {
    if (browserClient) {
        return browserClient;
    }
    const { url, anonKey } = getPublicSupabaseEnv();
    browserClient = createBrowserClient(url, anonKey);
    return browserClient;
}
