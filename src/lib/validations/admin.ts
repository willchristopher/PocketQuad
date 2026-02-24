import { z } from 'zod'
import {
  ADMIN_ACCESS_LEVELS,
  PORTAL_PERMISSIONS,
} from '@/lib/auth/portalPermissions'

const optionalTrimmed = z.string().trim().optional().transform((value) => value || undefined)

export const universityCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain lowercase letters, numbers, and hyphens')
    .optional(),
  domain: optionalTrimmed,
})

export const universityUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain lowercase letters, numbers, and hyphens')
    .optional(),
  domain: optionalTrimmed,
  themeMainColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color like #2563EB').optional().nullable(),
  themeAccentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color like #10B981').optional().nullable(),
})

export const adminFacultyCreateSchema = z.object({
  universityId: z.string().cuid(),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  canPublishCampusAnnouncements: z.boolean().default(false),
  title: z.string().trim().min(2).max(120),
  department: z.string().trim().min(2).max(120),
  officeLocation: z.string().trim().min(1).max(160),
  officeHours: z.string().trim().min(1).max(160),
  phone: optionalTrimmed,
  bio: z.string().trim().max(1000).optional(),
  courses: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
})

export const adminFacultySignupEmailCreateSchema = z.object({
  universityId: z.string().cuid(),
  email: z.string().trim().toLowerCase().email(),
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
})

export const adminFacultyUpdateSchema = z.object({
  universityId: z.string().cuid().optional(),
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  canPublishCampusAnnouncements: z.boolean().optional(),
  title: z.string().trim().min(2).max(120).optional(),
  department: z.string().trim().min(2).max(120).optional(),
  officeLocation: z.string().trim().min(1).max(160).optional(),
  officeHours: z.string().trim().min(1).max(160).optional(),
  phone: optionalTrimmed,
  bio: z.string().trim().max(1000).optional().nullable(),
  courses: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
})

export const campusBuildingCreateSchema = z.object({
  universityId: z.string().cuid(),
  name: z.string().trim().min(2).max(140),
  code: optionalTrimmed,
  type: z.string().trim().min(2).max(80),
  address: z.string().trim().min(2).max(240),
  mapQuery: z.string().trim().min(2).max(240),
  description: z.string().trim().max(2000).optional(),
  categories: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
  services: z.array(z.string().trim().min(1).max(200)).max(50).default([]),
  departments: z.array(z.string().trim().min(1).max(200)).max(50).default([]),
})

export const campusBuildingUpdateSchema = z.object({
  universityId: z.string().cuid().optional(),
  name: z.string().trim().min(2).max(140).optional(),
  code: optionalTrimmed,
  type: z.string().trim().min(2).max(80).optional(),
  address: z.string().trim().min(2).max(240).optional(),
  mapQuery: z.string().trim().min(2).max(240).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  categories: z.array(z.string().trim().min(1).max(120)).max(30).optional(),
  services: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
  departments: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
})

export const buildingImportRequestSchema = z.object({
  universityId: z.string().cuid(),
  csvContent: z.string().trim().min(1),
})

export const campusResourceLinkCreateSchema = z.object({
  universityId: z.string().cuid(),
  label: z.string().trim().min(2).max(120),
  category: z.enum(['LEARNING', 'COMMUNICATION', 'STUDENT_SERVICES', 'FINANCE', 'CAMPUS_LIFE', 'OTHER']),
  href: z.string().url(),
  description: z.string().trim().min(2).max(280),
})

export const campusResourceLinkUpdateSchema = z.object({
  universityId: z.string().cuid().optional(),
  label: z.string().trim().min(2).max(120).optional(),
  category: z.enum(['LEARNING', 'COMMUNICATION', 'STUDENT_SERVICES', 'FINANCE', 'CAMPUS_LIFE', 'OTHER']).optional(),
  href: z.string().url().optional(),
  description: z.string().trim().min(2).max(280).optional(),
})

export const campusServiceCreateSchema = z.object({
  universityId: z.string().cuid(),
  name: z.string().trim().min(2).max(140),
  status: z.enum(['OPEN', 'CLOSED', 'LIMITED']),
  hours: z.string().trim().min(2).max(180),
  location: z.string().trim().min(2).max(180),
  directionsUrl: z.string().url(),
})

export const campusServiceUpdateSchema = z.object({
  universityId: z.string().cuid().optional(),
  name: z.string().trim().min(2).max(140).optional(),
  status: z.enum(['OPEN', 'CLOSED', 'LIMITED']).optional(),
  hours: z.string().trim().min(2).max(180).optional(),
  location: z.string().trim().min(2).max(180).optional(),
  directionsUrl: z.string().url().optional(),
})

export const clubCreateSchema = z.object({
  universityId: z.string().cuid(),
  name: z.string().trim().min(2).max(140),
  category: z.string().trim().min(2).max(100),
  description: z.string().trim().min(2).max(600),
  contactEmail: z.string().trim().toLowerCase().email().optional(),
  websiteUrl: z.string().url().optional(),
  meetingInfo: z.string().trim().max(180).optional(),
})

export const clubUpdateSchema = z.object({
  universityId: z.string().cuid().optional(),
  name: z.string().trim().min(2).max(140).optional(),
  category: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().min(2).max(600).optional(),
  contactEmail: z.string().trim().toLowerCase().email().optional().nullable(),
  websiteUrl: z.string().url().optional().nullable(),
  meetingInfo: z.string().trim().max(180).optional().nullable(),
})

export const adminEventCreateSchema = z.object({
  universityId: z.string().cuid(),
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().min(2).max(2000),
  date: z.coerce.date(),
  time: z.string().trim().min(1).max(80),
  location: z.string().trim().min(2).max(180),
  category: z.enum(['ACADEMIC', 'SOCIAL', 'SPORTS', 'ARTS', 'CAREER', 'CLUBS', 'WELLNESS', 'OTHER']),
  organizer: z.string().trim().min(2).max(120),
  isPublished: z.boolean().default(true),
})

export const adminEventUpdateSchema = z.object({
  universityId: z.string().cuid().optional(),
  title: z.string().trim().min(2).max(140).optional(),
  description: z.string().trim().min(2).max(2000).optional(),
  date: z.coerce.date().optional(),
  time: z.string().trim().min(1).max(80).optional(),
  location: z.string().trim().min(2).max(180).optional(),
  category: z.enum(['ACADEMIC', 'SOCIAL', 'SPORTS', 'ARTS', 'CAREER', 'CLUBS', 'WELLNESS', 'OTHER']).optional(),
  organizer: z.string().trim().min(2).max(120).optional(),
  isPublished: z.boolean().optional(),
})

const portalPermissionSchema = z.enum(PORTAL_PERMISSIONS)
const accessLevelSchema = z.enum(ADMIN_ACCESS_LEVELS)

export const adminPortalAccountCreateSchema = z.object({
  universityId: z.string().cuid(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(['STUDENT', 'FACULTY', 'ADMIN']).optional(),
  accessLevel: accessLevelSchema.default('IT_ADMIN'),
  portalPermissions: z.array(portalPermissionSchema).max(40).optional(),
  managedClubIds: z.array(z.string().cuid()).max(100).optional(),
  password: z.string().min(12).max(120).optional(),
})

export const adminPortalAccountUpdateSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  role: z.enum(['STUDENT', 'FACULTY', 'ADMIN']).optional(),
  accessLevel: accessLevelSchema.optional().nullable(),
  portalPermissions: z.array(portalPermissionSchema).max(40).optional(),
  managedClubIds: z.array(z.string().cuid()).max(100).optional(),
  canPublishCampusAnnouncements: z.boolean().optional(),
})
