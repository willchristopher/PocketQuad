// User
export interface User {
  id: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: 'student' | 'faculty' | 'admin';
  major?: string;
  department?: string;
  createdAt: Date;
  lastLogin: Date;
  emailVerified: boolean;
}

export interface NotificationPreferences {
  officeHourChanges: boolean;
  newEvents: boolean;
  eventReminders: boolean;
  deadlineReminders: boolean;
  emailDigest: boolean;
  pushEnabled: boolean;
}

export interface UserProfile extends User {
  bio?: string;
  notificationPreferences: NotificationPreferences;
  theme: 'system' | 'light' | 'dark';
}

export interface Notification {
  id: string;
  type: 'officeHour' | 'newEvent' | 'eventCancelled' | 'deadline' | 'announcement';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export interface ChatroomMessage {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  content: string;
  timestamp: Date;
  isOwn: boolean;
  isDeleted: boolean;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  date: string;
  time: string;
  location: string;
  category: string;
  organizer: string;
  interestedCount?: number;
  isInterested?: boolean;
  isPast?: boolean;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  type: 'personal' | 'campus' | 'officeHours' | 'deadline';
  location?: string;
  instructor?: string;
}

export interface Deadline {
  id: string;
  title: string;
  course: string;
  dueDate: Date;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface CampusEvent {
    id: string;
    title: string;
    description: string;
    image?: string;
    date: Date;
    location: string;
    category: 'academic' | 'social' | 'sports' | 'arts' | 'career';
    interestedCount: number;
    isInterested: boolean;
}

export interface OfficeHour {
    id: string;
    dayOfWeek: number; // 0-6
    startTime: string; // "14:00"
    endTime: string;   // "16:00"
    location: string;
}

export interface Faculty {
    id: string;
    name: string;
    title: string;
    department: string;
    email: string;
    phone: string;
    officeLocation: string;
    officeHours: string;
    imageUrl: string;
    avatar?: string;
    bio?: string;
    courses?: string[];
    isFavorited?: boolean;
}

export interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    type: 'personal' | 'campus' | 'officeHours' | 'deadline';
    description?: string;
    location?: string;
    allDay?: boolean;
}

export interface StudySession {
    id: string;
    duration: number; // minutes
    date: Date;
    label?: string;
}

export interface QuickLink {
    id: string;
    label: string;
    href: string;
    icon: string;
    color: string;
}
