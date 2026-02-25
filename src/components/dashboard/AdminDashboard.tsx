'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  GraduationCap,
  KeyRound,
  Landmark,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  School,
  ShieldUser,
  Tag,
  Trash2,
  Upload,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ApiClientError, apiRequest } from '@/lib/api/client'
import { useAuth } from '@/lib/auth/context'
import {
  getAllowedAdminTabs,
  hasPortalPermission,
  type AdminAccessLevel,
  type PortalPermission,
} from '@/lib/auth/portalPermissions'
import { BUILDING_IMPORT_REQUIRED_HEADERS, validateBuildingImportHeaders } from '@/lib/buildingImport'
import { parseCsvText } from '@/lib/csv'
import { cn } from '@/lib/utils'

type TabValue =
  | 'overview'
  | 'universities'
  | 'faculty'
  | 'buildings'
  | 'building-import'
  | 'links'
  | 'services'
  | 'clubs'
  | 'events'
  | 'it-accounts'
  | 'users'

const tabItems: Array<{ value: TabValue; label: string; icon: React.ElementType }> = [
  { value: 'overview', label: 'Overview', icon: Landmark },
  { value: 'universities', label: 'Universities', icon: School },
  { value: 'faculty', label: 'Faculty', icon: Users },
  { value: 'buildings', label: 'Buildings', icon: Building2 },
  { value: 'building-import', label: 'Building Import', icon: Upload },
  { value: 'links', label: 'Resource Links', icon: ExternalLink },
  { value: 'services', label: 'Services', icon: Wrench },
  { value: 'clubs', label: 'Clubs', icon: Users },
  { value: 'events', label: 'Events', icon: CalendarDays },
  { value: 'it-accounts', label: 'IT Accounts', icon: ShieldUser },
  { value: 'users', label: 'Users', icon: Users },
]

type University = {
  id: string
  name: string
  slug: string
  domain: string | null
  themeMainColor: string | null
  themeAccentColor: string | null
  _count?: {
    users: number
    faculties: number
    events: number
    buildings: number
    resourceLinks: number
    services: number
    clubs: number
  }
}

type FacultyRecord = {
  id: string
  universityId: string | null
  name: string
  email: string
  title: string
  department: string
  officeLocation: string
  officeHours: string
  phone: string | null
  bio: string | null
  courses: string[]
  tags: string[]
  user?: {
    id: string
    email: string
    role: 'STUDENT' | 'FACULTY' | 'ADMIN'
    canPublishCampusAnnouncements: boolean
    managesAllClubs: boolean
    facultyRoleTags: string[]
    managedBuildings: Array<{ buildingId: string; building: { id: string; name: string } }>
    managedClubs: Array<{ clubId: string; club: { id: string; name: string } }>
  } | null
  university?: { id: string; name: string; slug: string } | null
}

type FacultySignupEmailRecord = {
  id: string
  universityId: string | null
  email: string
  firstName: string
  lastName: string
  displayName: string
  emailVerified: boolean
  createdAt: string
  canPublishCampusAnnouncements: boolean
  managesAllClubs: boolean
  facultyRoleTags: string[]
  managedBuildings: Array<{ buildingId: string; building: { id: string; name: string } }>
  managedClubs: Array<{ clubId: string; club: { id: string; name: string } }>
  university?: { id: string; name: string; slug: string } | null
}

type BuildingRecord = {
  id: string
  universityId: string
  name: string
  code: string | null
  type: string
  address: string
  mapQuery: string
  purpose: string | null
  description: string | null
  operatingHours: string | null
  operationalStatus: 'OPEN' | 'CLOSED' | 'LIMITED'
  operationalNote: string | null
  categories: string[]
  services: string[]
  departments: string[]
  university?: { id: string; name: string; slug: string } | null
}

type BuildingImportResult = {
  createdCount: number
  updatedCount: number
  totalRows: number
  requiredColumns: readonly string[]
}

type LinkCategory = 'LEARNING' | 'COMMUNICATION' | 'STUDENT_SERVICES' | 'FINANCE' | 'CAMPUS_LIFE' | 'OTHER'

type ResourceLinkRecord = {
  id: string
  universityId: string
  label: string
  category: LinkCategory
  href: string
  description: string
  university?: { id: string; name: string; slug: string } | null
}

type ServiceStatus = 'OPEN' | 'CLOSED' | 'LIMITED'

type ServiceRecord = {
  id: string
  universityId: string
  name: string
  status: ServiceStatus
  hours: string
  location: string
  directionsUrl: string
  university?: { id: string; name: string; slug: string } | null
}

type ClubRecord = {
  id: string
  universityId: string
  name: string
  category: string
  description: string
  contactEmail: string | null
  websiteUrl: string | null
  meetingInfo: string | null
  university?: { id: string; name: string; slug: string } | null
}

type EventRecord = {
  id: string
  universityId: string | null
  title: string
  description: string
  date: string
  time: string
  location: string
  category: 'ACADEMIC' | 'SOCIAL' | 'SPORTS' | 'ARTS' | 'CAREER' | 'CLUBS' | 'WELLNESS' | 'OTHER'
  organizer: string
  isPublished: boolean
  university?: { id: string; name: string; slug: string } | null
}

type ManagedClubAssignment = {
  clubId: string
  club: {
    id: string
    name: string
    universityId: string
  }
}

type PortalAccountRecord = {
  id: string
  universityId: string | null
  email: string
  firstName: string
  lastName: string
  displayName: string
  role: 'STUDENT' | 'FACULTY' | 'ADMIN'
  adminAccessLevel: AdminAccessLevel | null
  portalPermissions: PortalPermission[]
  canPublishCampusAnnouncements: boolean
  managedClubs: ManagedClubAssignment[]
  university?: { id: string; name: string; slug: string } | null
}

type PortalAccountCreateResult = {
  account: PortalAccountRecord
  temporaryPassword: string | null
}

type UserRecord = {
  id: string
  universityId?: string | null
  email: string
  firstName: string
  lastName: string
  displayName: string
  role: 'STUDENT' | 'FACULTY' | 'ADMIN'
  adminAccessLevel: AdminAccessLevel | null
  major: string | null
  department: string | null
  year: string | null
  emailVerified: boolean
  onboardingComplete: boolean
  createdAt: string
  lastLogin: string | null
  university?: { id: string; name: string; slug: string } | null
}

const resourceCategories: LinkCategory[] = [
  'LEARNING',
  'COMMUNICATION',
  'STUDENT_SERVICES',
  'FINANCE',
  'CAMPUS_LIFE',
  'OTHER',
]

const serviceStatuses: ServiceStatus[] = ['OPEN', 'CLOSED', 'LIMITED']
const eventCategories: EventRecord['category'][] = [
  'ACADEMIC',
  'SOCIAL',
  'SPORTS',
  'ARTS',
  'CAREER',
  'CLUBS',
  'WELLNESS',
  'OTHER',
]

const FACULTY_ROLE_TAG_OPTIONS = [
  'Club Advisor',
  'Academic Advisor',
  'Student Government Advisor',
  'Residence Life',
  'Athletics Advisor',
  'Department Chair',
  'Program Director',
] as const

const STATUS_CONFIG: Record<'OPEN' | 'CLOSED' | 'LIMITED', { label: string; className: string; icon: React.ReactNode }> = {
  OPEN: { label: 'Open', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30', icon: <CheckCircle2 className="h-2.5 w-2.5" /> },
  LIMITED: { label: 'Limited', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30', icon: <AlertCircle className="h-2.5 w-2.5" /> },
  CLOSED: { label: 'Closed', className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30', icon: <X className="h-2.5 w-2.5" /> },
}

const accessLevelOptions: AdminAccessLevel[] = [
  'OWNER',
  'IT_ADMIN',
  'CLUB_PRESIDENT',
  'CONTENT_MANAGER',
]

const portalPermissionOptions: PortalPermission[] = [
  'ADMIN_TAB_OVERVIEW',
  'ADMIN_TAB_UNIVERSITIES',
  'ADMIN_TAB_FACULTY',
  'ADMIN_TAB_BUILDINGS',
  'ADMIN_TAB_BUILDING_IMPORT',
  'ADMIN_TAB_LINKS',
  'ADMIN_TAB_SERVICES',
  'ADMIN_TAB_CLUBS',
  'ADMIN_TAB_EVENTS',
  'ADMIN_TAB_IT_ACCOUNTS',
  'ADMIN_TAB_USERS',
  'CAN_PUBLISH_ANNOUNCEMENTS',
  'CAN_MANAGE_CLUB_PROFILE',
  'CAN_MANAGE_CLUB_CONTACT',
]

const portalPermissionLabels: Record<PortalPermission, string> = {
  ADMIN_PORTAL_ACCESS: 'Portal Access',
  ADMIN_TAB_OVERVIEW: 'Tab: Overview',
  ADMIN_TAB_UNIVERSITIES: 'Tab: Universities',
  ADMIN_TAB_FACULTY: 'Tab: Faculty',
  ADMIN_TAB_BUILDINGS: 'Tab: Buildings',
  ADMIN_TAB_BUILDING_IMPORT: 'Tab: Building Import',
  ADMIN_TAB_LINKS: 'Tab: Resource Links',
  ADMIN_TAB_SERVICES: 'Tab: Services',
  ADMIN_TAB_CLUBS: 'Tab: Clubs',
  ADMIN_TAB_EVENTS: 'Tab: Events',
  ADMIN_TAB_IT_ACCOUNTS: 'Tab: IT Accounts',
  ADMIN_TAB_USERS: 'Tab: Users',
  CAN_PUBLISH_ANNOUNCEMENTS: 'Publish Announcements',
  CAN_MANAGE_CLUB_PROFILE: 'Manage Club Profile',
  CAN_MANAGE_CLUB_CONTACT: 'Manage Club Contact',
}

function asErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiClientError) {
    return error.message
  }

  return fallback
}

function formatDateTimeInput(value: string) {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function splitCsv(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function AdminDashboard() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { profile } = useAuth()

  const allowedTabs = React.useMemo(() => {
    if (!profile) return tabItems.map((item) => item.value)
    const resolved = getAllowedAdminTabs(profile)
    return resolved.length > 0 ? resolved : ['overview']
  }, [profile])

  const visibleTabs = React.useMemo(
    () => tabItems.filter((item) => allowedTabs.includes(item.value)),
    [allowedTabs],
  )

  const requestedTab = searchParams.get('tab') as TabValue | null
  const requestedUniversityId = searchParams.get('universityId') ?? ''
  const fallbackTab = visibleTabs[0]?.value ?? 'overview'
  const currentTab =
    requestedTab && visibleTabs.some((item) => item.value === requestedTab)
      ? requestedTab
      : fallbackTab
  const [activeTab, setActiveTab] = React.useState<TabValue>(currentTab)

  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  const [universities, setUniversities] = React.useState<University[]>([])
  const [faculty, setFaculty] = React.useState<FacultyRecord[]>([])
  const [facultySignupEmails, setFacultySignupEmails] = React.useState<FacultySignupEmailRecord[]>([])
  const [buildings, setBuildings] = React.useState<BuildingRecord[]>([])
  const [resourceLinks, setResourceLinks] = React.useState<ResourceLinkRecord[]>([])
  const [services, setServices] = React.useState<ServiceRecord[]>([])
  const [clubs, setClubs] = React.useState<ClubRecord[]>([])
  const [events, setEvents] = React.useState<EventRecord[]>([])
  const [portalAccounts, setPortalAccounts] = React.useState<PortalAccountRecord[]>([])
  const [temporaryAccountPassword, setTemporaryAccountPassword] = React.useState<string | null>(null)
  const [allUsers, setAllUsers] = React.useState<UserRecord[]>([])
  const [userSearchQuery, setUserSearchQuery] = React.useState('')
  const [userRoleFilter, setUserRoleFilter] = React.useState<string>('')

  // UI expansion state
  const [expandedFacultyId, setExpandedFacultyId] = React.useState<string | null>(null)
  const [expandedSignupEmailId, setExpandedSignupEmailId] = React.useState<string | null>(null)
  const [expandedBuildingId, setExpandedBuildingId] = React.useState<string | null>(null)
  const [showBuildingImport, setShowBuildingImport] = React.useState(false)

  const [selectedUniversityId, setSelectedUniversityId] = React.useState(requestedUniversityId)
  const [universitySelectionDraft, setUniversitySelectionDraft] = React.useState(requestedUniversityId)
  const [buildingImportUniversityId, setBuildingImportUniversityId] = React.useState('')
  const [buildingImportCsvContent, setBuildingImportCsvContent] = React.useState('')
  const [buildingImportFileName, setBuildingImportFileName] = React.useState('')
  const [buildingImportRowCount, setBuildingImportRowCount] = React.useState(0)
  const [buildingImportError, setBuildingImportError] = React.useState<string | null>(null)
  const [buildingImportValidation, setBuildingImportValidation] = React.useState<ReturnType<
    typeof validateBuildingImportHeaders
  > | null>(null)

  const [newFaculty, setNewFaculty] = React.useState({
    universityId: '',
    name: '',
    email: '',
    canPublishCampusAnnouncements: false,
    title: '',
    department: '',
    officeLocation: '',
    officeHours: '',
    courses: '',
    tags: '',
  })
  const [newFacultySignupEmail, setNewFacultySignupEmail] = React.useState({
    universityId: '',
    email: '',
    firstName: '',
    lastName: '',
    canPublishCampusAnnouncements: false,
    managesAllClubs: false,
    facultyRoleTags: [] as string[],
    managedBuildingIds: [] as string[],
    managedClubIds: [] as string[],
  })
  const [newBuilding, setNewBuilding] = React.useState({
    universityId: '',
    name: '',
    code: '',
    type: '',
    address: '',
    mapQuery: '',
    purpose: '',
    operatingHours: '',
    operationalStatus: 'OPEN' as 'OPEN' | 'CLOSED' | 'LIMITED',
    operationalNote: '',
    description: '',
  })
  const [newLink, setNewLink] = React.useState({
    universityId: '',
    label: '',
    category: 'LEARNING' as LinkCategory,
    href: '',
    description: '',
  })
  const [newService, setNewService] = React.useState({
    universityId: '',
    name: '',
    status: 'OPEN' as ServiceStatus,
    hours: '',
    location: '',
    directionsUrl: '',
  })
  const [newClub, setNewClub] = React.useState({
    universityId: '',
    name: '',
    category: '',
    description: '',
    contactEmail: '',
    websiteUrl: '',
    meetingInfo: '',
  })
  const [newEvent, setNewEvent] = React.useState({
    universityId: '',
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    category: 'ACADEMIC' as EventRecord['category'],
    organizer: '',
    isPublished: true,
  })
  const [newPortalAccount, setNewPortalAccount] = React.useState({
    universityId: '',
    firstName: '',
    lastName: '',
    email: '',
    role: 'ADMIN' as 'STUDENT' | 'FACULTY' | 'ADMIN',
    accessLevel: 'IT_ADMIN' as AdminAccessLevel,
    portalPermissions: ['ADMIN_TAB_OVERVIEW', 'ADMIN_TAB_FACULTY', 'ADMIN_TAB_BUILDINGS'] as PortalPermission[],
    managedClubIds: [] as string[],
    password: '',
  })

  const canManageUniversities = !profile || hasPortalPermission(profile, 'ADMIN_TAB_UNIVERSITIES')
  const canManageFaculty = !profile || hasPortalPermission(profile, 'ADMIN_TAB_FACULTY')
  const canManageBuildings = !profile || hasPortalPermission(profile, 'ADMIN_TAB_BUILDINGS')
  const canManageLinks = !profile || hasPortalPermission(profile, 'ADMIN_TAB_LINKS')
  const canManageServices = !profile || hasPortalPermission(profile, 'ADMIN_TAB_SERVICES')
  const canManageClubs = !profile || hasPortalPermission(profile, 'ADMIN_TAB_CLUBS')
  const canManageEvents = !profile || hasPortalPermission(profile, 'ADMIN_TAB_EVENTS')
  const canManageAccounts = !profile || hasPortalPermission(profile, 'ADMIN_TAB_IT_ACCOUNTS')
  const canManageUsers = !profile || hasPortalPermission(profile, 'ADMIN_TAB_USERS')

  const fallbackUniversityFromProfile = React.useMemo<University[]>(() => {
    if (!profile?.university) return []

    return [
      {
        id: profile.university.id,
        name: profile.university.name,
        slug: profile.university.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        domain: profile.university.domain ?? null,
        themeMainColor: null,
        themeAccentColor: null,
      },
    ]
  }, [profile])

  const loadData = React.useCallback(async () => {
    setLoading(true)

    try {
      const nextUniversitiesRaw = canManageUniversities
        ? await apiRequest<University[]>('/api/admin/universities')
        : fallbackUniversityFromProfile

      const nextUniversities =
        nextUniversitiesRaw.length > 0 ? nextUniversitiesRaw : fallbackUniversityFromProfile

      setUniversities(nextUniversities)

      const hasValidSelectedUniversity =
        selectedUniversityId.length > 0 &&
        nextUniversities.some((university) => university.id === selectedUniversityId)

      if (!hasValidSelectedUniversity) {
        setFaculty([])
        setFacultySignupEmails([])
        setBuildings([])
        setResourceLinks([])
        setServices([])
        setClubs([])
        setEvents([])
        setPortalAccounts([])
        setAllUsers([])
        return
      }

      const universityQuery = `?universityId=${encodeURIComponent(selectedUniversityId)}`
      const [
        nextFaculty,
        nextFacultySignupEmails,
        nextBuildings,
        nextLinks,
        nextServices,
        nextClubs,
        nextEvents,
        nextAccounts,
        nextUsers,
      ] = await Promise.all([
        canManageFaculty
          ? apiRequest<FacultyRecord[]>(`/api/admin/faculty${universityQuery}`)
          : Promise.resolve([]),
        canManageFaculty
          ? apiRequest<FacultySignupEmailRecord[]>(
              `/api/admin/faculty/signup-emails${universityQuery}`,
            )
          : Promise.resolve([]),
        canManageBuildings
          ? apiRequest<BuildingRecord[]>(`/api/admin/buildings${universityQuery}`)
          : Promise.resolve([]),
        canManageLinks
          ? apiRequest<ResourceLinkRecord[]>(`/api/admin/resource-links${universityQuery}`)
          : Promise.resolve([]),
        canManageServices
          ? apiRequest<ServiceRecord[]>(`/api/admin/services${universityQuery}`)
          : Promise.resolve([]),
        canManageClubs || canManageAccounts
          ? apiRequest<ClubRecord[]>(`/api/admin/clubs${universityQuery}`)
          : Promise.resolve([]),
        canManageEvents
          ? apiRequest<EventRecord[]>(`/api/admin/events${universityQuery}`)
          : Promise.resolve([]),
        canManageAccounts
          ? apiRequest<PortalAccountRecord[]>(`/api/admin/accounts${universityQuery}`)
          : Promise.resolve([]),
        canManageUsers
          ? apiRequest<UserRecord[]>(`/api/admin/users${universityQuery}`)
          : Promise.resolve([]),
      ])

      setFaculty(nextFaculty)
      setFacultySignupEmails(nextFacultySignupEmails)
      setBuildings(nextBuildings)
      setResourceLinks(nextLinks)
      setServices(nextServices)
      setClubs(nextClubs)
      setEvents(nextEvents)
      setPortalAccounts(nextAccounts)
      setAllUsers(nextUsers)
    } catch (error) {
      toast.error(asErrorMessage(error, 'Unable to load admin data'))
    } finally {
      setLoading(false)
    }
  }, [
    canManageAccounts,
    canManageBuildings,
    canManageClubs,
    canManageEvents,
    canManageFaculty,
    canManageLinks,
    canManageServices,
    canManageUniversities,
    canManageUsers,
    fallbackUniversityFromProfile,
    selectedUniversityId,
  ])

  React.useEffect(() => {
    setSelectedUniversityId(requestedUniversityId)
    setUniversitySelectionDraft(requestedUniversityId)
  }, [requestedUniversityId])

  React.useEffect(() => {
    void loadData()
  }, [loadData])

  React.useEffect(() => {
    setActiveTab(currentTab)
    if (requestedTab !== currentTab) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', currentTab)
      router.replace(`/admin?${params.toString()}`, { scroll: false })
    }
  }, [currentTab, requestedTab, router, searchParams])

  React.useEffect(() => {
    if (!selectedUniversityId) return
    if (universities.length === 0) return
    if (universities.some((university) => university.id === selectedUniversityId)) return

    const params = new URLSearchParams(searchParams.toString())
    params.delete('universityId')
    router.replace(`/admin?${params.toString()}`, { scroll: false })
  }, [router, searchParams, selectedUniversityId, universities])

  React.useEffect(() => {
    if (!selectedUniversityId) return

    setNewFaculty((current) => ({ ...current, universityId: selectedUniversityId }))
    setNewFacultySignupEmail((current) => ({
      ...current,
      universityId: selectedUniversityId,
      managedBuildingIds: [],
      managedClubIds: [],
    }))
    setNewBuilding((current) => ({ ...current, universityId: selectedUniversityId }))
    setNewLink((current) => ({ ...current, universityId: selectedUniversityId }))
    setNewService((current) => ({ ...current, universityId: selectedUniversityId }))
    setNewClub((current) => ({ ...current, universityId: selectedUniversityId }))
    setNewEvent((current) => ({ ...current, universityId: selectedUniversityId }))
    setNewPortalAccount((current) => ({ ...current, universityId: selectedUniversityId }))
    setBuildingImportUniversityId(selectedUniversityId)
  }, [selectedUniversityId])

  const applyUniversitySelection = React.useCallback(
    (universityId: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', currentTab)
      if (universityId) {
        params.set('universityId', universityId)
      } else {
        params.delete('universityId')
      }
      router.replace(`/admin?${params.toString()}`, { scroll: false })
    },
    [currentTab, router, searchParams],
  )

  const handleTabChange = (nextTab: string) => {
    // Redirect removed tabs to their new home or overview
    if (nextTab === 'universities') return
    if (nextTab === 'building-import') {
      setShowBuildingImport(true)
      handleTabChange('buildings')
      return
    }
    const normalized = nextTab as TabValue
    if (!visibleTabs.some((item) => item.value === normalized)) return
    setActiveTab(normalized)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', normalized)
    router.replace(`/admin?${params.toString()}`, { scroll: false })
  }

  const withinSelectedUniversity = <T extends { universityId: string | null | undefined }>(records: T[]) => {
    if (!selectedUniversityId) return []
    return records.filter((record) => record.universityId === selectedUniversityId)
  }

  const runMutation = async <T,>(
    action: () => Promise<T>,
    successMessage: string | ((result: T) => string),
  ) => {
    setSaving(true)

    try {
      const result = await action()
      toast.success(typeof successMessage === 'function' ? successMessage(result) : successMessage)
      await loadData()
      return result
    } catch (error) {
      toast.error(asErrorMessage(error, 'Request failed'))
      return undefined
    } finally {
      setSaving(false)
    }
  }

  const handleBuildingImportFileSelected = React.useCallback(async (file: File | null) => {
    if (!file) {
      setBuildingImportCsvContent('')
      setBuildingImportFileName('')
      setBuildingImportRowCount(0)
      setBuildingImportError(null)
      setBuildingImportValidation(null)
      return
    }

    try {
      const content = await file.text()
      const rows = parseCsvText(content)

      if (rows.length === 0) {
        setBuildingImportError('CSV file is empty')
        setBuildingImportValidation(null)
        setBuildingImportCsvContent('')
        setBuildingImportRowCount(0)
        setBuildingImportFileName(file.name)
        return
      }

      const headers = rows[0] ?? []
      const validation = validateBuildingImportHeaders(headers)
      const rowCount = rows.slice(1).filter((row) => row.some((cell) => cell.trim().length > 0)).length

      setBuildingImportCsvContent(content)
      setBuildingImportFileName(file.name)
      setBuildingImportRowCount(rowCount)
      setBuildingImportValidation(validation)
      setBuildingImportError(null)
    } catch {
      setBuildingImportError('Unable to read the CSV file')
      setBuildingImportValidation(null)
      setBuildingImportCsvContent('')
      setBuildingImportRowCount(0)
      setBuildingImportFileName(file.name)
    }
  }, [])

  const togglePermissionInDraftAccount = (permission: PortalPermission) => {
    setNewPortalAccount((current) => {
      const hasPermission = current.portalPermissions.includes(permission)
      const nextPermissions = hasPermission
        ? current.portalPermissions.filter((item) => item !== permission)
        : [...current.portalPermissions, permission]

      return {
        ...current,
        portalPermissions: nextPermissions,
      }
    })
  }

  const togglePermissionForAccount = (accountId: string, permission: PortalPermission) => {
    setPortalAccounts((current) =>
      current.map((account) => {
        if (account.id !== accountId) return account
        const hasPermission = account.portalPermissions.includes(permission)
        return {
          ...account,
          portalPermissions: hasPermission
            ? account.portalPermissions.filter((item) => item !== permission)
            : [...account.portalPermissions, permission],
        }
      }),
    )
  }

  const toggleManagedClubInDraftAccount = (clubId: string) => {
    setNewPortalAccount((current) => {
      const selected = current.managedClubIds.includes(clubId)
      return {
        ...current,
        managedClubIds: selected
          ? current.managedClubIds.filter((item) => item !== clubId)
          : [...current.managedClubIds, clubId],
      }
    })
  }

  const toggleManagedClubForAccount = (accountId: string, clubId: string) => {
    setPortalAccounts((current) =>
      current.map((account) => {
        if (account.id !== accountId) return account
        const alreadyManaged = account.managedClubs.some((item) => item.clubId === clubId)
        const nextManagedClubs = alreadyManaged
          ? account.managedClubs.filter((item) => item.clubId !== clubId)
          : [
              ...account.managedClubs,
              {
                clubId,
                club: {
                  id: clubId,
                  name: clubs.find((club) => club.id === clubId)?.name ?? 'Unknown Club',
                  universityId: clubs.find((club) => club.id === clubId)?.universityId ?? '',
                },
              },
            ]

        return {
          ...account,
          managedClubs: nextManagedClubs,
        }
      }),
    )
  }

  const selectedUniversity =
    universities.find((university) => university.id === selectedUniversityId) ?? null
  const scopedUniversities = selectedUniversity ? [selectedUniversity] : []

  const universityOptions = universities.map((university) => (
    <option key={university.id} value={university.id}>
      {university.name}
    </option>
  ))
  const scopedUniversityOptions = scopedUniversities.map((university) => (
    <option key={university.id} value={university.id}>
      {university.name}
    </option>
  ))
  const requiredBuildingHeaders = BUILDING_IMPORT_REQUIRED_HEADERS.join(', ')

  return (
    <div className="space-y-4 animate-in-up">
      {selectedUniversity ? (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">

        <TabsContent value="overview" className="mt-0 space-y-4">
          {/* University Info */}
          <Card className="rounded-2xl border-border/60">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active University</p>
                  <h2 className="mt-1 text-2xl font-display font-bold">{selectedUniversity.name}</h2>
                  {selectedUniversity.domain && (
                    <p className="text-sm text-muted-foreground mt-0.5">@{selectedUniversity.domain}</p>
                  )}
                </div>
                {(selectedUniversity.themeMainColor || selectedUniversity.themeAccentColor) && (
                  <div className="flex items-center gap-3">
                    {[
                      { label: 'Primary', color: selectedUniversity.themeMainColor },
                      { label: 'Accent', color: selectedUniversity.themeAccentColor },
                    ].filter((c) => c.color).map((c) => (
                      <div key={c.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <div style={{ backgroundColor: c.color! }} className="h-5 w-5 rounded-full border border-border/60 shadow-sm" />
                        <span className="font-mono">{c.color}</span>
                        <span className="text-muted-foreground/60">({c.label})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stats grid — click any to navigate */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {([
              { label: 'Faculty', value: faculty.length, icon: GraduationCap, tab: 'faculty' as TabValue },
              { label: 'Buildings', value: buildings.length, icon: Building2, tab: 'buildings' as TabValue },
              { label: 'Clubs', value: clubs.length, icon: Landmark, tab: 'clubs' as TabValue },
              { label: 'Events', value: events.length, icon: CalendarDays, tab: 'events' as TabValue },
              { label: 'Links', value: resourceLinks.length, icon: ExternalLink, tab: 'links' as TabValue },
              { label: 'Services', value: services.length, icon: Wrench, tab: 'services' as TabValue },
              { label: 'Users', value: allUsers.length, icon: Users, tab: 'users' as TabValue },
            ] as const).map((stat) => (
              <button
                key={stat.label}
                className="rounded-2xl border border-border/60 bg-card/70 p-4 text-left hover:bg-card transition-colors duration-150 active:scale-[0.98]"
                onClick={() => handleTabChange(stat.tab)}
              >
                <stat.icon className="h-4 w-4 text-muted-foreground mb-2" />
                <p className="text-2xl font-extrabold tracking-tight">{stat.value}</p>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">{stat.label}</p>
              </button>
            ))}
          </div>

          {/* Quick actions */}
          <Card className="rounded-2xl border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Quick Actions</CardTitle>
              <CardDescription>Jump to any section to manage content for {selectedUniversity.name}.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {([
                  { icon: GraduationCap, title: 'Invite Faculty', desc: 'Add faculty and configure access', tab: 'faculty' as TabValue },
                  { icon: Building2, title: 'Manage Buildings', desc: 'Add buildings and update their status', tab: 'buildings' as TabValue },
                  { icon: Landmark, title: 'Manage Clubs', desc: 'Update club info and leadership', tab: 'clubs' as TabValue },
                  { icon: CalendarDays, title: 'Publish Events', desc: 'Create and manage campus events', tab: 'events' as TabValue },
                  { icon: Wrench, title: 'Update Services', desc: 'Change service status and hours', tab: 'services' as TabValue },
                  { icon: ShieldUser, title: 'IT Accounts', desc: 'Provision portal access and permissions', tab: 'it-accounts' as TabValue },
                ] as const).map((action) => (
                  <button
                    key={action.title}
                    className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                    onClick={() => handleTabChange(action.tab)}
                  >
                    <action.icon className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">{action.title}</p>
                      <p className="text-xs text-muted-foreground">{action.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="universities" className="mt-0 space-y-4">
          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle>Manage University</CardTitle>
              <CardDescription>Update settings for the university currently in scope.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Main Color</TableHead>
                    <TableHead>Accent Color</TableHead>
                    <TableHead className="w-[220px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scopedUniversities.map((university) => (
                    <TableRow key={university.id}>
                      <TableCell>
                        <Input
                          value={university.name}
                          onChange={(event) =>
                            setUniversities((current) =>
                              current.map((item) => (item.id === university.id ? { ...item, name: event.target.value } : item)),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={university.slug}
                          onChange={(event) =>
                            setUniversities((current) =>
                              current.map((item) => (item.id === university.id ? { ...item, slug: event.target.value } : item)),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={university.domain ?? ''}
                          onChange={(event) =>
                            setUniversities((current) =>
                              current.map((item) =>
                                item.id === university.id ? { ...item, domain: event.target.value || null } : item,
                              ),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={university.themeMainColor ?? '#2563EB'}
                            onChange={(event) =>
                              setUniversities((current) =>
                                current.map((item) =>
                                  item.id === university.id ? { ...item, themeMainColor: event.target.value } : item,
                                ),
                              )
                            }
                            className="h-8 w-8 cursor-pointer rounded border border-border/60 bg-transparent p-0.5"
                          />
                          <Input
                            value={university.themeMainColor ?? ''}
                            onChange={(event) =>
                              setUniversities((current) =>
                                current.map((item) =>
                                  item.id === university.id ? { ...item, themeMainColor: event.target.value || null } : item,
                                ),
                              )
                            }
                            placeholder="#hex"
                            className="w-24 font-mono text-xs"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={university.themeAccentColor ?? '#3B82F6'}
                            onChange={(event) =>
                              setUniversities((current) =>
                                current.map((item) =>
                                  item.id === university.id ? { ...item, themeAccentColor: event.target.value } : item,
                                ),
                              )
                            }
                            className="h-8 w-8 cursor-pointer rounded border border-border/60 bg-transparent p-0.5"
                          />
                          <Input
                            value={university.themeAccentColor ?? ''}
                            onChange={(event) =>
                              setUniversities((current) =>
                                current.map((item) =>
                                  item.id === university.id ? { ...item, themeAccentColor: event.target.value || null } : item,
                                ),
                              )
                            }
                            placeholder="#hex"
                            className="w-24 font-mono text-xs"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={saving}
                          onClick={() =>
                            void runMutation(
                              async () => {
                                await apiRequest(`/api/admin/universities/${university.id}`, {
                                  method: 'PATCH',
                                  body: {
                                    name: university.name,
                                    slug: university.slug,
                                    domain: university.domain || undefined,
                                    themeMainColor: university.themeMainColor || undefined,
                                    themeAccentColor: university.themeAccentColor || undefined,
                                  },
                                })
                              },
                              'University updated',
                            )
                          }
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={saving}
                          onClick={() =>
                            void runMutation(
                              async () => {
                                await apiRequest(`/api/admin/universities/${university.id}`, {
                                  method: 'DELETE',
                                })
                              },
                              'University deleted',
                            )
                          }
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faculty" className="mt-0 space-y-5">

          {/* ── Invite Faculty Member ─────────────────────────────── */}
          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle>Invite Faculty Member</CardTitle>
              <CardDescription>
                Enter their email to allow signup. Configure their access and role assignments before they activate.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  value={newFacultySignupEmail.email}
                  onChange={(event) => setNewFacultySignupEmail((c) => ({ ...c, email: event.target.value.toLowerCase() }))}
                  placeholder="Faculty email (required)"
                />
                <Input
                  value={newFacultySignupEmail.firstName}
                  onChange={(event) => setNewFacultySignupEmail((c) => ({ ...c, firstName: event.target.value }))}
                  placeholder="First name (optional)"
                />
                <Input
                  value={newFacultySignupEmail.lastName}
                  onChange={(event) => setNewFacultySignupEmail((c) => ({ ...c, lastName: event.target.value }))}
                  placeholder="Last name (optional)"
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Permissions</p>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm hover:bg-muted/30">
                    <input
                      type="checkbox"
                      checked={newFacultySignupEmail.canPublishCampusAnnouncements}
                      onChange={(event) => setNewFacultySignupEmail((c) => ({ ...c, canPublishCampusAnnouncements: event.target.checked }))}
                    />
                    Can publish campus announcements
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm hover:bg-muted/30">
                    <input
                      type="checkbox"
                      checked={newFacultySignupEmail.managesAllClubs}
                      onChange={(event) => setNewFacultySignupEmail((c) => ({ ...c, managesAllClubs: event.target.checked }))}
                    />
                    Manages all clubs / Student orgs
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role Tags</p>
                <div className="flex flex-wrap gap-2">
                  {FACULTY_ROLE_TAG_OPTIONS.map((tag) => {
                    const isSelected = newFacultySignupEmail.facultyRoleTags.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setNewFacultySignupEmail((c) => ({
                            ...c,
                            facultyRoleTags: isSelected
                              ? c.facultyRoleTags.filter((t) => t !== tag)
                              : [...c.facultyRoleTags, tag],
                          }))
                        }
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                          isSelected
                            ? 'border-primary/30 bg-primary/10 text-primary'
                            : 'border-border/60 text-muted-foreground hover:border-primary/30 hover:text-foreground',
                        )}
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>

              {withinSelectedUniversity(buildings).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Manages Buildings</p>
                  <div className="grid gap-1.5 md:grid-cols-2 lg:grid-cols-3">
                    {withinSelectedUniversity(buildings).map((building) => {
                      const isSelected = newFacultySignupEmail.managedBuildingIds.includes(building.id)
                      return (
                        <label key={building.id} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-input px-3 py-2 text-xs hover:bg-muted/30">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              setNewFacultySignupEmail((c) => ({
                                ...c,
                                managedBuildingIds: isSelected
                                  ? c.managedBuildingIds.filter((id) => id !== building.id)
                                  : [...c.managedBuildingIds, building.id],
                              }))
                            }
                          />
                          <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span className="truncate">{building.name}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              {withinSelectedUniversity(clubs).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Advises Clubs / Orgs</p>
                  <div className="grid gap-1.5 md:grid-cols-2 lg:grid-cols-3">
                    {withinSelectedUniversity(clubs).map((club) => {
                      const isSelected = newFacultySignupEmail.managedClubIds.includes(club.id)
                      return (
                        <label key={club.id} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-input px-3 py-2 text-xs hover:bg-muted/30">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              setNewFacultySignupEmail((c) => ({
                                ...c,
                                managedClubIds: isSelected
                                  ? c.managedClubIds.filter((id) => id !== club.id)
                                  : [...c.managedClubIds, club.id],
                              }))
                            }
                          />
                          <Landmark className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span className="truncate">{club.name}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              <div>
                <Button
                  disabled={saving || !newFacultySignupEmail.universityId || !newFacultySignupEmail.email.trim()}
                  onClick={() =>
                    void runMutation(async () => {
                      await apiRequest('/api/admin/faculty/signup-emails', {
                        method: 'POST',
                        body: {
                          universityId: newFacultySignupEmail.universityId,
                          email: newFacultySignupEmail.email,
                          firstName: newFacultySignupEmail.firstName || undefined,
                          lastName: newFacultySignupEmail.lastName || undefined,
                          canPublishCampusAnnouncements: newFacultySignupEmail.canPublishCampusAnnouncements,
                          managesAllClubs: newFacultySignupEmail.managesAllClubs,
                          facultyRoleTags: newFacultySignupEmail.facultyRoleTags,
                          managedBuildingIds: newFacultySignupEmail.managedBuildingIds,
                          managedClubIds: newFacultySignupEmail.managedClubIds,
                        },
                      })
                      setNewFacultySignupEmail({
                        universityId: selectedUniversityId,
                        email: '',
                        firstName: '',
                        lastName: '',
                        canPublishCampusAnnouncements: false,
                        managesAllClubs: false,
                        facultyRoleTags: [],
                        managedBuildingIds: [],
                        managedClubIds: [],
                      })
                    }, 'Faculty invite sent')
                  }
                >
                  Send Invite
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ── Pending Invitations ───────────────────────────────── */}
          {withinSelectedUniversity(facultySignupEmails).length > 0 && (
            <Card className="rounded-2xl border-border/60">
              <CardHeader>
                <CardTitle>Pending Invitations</CardTitle>
                <CardDescription>Invited faculty who haven&apos;t yet completed their profile.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/40">
                  {withinSelectedUniversity(facultySignupEmails).map((record) => {
                    const isExpanded = expandedSignupEmailId === record.id
                    return (
                      <div key={record.id}>
                        <button
                          className="flex w-full items-center justify-between gap-3 px-6 py-3 text-left hover:bg-muted/30 transition-colors"
                          onClick={() => setExpandedSignupEmailId(isExpanded ? null : record.id)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                              <GraduationCap className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{record.displayName}</p>
                              <p className="truncate text-xs text-muted-foreground">{record.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {record.facultyRoleTags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                            ))}
                            <Badge variant={record.emailVerified ? 'success' : 'secondary'} className="text-[10px] shrink-0">
                              {record.emailVerified ? 'Activated' : 'Pending'}
                            </Badge>
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-border/40 bg-muted/20 px-6 py-4 space-y-3">
                            <div className="grid gap-2 md:grid-cols-2 text-sm">
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Email</p>
                                <p>{record.email}</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Status</p>
                                <p>{record.emailVerified ? 'Account activated' : 'Awaiting signup'}</p>
                              </div>
                            </div>
                            {(record.canPublishCampusAnnouncements || record.managesAllClubs) && (
                              <div className="flex flex-wrap gap-2">
                                {record.canPublishCampusAnnouncements && (
                                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="h-3 w-3" />Can publish announcements
                                  </span>
                                )}
                                {record.managesAllClubs && (
                                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="h-3 w-3" />Manages all clubs
                                  </span>
                                )}
                              </div>
                            )}
                            {record.facultyRoleTags.length > 0 && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">Role Tags</p>
                                <div className="flex flex-wrap gap-1">
                                  {record.facultyRoleTags.map((tag) => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
                                </div>
                              </div>
                            )}
                            {record.managedBuildings.length > 0 && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">Manages Buildings</p>
                                <div className="flex flex-wrap gap-1">
                                  {record.managedBuildings.map((mb) => (
                                    <Badge key={mb.buildingId} variant="secondary" className="text-xs">
                                      <Building2 className="mr-1 h-3 w-3" />{mb.building.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {record.managedClubs.length > 0 && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">Advises Clubs</p>
                                <div className="flex flex-wrap gap-1">
                                  {record.managedClubs.map((mc) => (
                                    <Badge key={mc.clubId} variant="secondary" className="text-xs">
                                      <Landmark className="mr-1 h-3 w-3" />{mc.club.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={saving}
                              onClick={() =>
                                void runMutation(async () => {
                                  await apiRequest(`/api/admin/faculty/signup-emails/${record.id}`, { method: 'DELETE' })
                                  setExpandedSignupEmailId(null)
                                }, 'Faculty invite removed')
                              }
                            >
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                              Remove Invite
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Faculty Directory ─────────────────────────────────── */}
          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle>Faculty Directory</CardTitle>
              <CardDescription>
                {withinSelectedUniversity(faculty).length} member{withinSelectedUniversity(faculty).length !== 1 ? 's' : ''} — click a row to view and edit.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {withinSelectedUniversity(faculty).length === 0 ? (
                <p className="px-6 py-6 text-sm text-muted-foreground">No faculty profiles yet.</p>
              ) : (
                <div className="divide-y divide-border/40">
                  {withinSelectedUniversity(faculty).map((record) => {
                    const isExpanded = expandedFacultyId === record.id
                    return (
                      <div key={record.id}>
                        <button
                          className="flex w-full items-center justify-between gap-3 px-6 py-3 text-left hover:bg-muted/30 transition-colors"
                          onClick={() => setExpandedFacultyId(isExpanded ? null : record.id)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                              <GraduationCap className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{record.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{record.title} &bull; {record.department}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="hidden text-xs text-muted-foreground md:block">{record.email}</span>
                            {record.user?.managesAllClubs && <Badge variant="outline" className="text-[10px]">All Clubs</Badge>}
                            {(record.user?.facultyRoleTags ?? []).slice(0, 1).map((tag) => (
                              <Badge key={tag} variant="secondary" className="hidden text-[10px] md:inline-flex">{tag}</Badge>
                            ))}
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-border/40 bg-muted/20 px-6 py-5 space-y-5">
                            {/* Basic info */}
                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                              {[
                                { label: 'Full Name', key: 'name' as const },
                                { label: 'Email', key: 'email' as const },
                                { label: 'Title', key: 'title' as const },
                                { label: 'Department', key: 'department' as const },
                                { label: 'Office Location', key: 'officeLocation' as const },
                                { label: 'Office Hours', key: 'officeHours' as const },
                              ].map(({ label, key }) => (
                                <div key={key} className="space-y-1.5">
                                  <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
                                  <Input
                                    value={record[key]}
                                    onChange={(event) => setFaculty((current) => current.map((item) => (item.id === record.id ? { ...item, [key]: event.target.value } : item)))}
                                  />
                                </div>
                              ))}
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Phone</label>
                                <Input
                                  value={record.phone ?? ''}
                                  placeholder="Optional"
                                  onChange={(event) => setFaculty((current) => current.map((item) => (item.id === record.id ? { ...item, phone: event.target.value || null } : item)))}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Courses (comma-separated)</label>
                                <Input
                                  value={record.courses.join(', ')}
                                  onChange={(event) => setFaculty((current) => current.map((item) => (item.id === record.id ? { ...item, courses: splitCsv(event.target.value) } : item)))}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tags (comma-separated)</label>
                                <Input
                                  value={record.tags.join(', ')}
                                  onChange={(event) => setFaculty((current) => current.map((item) => (item.id === record.id ? { ...item, tags: splitCsv(event.target.value) } : item)))}
                                />
                              </div>
                              <div className="space-y-1.5 md:col-span-2">
                                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Bio</label>
                                <Textarea
                                  value={record.bio ?? ''}
                                  placeholder="Optional bio"
                                  rows={2}
                                  className="resize-none"
                                  onChange={(event) => setFaculty((current) => current.map((item) => (item.id === record.id ? { ...item, bio: event.target.value || null } : item)))}
                                />
                              </div>
                            </div>

                            <Separator />

                            {/* Permissions */}
                            <div className="space-y-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Permissions</p>
                              <div className="flex flex-wrap gap-2">
                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm hover:bg-muted/30">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(record.user?.canPublishCampusAnnouncements)}
                                    onChange={(event) =>
                                      setFaculty((current) => current.map((item) =>
                                        item.id === record.id && item.user
                                          ? { ...item, user: { ...item.user, canPublishCampusAnnouncements: event.target.checked } }
                                          : item
                                      ))
                                    }
                                  />
                                  Can publish campus announcements
                                </label>
                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm hover:bg-muted/30">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(record.user?.managesAllClubs)}
                                    onChange={(event) =>
                                      setFaculty((current) => current.map((item) =>
                                        item.id === record.id && item.user
                                          ? { ...item, user: { ...item.user, managesAllClubs: event.target.checked } }
                                          : item
                                      ))
                                    }
                                  />
                                  Manages all clubs / Student orgs
                                </label>
                              </div>
                            </div>

                            {/* Role Tags */}
                            <div className="space-y-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Role Tags</p>
                              <div className="flex flex-wrap gap-2">
                                {FACULTY_ROLE_TAG_OPTIONS.map((tag) => {
                                  const currentTags = record.user?.facultyRoleTags ?? []
                                  const isSelected = currentTags.includes(tag)
                                  return (
                                    <button
                                      key={tag}
                                      type="button"
                                      onClick={() =>
                                        setFaculty((current) => current.map((item) =>
                                          item.id === record.id && item.user
                                            ? {
                                                ...item,
                                                user: {
                                                  ...item.user,
                                                  facultyRoleTags: isSelected
                                                    ? item.user.facultyRoleTags.filter((t) => t !== tag)
                                                    : [...item.user.facultyRoleTags, tag],
                                                },
                                              }
                                            : item
                                        ))
                                      }
                                      className={cn(
                                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                        isSelected
                                          ? 'border-primary/30 bg-primary/10 text-primary'
                                          : 'border-border/60 text-muted-foreground hover:border-primary/30 hover:text-foreground',
                                      )}
                                    >
                                      <Tag className="h-3 w-3" />
                                      {tag}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>

                            {/* Building Assignments */}
                            {withinSelectedUniversity(buildings).length > 0 && (
                              <div className="space-y-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Manages Buildings</p>
                                <div className="grid gap-1.5 md:grid-cols-2 lg:grid-cols-3">
                                  {withinSelectedUniversity(buildings).map((building) => {
                                    const isAssigned = (record.user?.managedBuildings ?? []).some((mb) => mb.buildingId === building.id)
                                    return (
                                      <label key={building.id} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-input px-3 py-2 text-xs hover:bg-muted/30">
                                        <input
                                          type="checkbox"
                                          checked={isAssigned}
                                          onChange={() =>
                                            setFaculty((current) => current.map((item) =>
                                              item.id === record.id && item.user
                                                ? {
                                                    ...item,
                                                    user: {
                                                      ...item.user,
                                                      managedBuildings: isAssigned
                                                        ? item.user.managedBuildings.filter((mb) => mb.buildingId !== building.id)
                                                        : [...item.user.managedBuildings, { buildingId: building.id, building: { id: building.id, name: building.name } }],
                                                    },
                                                  }
                                                : item
                                            ))
                                          }
                                        />
                                        <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                                        <span className="truncate">{building.name}</span>
                                      </label>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Club Assignments */}
                            {withinSelectedUniversity(clubs).length > 0 && (
                              <div className="space-y-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Advises Clubs / Orgs</p>
                                <div className="grid gap-1.5 md:grid-cols-2 lg:grid-cols-3">
                                  {withinSelectedUniversity(clubs).map((club) => {
                                    const isAssigned = (record.user?.managedClubs ?? []).some((mc) => mc.clubId === club.id)
                                    return (
                                      <label key={club.id} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-input px-3 py-2 text-xs hover:bg-muted/30">
                                        <input
                                          type="checkbox"
                                          checked={isAssigned}
                                          onChange={() =>
                                            setFaculty((current) => current.map((item) =>
                                              item.id === record.id && item.user
                                                ? {
                                                    ...item,
                                                    user: {
                                                      ...item.user,
                                                      managedClubs: isAssigned
                                                        ? item.user.managedClubs.filter((mc) => mc.clubId !== club.id)
                                                        : [...item.user.managedClubs, { clubId: club.id, club: { id: club.id, name: club.name } }],
                                                    },
                                                  }
                                                : item
                                            ))
                                          }
                                        />
                                        <Landmark className="h-3 w-3 shrink-0 text-muted-foreground" />
                                        <span className="truncate">{club.name}</span>
                                      </label>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            <div className="flex gap-2 pt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={saving}
                                onClick={() =>
                                  void runMutation(async () => {
                                    await apiRequest(`/api/admin/faculty/${record.id}`, {
                                      method: 'PATCH',
                                      body: {
                                        universityId: record.universityId,
                                        name: record.name,
                                        email: record.email,
                                        canPublishCampusAnnouncements: Boolean(record.user?.canPublishCampusAnnouncements),
                                        managesAllClubs: Boolean(record.user?.managesAllClubs),
                                        facultyRoleTags: record.user?.facultyRoleTags ?? [],
                                        managedBuildingIds: record.user?.managedBuildings.map((mb) => mb.buildingId) ?? [],
                                        managedClubIds: record.user?.managedClubs.map((mc) => mc.clubId) ?? [],
                                        title: record.title,
                                        department: record.department,
                                        officeLocation: record.officeLocation,
                                        officeHours: record.officeHours,
                                        phone: record.phone || undefined,
                                        bio: record.bio || undefined,
                                        courses: record.courses,
                                        tags: record.tags,
                                      },
                                    })
                                  }, 'Faculty updated')
                                }
                              >
                                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                Save Changes
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={saving}
                                onClick={() =>
                                  void runMutation(async () => {
                                    await apiRequest(`/api/admin/faculty/${record.id}`, { method: 'DELETE' })
                                    setExpandedFacultyId(null)
                                  }, 'Faculty deleted')
                                }
                              >
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Buildings Tab ─────────────────────────────────────── */}
        <TabsContent value="buildings" className="mt-0 space-y-5">

          {/* Header actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandedBuildingId(expandedBuildingId === 'new' ? null : 'new')}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add Building
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBuildingImport(true)}
              >
                <Upload className="mr-1.5 h-4 w-4" />
                Import from CSV
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {withinSelectedUniversity(buildings).length} building{withinSelectedUniversity(buildings).length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* New building form */}
          {expandedBuildingId === 'new' && (
            <Card className="rounded-2xl border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">New Building</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Building Name *</label>
                    <Input value={newBuilding.name} onChange={(event) => setNewBuilding((c) => ({ ...c, name: event.target.value }))} placeholder="e.g. Science Hall" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Code</label>
                    <Input value={newBuilding.code} onChange={(event) => setNewBuilding((c) => ({ ...c, code: event.target.value }))} placeholder="e.g. SCI" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Type *</label>
                    <Input value={newBuilding.type} onChange={(event) => setNewBuilding((c) => ({ ...c, type: event.target.value }))} placeholder="e.g. Academic, Resource, Dining" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Address *</label>
                    <Input value={newBuilding.address} onChange={(event) => setNewBuilding((c) => ({ ...c, address: event.target.value }))} placeholder="Street address" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Map Query *</label>
                    <Input value={newBuilding.mapQuery} onChange={(event) => setNewBuilding((c) => ({ ...c, mapQuery: event.target.value }))} placeholder="Search term for maps" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Operating Hours</label>
                    <Input value={newBuilding.operatingHours} onChange={(event) => setNewBuilding((c) => ({ ...c, operatingHours: event.target.value }))} placeholder="e.g. Mon–Fri 8am–6pm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Operational Status</label>
                    <select
                      value={newBuilding.operationalStatus}
                      onChange={(event) => setNewBuilding((c) => ({ ...c, operationalStatus: event.target.value as 'OPEN' | 'CLOSED' | 'LIMITED' }))}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="OPEN">Open</option>
                      <option value="CLOSED">Closed</option>
                      <option value="LIMITED">Limited Access</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status Note</label>
                    <Input value={newBuilding.operationalNote} onChange={(event) => setNewBuilding((c) => ({ ...c, operationalNote: event.target.value }))} placeholder="e.g. Closed for renovation" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Purpose (AI descriptor)</label>
                  <Textarea
                    value={newBuilding.purpose}
                    onChange={(event) => setNewBuilding((c) => ({ ...c, purpose: event.target.value }))}
                    placeholder="Describe what this building is used for so the AI assistant can surface it in relevant queries..."
                    rows={2}
                    className="resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Description</label>
                  <Textarea
                    value={newBuilding.description}
                    onChange={(event) => setNewBuilding((c) => ({ ...c, description: event.target.value }))}
                    placeholder="Optional public-facing description"
                    rows={2}
                    className="resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={saving || !newBuilding.name || !newBuilding.type || !newBuilding.address || !newBuilding.mapQuery}
                    onClick={() =>
                      void runMutation(async () => {
                        await apiRequest('/api/admin/buildings', {
                          method: 'POST',
                          body: {
                            universityId: newBuilding.universityId,
                            name: newBuilding.name,
                            code: newBuilding.code || undefined,
                            type: newBuilding.type,
                            address: newBuilding.address,
                            mapQuery: newBuilding.mapQuery,
                            purpose: newBuilding.purpose || undefined,
                            operatingHours: newBuilding.operatingHours || undefined,
                            operationalStatus: newBuilding.operationalStatus,
                            operationalNote: newBuilding.operationalNote || undefined,
                            description: newBuilding.description || undefined,
                          },
                        })
                        setNewBuilding({
                          universityId: selectedUniversityId,
                          name: '', code: '', type: '', address: '', mapQuery: '',
                          purpose: '', operatingHours: '', operationalStatus: 'OPEN',
                          operationalNote: '', description: '',
                        })
                        setExpandedBuildingId(null)
                      }, 'Building created')
                    }
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Create Building
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setExpandedBuildingId(null)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Buildings list */}
          <Card className="rounded-2xl border-border/60">
            <CardContent className="p-0">
              {withinSelectedUniversity(buildings).length === 0 ? (
                <p className="px-6 py-6 text-sm text-muted-foreground">No buildings yet. Add one above or import from CSV.</p>
              ) : (
                <div className="divide-y divide-border/40">
                  {withinSelectedUniversity(buildings).map((building) => {
                    const isExpanded = expandedBuildingId === building.id
                    const statusMeta = STATUS_CONFIG[building.operationalStatus ?? 'OPEN']
                    return (
                      <div key={building.id}>
                        <button
                          className="flex w-full items-center justify-between gap-3 px-6 py-3 text-left hover:bg-muted/30 transition-colors"
                          onClick={() => setExpandedBuildingId(isExpanded ? null : building.id)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{building.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{building.type} &bull; {building.address}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', statusMeta.className)}>
                              {statusMeta.icon}
                              {statusMeta.label}
                            </span>
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-border/40 bg-muted/20 px-6 py-5 space-y-4">
                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                              {([
                                { label: 'Building Name', key: 'name' as const },
                                { label: 'Code', key: 'code' as const },
                                { label: 'Type', key: 'type' as const },
                                { label: 'Address', key: 'address' as const },
                                { label: 'Map Query', key: 'mapQuery' as const },
                                { label: 'Operating Hours', key: 'operatingHours' as const },
                              ] as { label: string; key: keyof BuildingRecord }[]).map(({ label, key }) => (
                                <div key={String(key)} className="space-y-1.5">
                                  <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
                                  <Input
                                    value={(building[key] as string) ?? ''}
                                    onChange={(event) =>
                                      setBuildings((current) =>
                                        current.map((item) => (item.id === building.id ? { ...item, [key]: event.target.value } : item)),
                                      )
                                    }
                                  />
                                </div>
                              ))}
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Operational Status</label>
                                <select
                                  value={building.operationalStatus ?? 'OPEN'}
                                  onChange={(event) =>
                                    setBuildings((current) =>
                                      current.map((item) => (item.id === building.id ? { ...item, operationalStatus: event.target.value as 'OPEN' | 'CLOSED' | 'LIMITED' } : item)),
                                    )
                                  }
                                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                >
                                  <option value="OPEN">Open</option>
                                  <option value="CLOSED">Closed</option>
                                  <option value="LIMITED">Limited Access</option>
                                </select>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status Note</label>
                                <Input
                                  value={building.operationalNote ?? ''}
                                  placeholder="e.g. Closed for renovation"
                                  onChange={(event) =>
                                    setBuildings((current) =>
                                      current.map((item) => (item.id === building.id ? { ...item, operationalNote: event.target.value } : item)),
                                    )
                                  }
                                />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Purpose (AI descriptor)</label>
                              <Textarea
                                value={building.purpose ?? ''}
                                placeholder="Describe what this building is used for so the AI assistant can surface it in relevant queries..."
                                rows={2}
                                className="resize-none"
                                onChange={(event) =>
                                  setBuildings((current) =>
                                    current.map((item) => (item.id === building.id ? { ...item, purpose: event.target.value } : item)),
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Description</label>
                              <Textarea
                                value={building.description ?? ''}
                                placeholder="Optional public-facing description"
                                rows={2}
                                className="resize-none"
                                onChange={(event) =>
                                  setBuildings((current) =>
                                    current.map((item) => (item.id === building.id ? { ...item, description: event.target.value } : item)),
                                  )
                                }
                              />
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={saving}
                                onClick={() =>
                                  void runMutation(async () => {
                                    await apiRequest(`/api/admin/buildings/${building.id}`, {
                                      method: 'PATCH',
                                      body: {
                                        universityId: building.universityId,
                                        name: building.name,
                                        code: building.code || undefined,
                                        type: building.type,
                                        address: building.address,
                                        mapQuery: building.mapQuery,
                                        purpose: building.purpose || undefined,
                                        operatingHours: building.operatingHours || undefined,
                                        operationalStatus: building.operationalStatus,
                                        operationalNote: building.operationalNote || undefined,
                                        description: building.description || undefined,
                                      },
                                    })
                                  }, 'Building updated')
                                }
                              >
                                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                Save Changes
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={saving}
                                onClick={() =>
                                  void runMutation(async () => {
                                    await apiRequest(`/api/admin/buildings/${building.id}`, { method: 'DELETE' })
                                    setExpandedBuildingId(null)
                                  }, 'Building deleted')
                                }
                              >
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Building Import Dialog */}
          <Dialog open={showBuildingImport} onOpenChange={setShowBuildingImport}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Import Buildings From CSV</DialogTitle>
                <DialogDescription>
                  Upload a CSV file to bulk-import or update buildings for this university.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">CSV File</label>
                  <Input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(event) => void handleBuildingImportFileSelected(event.target.files?.[0] ?? null)}
                  />
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">Required columns (exact names):</p>
                  <p className="mt-1 font-mono">{requiredBuildingHeaders}</p>
                  <p className="mt-2">All future building CSV uploads must use the same column names.</p>
                </div>

                {buildingImportFileName && (
                  <p className="text-xs text-muted-foreground">
                    File selected: <span className="font-medium text-foreground">{buildingImportFileName}</span>
                  </p>
                )}

                {buildingImportError && (
                  <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                    {buildingImportError}
                  </p>
                )}

                {buildingImportValidation && (
                  <div
                    className={cn(
                      'rounded-md border px-3 py-2 text-xs',
                      buildingImportValidation.valid
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300',
                    )}
                  >
                    <p className="font-semibold">
                      {buildingImportValidation.valid ? 'CSV headers look good.' : 'CSV headers do not match the required format.'}
                    </p>
                    {buildingImportValidation.missingHeaders.length > 0 && (
                      <p>Missing: {buildingImportValidation.missingHeaders.join(', ')}</p>
                    )}
                    {buildingImportValidation.unexpectedHeaders.length > 0 && (
                      <p>Unexpected: {buildingImportValidation.unexpectedHeaders.join(', ')}</p>
                    )}
                    {buildingImportValidation.duplicateHeaders.length > 0 && (
                      <p>Duplicate: {buildingImportValidation.duplicateHeaders.join(', ')}</p>
                    )}
                    <p>Detected data rows: {buildingImportRowCount}</p>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowBuildingImport(false)}>
                    Cancel
                  </Button>
                  <Button
                    disabled={
                      saving ||
                      !buildingImportCsvContent ||
                      !buildingImportValidation?.valid ||
                      buildingImportRowCount === 0
                    }
                    onClick={() =>
                      void runMutation(
                        async () => {
                          const result = await apiRequest<BuildingImportResult>('/api/admin/buildings/import', {
                            method: 'POST',
                            body: {
                              universityId: buildingImportUniversityId,
                              csvContent: buildingImportCsvContent,
                            },
                          })
                          setBuildingImportCsvContent('')
                          setBuildingImportFileName('')
                          setBuildingImportRowCount(0)
                          setBuildingImportError(null)
                          setBuildingImportValidation(null)
                          setShowBuildingImport(false)
                          return result
                        },
                        (result) =>
                          `Imported ${result.totalRows} rows (${result.createdCount} created, ${result.updatedCount} updated)`,
                      )
                    }
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Import Buildings'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

        </TabsContent>

        {/* building-import is now embedded in buildings tab — keep empty for compat */}
        <TabsContent value="building-import" className="mt-0" />

        <TabsContent value="links" className="mt-0 space-y-4">
          <SimpleCreateCard
            title="Create Resource Link"
            description="Links appear in the student Links Directory for the selected university."
            content={
              <>
                <select value={newLink.universityId} onChange={(event) => setNewLink((current) => ({ ...current, universityId: event.target.value }))} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {scopedUniversityOptions}
                </select>
                <Input value={newLink.label} onChange={(event) => setNewLink((current) => ({ ...current, label: event.target.value }))} placeholder="Link label" />
                <select value={newLink.category} onChange={(event) => setNewLink((current) => ({ ...current, category: event.target.value as LinkCategory }))} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {resourceCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <Input value={newLink.href} onChange={(event) => setNewLink((current) => ({ ...current, href: event.target.value }))} placeholder="https://..." />
                <Input value={newLink.description} onChange={(event) => setNewLink((current) => ({ ...current, description: event.target.value }))} placeholder="Description" />
                <Button
                  disabled={saving || !newLink.universityId || !newLink.label || !newLink.href || !newLink.description}
                  onClick={() =>
                    void runMutation(async () => {
                      await apiRequest('/api/admin/resource-links', {
                        method: 'POST',
                        body: newLink,
                      })

                      setNewLink({
                        universityId: selectedUniversityId,
                        label: '',
                        category: 'LEARNING',
                        href: '',
                        description: '',
                      })
                    }, 'Resource link created')
                  }
                >
                  Create Link
                </Button>
              </>
            }
          />

          <CrudLinkTable
            records={withinSelectedUniversity(resourceLinks)}
            universities={scopedUniversities}
            saving={saving}
            onChange={setResourceLinks}
            onSave={(record) =>
              runMutation(async () => {
                await apiRequest(`/api/admin/resource-links/${record.id}`, {
                  method: 'PATCH',
                  body: {
                    universityId: record.universityId,
                    label: record.label,
                    category: record.category,
                    href: record.href,
                    description: record.description,
                  },
                })
              }, 'Resource link updated')
            }
            onDelete={(recordId) =>
              runMutation(async () => {
                await apiRequest(`/api/admin/resource-links/${recordId}`, { method: 'DELETE' })
              }, 'Resource link deleted')
            }
          />
        </TabsContent>

        <TabsContent value="services" className="mt-0 space-y-4">
          <SimpleCreateCard
            title="Create Service"
            description="Services power the student Services Status page."
            content={
              <>
                <select value={newService.universityId} onChange={(event) => setNewService((current) => ({ ...current, universityId: event.target.value }))} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {scopedUniversityOptions}
                </select>
                <Input value={newService.name} onChange={(event) => setNewService((current) => ({ ...current, name: event.target.value }))} placeholder="Service name" />
                <select value={newService.status} onChange={(event) => setNewService((current) => ({ ...current, status: event.target.value as ServiceStatus }))} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {serviceStatuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <Input value={newService.hours} onChange={(event) => setNewService((current) => ({ ...current, hours: event.target.value }))} placeholder="Hours" />
                <Input value={newService.location} onChange={(event) => setNewService((current) => ({ ...current, location: event.target.value }))} placeholder="Location" />
                <Input value={newService.directionsUrl} onChange={(event) => setNewService((current) => ({ ...current, directionsUrl: event.target.value }))} placeholder="Directions URL" />
                <Button
                  disabled={saving || !newService.universityId || !newService.name || !newService.hours || !newService.location || !newService.directionsUrl}
                  onClick={() =>
                    void runMutation(async () => {
                      await apiRequest('/api/admin/services', {
                        method: 'POST',
                        body: newService,
                      })

                      setNewService({
                        universityId: selectedUniversityId,
                        name: '',
                        status: 'OPEN',
                        hours: '',
                        location: '',
                        directionsUrl: '',
                      })
                    }, 'Service created')
                  }
                >
                  Create Service
                </Button>
              </>
            }
          />

          <CrudServiceTable
            records={withinSelectedUniversity(services)}
            universities={scopedUniversities}
            saving={saving}
            onChange={setServices}
            onSave={(record) =>
              runMutation(async () => {
                await apiRequest(`/api/admin/services/${record.id}`, {
                  method: 'PATCH',
                  body: {
                    universityId: record.universityId,
                    name: record.name,
                    status: record.status,
                    hours: record.hours,
                    location: record.location,
                    directionsUrl: record.directionsUrl,
                  },
                })
              }, 'Service updated')
            }
            onDelete={(recordId) =>
              runMutation(async () => {
                await apiRequest(`/api/admin/services/${recordId}`, { method: 'DELETE' })
              }, 'Service deleted')
            }
          />
        </TabsContent>

        <TabsContent value="clubs" className="mt-0 space-y-4">
          <SimpleCreateCard
            title="Create Club/Organization"
            description="Organizations can be displayed across student discovery experiences."
            content={
              <>
                <select value={newClub.universityId} onChange={(event) => setNewClub((current) => ({ ...current, universityId: event.target.value }))} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {scopedUniversityOptions}
                </select>
                <Input value={newClub.name} onChange={(event) => setNewClub((current) => ({ ...current, name: event.target.value }))} placeholder="Club name" />
                <Input value={newClub.category} onChange={(event) => setNewClub((current) => ({ ...current, category: event.target.value }))} placeholder="Category" />
                <Input value={newClub.description} onChange={(event) => setNewClub((current) => ({ ...current, description: event.target.value }))} placeholder="Description" />
                <Input value={newClub.contactEmail} onChange={(event) => setNewClub((current) => ({ ...current, contactEmail: event.target.value }))} placeholder="Contact email (optional)" />
                <Input value={newClub.websiteUrl} onChange={(event) => setNewClub((current) => ({ ...current, websiteUrl: event.target.value }))} placeholder="Website URL (optional)" />
                <Input value={newClub.meetingInfo} onChange={(event) => setNewClub((current) => ({ ...current, meetingInfo: event.target.value }))} placeholder="Meeting info (optional)" />
                <Button
                  disabled={saving || !newClub.universityId || !newClub.name || !newClub.category || !newClub.description}
                  onClick={() =>
                    void runMutation(async () => {
                      await apiRequest('/api/admin/clubs', {
                        method: 'POST',
                        body: {
                          ...newClub,
                          contactEmail: newClub.contactEmail || undefined,
                          websiteUrl: newClub.websiteUrl || undefined,
                          meetingInfo: newClub.meetingInfo || undefined,
                        },
                      })

                      setNewClub({
                        universityId: selectedUniversityId,
                        name: '',
                        category: '',
                        description: '',
                        contactEmail: '',
                        websiteUrl: '',
                        meetingInfo: '',
                      })
                    }, 'Club created')
                  }
                >
                  Create Club
                </Button>
              </>
            }
          />

          <CrudClubTable
            records={withinSelectedUniversity(clubs)}
            universities={scopedUniversities}
            saving={saving}
            onChange={setClubs}
            onSave={(record) =>
              runMutation(async () => {
                await apiRequest(`/api/admin/clubs/${record.id}`, {
                  method: 'PATCH',
                  body: {
                    universityId: record.universityId,
                    name: record.name,
                    category: record.category,
                    description: record.description,
                    contactEmail: record.contactEmail || null,
                    websiteUrl: record.websiteUrl || null,
                    meetingInfo: record.meetingInfo || null,
                  },
                })
              }, 'Club updated')
            }
            onDelete={(recordId) =>
              runMutation(async () => {
                await apiRequest(`/api/admin/clubs/${recordId}`, { method: 'DELETE' })
              }, 'Club deleted')
            }
          />
        </TabsContent>

        <TabsContent value="events" className="mt-0 space-y-4">
          <SimpleCreateCard
            title="Create Event"
            description="Events appear in the student events workflow."
            content={
              <>
                <select value={newEvent.universityId} onChange={(event) => setNewEvent((current) => ({ ...current, universityId: event.target.value }))} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {scopedUniversityOptions}
                </select>
                <Input value={newEvent.title} onChange={(event) => setNewEvent((current) => ({ ...current, title: event.target.value }))} placeholder="Event title" />
                <Input value={newEvent.description} onChange={(event) => setNewEvent((current) => ({ ...current, description: event.target.value }))} placeholder="Description" />
                <Input type="datetime-local" value={newEvent.date} onChange={(event) => setNewEvent((current) => ({ ...current, date: event.target.value }))} />
                <Input value={newEvent.time} onChange={(event) => setNewEvent((current) => ({ ...current, time: event.target.value }))} placeholder="Time label" />
                <Input value={newEvent.location} onChange={(event) => setNewEvent((current) => ({ ...current, location: event.target.value }))} placeholder="Location" />
                <select value={newEvent.category} onChange={(event) => setNewEvent((current) => ({ ...current, category: event.target.value as EventRecord['category'] }))} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {eventCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <Input value={newEvent.organizer} onChange={(event) => setNewEvent((current) => ({ ...current, organizer: event.target.value }))} placeholder="Organizer" />
                <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={newEvent.isPublished} onChange={(event) => setNewEvent((current) => ({ ...current, isPublished: event.target.checked }))} />
                  Published
                </label>
                <Button
                  disabled={saving || !newEvent.universityId || !newEvent.title || !newEvent.description || !newEvent.date || !newEvent.time || !newEvent.location || !newEvent.organizer}
                  onClick={() =>
                    void runMutation(async () => {
                      await apiRequest('/api/admin/events', {
                        method: 'POST',
                        body: {
                          ...newEvent,
                          date: new Date(newEvent.date).toISOString(),
                        },
                      })

                      setNewEvent({
                        universityId: selectedUniversityId,
                        title: '',
                        description: '',
                        date: '',
                        time: '',
                        location: '',
                        category: 'ACADEMIC',
                        organizer: '',
                        isPublished: true,
                      })
                    }, 'Event created')
                  }
                >
                  Create Event
                </Button>
              </>
            }
          />

          <CrudEventTable
            records={withinSelectedUniversity(events)}
            universities={scopedUniversities}
            saving={saving}
            onChange={setEvents}
            onSave={(record) =>
              runMutation(async () => {
                await apiRequest(`/api/admin/events/${record.id}`, {
                  method: 'PATCH',
                  body: {
                    universityId: record.universityId,
                    title: record.title,
                    description: record.description,
                    date: new Date(record.date).toISOString(),
                    time: record.time,
                    location: record.location,
                    category: record.category,
                    organizer: record.organizer,
                    isPublished: record.isPublished,
                  },
                })
              }, 'Event updated')
            }
            onDelete={(recordId) =>
              runMutation(async () => {
                await apiRequest(`/api/admin/events/${recordId}`, { method: 'DELETE' })
              }, 'Event deleted')
            }
          />
        </TabsContent>

        <TabsContent value="it-accounts" className="mt-0 space-y-4">
          {temporaryAccountPassword && (
            <Card className="rounded-2xl border-emerald-500/30 bg-emerald-500/10">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                  Temporary Password
                </p>
                <p className="mt-1 font-mono text-sm text-emerald-900 dark:text-emerald-100">
                  {temporaryAccountPassword}
                </p>
                <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">
                  Share this securely and require the user to reset it at first login.
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle>Create IT / Portal Account</CardTitle>
              <CardDescription>
                Provision IT admins and scoped portal users with tab-level access controls.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <select
                  value={newPortalAccount.universityId}
                  onChange={(event) =>
                    setNewPortalAccount((current) => ({
                      ...current,
                      universityId: event.target.value,
                    }))
                  }
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {scopedUniversityOptions}
                </select>
                <Input
                  value={newPortalAccount.firstName}
                  onChange={(event) =>
                    setNewPortalAccount((current) => ({
                      ...current,
                      firstName: event.target.value,
                    }))
                  }
                  placeholder="First name"
                />
                <Input
                  value={newPortalAccount.lastName}
                  onChange={(event) =>
                    setNewPortalAccount((current) => ({
                      ...current,
                      lastName: event.target.value,
                    }))
                  }
                  placeholder="Last name"
                />
                <Input
                  value={newPortalAccount.email}
                  onChange={(event) =>
                    setNewPortalAccount((current) => ({
                      ...current,
                      email: event.target.value.toLowerCase(),
                    }))
                  }
                  placeholder="Email address"
                />
                <select
                  value={newPortalAccount.role}
                  onChange={(event) =>
                    setNewPortalAccount((current) => ({
                      ...current,
                      role: event.target.value as 'STUDENT' | 'FACULTY' | 'ADMIN',
                    }))
                  }
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="FACULTY">Faculty</option>
                  <option value="STUDENT">Student</option>
                </select>
                <select
                  value={newPortalAccount.accessLevel}
                  onChange={(event) =>
                    setNewPortalAccount((current) => ({
                      ...current,
                      accessLevel: event.target.value as AdminAccessLevel,
                    }))
                  }
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {accessLevelOptions.map((level) => (
                    <option key={level} value={level}>
                      {level.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
                <Input
                  value={newPortalAccount.password}
                  onChange={(event) =>
                    setNewPortalAccount((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder="Password (optional)"
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Portal Permissions
                </p>
                <div className="grid gap-2 md:grid-cols-3">
                  {portalPermissionOptions.map((permission) => (
                    <label
                      key={permission}
                      className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-2 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={newPortalAccount.portalPermissions.includes(permission)}
                        onChange={() => togglePermissionInDraftAccount(permission)}
                      />
                      {portalPermissionLabels[permission]}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Managed Clubs (for club leadership roles)
                </p>
                <div className="grid gap-2 md:grid-cols-3">
                  {withinSelectedUniversity(clubs).map((club) => (
                    <label
                      key={club.id}
                      className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-2 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={newPortalAccount.managedClubIds.includes(club.id)}
                        onChange={() => toggleManagedClubInDraftAccount(club.id)}
                      />
                      {club.name}
                    </label>
                  ))}
                </div>
              </div>

              <Button
                disabled={
                  saving ||
                  !newPortalAccount.universityId ||
                  !newPortalAccount.firstName.trim() ||
                  !newPortalAccount.lastName.trim() ||
                  !newPortalAccount.email.trim()
                }
                onClick={() =>
                  void runMutation(
                    async () => {
                      const result = await apiRequest<PortalAccountCreateResult>(
                        '/api/admin/accounts',
                        {
                          method: 'POST',
                          body: {
                            universityId: newPortalAccount.universityId,
                            firstName: newPortalAccount.firstName,
                            lastName: newPortalAccount.lastName,
                            email: newPortalAccount.email,
                            role: newPortalAccount.role,
                            accessLevel: newPortalAccount.accessLevel,
                            portalPermissions: newPortalAccount.portalPermissions,
                            managedClubIds: newPortalAccount.managedClubIds,
                            password: newPortalAccount.password || undefined,
                          },
                        },
                      )

                      setTemporaryAccountPassword(result.temporaryPassword)
                      setNewPortalAccount({
                        universityId: selectedUniversityId,
                        firstName: '',
                        lastName: '',
                        email: '',
                        role: 'ADMIN',
                        accessLevel: 'IT_ADMIN',
                        portalPermissions: [
                          'ADMIN_TAB_OVERVIEW',
                          'ADMIN_TAB_FACULTY',
                          'ADMIN_TAB_BUILDINGS',
                        ],
                        managedClubIds: [],
                        password: '',
                      })
                    },
                    'Portal account created',
                  )
                }
              >
                <KeyRound className="mr-1.5 h-4 w-4" />
                Create Account
              </Button>
            </CardContent>
          </Card>

          <CrudPortalAccountsTable
            records={withinSelectedUniversity(portalAccounts)}
            universities={scopedUniversities}
            clubs={withinSelectedUniversity(clubs)}
            saving={saving}
            onChange={setPortalAccounts}
            onTogglePermission={togglePermissionForAccount}
            onToggleManagedClub={toggleManagedClubForAccount}
            onSave={(record) =>
              runMutation(async () => {
                await apiRequest(`/api/admin/accounts/${record.id}`, {
                  method: 'PATCH',
                  body: {
                    firstName: record.firstName,
                    lastName: record.lastName,
                    role: record.role,
                    accessLevel: record.adminAccessLevel,
                    portalPermissions: record.portalPermissions,
                    managedClubIds: record.managedClubs.map((assignment) => assignment.clubId),
                    canPublishCampusAnnouncements: record.portalPermissions.includes(
                      'CAN_PUBLISH_ANNOUNCEMENTS',
                    ),
                  },
                })
              }, 'Account updated')
            }
            onDelete={(recordId) =>
              runMutation(async () => {
                await apiRequest(`/api/admin/accounts/${recordId}`, {
                  method: 'DELETE',
                })
              }, 'Account deleted')
            }
          />
        </TabsContent>

        <TabsContent value="users" className="mt-0 space-y-4">
          {/* Filters */}
          <Card className="rounded-2xl border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">All Users</CardTitle>
              <CardDescription>
                View and manage every user account for {selectedUniversity?.name ?? 'this university'}. Use the search and filter to narrow down results.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Input
                className="max-w-xs"
                placeholder="Search by name or email…"
                value={userSearchQuery}
                onChange={(event) => setUserSearchQuery(event.target.value)}
              />
              <select
                value={userRoleFilter}
                onChange={(event) => setUserRoleFilter(event.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All Roles</option>
                <option value="STUDENT">Student</option>
                <option value="FACULTY">Faculty</option>
                <option value="ADMIN">Admin</option>
              </select>
              <Badge variant="outline" className="self-center">
                {(() => {
                  const filtered = allUsers.filter((u) => {
                    const matchesRole = !userRoleFilter || u.role === userRoleFilter
                    const q = userSearchQuery.toLowerCase()
                    const matchesSearch =
                      !q ||
                      u.email.toLowerCase().includes(q) ||
                      u.firstName.toLowerCase().includes(q) ||
                      u.lastName.toLowerCase().includes(q) ||
                      u.displayName.toLowerCase().includes(q)
                    return matchesRole && matchesSearch
                  })
                  return `${filtered.length} user${filtered.length !== 1 ? 's' : ''}`
                })()}
              </Badge>
            </CardContent>
          </Card>

          <CrudUsersTable
            records={allUsers}
            searchQuery={userSearchQuery}
            roleFilter={userRoleFilter}
            saving={saving}
            onChange={setAllUsers}
            onSave={(record) =>
              runMutation(async () => {
                await apiRequest(`/api/admin/users/${record.id}`, {
                  method: 'PATCH',
                  body: {
                    firstName: record.firstName,
                    lastName: record.lastName,
                    role: record.role,
                    major: record.major || null,
                    department: record.department || null,
                    year: record.year || null,
                    adminAccessLevel: record.adminAccessLevel || null,
                    onboardingComplete: record.onboardingComplete,
                  },
                })
              }, 'User updated')
            }
            onDelete={(recordId) =>
              runMutation(async () => {
                await apiRequest(`/api/admin/users/${recordId}`, {
                  method: 'DELETE',
                })
              }, 'User deleted')
            }
          />
        </TabsContent>
        </Tabs>
      ) : (
        <Card className="mx-auto w-full max-w-2xl rounded-2xl border-border/60">
          <CardHeader>
            <CardTitle>What university are you working on?</CardTitle>
            <CardDescription>
              Select one university to load a scoped dashboard and run CRUD operations for that tenant only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {universities.length > 0 ? (
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (!universitySelectionDraft) return
                  applyUniversitySelection(universitySelectionDraft)
                }}
              >
                <div className="space-y-1.5">
                  <label
                    htmlFor="admin-university-selection"
                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    University
                  </label>
                  <select
                    id="admin-university-selection"
                    value={universitySelectionDraft}
                    onChange={(event) => setUniversitySelectionDraft(event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Select university</option>
                    {universityOptions}
                  </select>
                </div>

                <Button type="submit" disabled={!universitySelectionDraft}>
                  Load Dashboard
                </Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                No universities are available for this account.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="rounded-xl border border-border/60 bg-card px-4 py-3 text-sm text-muted-foreground">
            Loading admin data...
          </div>
        </div>
      )}
    </div>
  )
}
function SimpleCreateCard({
  title,
  description,
  content,
}: {
  title: string
  description: string
  content: React.ReactNode
}) {
  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">{content}</CardContent>
    </Card>
  )
}


function CrudLinkTable({
  records,
  universities,
  saving,
  onChange,
  onSave,
  onDelete,
}: {
  records: ResourceLinkRecord[]
  universities: University[]
  saving: boolean
  onChange: React.Dispatch<React.SetStateAction<ResourceLinkRecord[]>>
  onSave: (record: ResourceLinkRecord) => Promise<void>
  onDelete: (recordId: string) => Promise<void>
}) {
  return (
    <CrudCard title="Manage Resource Links" description="Update portal links shown to students.">
      <BaseCrudTable
        rows={records.map((record) => (
          <TableRow key={record.id}>
            <TableCell className="space-y-2 min-w-[260px]">
              <Input value={record.label} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, label: event.target.value } : item)))} />
              <select value={record.category} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, category: event.target.value as LinkCategory } : item)))} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                {resourceCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </TableCell>
            <TableCell>
              <select value={record.universityId} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, universityId: event.target.value } : item)))} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                {universities.map((university) => (
                  <option key={university.id} value={university.id}>{university.name}</option>
                ))}
              </select>
            </TableCell>
            <TableCell className="space-y-2 min-w-[340px]">
              <Input value={record.href} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, href: event.target.value } : item)))} />
              <Input value={record.description} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, description: event.target.value } : item)))} />
            </TableCell>
            <TableCell className="space-x-2">
              <Button size="sm" variant="outline" disabled={saving} onClick={() => void onSave(record)}>Save</Button>
              <Button size="sm" variant="destructive" disabled={saving} onClick={() => void onDelete(record.id)}>Delete</Button>
            </TableCell>
          </TableRow>
        ))}
      />
    </CrudCard>
  )
}

function CrudServiceTable({
  records,
  universities,
  saving,
  onChange,
  onSave,
  onDelete,
}: {
  records: ServiceRecord[]
  universities: University[]
  saving: boolean
  onChange: React.Dispatch<React.SetStateAction<ServiceRecord[]>>
  onSave: (record: ServiceRecord) => Promise<void>
  onDelete: (recordId: string) => Promise<void>
}) {
  return (
    <CrudCard title="Manage Services" description="Control service status cards on student pages.">
      <BaseCrudTable
        rows={records.map((record) => (
          <TableRow key={record.id}>
            <TableCell className="space-y-2 min-w-[260px]">
              <Input value={record.name} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, name: event.target.value } : item)))} />
              <select value={record.status} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, status: event.target.value as ServiceStatus } : item)))} className={cn('h-10 rounded-md border border-input bg-background px-3 text-sm', record.status === 'OPEN' ? 'text-emerald-600' : record.status === 'LIMITED' ? 'text-amber-600' : 'text-red-600')}>
                {serviceStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </TableCell>
            <TableCell>
              <select value={record.universityId} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, universityId: event.target.value } : item)))} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                {universities.map((university) => (
                  <option key={university.id} value={university.id}>{university.name}</option>
                ))}
              </select>
            </TableCell>
            <TableCell className="space-y-2 min-w-[300px]">
              <Input value={record.hours} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, hours: event.target.value } : item)))} />
              <Input value={record.location} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, location: event.target.value } : item)))} />
              <Input value={record.directionsUrl} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, directionsUrl: event.target.value } : item)))} />
            </TableCell>
            <TableCell className="space-x-2">
              <Button size="sm" variant="outline" disabled={saving} onClick={() => void onSave(record)}>Save</Button>
              <Button size="sm" variant="destructive" disabled={saving} onClick={() => void onDelete(record.id)}>Delete</Button>
            </TableCell>
          </TableRow>
        ))}
      />
    </CrudCard>
  )
}

function CrudClubTable({
  records,
  universities,
  saving,
  onChange,
  onSave,
  onDelete,
}: {
  records: ClubRecord[]
  universities: University[]
  saving: boolean
  onChange: React.Dispatch<React.SetStateAction<ClubRecord[]>>
  onSave: (record: ClubRecord) => Promise<void>
  onDelete: (recordId: string) => Promise<void>
}) {
  return (
    <CrudCard title="Manage Clubs" description="Maintain clubs and organizations by university.">
      <BaseCrudTable
        rows={records.map((record) => (
          <TableRow key={record.id}>
            <TableCell className="space-y-2 min-w-[260px]">
              <Input value={record.name} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, name: event.target.value } : item)))} />
              <Input value={record.category} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, category: event.target.value } : item)))} />
            </TableCell>
            <TableCell>
              <select value={record.universityId} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, universityId: event.target.value } : item)))} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                {universities.map((university) => (
                  <option key={university.id} value={university.id}>{university.name}</option>
                ))}
              </select>
            </TableCell>
            <TableCell className="space-y-2 min-w-[320px]">
              <Input value={record.description} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, description: event.target.value } : item)))} />
              <Input value={record.contactEmail ?? ''} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, contactEmail: event.target.value || null } : item)))} placeholder="Contact email" />
              <Input value={record.websiteUrl ?? ''} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, websiteUrl: event.target.value || null } : item)))} placeholder="Website" />
              <Input value={record.meetingInfo ?? ''} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, meetingInfo: event.target.value || null } : item)))} placeholder="Meeting info" />
            </TableCell>
            <TableCell className="space-x-2">
              <Button size="sm" variant="outline" disabled={saving} onClick={() => void onSave(record)}>Save</Button>
              <Button size="sm" variant="destructive" disabled={saving} onClick={() => void onDelete(record.id)}>Delete</Button>
            </TableCell>
          </TableRow>
        ))}
      />
    </CrudCard>
  )
}

function CrudEventTable({
  records,
  universities,
  saving,
  onChange,
  onSave,
  onDelete,
}: {
  records: EventRecord[]
  universities: University[]
  saving: boolean
  onChange: React.Dispatch<React.SetStateAction<EventRecord[]>>
  onSave: (record: EventRecord) => Promise<void>
  onDelete: (recordId: string) => Promise<void>
}) {
  return (
    <CrudCard title="Manage Events" description="Edit event data visible in student event discovery.">
      <BaseCrudTable
        rows={records.map((record) => (
          <TableRow key={record.id}>
            <TableCell className="space-y-2 min-w-[280px]">
              <Input value={record.title} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, title: event.target.value } : item)))} />
              <Input value={record.description} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, description: event.target.value } : item)))} />
              <Input value={record.organizer} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, organizer: event.target.value } : item)))} />
            </TableCell>
            <TableCell className="space-y-2 min-w-[220px]">
              <select value={record.universityId ?? ''} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, universityId: event.target.value } : item)))} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                {universities.map((university) => (
                  <option key={university.id} value={university.id}>{university.name}</option>
                ))}
              </select>
              <Input type="datetime-local" value={formatDateTimeInput(record.date)} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, date: new Date(event.target.value).toISOString() } : item)))} />
              <Input value={record.time} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, time: event.target.value } : item)))} />
              <Input value={record.location} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, location: event.target.value } : item)))} />
            </TableCell>
            <TableCell className="space-y-2">
              <select value={record.category} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, category: event.target.value as EventRecord['category'] } : item)))} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                {eventCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={record.isPublished} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, isPublished: event.target.checked } : item)))} />
                Published
              </label>
              <Badge variant={record.isPublished ? 'success' : 'secondary'}>{record.isPublished ? 'Live' : 'Draft'}</Badge>
            </TableCell>
            <TableCell className="space-x-2">
              <Button size="sm" variant="outline" disabled={saving || !record.universityId} onClick={() => void onSave(record)}>Save</Button>
              <Button size="sm" variant="destructive" disabled={saving} onClick={() => void onDelete(record.id)}>Delete</Button>
            </TableCell>
          </TableRow>
        ))}
      />
    </CrudCard>
  )
}

function CrudPortalAccountsTable({
  records,
  universities,
  clubs,
  saving,
  onChange,
  onTogglePermission,
  onToggleManagedClub,
  onSave,
  onDelete,
}: {
  records: PortalAccountRecord[]
  universities: University[]
  clubs: ClubRecord[]
  saving: boolean
  onChange: React.Dispatch<React.SetStateAction<PortalAccountRecord[]>>
  onTogglePermission: (accountId: string, permission: PortalPermission) => void
  onToggleManagedClub: (accountId: string, clubId: string) => void
  onSave: (record: PortalAccountRecord) => Promise<void>
  onDelete: (recordId: string) => Promise<void>
}) {
  return (
    <CrudCard
      title="Manage Portal Accounts"
      description="Update role access levels, tab permissions, and club assignment scope."
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>University</TableHead>
              <TableHead>Access</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Managed Clubs</TableHead>
              <TableHead className="w-[220px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => {
              const assignedClubIds = new Set(
                record.managedClubs.map((assignment) => assignment.clubId),
              )

              return (
                <TableRow key={record.id}>
                  <TableCell className="space-y-2 min-w-[260px]">
                    <Input
                      value={record.firstName}
                      onChange={(event) =>
                        onChange((current) =>
                          current.map((item) =>
                            item.id === record.id
                              ? {
                                  ...item,
                                  firstName: event.target.value,
                                  displayName: `${event.target.value} ${item.lastName}`.trim(),
                                }
                              : item,
                          ),
                        )
                      }
                    />
                    <Input
                      value={record.lastName}
                      onChange={(event) =>
                        onChange((current) =>
                          current.map((item) =>
                            item.id === record.id
                              ? {
                                  ...item,
                                  lastName: event.target.value,
                                  displayName: `${item.firstName} ${event.target.value}`.trim(),
                                }
                              : item,
                          ),
                        )
                      }
                    />
                    <Input value={record.email} disabled />
                  </TableCell>
                  <TableCell>
                    <select
                      value={record.universityId ?? ''}
                      disabled
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Unscoped</option>
                      {universities.map((university) => (
                        <option key={university.id} value={university.id}>
                          {university.name}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell className="space-y-2 min-w-[220px]">
                    <select
                      value={record.role}
                      onChange={(event) =>
                        onChange((current) =>
                          current.map((item) =>
                            item.id === record.id
                              ? {
                                  ...item,
                                  role: event.target.value as 'STUDENT' | 'FACULTY' | 'ADMIN',
                                }
                              : item,
                          ),
                        )
                      }
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="FACULTY">Faculty</option>
                      <option value="STUDENT">Student</option>
                    </select>
                    <select
                      value={record.adminAccessLevel ?? ''}
                      onChange={(event) =>
                        onChange((current) =>
                          current.map((item) =>
                            item.id === record.id
                              ? {
                                  ...item,
                                  adminAccessLevel: (event.target.value || null) as
                                    | AdminAccessLevel
                                    | null,
                                }
                              : item,
                          ),
                        )
                      }
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">No access level</option>
                      {accessLevelOptions.map((level) => (
                        <option key={level} value={level}>
                          {level.replaceAll('_', ' ')}
                        </option>
                      ))}
                    </select>
                    <Badge variant="outline">{record.adminAccessLevel ?? 'CUSTOM'}</Badge>
                  </TableCell>
                  <TableCell className="min-w-[360px]">
                    <div className="grid gap-1.5 md:grid-cols-2">
                      {portalPermissionOptions.map((permission) => (
                        <label
                          key={`${record.id}-${permission}`}
                          className="inline-flex items-center gap-1.5 rounded-md border border-input px-2 py-1 text-[11px]"
                        >
                          <input
                            type="checkbox"
                            checked={record.portalPermissions.includes(permission)}
                            onChange={() => onTogglePermission(record.id, permission)}
                          />
                          {portalPermissionLabels[permission]}
                        </label>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[240px]">
                    <div className="grid gap-1.5">
                      {clubs.map((club) => (
                        <label
                          key={`${record.id}-${club.id}`}
                          className="inline-flex items-center gap-1.5 rounded-md border border-input px-2 py-1 text-[11px]"
                        >
                          <input
                            type="checkbox"
                            checked={assignedClubIds.has(club.id)}
                            onChange={() => onToggleManagedClub(record.id, club.id)}
                          />
                          {club.name}
                        </label>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={saving}
                      onClick={() => void onSave(record)}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={saving}
                      onClick={() => void onDelete(record.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </CrudCard>
  )
}

function CrudUsersTable({
  records,
  searchQuery,
  roleFilter,
  saving,
  onChange,
  onSave,
  onDelete,
}: {
  records: UserRecord[]
  searchQuery: string
  roleFilter: string
  saving: boolean
  onChange: React.Dispatch<React.SetStateAction<UserRecord[]>>
  onSave: (record: UserRecord) => Promise<void>
  onDelete: (recordId: string) => Promise<void>
}) {
  const q = searchQuery.toLowerCase()
  const filtered = records.filter((u) => {
    const matchesRole = !roleFilter || u.role === roleFilter
    const matchesSearch =
      !q ||
      u.email.toLowerCase().includes(q) ||
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.displayName.toLowerCase().includes(q)
    return matchesRole && matchesSearch
  })

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'destructive' as const
      case 'FACULTY':
        return 'default' as const
      default:
        return 'secondary' as const
    }
  }

  return (
    <CrudCard title="Manage Users" description="Edit user profiles, roles, and metadata directly.">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name / Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[220px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="space-y-2 min-w-[260px]">
                  <Input
                    value={record.firstName}
                    placeholder="First name"
                    onChange={(event) =>
                      onChange((current) =>
                        current.map((item) =>
                          item.id === record.id
                            ? {
                                ...item,
                                firstName: event.target.value,
                                displayName: `${event.target.value} ${item.lastName}`.trim(),
                              }
                            : item,
                        ),
                      )
                    }
                  />
                  <Input
                    value={record.lastName}
                    placeholder="Last name"
                    onChange={(event) =>
                      onChange((current) =>
                        current.map((item) =>
                          item.id === record.id
                            ? {
                                ...item,
                                lastName: event.target.value,
                                displayName: `${item.firstName} ${event.target.value}`.trim(),
                              }
                            : item,
                        ),
                      )
                    }
                  />
                  <Input value={record.email} disabled className="text-xs text-muted-foreground" />
                </TableCell>
                <TableCell className="space-y-2 min-w-[160px]">
                  <select
                    value={record.role}
                    onChange={(event) =>
                      onChange((current) =>
                        current.map((item) =>
                          item.id === record.id
                            ? { ...item, role: event.target.value as 'STUDENT' | 'FACULTY' | 'ADMIN' }
                            : item,
                        ),
                      )
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="STUDENT">Student</option>
                    <option value="FACULTY">Faculty</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  {record.role === 'ADMIN' && (
                    <select
                      value={record.adminAccessLevel ?? ''}
                      onChange={(event) =>
                        onChange((current) =>
                          current.map((item) =>
                            item.id === record.id
                              ? {
                                  ...item,
                                  adminAccessLevel: (event.target.value || null) as AdminAccessLevel | null,
                                }
                              : item,
                          ),
                        )
                      }
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">No Access Level</option>
                      <option value="OWNER">Owner</option>
                      <option value="IT_ADMIN">IT Admin</option>
                      <option value="CLUB_PRESIDENT">Club President</option>
                    </select>
                  )}
                </TableCell>
                <TableCell className="space-y-2 min-w-[220px]">
                  <Input
                    value={record.major ?? ''}
                    placeholder="Major"
                    onChange={(event) =>
                      onChange((current) =>
                        current.map((item) =>
                          item.id === record.id ? { ...item, major: event.target.value || null } : item,
                        ),
                      )
                    }
                  />
                  <Input
                    value={record.department ?? ''}
                    placeholder="Department"
                    onChange={(event) =>
                      onChange((current) =>
                        current.map((item) =>
                          item.id === record.id ? { ...item, department: event.target.value || null } : item,
                        ),
                      )
                    }
                  />
                  <Input
                    value={record.year ?? ''}
                    placeholder="Year"
                    onChange={(event) =>
                      onChange((current) =>
                        current.map((item) =>
                          item.id === record.id ? { ...item, year: event.target.value || null } : item,
                        ),
                      )
                    }
                  />
                </TableCell>
                <TableCell className="space-y-1.5 min-w-[140px]">
                  <Badge variant={roleBadgeVariant(record.role)}>{record.role}</Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {record.emailVerified ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                    )}
                    {record.emailVerified ? 'Verified' : 'Unverified'}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {record.onboardingComplete ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                    )}
                    {record.onboardingComplete ? 'Onboarded' : 'Pending'}
                  </div>
                  {record.createdAt && (
                    <p className="text-[10px] text-muted-foreground/70">
                      Joined {new Date(record.createdAt).toLocaleDateString()}
                    </p>
                  )}
                  {record.lastLogin && (
                    <p className="text-[10px] text-muted-foreground/70">
                      Last login {new Date(record.lastLogin).toLocaleDateString()}
                    </p>
                  )}
                </TableCell>
                <TableCell className="space-x-2">
                  <Button size="sm" variant="outline" disabled={saving} onClick={() => void onSave(record)}>
                    Save
                  </Button>
                  <Button size="sm" variant="destructive" disabled={saving} onClick={() => void onDelete(record.id)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </CrudCard>
  )
}

function CrudCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function BaseCrudTable({ rows }: { rows: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Details</TableHead>
            <TableHead>University</TableHead>
            <TableHead>Additional</TableHead>
            <TableHead className="w-[220px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{rows}</TableBody>
      </Table>
    </div>
  )
}
