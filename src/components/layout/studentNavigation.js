import {
  BellRing,
  CalendarDays,
  Calendar,
  ExternalLink,
  Flag,
  LayoutGrid,
  MapPin,
  MessageCircle,
  CircleUser,
  Ticket,
  Users,
} from 'lucide-react'

import {
  getFirstVisibleStudentHref,
  getStudentPageKeyForPathname,
  isStudentPageVisible,
} from '@/lib/studentPageVisibility'

const baseStudentNavigationSections = [
  {
    title: 'Overview',
    items: [
      { icon: LayoutGrid, label: 'Dashboard', href: '/dashboard', pageKey: 'dashboard' },
      { icon: CalendarDays, label: 'Calendar', href: '/calendar', pageKey: 'calendar' },
    ],
  },
  {
    title: 'Campus',
    items: [
      { icon: Users, label: 'Faculty Directory', href: '/faculty-directory', pageKey: 'faculty-directory' },
      { icon: Ticket, label: 'Events', href: '/events', pageKey: 'events' },
      { icon: MapPin, label: 'Campus Map', href: '/campus-map', pageKey: 'campus-map' },
      { icon: ExternalLink, label: 'Resources', href: '/links-directory', pageKey: 'links-directory' },
    ],
  },
  {
    title: 'Community',
    items: [
      { icon: MessageCircle, label: 'Campus Chat', href: '/chatroom', pageKey: 'chatroom' },
      { icon: Flag, label: 'Clubs', href: '/clubs', pageKey: 'clubs' },
    ],
  },
]

const baseStudentSecondaryNavigationItems = [
  { icon: BellRing, label: 'Notifications', href: '/notifications', pageKey: 'notifications' },
  { icon: CircleUser, label: 'Profile', href: '/profile', pageKey: 'profile' },
]

const baseStudentMobileNavigationItems = [
  { icon: LayoutGrid, label: 'Dashboard', href: '/dashboard', pageKey: 'dashboard' },
  { icon: Ticket, label: 'Events', href: '/events', pageKey: 'events' },
  { icon: MessageCircle, label: 'Campus Chat', href: '/chatroom', pageKey: 'chatroom' },
  { icon: CircleUser, label: 'Profile', href: '/profile', pageKey: 'profile' },
]

const baseStudentCommandNavigationItems = [
  { icon: LayoutGrid, label: 'Dashboard', href: '/dashboard', pageKey: 'dashboard' },
  { icon: Ticket, label: 'Events', href: '/events', pageKey: 'events' },
  { icon: Users, label: 'Faculty Directory', href: '/faculty-directory', pageKey: 'faculty-directory' },
  { icon: MessageCircle, label: 'Campus Chat', href: '/chatroom', pageKey: 'chatroom' },
  { icon: MapPin, label: 'Campus Map', href: '/campus-map', pageKey: 'campus-map' },
  { icon: ExternalLink, label: 'Resources', href: '/links-directory', pageKey: 'links-directory' },
  { icon: BellRing, label: 'Notifications', href: '/notifications', pageKey: 'notifications' },
  { icon: CircleUser, label: 'Profile', href: '/profile', pageKey: 'profile' },
]

function filterStudentNavigationItems(items, disabledStudentPages = []) {
  return items.filter((item) => isStudentPageVisible(disabledStudentPages, item.pageKey))
}

export function getStudentNavigationSections(disabledStudentPages = []) {
  return baseStudentNavigationSections
    .map((section) => ({
      ...section,
      items: filterStudentNavigationItems(section.items, disabledStudentPages),
    }))
    .filter((section) => section.items.length > 0)
}

export function getStudentSecondaryNavigationItems(disabledStudentPages = []) {
  return filterStudentNavigationItems(baseStudentSecondaryNavigationItems, disabledStudentPages)
}

export function getStudentMobileNavigationItems(disabledStudentPages = []) {
  return filterStudentNavigationItems(baseStudentMobileNavigationItems, disabledStudentPages)
}

export function getStudentCommandNavigationItems(disabledStudentPages = []) {
  return filterStudentNavigationItems(baseStudentCommandNavigationItems, disabledStudentPages)
}

export function getStudentFallbackHref(disabledStudentPages = []) {
  return getFirstVisibleStudentHref(disabledStudentPages)
}

const studentPageMeta = {
  calendar: {
    title: 'Calendar',
    description: 'Course deadlines, upcoming events, and schedule context in one organized timeline.',
  },
  campusMap: {
    title: 'Campus Map & Services',
    description: 'Find buildings, service health, and operational updates without hunting around.',
  },
  chatroom: {
    title: 'Campus Chat',
    description: 'Join conversations, ask questions, and stay close to student activity.',
  },
  clubs: {
    title: 'Clubhouse',
    description: 'Discover campus organizations, build your circle, and branch into new communities.',
  },
  dashboard: {
    title: 'Dashboard',
    description: '',
  },
  facultyDirectory: {
    title: 'Faculty Directory',
    description: '',
  },
  notifications: {
    title: 'Notifications',
    description: 'A focused inbox for faculty updates, events, and campus alerts.',
  },
  profile: {
    title: 'Profile & Preferences',
    description: 'Manage what you see, what you save, and how the app fits your day.',
  },
  resources: {
    title: 'Resources',
    description: 'Quick access to the links and systems students use the most.',
  },
  events: {
    title: 'Campus Events',
    description: 'What is happening around campus next and where you should be.',
  },
  fallback: {
    title: 'PocketQuad',
    description: 'Campus information organized into one better daily workspace.',
  },
}

export function getStudentPageMeta(pathname) {
  const pageKey = getStudentPageKeyForPathname(pathname)

  if (pageKey === 'dashboard') {
    return studentPageMeta.dashboard
  }

  if (pageKey === 'calendar') {
    return studentPageMeta.calendar
  }

  if (pageKey === 'events') {
    return studentPageMeta.events
  }

  if (pageKey === 'faculty-directory') {
    return studentPageMeta.facultyDirectory
  }

  if (pageKey === 'chatroom') {
    return studentPageMeta.chatroom
  }

  if (pageKey === 'campus-map') {
    return studentPageMeta.campusMap
  }

  if (pageKey === 'links-directory') {
    return studentPageMeta.resources
  }

  if (pageKey === 'clubs') {
    return studentPageMeta.clubs
  }

  if (pageKey === 'notifications') {
    return studentPageMeta.notifications
  }

  if (pageKey === 'profile') {
    return studentPageMeta.profile
  }

  return studentPageMeta.fallback
}

export function isStudentPathActive(pathname, href) {
  return (
    pathname === href ||
    pathname?.startsWith(`${href}/`) ||
    (href === '/dashboard' && pathname === '/') ||
    (href === '/campus-map' && pathname === '/services-status')
  )
}
