'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Building2, CalendarDays, ExternalLink, Landmark, Loader2, School, Users, Wrench } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ApiClientError, apiRequest } from '@/lib/api/client'
import { cn } from '@/lib/utils'

type TabValue =
  | 'overview'
  | 'universities'
  | 'faculty'
  | 'buildings'
  | 'links'
  | 'services'
  | 'clubs'
  | 'events'

const tabItems: Array<{ value: TabValue; label: string; icon: React.ElementType }> = [
  { value: 'overview', label: 'Overview', icon: Landmark },
  { value: 'universities', label: 'Universities', icon: School },
  { value: 'faculty', label: 'Faculty', icon: Users },
  { value: 'buildings', label: 'Buildings', icon: Building2 },
  { value: 'links', label: 'Resource Links', icon: ExternalLink },
  { value: 'services', label: 'Services', icon: Wrench },
  { value: 'clubs', label: 'Clubs', icon: Users },
  { value: 'events', label: 'Events', icon: CalendarDays },
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

type BuildingRecord = {
  id: string
  universityId: string
  name: string
  code: string | null
  type: string
  address: string
  mapQuery: string
  university?: { id: string; name: string; slug: string } | null
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

  const requestedTab = searchParams.get('tab') as TabValue | null
  const currentTab = tabItems.some((item) => item.value === requestedTab) ? requestedTab ?? 'overview' : 'overview'
  const [activeTab, setActiveTab] = React.useState<TabValue>(currentTab)

  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  const [universities, setUniversities] = React.useState<University[]>([])
  const [faculty, setFaculty] = React.useState<FacultyRecord[]>([])
  const [buildings, setBuildings] = React.useState<BuildingRecord[]>([])
  const [resourceLinks, setResourceLinks] = React.useState<ResourceLinkRecord[]>([])
  const [services, setServices] = React.useState<ServiceRecord[]>([])
  const [clubs, setClubs] = React.useState<ClubRecord[]>([])
  const [events, setEvents] = React.useState<EventRecord[]>([])

  const [selectedUniversityId, setSelectedUniversityId] = React.useState('')

  const [newUniversity, setNewUniversity] = React.useState({ name: '', domain: '' })
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

  const loadData = React.useCallback(async () => {
    setLoading(true)

    try {
      const [nextUniversities, nextFaculty, nextBuildings, nextLinks, nextServices, nextClubs, nextEvents] =
        await Promise.all([
          apiRequest<University[]>('/api/admin/universities'),
          apiRequest<FacultyRecord[]>('/api/admin/faculty'),
          apiRequest<BuildingRecord[]>('/api/admin/buildings'),
          apiRequest<ResourceLinkRecord[]>('/api/admin/resource-links'),
          apiRequest<ServiceRecord[]>('/api/admin/services'),
          apiRequest<ClubRecord[]>('/api/admin/clubs'),
          apiRequest<EventRecord[]>('/api/admin/events'),
        ])

      setUniversities(nextUniversities)
      setFaculty(nextFaculty)
      setBuildings(nextBuildings)
      setResourceLinks(nextLinks)
      setServices(nextServices)
      setClubs(nextClubs)
      setEvents(nextEvents)

      const defaultUniversityId = nextUniversities[0]?.id ?? ''
      setSelectedUniversityId((current) => current || defaultUniversityId)

      setNewFaculty((current) => ({ ...current, universityId: current.universityId || defaultUniversityId }))
      setNewBuilding((current) => ({ ...current, universityId: current.universityId || defaultUniversityId }))
      setNewLink((current) => ({ ...current, universityId: current.universityId || defaultUniversityId }))
      setNewService((current) => ({ ...current, universityId: current.universityId || defaultUniversityId }))
      setNewClub((current) => ({ ...current, universityId: current.universityId || defaultUniversityId }))
      setNewEvent((current) => ({ ...current, universityId: current.universityId || defaultUniversityId }))
    } catch (error) {
      toast.error(asErrorMessage(error, 'Unable to load admin data'))
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadData()
  }, [loadData])

  React.useEffect(() => {
    setActiveTab(currentTab)
  }, [currentTab])

  React.useEffect(() => {
    if (!selectedUniversityId) return

    setNewFaculty((current) => ({ ...current, universityId: selectedUniversityId }))
    setNewBuilding((current) => ({ ...current, universityId: selectedUniversityId }))
    setNewLink((current) => ({ ...current, universityId: selectedUniversityId }))
    setNewService((current) => ({ ...current, universityId: selectedUniversityId }))
    setNewClub((current) => ({ ...current, universityId: selectedUniversityId }))
    setNewEvent((current) => ({ ...current, universityId: selectedUniversityId }))
  }, [selectedUniversityId])

  const handleTabChange = (nextTab: string) => {
    const normalized = nextTab as TabValue
    setActiveTab(normalized)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', normalized)
    router.replace(`/admin?${params.toString()}`, { scroll: false })
  }

  const withinSelectedUniversity = <T extends { universityId: string | null | undefined }>(records: T[]) => {
    if (!selectedUniversityId) return records
    return records.filter((record) => record.universityId === selectedUniversityId)
  }

  const runMutation = async (action: () => Promise<void>, successMessage: string) => {
    setSaving(true)

    try {
      await action()
      toast.success(successMessage)
      await loadData()
    } catch (error) {
      toast.error(asErrorMessage(error, 'Request failed'))
    } finally {
      setSaving(false)
    }
  }

  const overviewMetrics = [
    {
      label: 'Universities',
      value: `${universities.length}`,
      icon: School,
      helper: 'Tenant organizations configured',
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
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filter University</label>
            <select
              value={selectedUniversityId}
              onChange={(event) => setSelectedUniversityId(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All Universities</option>
              {universityOptions}
            </select>
          </div>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl border border-border/60 bg-card/70 p-1">
          {tabItems.map((item) => (
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
                  {universities.map((university) => (
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
              <CardTitle>Create University</CardTitle>
              <CardDescription>Add a new tenant with optional email domain mapping.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <Input
                value={newUniversity.name}
                onChange={(event) => setNewUniversity((current) => ({ ...current, name: event.target.value }))}
                placeholder="University name"
              />
              <Input
                value={newUniversity.domain}
                onChange={(event) => setNewUniversity((current) => ({ ...current, domain: event.target.value }))}
                placeholder="Email domain (optional)"
              />
              <div className="md:col-span-2">
                <Button
                  disabled={saving || !newUniversity.name.trim()}
                  onClick={() =>
                    void runMutation(async () => {
                      await apiRequest('/api/admin/universities', {
                        method: 'POST',
                        body: {
                          name: newUniversity.name,
                          domain: newUniversity.domain || undefined,
                        },
                      })
                      setNewUniversity({ name: '', domain: '' })
                    }, 'University created')
                  }
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create University'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle>Manage Universities</CardTitle>
              <CardDescription>Update names/domains, set custom theme colors, or delete empty tenants.</CardDescription>
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
                  {universities.map((university) => (
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
              <CardTitle>Create Faculty Profile</CardTitle>
              <CardDescription>Add faculty entries tied to a university.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <select
                value={newFaculty.universityId}
                onChange={(event) => setNewFaculty((current) => ({ ...current, universityId: event.target.value }))}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select university</option>
                {universityOptions}
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
            universities={universities}
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
                  <option value="">Select university</option>
                  {universityOptions}
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
            universities={universities}
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

        <TabsContent value="links" className="mt-0 space-y-4">
          <SimpleCreateCard
            title="Create Resource Link"
            description="Links appear in the student Links Directory for the selected university."
            content={
              <>
                <select value={newLink.universityId} onChange={(event) => setNewLink((current) => ({ ...current, universityId: event.target.value }))} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Select university</option>
                  {universityOptions}
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
            universities={universities}
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
                  <option value="">Select university</option>
                  {universityOptions}
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
            universities={universities}
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
                  <option value="">Select university</option>
                  {universityOptions}
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
            universities={universities}
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
                  <option value="">Select university</option>
                  {universityOptions}
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
            universities={universities}
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
      </Tabs>

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
