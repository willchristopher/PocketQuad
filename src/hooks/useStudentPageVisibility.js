'use client';

import React from 'react';

import {
    getFirstVisibleStudentHref,
    isStudentHrefVisible,
    isStudentPageVisible,
    isStudentPathVisible,
    sanitizeDisabledStudentPages,
} from '@/lib/studentPageVisibility';
import { useAuth } from '@/lib/auth/context';

export function useStudentPageVisibility() {
    const { profile } = useAuth();
    const disabledStudentPages = React.useMemo(() => sanitizeDisabledStudentPages(profile?.university?.disabledStudentPages), [profile?.university?.disabledStudentPages]);

    return React.useMemo(() => ({
        disabledStudentPages,
        fallbackHref: getFirstVisibleStudentHref(disabledStudentPages),
        isPageVisible: (pageKey) => isStudentPageVisible(disabledStudentPages, pageKey),
        isHrefVisible: (href) => isStudentHrefVisible(href, disabledStudentPages),
        isPathVisible: (pathname) => isStudentPathVisible(pathname, disabledStudentPages),
    }), [disabledStudentPages]);
}
