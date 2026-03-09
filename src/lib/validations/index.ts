import { z } from 'zod'
import { dashboardModuleIds } from '@/lib/studentData'

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
}).strict()

export const updatePreferencesSchema = z.object({
  officeHourChanges: z.boolean().optional(),
  newEvents: z.boolean().optional(),
  eventReminders: z.boolean().optional(),
  deadlineReminders: z.boolean().optional(),
  emailDigest: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  theme: z.enum(['system', 'light', 'dark', 'university']).optional(),
  buildingAlerts: z.boolean().optional(),
  buildingIds: z.array(z.string()).optional(),
  clubInterestIds: z.array(z.string()).optional(),
  dashboardModules: z.array(z.enum(dashboardModuleIds)).optional(),
})

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
  replyToId: z.string().cuid().optional(),
})

export const reportMessageSchema = z.object({
  reason: z.string().trim().min(5).max(280),
})

export const createChannelSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).optional(),
  type: z.enum(['PUBLIC', 'PRIVATE', 'DIRECT']).default('PUBLIC'),
})

export const eventQuerySchema = z.object({
  category: z
    .enum(['ACADEMIC', 'SOCIAL', 'SPORTS', 'ARTS', 'CAREER', 'CLUBS', 'WELLNESS', 'OTHER'])
    .optional(),
  search: z.string().trim().max(120).optional(),
  upcoming: z.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const createEventSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(2000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM 24-hour format'),
  location: z.string().trim().min(1).max(160),
  category: z.enum(['ACADEMIC', 'SOCIAL', 'SPORTS', 'ARTS', 'CAREER', 'CLUBS', 'WELLNESS', 'OTHER']),
  maxAttendees: z.number().int().min(1).max(10000).optional(),
})

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(2000),
  linkUrl: z.string().trim().url().optional(),
})

export const facultyStatusSchema = z.object({
  status: z.enum(['AVAILABLE', 'LIMITED', 'OUT_OF_OFFICE']),
  note: z.string().trim().max(280).optional(),
})

export const createCalendarEventSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional(),
  start: z.coerce.date(),
  end: z.coerce.date(),
  allDay: z.boolean().default(false),
  type: z.enum(['PERSONAL', 'CAMPUS', 'OFFICE_HOURS', 'DEADLINE']),
  location: z.string().trim().max(120).optional(),
})

export const createDeadlineSchema = z.object({
  title: z.string().trim().min(1).max(120),
  course: z.string().trim().min(1).max(120),
  dueDate: z.coerce.date(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  notes: z.string().trim().max(1000).optional(),
})

export const createOfficeHourSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM 24-hour format'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM 24-hour format'),
  location: z.string().trim().min(1).max(120),
  mode: z.enum(['IN_PERSON', 'VIRTUAL', 'HYBRID']),
  maxQueue: z.number().int().min(1).max(200).default(20),
  meetingLink: z.string().url().optional(),
})

export const joinQueueSchema = z.object({
  topic: z.string().trim().min(1).max(240),
})
