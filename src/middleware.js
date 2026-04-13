import { NextResponse } from 'next/server';
import { ROLE_HINT_COOKIE_NAME, verifyRoleHintToken, } from '@/lib/auth/roleHint';
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
        const hintedRole = await verifyRoleHintToken(request.cookies.get(ROLE_HINT_COOKIE_NAME)?.value, user.id);
        if (!hintedRole && authRoute) {
            return response;
        }
        if (authRoute) {
            return redirectAuthenticatedUser(request, hintedRole);
        }
        return response;
    }
    catch (error) {
        console.error('Middleware auth check failed:', error);
        return NextResponse.next();
    }
}
export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
