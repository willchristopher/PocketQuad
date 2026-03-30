import { NextResponse } from 'next/server';
import { createRoleHintToken, ROLE_HINT_COOKIE_NAME, setRoleHintCookie, verifyRoleHintToken, } from '@/lib/auth/roleHint';
import { canAccessAdminPortal, } from '@/lib/auth/portalPermissions';
import { createSupabaseMiddlewareClient, hasSupabaseEnv } from '@/lib/supabase/server';
const PUBLIC_ROUTES = new Set([
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/verify-email',
    '/onboarding',
]);
const AUTH_ROUTES = new Set(['/login', '/register']);
const STUDENT_PREFIXES = [
    '/dashboard',
    '/calendar',
    '/events',
    '/faculty-directory',
    '/chatroom',
    '/notifications',
    '/profile',
    '/advisor',
    '/campus-map',
    '/links-directory',
    '/services-status',
    '/clubs',
];
function matchesPrefix(pathname, prefixes) {
    return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
function isPublicRoute(pathname) {
    if (PUBLIC_ROUTES.has(pathname))
        return true;
    return pathname.startsWith('/verify-email/');
}
function isStudentRoute(pathname) {
    return matchesPrefix(pathname, STUDENT_PREFIXES);
}
function isFacultyRoute(pathname) {
    return pathname === '/faculty' || pathname.startsWith('/faculty/');
}
function isAdminRoute(pathname) {
    return pathname === '/admin' || pathname.startsWith('/admin/');
}
function redirectToLogin(request) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
}
function redirectToVerifyEmail(request) {
    const url = request.nextUrl.clone();
    url.pathname = '/verify-email';
    url.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
}
function redirectAuthenticatedUser(request, role) {
    const url = request.nextUrl.clone();
    if (role === 'ADMIN') {
        url.pathname = '/admin';
    }
    else if (role === 'FACULTY') {
        url.pathname = '/faculty/dashboard';
    }
    else {
        url.pathname = '/dashboard';
    }
    return NextResponse.redirect(url);
}
function withRoleHint(response, roleHintToken) {
    if (roleHintToken) {
        setRoleHintCookie(response, roleHintToken);
    }
    return response;
}
function parseTestingRole(value) {
    if (!value)
        return null;
    if (value === 'admin')
        return 'ADMIN';
    if (value === 'faculty')
        return 'FACULTY';
    if (value === 'student')
        return 'STUDENT';
    return null;
}
async function fetchMiddlewareProfile(request) {
    const endpoint = new URL('/api/auth/middleware-profile', request.url);
    const cookie = request.headers.get('cookie');
    const profileResponse = await fetch(endpoint, {
        method: 'GET',
        headers: cookie ? { cookie } : undefined,
        cache: 'no-store',
    });
    if (!profileResponse.ok)
        return null;
    const payload = (await profileResponse.json());
    return payload.data ?? null;
}
export async function middleware(request) {
    const pathname = request.nextUrl.pathname;
    if (pathname.startsWith('/_next') || pathname.startsWith('/api')) {
        return NextResponse.next();
    }
    if (!hasSupabaseEnv()) {
        return NextResponse.next();
    }
    const response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });
    try {
        const mockRole = parseTestingRole(request.cookies.get('pocketquad-test-role')?.value);
        const supabase = createSupabaseMiddlewareClient(request, response);
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        const publicRoute = isPublicRoute(pathname);
        const authRoute = AUTH_ROUTES.has(pathname);
        const needsAuth = isStudentRoute(pathname) || isFacultyRoute(pathname) || isAdminRoute(pathname);
        if (!user) {
            if (mockRole) {
                if (authRoute) {
                    return redirectAuthenticatedUser(request, mockRole);
                }
                if (isFacultyRoute(pathname) && mockRole !== 'FACULTY' && mockRole !== 'ADMIN') {
                    const url = request.nextUrl.clone();
                    url.pathname = '/dashboard';
                    return NextResponse.redirect(url);
                }
                if (isAdminRoute(pathname) && mockRole !== 'ADMIN') {
                    const url = request.nextUrl.clone();
                    url.pathname = mockRole === 'FACULTY' ? '/faculty/dashboard' : '/dashboard';
                    return NextResponse.redirect(url);
                }
                if (isStudentRoute(pathname) && mockRole === 'FACULTY') {
                    const url = request.nextUrl.clone();
                    url.pathname = '/faculty/dashboard';
                    return NextResponse.redirect(url);
                }
                if (isStudentRoute(pathname) && mockRole === 'ADMIN') {
                    const url = request.nextUrl.clone();
                    url.pathname = '/admin';
                    return NextResponse.redirect(url);
                }
                return response;
            }
            if (needsAuth && !publicRoute) {
                return redirectToLogin(request);
            }
            return response;
        }
        let role = 'STUDENT';
        let roleHintToken = null;
        const hintedRole = await verifyRoleHintToken(request.cookies.get(ROLE_HINT_COOKIE_NAME)?.value, user.id);
        let adminAccessLevel = null;
        let portalPermissions = [];
        let canPublishCampusAnnouncements = false;
        if (hintedRole) {
            role = hintedRole;
        }
        const dbUser = await fetchMiddlewareProfile(request);
        if (dbUser?.role) {
            role = dbUser.role;
            adminAccessLevel = dbUser.adminAccessLevel;
            portalPermissions = dbUser.portalPermissions;
            canPublishCampusAnnouncements = dbUser.canPublishCampusAnnouncements;
            if (!hintedRole || hintedRole !== role) {
                roleHintToken = await createRoleHintToken(user.id, role);
            }
        }
        const canAccessAdmin = canAccessAdminPortal({
            role,
            adminAccessLevel,
            portalPermissions,
            canPublishCampusAnnouncements,
        });
        if (dbUser && !dbUser.emailVerified && (needsAuth || authRoute)) {
            return withRoleHint(redirectToVerifyEmail(request), roleHintToken);
        }
        if (authRoute) {
            const redirectRole = canAccessAdmin ? 'ADMIN' : role;
            return withRoleHint(redirectAuthenticatedUser(request, redirectRole), roleHintToken);
        }
        if (isFacultyRoute(pathname) && role !== 'FACULTY' && role !== 'ADMIN') {
            const url = request.nextUrl.clone();
            url.pathname = '/dashboard';
            return withRoleHint(NextResponse.redirect(url), roleHintToken);
        }
        if (isAdminRoute(pathname) && !canAccessAdmin) {
            const url = request.nextUrl.clone();
            url.pathname = role === 'FACULTY' ? '/faculty/dashboard' : '/dashboard';
            return withRoleHint(NextResponse.redirect(url), roleHintToken);
        }
        if (isStudentRoute(pathname) && role === 'FACULTY') {
            const url = request.nextUrl.clone();
            url.pathname = '/faculty/dashboard';
            return withRoleHint(NextResponse.redirect(url), roleHintToken);
        }
        if (isStudentRoute(pathname) && role === 'ADMIN' && canAccessAdmin) {
            const url = request.nextUrl.clone();
            url.pathname = '/admin';
            return withRoleHint(NextResponse.redirect(url), roleHintToken);
        }
        return withRoleHint(response, roleHintToken);
    }
    catch (error) {
        console.error('Middleware auth check failed:', error);
        return NextResponse.next();
    }
}
export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
