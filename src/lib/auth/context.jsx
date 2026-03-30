'use client';
import React from 'react';
import { apiRequest } from '@/lib/api/client';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { hasSupabasePublicEnv } from '@/lib/supabase/config';
const AuthContext = React.createContext(undefined);
export function AuthProvider({ children }) {
    const [user, setUser] = React.useState(null);
    const [profile, setProfile] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const mountedRef = React.useRef(true);
    const syncRequestIdRef = React.useRef(0);
    const fetchSession = React.useCallback(async (options) => {
        const requestId = ++syncRequestIdRef.current;
        const showLoader = options?.showLoader ?? false;
        if (showLoader && mountedRef.current) {
            setLoading(true);
        }
        try {
            const data = await apiRequest('/api/auth/session');
            if (mountedRef.current && requestId === syncRequestIdRef.current) {
                setUser(data.user);
                setProfile(data.profile);
            }
            return data;
        }
        catch {
            if (mountedRef.current && requestId === syncRequestIdRef.current) {
                setUser(null);
                setProfile(null);
            }
            return null;
        }
        finally {
            if (showLoader && mountedRef.current && requestId === syncRequestIdRef.current) {
                setLoading(false);
            }
        }
    }, []);
    React.useEffect(() => {
        mountedRef.current = true;
        const bootstrap = async () => {
            await fetchSession({ showLoader: true });
        };
        void bootstrap();
        if (!hasSupabasePublicEnv()) {
            return () => {
                mountedRef.current = false;
            };
        }
        const supabase = createSupabaseBrowserClient();
        const { data } = supabase.auth.onAuthStateChange(() => {
            void fetchSession({ showLoader: true });
        });
        return () => {
            mountedRef.current = false;
            data.subscription.unsubscribe();
        };
    }, [fetchSession]);
    const refreshProfile = React.useCallback(async () => {
        const nextProfile = await apiRequest('/api/users/me');
        setProfile(nextProfile);
    }, []);
    const refreshSession = React.useCallback(async () => fetchSession({ showLoader: true }), [fetchSession]);
    const signOut = React.useCallback(async () => {
        try {
            await apiRequest('/api/auth/logout', { method: 'POST' });
        }
        finally {
            setUser(null);
            setProfile(null);
        }
    }, []);
    const value = React.useMemo(() => ({
        user,
        profile,
        loading,
        signOut,
        refreshProfile,
        refreshSession,
    }), [loading, profile, refreshProfile, refreshSession, signOut, user]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
    const context = React.useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used inside AuthProvider');
    }
    return context;
}
