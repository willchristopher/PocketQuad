export type EventCategory = 'Academic' | 'Career' | 'Community' | 'Arts' | 'Wellness'

export interface StudentEvent {
  id: string
  title: string
  description: string
  dateISO: string
  timeLabel: string
  location: string
  category: EventCategory
  organizer: string
}

export interface StudentDeadline {
  id: string
  title: string
  source: string
  dueISO: string
  priority: 'High' | 'Medium' | 'Low'
}

export interface CampusNewsItem {
  id: string
  headline: string
  summary: string
  postedLabel: string
  level: 'Alert' | 'Update' | 'Notice'
}

export interface FacultyEntry {
  id: string
  name: string
  title: string
  department: string
  email: string
  officeLocation: string
  officeHours: string
  bio: string
}

export interface CampusService {
  id: string
  name: string
  status: 'Open' | 'Closed' | 'Limited'
  hours: string
  location: string
  directionsUrl: string
}

export interface ExternalPortalLink {
  id: string
  label: string
  category: 'Learning' | 'Communication' | 'Student Services' | 'Finance' | 'Campus Life'
  href: string
  description: string
}

export interface CampusMapPin {
  id: string
  label: string
  type: 'Resource' | 'Faculty Office' | 'Event Venue'
  address: string
  mapQuery: string
}

export interface FavoriteItem {
  id: string
  kind: 'event' | 'faculty' | 'resource'
  label: string
  subtitle: string
  href: string
}

export const studentEmailFallback = 'student@university.edu'

export const studentEvents: StudentEvent[] = [
  {
    id: 'event-1',
    title: 'Career Fair: Technology and Engineering',
    description: 'Meet employers recruiting for internships and full-time roles.',
    dateISO: '2026-02-11T10:00:00-05:00',
    timeLabel: '10:00 AM - 3:00 PM',
    location: 'Student Union Ballroom',
    category: 'Career',
    organizer: 'Career Center',
  },
  {
    id: 'event-2',
    title: 'Study Abroad Information Session',
    description: 'Learn about scholarship options and upcoming program deadlines.',
    dateISO: '2026-02-13T12:00:00-05:00',
    timeLabel: '12:00 PM',
    location: 'Global Center 201',
    category: 'Academic',
    organizer: 'Global Programs Office',
  },
  {
    id: 'event-3',
    title: 'Hackathon: Build for Good',
    description: '24-hour build event focused on social-impact solutions.',
    dateISO: '2026-02-15T18:00:00-05:00',
    timeLabel: '6:00 PM - 6:00 PM (24h)',
    location: 'Innovation Hub',
    category: 'Community',
    organizer: 'School of Computing',
  },
  {
    id: 'event-4',
    title: 'Campus Film Night',
    description: 'Open-air movie night with student organizations.',
    dateISO: '2026-02-18T20:30:00-05:00',
    timeLabel: '8:30 PM',
    location: 'Main Lawn',
    category: 'Arts',
    organizer: 'Student Activities Board',
  },
  {
    id: 'event-5',
    title: 'Mindfulness Workshop',
    description: 'Guided stress-management workshop before midterm season.',
    dateISO: '2026-02-20T16:00:00-05:00',
    timeLabel: '4:00 PM - 5:00 PM',
    location: 'Wellness Center Room 108',
    category: 'Wellness',
    organizer: 'Student Wellness Center',
  },
]

export const studentDeadlines: StudentDeadline[] = [
  {
    id: 'deadline-1',
    title: 'Scholarship Renewal Application',
    source: 'Financial Aid Office',
    dueISO: '2026-02-12T23:59:00-05:00',
    priority: 'High',
  },
  {
    id: 'deadline-2',
    title: 'Study Abroad Priority Intent Form',
    source: 'Global Programs Office',
    dueISO: '2026-02-16T17:00:00-05:00',
    priority: 'Medium',
  },
  {
    id: 'deadline-3',
    title: 'Student Organization Funding Request',
    source: 'Campus Life Office',
    dueISO: '2026-02-21T17:00:00-05:00',
    priority: 'Low',
  },
]

export const campusNews: CampusNewsItem[] = [
  {
    id: 'news-1',
    headline: 'Library North Wing Closed Through February 10',
    summary: 'Use the south entrance and second-floor study spaces during maintenance.',
    postedLabel: 'Updated 2 hours ago',
    level: 'Alert',
  },
  {
    id: 'news-2',
    headline: 'Priority Registration Opens February 12 at 8:00 AM',
    summary: 'Early registration windows will be posted in the student portal.',
    postedLabel: 'Posted today',
    level: 'Update',
  },
  {
    id: 'news-3',
    headline: 'Student Health Flu Clinic Extended This Week',
    summary: 'Walk-in slots available weekdays from 10:00 AM to 4:00 PM.',
    postedLabel: 'Posted yesterday',
    level: 'Notice',
  },
]

export const facultyDirectory: FacultyEntry[] = [
  {
    id: 'faculty-1',
    name: 'Dr. Sarah Chen',
    title: 'Associate Professor',
    department: 'Computer Science',
    email: 'schen@university.edu',
    officeLocation: 'Science Hall 312',
    officeHours: 'Mon/Wed 2:00 PM - 4:00 PM',
    bio: 'Focuses on machine learning systems and student mentorship in AI research.',
  },
  {
    id: 'faculty-2',
    name: 'Prof. Michael Torres',
    title: 'Professor',
    department: 'Mathematics',
    email: 'mtorres@university.edu',
    officeLocation: 'Math Building 205',
    officeHours: 'Tue/Thu 1:00 PM - 3:00 PM',
    bio: 'Specializes in applied statistics and quantitative problem solving.',
  },
  {
    id: 'faculty-3',
    name: 'Dr. Aisha Patel',
    title: 'Assistant Professor',
    department: 'Biology',
    email: 'apatel@university.edu',
    officeLocation: 'Life Sciences 118',
    officeHours: 'Mon/Fri 10:00 AM - 12:00 PM',
    bio: 'Leads a lab focused on conservation genetics and field research.',
  },
  {
    id: 'faculty-4',
    name: 'Dr. James Wright',
    title: 'Professor',
    department: 'English',
    email: 'jwright@university.edu',
    officeLocation: 'Humanities 401',
    officeHours: 'Wed 1:00 PM - 4:00 PM',
    bio: 'Teaches writing, rhetoric, and modern literature analysis.',
  },
]

export const campusServices: CampusService[] = [
  {
    id: 'service-1',
    name: 'Main Library',
    status: 'Open',
    hours: '8:00 AM - 11:00 PM',
    location: 'Library Complex',
    directionsUrl: 'https://maps.google.com/?q=Main+Library+Campus',
  },
  {
    id: 'service-2',
    name: 'Computer Lab',
    status: 'Open',
    hours: '7:30 AM - 10:00 PM',
    location: 'Engineering Building 140',
    directionsUrl: 'https://maps.google.com/?q=Engineering+Building+140',
  },
  {
    id: 'service-3',
    name: 'Student Health Center',
    status: 'Limited',
    hours: '10:00 AM - 4:00 PM (walk-in only)',
    location: 'Health Services Center',
    directionsUrl: 'https://maps.google.com/?q=Student+Health+Center',
  },
  {
    id: 'service-4',
    name: 'Financial Aid Office',
    status: 'Closed',
    hours: 'Reopens Monday at 9:00 AM',
    location: 'Administration Hall 102',
    directionsUrl: 'https://maps.google.com/?q=Administration+Hall+102',
  },
]

export const externalPortalLinks: ExternalPortalLink[] = [
  {
    id: 'link-1',
    label: 'Canvas',
    category: 'Learning',
    href: 'https://canvas.instructure.com/',
    description: 'Course materials, assignments, and announcements.',
  },
  {
    id: 'link-2',
    label: 'Outlook Email',
    category: 'Communication',
    href: 'https://outlook.office.com/',
    description: 'University email and calendar communication.',
  },
  {
    id: 'link-3',
    label: 'Financial Aid Portal',
    category: 'Finance',
    href: 'https://www.studentaid.gov/',
    description: 'Aid status, forms, and disbursement updates.',
  },
  {
    id: 'link-4',
    label: 'Library Services',
    category: 'Student Services',
    href: 'https://www.oclc.org/',
    description: 'Catalog search, room booking, and support.',
  },
  {
    id: 'link-5',
    label: 'Campus Recreation',
    category: 'Campus Life',
    href: 'https://www.imleagues.com/',
    description: 'Fitness schedules, intramurals, and facilities.',
  },
  {
    id: 'link-6',
    label: 'Career Services',
    category: 'Student Services',
    href: 'https://joinhandshake.com/',
    description: 'Appointments, career fairs, and employer postings.',
  },
]

export const campusMapPins: CampusMapPin[] = [
  {
    id: 'pin-1',
    label: 'Science Hall 312',
    type: 'Faculty Office',
    address: 'Science Hall 312, University Campus',
    mapQuery: 'Science Hall 312 University Campus',
  },
  {
    id: 'pin-2',
    label: 'Student Union Ballroom',
    type: 'Event Venue',
    address: 'Student Union Ballroom, University Campus',
    mapQuery: 'Student Union Ballroom University Campus',
  },
  {
    id: 'pin-3',
    label: 'Main Library',
    type: 'Resource',
    address: 'Main Library, University Campus',
    mapQuery: 'Main Library University Campus',
  },
  {
    id: 'pin-4',
    label: 'Health Services Center',
    type: 'Resource',
    address: 'Health Services Center, University Campus',
    mapQuery: 'Health Services Center University Campus',
  },
]

export const defaultFavorites: FavoriteItem[] = [
  {
    id: 'fav-1',
    kind: 'event',
    label: 'Career Fair: Technology and Engineering',
    subtitle: 'Student Union Ballroom',
    href: '/events/event-1',
  },
  {
    id: 'fav-2',
    kind: 'faculty',
    label: 'Dr. Sarah Chen',
    subtitle: 'Computer Science | Office hours Mon/Wed',
    href: '/faculty-directory/faculty-1',
  },
  {
    id: 'fav-3',
    kind: 'resource',
    label: 'Canvas',
    subtitle: 'Learning portal',
    href: '/links-directory',
  },
]

export const dashboardModuleIds = [
  'favorites',
  'deadlines',
  'events',
  'news',
  'services',
  'links',
] as const

export type DashboardModuleId = (typeof dashboardModuleIds)[number]

export function getEventById(id: string) {
  return studentEvents.find((event) => event.id === id)
}

export function getFacultyById(id: string) {
  return facultyDirectory.find((entry) => entry.id === id)
}
