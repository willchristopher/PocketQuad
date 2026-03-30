import {
  BellRinging,
  CalendarBlank,
  Calendar,
  ArrowSquareOut,
  Flag,
  SquaresFour,
  MapPinLine,
  ChatCircleDots,
  UserCircle,
  UsersThree,
} from '@phosphor-icons/react'

import {
  getFirstVisibleStudentHref,
  getStudentPageKeyForPathname,
  isStudentPageVisible,
} from '@/lib/studentPageVisibility'

const baseStudentNavigationSections = [
  {
    title: 'Overview',
    items: [
      { icon: SquaresFour, label: 'Dashboard', href: '/dashboard', pageKey: 'dashboard' },
      { icon: Calendar, label: 'Calendar', href: '/calendar', pageKey: 'calendar' },
    ],
  },
  {
    title: 'Campus',
    items: [
      { icon: UsersThree, label: 'Faculty', href: '/faculty-directory', pageKey: 'faculty-directory' },
      { icon: CalendarBlank, label: 'Events', href: '/events', pageKey: 'events' },
      { icon: MapPinLine, label: 'Map & Services', href: '/campus-map', pageKey: 'campus-map' },
      { icon: ArrowSquareOut, label: 'Resources', href: '/links-directory', pageKey: 'links-directory' },
    ],
  },
  {
    title: 'Community',
    items: [
      { icon: ChatCircleDots, label: 'Chat', href: '/chatroom', pageKey: 'chatroom' },
      { icon: Flag, label: 'Clubs', href: '/clubs', pageKey: 'clubs' },
    ],
  },
]

const baseStudentSecondaryNavigationItems = [
  { icon: BellRinging, label: 'Notifications', href: '/notifications', pageKey: 'notifications' },
  { icon: UserCircle, label: 'Profile', href: '/profile', pageKey: 'profile' },
]

const baseStudentMobileNavigationItems = [
  { icon: SquaresFour, label: 'Home', href: '/dashboard', pageKey: 'dashboard' },
  { icon: CalendarBlank, label: 'Events', href: '/events', pageKey: 'events' },
  { icon: ChatCircleDots, label: 'Chat', href: '/chatroom', pageKey: 'chatroom' },
  { icon: UserCircle, label: 'Profile', href: '/profile', pageKey: 'profile' },
]

const baseStudentCommandNavigationItems = [
  { icon: SquaresFour, label: 'Dashboard', href: '/dashboard', pageKey: 'dashboard' },
  { icon: CalendarBlank, label: 'Events', href: '/events', pageKey: 'events' },
  { icon: UsersThree, label: 'Faculty', href: '/faculty-directory', pageKey: 'faculty-directory' },
  { icon: ChatCircleDots, label: 'Chat', href: '/chatroom', pageKey: 'chatroom' },
  { icon: MapPinLine, label: 'Map & Services', href: '/campus-map', pageKey: 'campus-map' },
  { icon: ArrowSquareOut, label: 'Resources', href: '/links-directory', pageKey: 'links-directory' },
  { icon: BellRinging, label: 'Notifications', href: '/notifications', pageKey: 'notifications' },
  { icon: UserCircle, label: 'Profile', href: '/profile', pageKey: 'profile' },
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
    title: 'Clubs',
    description: 'Explore the organizations and communities shaping campus life.',
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
