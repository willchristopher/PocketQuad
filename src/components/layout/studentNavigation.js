import {
  BellRing,
  CalendarClock,
  CalendarRange,
  ExternalLink,
  Flag,
  LayoutGrid,
  MapPinned,
  MessageCircleMore,
  UserCircle2,
  Users2,
} from 'lucide-react'

export const studentNavigationSections = [
  {
    title: 'Overview',
    items: [
      { icon: LayoutGrid, label: 'Dashboard', href: '/dashboard' },
      { icon: CalendarRange, label: 'Calendar', href: '/calendar' },
    ],
  },
  {
    title: 'Campus',
    items: [
      { icon: Users2, label: 'Faculty', href: '/faculty-directory' },
      { icon: CalendarClock, label: 'Events', href: '/events' },
      { icon: MapPinned, label: 'Map & Services', href: '/campus-map' },
      { icon: ExternalLink, label: 'Resources', href: '/links-directory' },
    ],
  },
  {
    title: 'Community',
    items: [
      { icon: MessageCircleMore, label: 'Chat', href: '/chatroom' },
      { icon: Flag, label: 'Clubs', href: '/clubs' },
    ],
  },
]

export const studentSecondaryNavigationItems = [
  { icon: BellRing, label: 'Notifications', href: '/notifications' },
  { icon: UserCircle2, label: 'Profile', href: '/profile' },
]

export const studentMobileNavigationItems = [
  { icon: LayoutGrid, label: 'Home', href: '/dashboard' },
  { icon: CalendarClock, label: 'Events', href: '/events' },
  { icon: MessageCircleMore, label: 'Chat', href: '/chatroom' },
  { icon: UserCircle2, label: 'Profile', href: '/profile' },
]

export const studentCommandNavigationItems = [
  { icon: LayoutGrid, label: 'Dashboard', href: '/dashboard' },
  { icon: CalendarClock, label: 'Events', href: '/events' },
  { icon: Users2, label: 'Faculty', href: '/faculty-directory' },
  { icon: MessageCircleMore, label: 'Chat', href: '/chatroom' },
  { icon: MapPinned, label: 'Map & Services', href: '/campus-map' },
  { icon: ExternalLink, label: 'Resources', href: '/links-directory' },
  { icon: BellRing, label: 'Notifications', href: '/notifications' },
  { icon: UserCircle2, label: 'Profile', href: '/profile' },
]

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
  if (!pathname || pathname === '/dashboard' || pathname === '/') {
    return studentPageMeta.dashboard
  }

  if (pathname === '/calendar') {
    return studentPageMeta.calendar
  }

  if (pathname === '/events' || pathname.startsWith('/events/')) {
    return studentPageMeta.events
  }

  if (pathname.startsWith('/faculty-directory')) {
    return studentPageMeta.facultyDirectory
  }

  if (pathname === '/chatroom') {
    return studentPageMeta.chatroom
  }

  if (pathname === '/campus-map' || pathname === '/services-status') {
    return studentPageMeta.campusMap
  }

  if (pathname === '/links-directory') {
    return studentPageMeta.resources
  }

  if (pathname === '/clubs') {
    return studentPageMeta.clubs
  }

  if (pathname === '/notifications') {
    return studentPageMeta.notifications
  }

  if (pathname === '/profile') {
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
