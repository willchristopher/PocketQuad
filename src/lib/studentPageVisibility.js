export const studentPageVisibilityOptions = [
    {
        key: 'dashboard',
        label: 'Dashboard',
        description: 'The student home page with campus summaries and personalized widgets.',
        href: '/dashboard',
    },
    {
        key: 'calendar',
        label: 'Calendar',
        description: 'The combined calendar and deadline timeline for students.',
        href: '/calendar',
    },
    {
        key: 'faculty-directory',
        label: 'Faculty Directory',
        description: 'Faculty browsing and profile pages.',
        href: '/faculty-directory',
    },
    {
        key: 'events',
        label: 'Events',
        description: 'Campus event listings and event detail pages.',
        href: '/events',
    },
    {
        key: 'campus-map',
        label: 'Map & Services',
        description: 'Campus map, saved buildings, and service status pages.',
        href: '/campus-map',
    },
    {
        key: 'links-directory',
        label: 'Resources',
        description: 'The student links and resources directory.',
        href: '/links-directory',
    },
    {
        key: 'chatroom',
        label: 'Chat',
        description: 'The campus chatroom experience.',
        href: '/chatroom',
    },
    {
        key: 'clubs',
        label: 'Clubhouse',
        description: 'Student club discovery, networking, and organization browsing.',
        href: '/clubs',
    },
    {
        key: 'notifications',
        label: 'Notifications',
        description: 'The student notifications inbox.',
        href: '/notifications',
    },
    {
        key: 'profile',
        label: 'Profile',
        description: 'Student profile, notification settings, and dashboard preferences.',
        href: '/profile',
    },
];

const studentPageVisibilityKeySet = new Set(studentPageVisibilityOptions.map((option) => option.key));

export function sanitizeDisabledStudentPages(values) {
    if (!Array.isArray(values)) {
        return [];
    }

    const seen = new Set();
    const sanitized = [];

    for (const value of values) {
        if (typeof value !== 'string' || !studentPageVisibilityKeySet.has(value) || seen.has(value)) {
            continue;
        }

        seen.add(value);
        sanitized.push(value);
    }

    return sanitized;
}

export function getStudentPageKeyForPathname(pathname) {
    if (!pathname || pathname === '/' || pathname === '/dashboard') {
        return 'dashboard';
    }

    if (pathname === '/calendar') {
        return 'calendar';
    }

    if (pathname === '/events' || pathname.startsWith('/events/')) {
        return 'events';
    }

    if (pathname.startsWith('/faculty-directory')) {
        return 'faculty-directory';
    }

    if (pathname === '/chatroom') {
        return 'chatroom';
    }

    if (pathname === '/campus-map' || pathname === '/services-status') {
        return 'campus-map';
    }

    if (pathname === '/links-directory') {
        return 'links-directory';
    }

    if (pathname === '/clubs') {
        return 'clubs';
    }

    if (pathname === '/notifications') {
        return 'notifications';
    }

    if (pathname === '/profile') {
        return 'profile';
    }

    return null;
}

export function getStudentPageKeyForHref(href) {
    if (!href || typeof href !== 'string') {
        return null;
    }

    if (/^https?:\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return null;
    }

    try {
        const url = new URL(href, 'https://pocketquad.local');
        return getStudentPageKeyForPathname(url.pathname);
    }
    catch {
        return null;
    }
}

export function isStudentPageVisible(disabledStudentPages, pageKey) {
    if (!pageKey) {
        return true;
    }

    return !sanitizeDisabledStudentPages(disabledStudentPages).includes(pageKey);
}

export function isStudentPathVisible(pathname, disabledStudentPages) {
    const pageKey = getStudentPageKeyForPathname(pathname);
    if (!pageKey) {
        return true;
    }

    return isStudentPageVisible(disabledStudentPages, pageKey);
}

export function isStudentHrefVisible(href, disabledStudentPages) {
    const pageKey = getStudentPageKeyForHref(href);
    if (!pageKey) {
        return true;
    }

    return isStudentPageVisible(disabledStudentPages, pageKey);
}

export function getFirstVisibleStudentHref(disabledStudentPages) {
    const disabled = sanitizeDisabledStudentPages(disabledStudentPages);
    const firstVisible = studentPageVisibilityOptions.find((option) => !disabled.includes(option.key));
    return firstVisible?.href ?? '/dashboard';
}
