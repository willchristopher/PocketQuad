import { z } from 'zod';

/**
 * Announcement scope determines the target audience for the announcement
 */
export const ANNOUNCEMENT_SCOPE = {
  CAMPUS: 'CAMPUS',
  BUILDING: 'BUILDING',
  SERVICE: 'SERVICE',
};

export const announcementScopeEnum = z.enum(['CAMPUS', 'BUILDING', 'SERVICE']);

/**
 * Announcement status tracks the lifecycle of an announcement
 */
export const ANNOUNCEMENT_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  SCHEDULED: 'SCHEDULED',
  EXPIRED: 'EXPIRED',
  ARCHIVED: 'ARCHIVED',
};

export const announcementStatusEnum = z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED', 'EXPIRED', 'ARCHIVED']);

/**
 * Announcement priority level for display ordering
 */
export const ANNOUNCEMENT_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
};

export const announcementPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

/**
 * Validation schema for creating announcements
 */
export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(2000),
  linkUrl: z.string().trim().url().optional(),
  expiresAt: z.coerce.date().optional(),
  scope: announcementScopeEnum.default('CAMPUS'),
  buildingId: z.string().cuid().optional(),
  serviceId: z.string().cuid().optional(),
  priority: announcementPriorityEnum.default('MEDIUM').optional(),
}).superRefine((value, context) => {
  if (value.scope === 'BUILDING' && !value.buildingId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['buildingId'],
      message: 'Choose a building for building announcements',
    });
  }
  if (value.scope !== 'BUILDING' && value.buildingId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['buildingId'],
      message: 'Building target is only valid for building announcements',
    });
  }
  if (value.scope === 'SERVICE' && !value.serviceId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['serviceId'],
      message: 'Choose a service for service announcements',
    });
  }
  if (value.scope !== 'SERVICE' && value.serviceId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['serviceId'],
      message: 'Service target is only valid for service announcements',
    });
  }
  if (value.expiresAt && value.expiresAt <= new Date()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['expiresAt'],
      message: 'Expiration must be in the future',
    });
  }
});

/**
 * Validation schema for updating announcements
 */
export const updateAnnouncementSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  message: z.string().trim().min(1).max(2000).optional(),
  linkUrl: z.string().trim().url().optional().or(z.literal('')),
  expiresAt: z.coerce.date().nullable().optional(),
  priority: announcementPriorityEnum.optional(),
  status: announcementStatusEnum.optional(),
}).superRefine((value, context) => {
  if (value.expiresAt && value.expiresAt <= new Date()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['expiresAt'],
      message: 'Expiration must be in the future',
    });
  }
});

/**
 * Validation schema for scheduling announcements
 */
export const scheduleAnnouncementSchema = z.object({
  announcementId: z.string().cuid(),
  scheduledFor: z.coerce.date().refine(
    (date) => date > new Date(),
    'Scheduled time must be in the future'
  ),
});

/**
 * Validation schema for filtering/querying announcements
 */
export const announcementQuerySchema = z.object({
  scope: announcementScopeEnum.optional(),
  status: announcementStatusEnum.optional(),
  priority: announcementPriorityEnum.optional(),
  buildingId: z.string().cuid().optional(),
  serviceId: z.string().cuid().optional(),
  search: z.string().trim().max(120).optional(),
  includeExpired: z.boolean().default(false).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();
