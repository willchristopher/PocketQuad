import { z } from 'zod';
import { dashboardModuleIds } from '@/lib/studentData';
export {
  ANNOUNCEMENT_SCOPE,
  ANNOUNCEMENT_STATUS,
  ANNOUNCEMENT_PRIORITY,
  announcementScopeEnum,
  announcementStatusEnum,
  announcementPriorityEnum,
  createAnnouncementSchema,
  updateAnnouncementSchema,
  scheduleAnnouncementSchema,
  announcementQuerySchema,
} from '@/lib/validations/announcements';
export const updateProfileSchema = z.object({
    displayName: z.string().trim().min(1).max(80),
}).strict();
export const updateFacultyProfileSchema = z.object({
    displayName: z.string().trim().min(1).max(80),
    title: z.string().trim().min(2).max(80),
    department: z.string().trim().min(2).max(80),
    officeLocation: z.string().trim().min(2).max(120),
    bio: z.string().trim().max(600).optional().or(z.literal('')),
    phone: z.string().trim().max(40).optional().or(z.literal('')),
    tags: z.array(z.string().trim().min(1).max(40)).max(12),
}).strict();
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
    resourceLinkIds: z.array(z.string()).optional(),
    clubInterestIds: z.array(z.string()).optional(),
    dashboardModules: z.array(z.enum(dashboardModuleIds)).optional(),
});
const buildingHoursTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM 24-hour format');
const buildingHoursSlotSchema = z.object({
    openTime: buildingHoursTimeSchema,
    closeTime: buildingHoursTimeSchema,
}).superRefine((value, context) => {
    if (value.openTime >= value.closeTime) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['closeTime'],
            message: 'Closing time must be later than opening time',
        });
    }
});
const buildingHoursDaySchema = z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    kind: z.enum(['closed', 'open', 'all_day', 'text']),
    label: z.string().trim().max(120).optional().nullable(),
    slots: z.array(buildingHoursSlotSchema).max(4).default([]),
}).superRefine((value, context) => {
    if (value.kind === 'open' && value.slots.length === 0) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['slots'],
            message: 'Open days need at least one time slot',
        });
    }
    if (value.kind !== 'open' && value.slots.length > 0) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['slots'],
            message: 'Only open days can include time slots',
        });
    }
});
const buildingHoursScheduleSchema = z.object({
    timezone: z.string().trim().min(1).max(64).default('America/Chicago'),
    days: z.array(buildingHoursDaySchema).length(7),
}).strict();
export const sendMessageSchema = z.object({
    content: z.string().trim().min(1).max(4000),
    replyToId: z.string().cuid().optional(),
});
export const reportMessageSchema = z.object({
    reason: z.string().trim().min(5).max(280),
});
export const createChannelSchema = z.object({
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(240).optional(),
    type: z.enum(['PUBLIC', 'PRIVATE', 'DIRECT']).default('PUBLIC'),
});
export const eventQuerySchema = z.object({
    category: z
        .enum(['ACADEMIC', 'SOCIAL', 'SPORTS', 'ARTS', 'CAREER', 'CLUBS', 'WELLNESS', 'OTHER'])
        .optional(),
    search: z.string().trim().max(120).optional(),
    upcoming: z.boolean().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const createEventSchema = z.object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(2000),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM 24-hour format'),
    location: z.string().trim().min(1).max(160),
    category: z.enum(['ACADEMIC', 'SOCIAL', 'SPORTS', 'ARTS', 'CAREER', 'CLUBS', 'WELLNESS', 'OTHER']),
    audience: z.enum(['ORGANIZATION', 'ALL_CAMPUS', 'DEADLINE']).default('ALL_CAMPUS'),
    maxAttendees: z.number().int().min(1).max(10000).optional(),
    buildingId: z.string().cuid().optional(),
});
export const updateFacultyEventSchema = z.object({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().min(1).max(2000).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format').optional(),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM 24-hour format').optional(),
    location: z.string().trim().min(1).max(160).optional(),
    category: z.enum(['ACADEMIC', 'SOCIAL', 'SPORTS', 'ARTS', 'CAREER', 'CLUBS', 'WELLNESS', 'OTHER']).optional(),
    audience: z.enum(['ORGANIZATION', 'ALL_CAMPUS', 'DEADLINE']).optional(),
    maxAttendees: z.number().int().min(1).max(10000).nullable().optional(),
    buildingId: z.string().cuid().nullable().optional(),
    isCancelled: z.boolean().optional(),
}).strict();

export const facultyBuildingManagerSchema = z.object({
    buildingId: z.string().cuid(),
});
export const updateManagedBuildingSchema = z.object({
    operatingHours: z.string().trim().max(180).optional().nullable(),
    operatingHoursSchedule: buildingHoursScheduleSchema.optional().nullable(),
    operationalStatus: z.enum(['OPEN', 'CLOSED', 'LIMITED']),
    operationalNote: z.string().trim().max(280).optional().nullable(),
    accessibilityNotes: z.string().trim().max(1500).optional().nullable(),
}).strict();
export const facultyStatusSchema = z.object({
    status: z.enum(['AVAILABLE', 'LIMITED', 'AWAY']),
    note: z.string().trim().max(280).optional(),
});
export const createCalendarEventSchema = z.object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000).optional(),
    start: z.coerce.date(),
    end: z.coerce.date(),
    allDay: z.boolean().default(false),
    type: z.enum(['PERSONAL', 'CAMPUS', 'OFFICE_HOURS', 'DEADLINE']),
    campusEventId: z.string().cuid().optional(),
    location: z.string().trim().max(120).optional(),
});
export const createDeadlineSchema = z.object({
    title: z.string().trim().min(1).max(120),
    course: z.string().trim().min(1).max(120),
    dueDate: z.coerce.date(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
    notes: z.string().trim().max(1000).optional(),
});
export const createOfficeHourSchema = z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM 24-hour format'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM 24-hour format'),
    location: z.string().trim().min(1).max(120),
    mode: z.enum(['IN_PERSON', 'VIRTUAL', 'HYBRID']),
    maxQueue: z.number().int().min(1).max(200).default(20),
    meetingLink: z.string().url().optional(),
});
export const joinQueueSchema = z.object({
    topic: z.string().trim().min(1).max(240),
});
