'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Building2,
  CalendarDays,
  ExternalLink,
  KeyRound,
  Landmark,
  Loader2,
  School,
  ShieldUser,
  Upload,
  Users,
  Wrench,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  description: string | null
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
  })
  const [newBuilding, setNewBuilding] = React.useState({
    universityId: '',
    name: '',
    code: '',
    type: '',
    address: '',
    mapQuery: '',
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
      ])

      setFaculty(nextFaculty)
      setFacultySignupEmails(nextFacultySignupEmails)
      setBuildings(nextBuildings)
      setResourceLinks(nextLinks)
      setServices(nextServices)
      setClubs(nextClubs)
      setEvents(nextEvents)
      setPortalAccounts(nextAccounts)
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
    setNewFacultySignupEmail((current) => ({ ...current, universityId: selectedUniversityId }))
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

  const overviewMetrics = [
    {
      label: 'Working University',
      value: selectedUniversity?.name ?? 'Not selected',
      icon: School,
      helper: 'All dashboard data is scoped to this university',
    },
    {
      label: 'Faculty Profiles',
      value: `${faculty.length}`,
      icon: Users,
      helper: 'Directory entries available to students',
    },
    {
      label: 'Campus Content Items',
      value: `${buildings.length + resourceLinks.length + services.length + clubs.length + events.length}`,
      icon: Landmark,
      helper: 'Buildings, links, services, clubs, and events',
    },
  ]

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
    <div className="space-y-6 animate-in-up">
      <section className="rounded-2xl border border-border/60 bg-card/75 p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin CRUD Console</p>
            <h2 className="mt-1 text-2xl font-display font-extrabold tracking-tight">University-Scoped Data Management</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create, update, and delete data by university so student-facing content stays tenant-specific.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Working University</p>
            <p className="text-sm font-medium">
              {selectedUniversity?.name ?? 'Choose a university to continue'}
            </p>
          </div>
        </div>
      </section>

      {selectedUniversity ? (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl border border-border/60 bg-card/70 p-1">
          {visibleTabs.map((item) => (
            <TabsTrigger key={item.value} value={item.value} className="rounded-lg px-3 py-2 text-xs md:text-sm">
              <item.icon className="mr-1.5 h-3.5 w-3.5" />
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-0 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {overviewMetrics.map((metric) => (
              <Card key={metric.label} className="rounded-2xl border-border/60">
                <CardContent className="p-4">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                    <metric.icon className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <p className="text-2xl font-extrabold tracking-tight">{metric.value}</p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mt-0.5">{metric.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{metric.helper}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle>University Summary</CardTitle>
              <CardDescription>Counts shown per university to verify tenant isolation.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>University</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Faculty</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Resources</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scopedUniversities.map((university) => (
                    <TableRow key={university.id}>
                      <TableCell>
                        <p className="font-semibold">{university.name}</p>
                        <p className="text-xs text-muted-foreground">{university.slug}</p>
                      </TableCell>
                      <TableCell>{university._count?.users ?? 0}</TableCell>
                      <TableCell>{university._count?.faculties ?? 0}</TableCell>
                      <TableCell>{university._count?.events ?? 0}</TableCell>
                      <TableCell>
                        {(university._count?.buildings ?? 0) +
                          (university._count?.resourceLinks ?? 0) +
                          (university._count?.services ?? 0) +
                          (university._count?.clubs ?? 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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

        <TabsContent value="faculty" className="mt-0 space-y-4">
          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle>Allow Faculty Signup Email</CardTitle>
              <CardDescription>
                Add faculty emails that are allowed to use the faculty OTP activation flow.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <select
                value={newFacultySignupEmail.universityId}
                onChange={(event) =>
                  setNewFacultySignupEmail((current) => ({
                    ...current,
                    universityId: event.target.value,
                  }))
                }
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {scopedUniversityOptions}
              </select>
              <Input
                value={newFacultySignupEmail.email}
                onChange={(event) =>
                  setNewFacultySignupEmail((current) => ({
                    ...current,
                    email: event.target.value.toLowerCase(),
                  }))
                }
                placeholder="Faculty email"
              />
              <Input
                value={newFacultySignupEmail.firstName}
                onChange={(event) =>
                  setNewFacultySignupEmail((current) => ({
                    ...current,
                    firstName: event.target.value,
                  }))
                }
                placeholder="First name (optional)"
              />
              <Input
                value={newFacultySignupEmail.lastName}
                onChange={(event) =>
                  setNewFacultySignupEmail((current) => ({
                    ...current,
                    lastName: event.target.value,
                  }))
                }
                placeholder="Last name (optional)"
              />
              <div>
                <Button
                  disabled={
                    saving ||
                    !newFacultySignupEmail.universityId ||
                    !newFacultySignupEmail.email.trim()
                  }
                  onClick={() =>
                    void runMutation(async () => {
                      await apiRequest('/api/admin/faculty/signup-emails', {
                        method: 'POST',
                        body: {
                          universityId: newFacultySignupEmail.universityId,
                          email: newFacultySignupEmail.email,
                          firstName: newFacultySignupEmail.firstName || undefined,
                          lastName: newFacultySignupEmail.lastName || undefined,
                        },
                      })

                      setNewFacultySignupEmail({
                        universityId: selectedUniversityId,
                        email: '',
                        firstName: '',
                        lastName: '',
                      })
                    }, 'Faculty signup email added')
                  }
                >
                  Add Faculty Email
                </Button>
              </div>
            </CardContent>
          </Card>

          <CrudFacultySignupEmailsTable
            records={withinSelectedUniversity(facultySignupEmails)}
            universities={scopedUniversities}
            saving={saving}
            onDelete={(recordId) =>
              runMutation(
                async () => {
                  await apiRequest(`/api/admin/faculty/signup-emails/${recordId}`, {
                    method: 'DELETE',
                  })
                },
                'Faculty signup email removed',
              )
            }
          />

          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle>Create Faculty Profile</CardTitle>
              <CardDescription>Add faculty entries tied to a university.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <select
                value={newFaculty.universityId}
                onChange={(event) => setNewFaculty((current) => ({ ...current, universityId: event.target.value }))}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {scopedUniversityOptions}
              </select>
              <Input value={newFaculty.name} onChange={(event) => setNewFaculty((current) => ({ ...current, name: event.target.value }))} placeholder="Full name" />
              <Input value={newFaculty.email} onChange={(event) => setNewFaculty((current) => ({ ...current, email: event.target.value }))} placeholder="Email" />
              <Input value={newFaculty.title} onChange={(event) => setNewFaculty((current) => ({ ...current, title: event.target.value }))} placeholder="Title" />
              <Input value={newFaculty.department} onChange={(event) => setNewFaculty((current) => ({ ...current, department: event.target.value }))} placeholder="Department" />
              <Input value={newFaculty.officeLocation} onChange={(event) => setNewFaculty((current) => ({ ...current, officeLocation: event.target.value }))} placeholder="Office location" />
              <Input value={newFaculty.officeHours} onChange={(event) => setNewFaculty((current) => ({ ...current, officeHours: event.target.value }))} placeholder="Office hours" />
              <Input value={newFaculty.courses} onChange={(event) => setNewFaculty((current) => ({ ...current, courses: event.target.value }))} placeholder="Courses (comma separated)" />
              <Input value={newFaculty.tags} onChange={(event) => setNewFaculty((current) => ({ ...current, tags: event.target.value }))} placeholder="Tags (comma separated)" />
              <label className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={newFaculty.canPublishCampusAnnouncements}
                  onChange={(event) =>
                    setNewFaculty((current) => ({
                      ...current,
                      canPublishCampusAnnouncements: event.target.checked,
                    }))
                  }
                />
                Can publish campus announcements
              </label>
              <div>
                <Button
                  disabled={saving || !newFaculty.universityId || !newFaculty.name || !newFaculty.email}
                  onClick={() =>
                    void runMutation(async () => {
                      await apiRequest('/api/admin/faculty', {
                        method: 'POST',
                        body: {
                          universityId: newFaculty.universityId,
                          name: newFaculty.name,
                          email: newFaculty.email,
                          canPublishCampusAnnouncements: newFaculty.canPublishCampusAnnouncements,
                          title: newFaculty.title,
                          department: newFaculty.department,
                          officeLocation: newFaculty.officeLocation,
                          officeHours: newFaculty.officeHours,
                          courses: splitCsv(newFaculty.courses),
                          tags: splitCsv(newFaculty.tags),
                        },
                      })

                      setNewFaculty({
                        universityId: selectedUniversityId,
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
                    }, 'Faculty profile created')
                  }
                >
                  Create Faculty
                </Button>
              </div>
            </CardContent>
          </Card>

          <CrudFacultyTable
            faculty={withinSelectedUniversity(faculty)}
            universities={scopedUniversities}
            saving={saving}
            onChange={setFaculty}
            onSave={(record) =>
              runMutation(
                async () => {
                  await apiRequest(`/api/admin/faculty/${record.id}`, {
                    method: 'PATCH',
                    body: {
                      universityId: record.universityId,
                      name: record.name,
                      email: record.email,
                      canPublishCampusAnnouncements: Boolean(
                        record.user?.canPublishCampusAnnouncements,
                      ),
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
                },
                'Faculty updated',
              )
            }
            onDelete={(recordId) =>
              runMutation(
                async () => {
                  await apiRequest(`/api/admin/faculty/${recordId}`, { method: 'DELETE' })
                },
                'Faculty deleted',
              )
            }
          />
        </TabsContent>

        <TabsContent value="buildings" className="mt-0 space-y-4">
          <SimpleCreateCard
            title="Create Building"
            description="Buildings power the campus map and location metadata."
            content={
              <>
                <select value={newBuilding.universityId} onChange={(event) => setNewBuilding((current) => ({ ...current, universityId: event.target.value }))} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {scopedUniversityOptions}
                </select>
                <Input value={newBuilding.name} onChange={(event) => setNewBuilding((current) => ({ ...current, name: event.target.value }))} placeholder="Building name" />
                <Input value={newBuilding.code} onChange={(event) => setNewBuilding((current) => ({ ...current, code: event.target.value }))} placeholder="Code (optional)" />
                <Input value={newBuilding.type} onChange={(event) => setNewBuilding((current) => ({ ...current, type: event.target.value }))} placeholder="Type (Resource, Faculty Office...)" />
                <Input value={newBuilding.address} onChange={(event) => setNewBuilding((current) => ({ ...current, address: event.target.value }))} placeholder="Address" />
                <Input value={newBuilding.mapQuery} onChange={(event) => setNewBuilding((current) => ({ ...current, mapQuery: event.target.value }))} placeholder="Map query" />
                <Button
                  disabled={saving || !newBuilding.universityId || !newBuilding.name || !newBuilding.type || !newBuilding.address || !newBuilding.mapQuery}
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
                        },
                      })

                      setNewBuilding({
                        universityId: selectedUniversityId,
                        name: '',
                        code: '',
                        type: '',
                        address: '',
                        mapQuery: '',
                      })
                    }, 'Building created')
                  }
                >
                  Create Building
                </Button>
              </>
            }
          />

          <CrudBuildingTable
            records={withinSelectedUniversity(buildings)}
            universities={scopedUniversities}
            saving={saving}
            onChange={setBuildings}
            onSave={(record) =>
              runMutation(async () => {
                await apiRequest(`/api/admin/buildings/${record.id}`, {
                  method: 'PATCH',
                  body: {
                    universityId: record.universityId,
                    name: record.name,
                    code: record.code || undefined,
                    type: record.type,
                    address: record.address,
                    mapQuery: record.mapQuery,
                  },
                })
              }, 'Building updated')
            }
            onDelete={(recordId) =>
              runMutation(async () => {
                await apiRequest(`/api/admin/buildings/${recordId}`, { method: 'DELETE' })
              }, 'Building deleted')
            }
          />
        </TabsContent>

        <TabsContent value="building-import" className="mt-0 space-y-4">
          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle>Import Buildings From CSV</CardTitle>
              <CardDescription>
                Upload a CSV and import records for the university currently in scope.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    University
                  </label>
                  <select
                    value={buildingImportUniversityId}
                    onChange={(event) => setBuildingImportUniversityId(event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {scopedUniversityOptions}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    CSV File
                  </label>
                  <Input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(event) =>
                      void handleBuildingImportFileSelected(event.target.files?.[0] ?? null)
                    }
                  />
                </div>
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
                    {buildingImportValidation.valid
                      ? 'CSV headers look good.'
                      : 'CSV headers do not match the required format.'}
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

              <Button
                disabled={
                  saving ||
                  !buildingImportUniversityId ||
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

                      return result
                    },
                    (result) =>
                      `Imported ${result.totalRows} rows (${result.createdCount} created, ${result.updatedCount} updated)`,
                  )
                }
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Import Buildings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

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

function CrudFacultySignupEmailsTable({
  records,
  universities,
  saving,
  onDelete,
}: {
  records: FacultySignupEmailRecord[]
  universities: University[]
  saving: boolean
  onDelete: (recordId: string) => Promise<void>
}) {
  return (
    <CrudCard
      title="Manage Faculty Signup Emails"
      description="Emails listed here can complete faculty OTP verification and password setup."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>University</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[160px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id}>
              <TableCell>{record.email}</TableCell>
              <TableCell>{record.displayName}</TableCell>
              <TableCell>
                {record.university?.name ??
                  universities.find((university) => university.id === record.universityId)?.name ??
                  'Unassigned'}
              </TableCell>
              <TableCell>
                <Badge variant={record.emailVerified ? 'success' : 'secondary'}>
                  {record.emailVerified ? 'Activated' : 'Pending Signup'}
                </Badge>
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={saving}
                  onClick={() => void onDelete(record.id)}
                >
                  Remove
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CrudCard>
  )
}

function CrudFacultyTable({
  faculty,
  universities,
  saving,
  onChange,
  onSave,
  onDelete,
}: {
  faculty: FacultyRecord[]
  universities: University[]
  saving: boolean
  onChange: React.Dispatch<React.SetStateAction<FacultyRecord[]>>
  onSave: (record: FacultyRecord) => Promise<void>
  onDelete: (recordId: string) => Promise<void>
}) {
  return (
    <CrudCard title="Manage Faculty" description="Edit faculty directory records and university assignment.">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Faculty</TableHead>
            <TableHead>University</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead>Courses/Tags</TableHead>
            <TableHead className="w-[220px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {faculty.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="space-y-2 min-w-[320px]">
                <Input value={record.name} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, name: event.target.value } : item)))} />
                <Input value={record.email} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, email: event.target.value } : item)))} />
                <Input value={record.title} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, title: event.target.value } : item)))} />
                <Input value={record.officeLocation} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, officeLocation: event.target.value } : item)))} />
                <Input value={record.officeHours} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, officeHours: event.target.value } : item)))} />
              </TableCell>
              <TableCell>
                <select
                  value={record.universityId ?? ''}
                  onChange={(event) =>
                    onChange((current) => current.map((item) => (item.id === record.id ? { ...item, universityId: event.target.value } : item)))
                  }
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {universities.map((university) => (
                    <option key={university.id} value={university.id}>
                      {university.name}
                    </option>
                  ))}
                </select>
              </TableCell>
              <TableCell>
                <Input value={record.department} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, department: event.target.value } : item)))} />
              </TableCell>
              <TableCell className="min-w-[220px]">
                <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={Boolean(record.user?.canPublishCampusAnnouncements)}
                    onChange={(event) =>
                      onChange((current) =>
                        current.map((item) =>
                          item.id === record.id
                            ? {
                                ...item,
                                user: {
                                  id: item.user?.id ?? '',
                                  email: item.user?.email ?? item.email,
                                  role: item.user?.role ?? 'FACULTY',
                                  canPublishCampusAnnouncements: event.target.checked,
                                },
                              }
                            : item,
                        ),
                      )
                    }
                  />
                  Campus announcements
                </label>
              </TableCell>
              <TableCell className="space-y-2 min-w-[260px]">
                <Input value={record.courses.join(', ')} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, courses: splitCsv(event.target.value) } : item)))} />
                <Input value={record.tags.join(', ')} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, tags: splitCsv(event.target.value) } : item)))} />
              </TableCell>
              <TableCell className="space-x-2">
                <Button size="sm" variant="outline" disabled={saving || !record.universityId} onClick={() => void onSave(record)}>
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
    </CrudCard>
  )
}

function CrudBuildingTable({
  records,
  universities,
  saving,
  onChange,
  onSave,
  onDelete,
}: {
  records: BuildingRecord[]
  universities: University[]
  saving: boolean
  onChange: React.Dispatch<React.SetStateAction<BuildingRecord[]>>
  onSave: (record: BuildingRecord) => Promise<void>
  onDelete: (recordId: string) => Promise<void>
}) {
  return (
    <CrudCard title="Manage Buildings" description="Edit map/location records by university.">
      <BaseCrudTable
        rows={records.map((record) => (
          <TableRow key={record.id}>
            <TableCell className="space-y-2 min-w-[260px]">
              <Input value={record.name} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, name: event.target.value } : item)))} />
              <Input value={record.code ?? ''} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, code: event.target.value || null } : item)))} placeholder="Code" />
              <Input value={record.type} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, type: event.target.value } : item)))} />
            </TableCell>
            <TableCell>
              <select value={record.universityId} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, universityId: event.target.value } : item)))} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                {universities.map((university) => (
                  <option key={university.id} value={university.id}>{university.name}</option>
                ))}
              </select>
            </TableCell>
            <TableCell className="space-y-2 min-w-[280px]">
              <Input value={record.address} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, address: event.target.value } : item)))} />
              <Input value={record.mapQuery} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, mapQuery: event.target.value } : item)))} />
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
