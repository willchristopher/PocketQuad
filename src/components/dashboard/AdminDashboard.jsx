'use client';
import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Building2, CalendarDays, CheckCircle2, ChevronDown, ChevronUp, Clock, ExternalLink, GraduationCap, KeyRound, Landmark, LayoutGrid, Loader2, Pencil, Plus, School, Search, ShieldUser, Tag, Trash2, Upload, Users, X, } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ApiClientError, apiRequest } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/context';
import { getAllowedAdminTabs, hasPortalPermission, } from '@/lib/auth/portalPermissions';
import { BuildingHoursEditor } from '@/components/buildings/BuildingHoursEditor';
import { BUILDING_IMPORT_OPTIONAL_HEADERS, BUILDING_IMPORT_REQUIRED_HEADERS, extractBuildingImportRows, validateBuildingImportHeaders } from '@/lib/buildingImport';
import { hasMeaningfulBuildingHoursSchedule, summarizeBuildingHoursSchedule } from '@/lib/buildingHours';
import { parseCsvText } from '@/lib/csv';
import { sanitizeDisabledStudentPages, studentPageVisibilityOptions } from '@/lib/studentPageVisibility';
import { cn } from '@/lib/utils';
const tabItems = [
    { value: 'overview', label: 'Overview', icon: Landmark },
    { value: 'universities', label: 'Universities', icon: School },
    { value: 'student-pages', label: 'Student Pages', icon: LayoutGrid },
    { value: 'faculty', label: 'Faculty', icon: Users },
    { value: 'buildings', label: 'Buildings', icon: Building2 },
    { value: 'building-import', label: 'Building Import', icon: Upload },
    { value: 'links', label: 'Resource Links', icon: ExternalLink },
    { value: 'clubs', label: 'Clubs', icon: Users },
    { value: 'events', label: 'Events', icon: CalendarDays },
    { value: 'it-accounts', label: 'IT Accounts', icon: ShieldUser },
    { value: 'users', label: 'Users', icon: Users },
];
const resourceCategories = [
    'LEARNING',
    'COMMUNICATION',
    'STUDENT_SERVICES',
    'FINANCE',
    'CAMPUS_LIFE',
    'OTHER',
];
const eventCategories = [
    'ACADEMIC',
    'SOCIAL',
    'SPORTS',
    'ARTS',
    'CAREER',
    'CLUBS',
    'WELLNESS',
    'OTHER',
];
const eventAudienceOptions = [
    'ORGANIZATION',
    'ALL_CAMPUS',
    'DEADLINE',
];
const eventAudienceLabels = {
    ORGANIZATION: 'Organization',
    ALL_CAMPUS: 'All campus',
    DEADLINE: 'Deadline',
};
const FACULTY_ROLE_TAG_OPTIONS = [
    'Club Advisor',
    'Academic Advisor',
    'Student Government Advisor',
    'Residence Life',
    'Athletics Advisor',
    'Department Chair',
    'Program Director',
];
const STATUS_CONFIG = {
    OPEN: { label: 'Open', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30', icon: <CheckCircle2 className="h-2.5 w-2.5"/> },
    LIMITED: { label: 'Limited', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30', icon: <AlertCircle className="h-2.5 w-2.5"/> },
    CLOSED: { label: 'Closed', className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30', icon: <X className="h-2.5 w-2.5"/> },
};
const ACCOUNT_STATUS_META = {
    ACTIVE: {
        label: 'Active',
        variant: 'success',
        helper: 'Can sign in normally',
    },
    DORMANT: {
        label: 'Dormant',
        variant: 'secondary',
        helper: 'Waiting for signup claim',
    },
};
const accessLevelOptions = [
    'OWNER',
    'IT_ADMIN',
    'CLUB_PRESIDENT',
    'CONTENT_MANAGER',
];
const portalPermissionOptions = [
    'ADMIN_TAB_OVERVIEW',
    'ADMIN_TAB_UNIVERSITIES',
    'ADMIN_TAB_STUDENT_PAGES',
    'ADMIN_TAB_FACULTY',
    'ADMIN_TAB_BUILDINGS',
    'ADMIN_TAB_BUILDING_IMPORT',
    'ADMIN_TAB_LINKS',
    'ADMIN_TAB_CLUBS',
    'ADMIN_TAB_EVENTS',
    'ADMIN_TAB_IT_ACCOUNTS',
    'ADMIN_TAB_USERS',
    'CAN_PUBLISH_ANNOUNCEMENTS',
    'CAN_CREATE_DEADLINE_EVENTS',
    'CAN_MANAGE_CLUB_PROFILE',
    'CAN_MANAGE_CLUB_CONTACT',
];
const portalPermissionLabels = {
    ADMIN_PORTAL_ACCESS: 'Portal Access',
    ADMIN_TAB_OVERVIEW: 'Tab: Overview',
    ADMIN_TAB_UNIVERSITIES: 'Tab: Universities',
    ADMIN_TAB_STUDENT_PAGES: 'Tab: Student Pages',
    ADMIN_TAB_FACULTY: 'Tab: Faculty',
    ADMIN_TAB_BUILDINGS: 'Tab: Buildings',
    ADMIN_TAB_BUILDING_IMPORT: 'Tab: Building Import',
    ADMIN_TAB_LINKS: 'Tab: Resource Links',
    ADMIN_TAB_CLUBS: 'Tab: Clubs',
    ADMIN_TAB_EVENTS: 'Tab: Events',
    ADMIN_TAB_IT_ACCOUNTS: 'Tab: IT Accounts',
    ADMIN_TAB_USERS: 'Tab: Users',
    CAN_PUBLISH_ANNOUNCEMENTS: 'Publish Announcements',
    CAN_CREATE_DEADLINE_EVENTS: 'Create Deadline Events',
    CAN_MANAGE_CLUB_PROFILE: 'Manage Club Profile',
    CAN_MANAGE_CLUB_CONTACT: 'Manage Club Contact',
};
function asErrorMessage(error, fallback) {
    if (error instanceof ApiClientError) {
        return error.message;
    }
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return fallback;
}
function normalizeSearchValue(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}
function matchesSearch(value, query) {
    if (!query) {
        return true;
    }
    if (value === null || typeof value === 'undefined') {
        return false;
    }
    return `${value}`.toLowerCase().includes(query);
}
function matchesAnySearch(record, query, selectors) {
    if (!query) {
        return true;
    }
    return selectors.some((selector) => {
        const value = typeof selector === 'function' ? selector(record) : record?.[selector];
        if (Array.isArray(value)) {
            return value.some((item) => matchesSearch(item, query));
        }
        return matchesSearch(value, query);
    });
}
function formatDateTimeInput(value) {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}
function splitCsv(value) {
    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}
const coordinateFieldConfig = {
    latitude: {
        label: 'Latitude',
        min: -90,
        max: 90,
    },
    longitude: {
        label: 'Longitude',
        min: -180,
        max: 180,
    },
};
function formatCoordinateInput(value) {
    if (value === null || typeof value === 'undefined') {
        return '';
    }
    return `${value}`;
}
function parseCoordinateValue(value, field, blankValue) {
    const normalized = typeof value === 'string' ? value.trim() : value;
    if (normalized === '' || normalized === null || typeof normalized === 'undefined') {
        return blankValue;
    }
    const number = typeof normalized === 'number' ? normalized : Number(normalized);
    const config = coordinateFieldConfig[field];
    if (!Number.isFinite(number)) {
        throw new Error(`${config.label} must be a valid number`);
    }
    if (number < config.min || number > config.max) {
        throw new Error(`${config.label} must be between ${config.min} and ${config.max}`);
    }
    return number;
}
function buildBuildingPayload(building, options = {}) {
    const { clearBlankCoordinates = false } = options;
    return {
        universityId: building.universityId,
        name: building.name,
        code: building.code || undefined,
        type: building.type,
        address: building.address,
        mapQuery: building.mapQuery,
        latitude: parseCoordinateValue(building.latitude, 'latitude', clearBlankCoordinates ? null : undefined),
        longitude: parseCoordinateValue(building.longitude, 'longitude', clearBlankCoordinates ? null : undefined),
        purpose: building.purpose || undefined,
        operatingHours: building.operatingHours || undefined,
        operatingHoursSchedule: building.operatingHoursSchedule ?? null,
        operationalStatus: building.operationalStatus,
        operationalNote: building.operationalNote || undefined,
        description: building.description || undefined,
    };
}
export function AdminDashboard({ initialUniversities = null }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { profile } = useAuth();
    const allowedTabs = React.useMemo(() => {
        if (!profile)
            return tabItems.map((item) => item.value);
        const resolved = getAllowedAdminTabs(profile);
        return resolved.length > 0 ? resolved : ['overview'];
    }, [profile]);
    const visibleTabs = React.useMemo(() => tabItems.filter((item) => allowedTabs.includes(item.value)), [allowedTabs]);
    const requestedTab = searchParams.get('tab');
    const requestedUniversityId = searchParams.get('universityId') ?? '';
    const fallbackTab = visibleTabs[0]?.value ?? 'overview';
    const currentTab = requestedTab && visibleTabs.some((item) => item.value === requestedTab)
        ? requestedTab
        : fallbackTab;
    const [activeTab, setActiveTab] = React.useState(currentTab);
    const [loading, setLoading] = React.useState(!initialUniversities);
    const [saving, setSaving] = React.useState(false);
    const [universities, setUniversities] = React.useState(initialUniversities ?? []);
    const [faculty, setFaculty] = React.useState([]);
    const [facultySignupEmails, setFacultySignupEmails] = React.useState([]);
    const [buildings, setBuildings] = React.useState([]);
    const [resourceLinks, setResourceLinks] = React.useState([]);
    const [clubs, setClubs] = React.useState([]);
    const [events, setEvents] = React.useState([]);
    const [portalAccounts, setPortalAccounts] = React.useState([]);
    const [temporaryAccountPassword, setTemporaryAccountPassword] = React.useState(null);
    const [allUsers, setAllUsers] = React.useState([]);
    const [userSearchQuery, setUserSearchQuery] = React.useState('');
    const [userRoleFilter, setUserRoleFilter] = React.useState('');
    const [pendingInviteSearchQuery, setPendingInviteSearchQuery] = React.useState('');
    const [facultySearchQuery, setFacultySearchQuery] = React.useState('');
    const [buildingSearchQuery, setBuildingSearchQuery] = React.useState('');
    const [linkSearchQuery, setLinkSearchQuery] = React.useState('');
    const [clubSearchQuery, setClubSearchQuery] = React.useState('');
    const [eventSearchQuery, setEventSearchQuery] = React.useState('');
    const [portalAccountSearchQuery, setPortalAccountSearchQuery] = React.useState('');
    // UI expansion state
    const [expandedFacultyId, setExpandedFacultyId] = React.useState(null);
    const [expandedSignupEmailId, setExpandedSignupEmailId] = React.useState(null);
    const [expandedBuildingId, setExpandedBuildingId] = React.useState(null);
    const [showBuildingImport, setShowBuildingImport] = React.useState(false);
    const [selectedUniversityId, setSelectedUniversityId] = React.useState(requestedUniversityId);
    const [universitySelectionDraft, setUniversitySelectionDraft] = React.useState(requestedUniversityId);
    const [buildingImportUniversityId, setBuildingImportUniversityId] = React.useState('');
    const [buildingImportCsvContent, setBuildingImportCsvContent] = React.useState('');
    const [buildingImportFileName, setBuildingImportFileName] = React.useState('');
    const [buildingImportRowCount, setBuildingImportRowCount] = React.useState(0);
    const [buildingImportError, setBuildingImportError] = React.useState(null);
    const [buildingImportValidation, setBuildingImportValidation] = React.useState(null);
    const [newFacultySignupEmail, setNewFacultySignupEmail] = React.useState({
        universityId: '',
        email: '',
        firstName: '',
        lastName: '',
        canPublishCampusAnnouncements: false,
        canCreateDeadlineEvents: false,
        managesAllClubs: false,
        facultyRoleTags: [],
        managedBuildingIds: [],
        managedClubIds: [],
    });
    const [newBuilding, setNewBuilding] = React.useState({
        universityId: '',
        name: '',
        code: '',
        type: '',
        address: '',
        mapQuery: '',
        latitude: '',
        longitude: '',
        purpose: '',
        operatingHours: '',
        operatingHoursSchedule: null,
        operationalStatus: 'OPEN',
        operationalNote: '',
        description: '',
    });
    const [newLink, setNewLink] = React.useState({
        universityId: '',
        label: '',
        category: 'LEARNING',
        href: '',
        description: '',
    });
    const [newClub, setNewClub] = React.useState({
        universityId: '',
        name: '',
        category: '',
        description: '',
        contactEmail: '',
        presidentName: '',
        presidentEmail: '',
        advisorName: '',
        advisorEmail: '',
        publicContactInfo: '',
        sourceUrls: '',
        importNotes: '',
        websiteUrl: '',
        meetingInfo: '',
    });
    const [newEvent, setNewEvent] = React.useState({
        universityId: '',
        title: '',
        description: '',
        date: '',
        time: '',
        location: '',
        category: 'ACADEMIC',
        audience: 'ALL_CAMPUS',
        organizer: '',
        isPublished: true,
    });
    const [newPortalAccount, setNewPortalAccount] = React.useState({
        universityId: '',
        firstName: '',
        lastName: '',
        email: '',
        role: 'ADMIN',
        accessLevel: 'IT_ADMIN',
        portalPermissions: ['ADMIN_TAB_OVERVIEW', 'ADMIN_TAB_FACULTY', 'ADMIN_TAB_BUILDINGS'],
        managedClubIds: [],
        password: '',
    });
    const skippedInitialLoadRef = React.useRef(Boolean(initialUniversities));
    const canManageUniversities = !profile || hasPortalPermission(profile, 'ADMIN_TAB_UNIVERSITIES');
    const canManageStudentPages = !profile || hasPortalPermission(profile, 'ADMIN_TAB_STUDENT_PAGES');
    const canManageFaculty = !profile || hasPortalPermission(profile, 'ADMIN_TAB_FACULTY');
    const canManageBuildings = !profile || hasPortalPermission(profile, 'ADMIN_TAB_BUILDINGS');
    const canManageLinks = !profile || hasPortalPermission(profile, 'ADMIN_TAB_LINKS');
    const canManageClubs = !profile || hasPortalPermission(profile, 'ADMIN_TAB_CLUBS');
    const canManageEvents = !profile || hasPortalPermission(profile, 'ADMIN_TAB_EVENTS');
    const canManageAccounts = !profile || hasPortalPermission(profile, 'ADMIN_TAB_IT_ACCOUNTS');
    const canManageUsers = !profile || hasPortalPermission(profile, 'ADMIN_TAB_USERS');
    const fallbackUniversityFromProfile = React.useMemo(() => {
        if (!profile?.university)
            return [];
        return [
            {
                id: profile.university.id,
                name: profile.university.name,
                slug: profile.university.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                domain: profile.university.domain ?? null,
                themeMainColor: null,
                themeAccentColor: null,
                disabledStudentPages: profile.university.disabledStudentPages ?? [],
            },
        ];
    }, [profile]);
    const loadData = React.useCallback(async () => {
        setLoading(true);
        try {
            const nextUniversitiesRaw = canManageUniversities
                ? await apiRequest('/api/admin/universities')
                : fallbackUniversityFromProfile;
            const nextUniversities = nextUniversitiesRaw.length > 0 ? nextUniversitiesRaw : fallbackUniversityFromProfile;
            setUniversities(nextUniversities);
            const hasValidSelectedUniversity = selectedUniversityId.length > 0 &&
                nextUniversities.some((university) => university.id === selectedUniversityId);
            if (!hasValidSelectedUniversity) {
                setFaculty([]);
                setFacultySignupEmails([]);
                setBuildings([]);
                setResourceLinks([]);
                setClubs([]);
                setEvents([]);
                setPortalAccounts([]);
                setAllUsers([]);
                return;
            }
            const universityQuery = `?universityId=${encodeURIComponent(selectedUniversityId)}`;
            const sectionRequests = [
                {
                    key: 'faculty',
                    label: 'faculty',
                    enabled: canManageFaculty,
                    load: () => apiRequest(`/api/admin/faculty${universityQuery}`),
                    set: setFaculty,
                },
                {
                    key: 'faculty-signup-emails',
                    label: 'faculty signup emails',
                    enabled: canManageFaculty,
                    load: () => apiRequest(`/api/admin/faculty/signup-emails${universityQuery}`),
                    set: setFacultySignupEmails,
                },
                {
                    key: 'buildings',
                    label: 'buildings',
                    enabled: canManageBuildings,
                    load: () => apiRequest(`/api/admin/buildings${universityQuery}`),
                    set: setBuildings,
                },
                {
                    key: 'resource-links',
                    label: 'resource links',
                    enabled: canManageLinks,
                    load: () => apiRequest(`/api/admin/resource-links${universityQuery}`),
                    set: setResourceLinks,
                },
                {
                    key: 'clubs',
                    label: 'clubs',
                    enabled: canManageClubs || canManageAccounts,
                    load: () => apiRequest(`/api/admin/clubs${universityQuery}`),
                    set: setClubs,
                },
                {
                    key: 'events',
                    label: 'events',
                    enabled: canManageEvents,
                    load: () => apiRequest(`/api/admin/events${universityQuery}`),
                    set: setEvents,
                },
                {
                    key: 'accounts',
                    label: 'IT accounts',
                    enabled: canManageAccounts,
                    load: () => apiRequest(`/api/admin/accounts${universityQuery}`),
                    set: setPortalAccounts,
                },
                {
                    key: 'users',
                    label: 'users',
                    enabled: canManageUsers,
                    load: () => apiRequest(`/api/admin/users${universityQuery}`),
                    set: setAllUsers,
                },
            ];
            const sectionResults = await Promise.allSettled(sectionRequests.map((section) => section.enabled ? section.load() : Promise.resolve([])));
            const failedSections = [];
            sectionResults.forEach((result, index) => {
                const section = sectionRequests[index];
                if (result.status === 'fulfilled') {
                    section.set(result.value);
                    return;
                }
                section.set([]);
                failedSections.push({
                    label: section.label,
                    error: result.reason,
                });
            });
            if (failedSections.length === 1) {
                const failedSection = failedSections[0];
                toast.error(asErrorMessage(failedSection.error, `Unable to load ${failedSection.label}`));
            }
            else if (failedSections.length > 1) {
                toast.error(`Some admin sections could not be loaded: ${failedSections.map((section) => section.label).join(', ')}`);
            }
        }
        catch (error) {
            toast.error(asErrorMessage(error, 'Unable to load admin data'));
        }
        finally {
            setLoading(false);
        }
    }, [
        canManageAccounts,
        canManageBuildings,
        canManageClubs,
        canManageEvents,
        canManageFaculty,
        canManageLinks,
        canManageUniversities,
        canManageUsers,
        fallbackUniversityFromProfile,
        selectedUniversityId,
    ]);
    React.useEffect(() => {
        setSelectedUniversityId(requestedUniversityId);
        setUniversitySelectionDraft(requestedUniversityId);
    }, [requestedUniversityId]);
    React.useEffect(() => {
        if (skippedInitialLoadRef.current && !selectedUniversityId) {
            skippedInitialLoadRef.current = false;
            return;
        }
        skippedInitialLoadRef.current = false;
        void loadData();
    }, [loadData, selectedUniversityId]);
    React.useEffect(() => {
        setActiveTab(currentTab);
        if (requestedTab !== currentTab) {
            const params = new URLSearchParams(searchParams.toString());
            params.set('tab', currentTab);
            router.replace(`/admin?${params.toString()}`, { scroll: false });
        }
    }, [currentTab, requestedTab, router, searchParams]);
    React.useEffect(() => {
        if (!selectedUniversityId)
            return;
        if (universities.length === 0)
            return;
        if (universities.some((university) => university.id === selectedUniversityId))
            return;
        const params = new URLSearchParams(searchParams.toString());
        params.delete('universityId');
        router.replace(`/admin?${params.toString()}`, { scroll: false });
    }, [router, searchParams, selectedUniversityId, universities]);
    React.useEffect(() => {
        if (!selectedUniversityId)
            return;
        setNewFacultySignupEmail((current) => ({
            ...current,
            universityId: selectedUniversityId,
            managedBuildingIds: [],
            managedClubIds: [],
        }));
        setNewBuilding((current) => ({ ...current, universityId: selectedUniversityId }));
        setNewLink((current) => ({ ...current, universityId: selectedUniversityId }));
        setNewClub((current) => ({ ...current, universityId: selectedUniversityId }));
        setNewEvent((current) => ({ ...current, universityId: selectedUniversityId }));
        setNewPortalAccount((current) => ({ ...current, universityId: selectedUniversityId }));
        setBuildingImportUniversityId(selectedUniversityId);
    }, [selectedUniversityId]);
    const applyUniversitySelection = React.useCallback((universityId) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', currentTab);
        if (universityId) {
            params.set('universityId', universityId);
        }
        else {
            params.delete('universityId');
        }
        router.replace(`/admin?${params.toString()}`, { scroll: false });
    }, [currentTab, router, searchParams]);
    const handleTabChange = (nextTab) => {
        // Redirect removed tabs to their new home or overview
        if (nextTab === 'universities')
            return;
        if (nextTab === 'building-import') {
            setShowBuildingImport(true);
            handleTabChange('buildings');
            return;
        }
        const normalized = nextTab;
        if (!visibleTabs.some((item) => item.value === normalized))
            return;
        setActiveTab(normalized);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', normalized);
        router.replace(`/admin?${params.toString()}`, { scroll: false });
    };
    const withinSelectedUniversity = React.useCallback((records) => {
        if (!selectedUniversityId)
            return [];
        return records.filter((record) => record.universityId === selectedUniversityId);
    }, [selectedUniversityId]);
    const runMutation = async (action, successMessage) => {
        setSaving(true);
        try {
            const result = await action();
            toast.success(typeof successMessage === 'function' ? successMessage(result) : successMessage);
            await loadData();
            return result;
        }
        catch (error) {
            toast.error(asErrorMessage(error, 'Request failed'));
            return undefined;
        }
        finally {
            setSaving(false);
        }
    };
    const handleBuildingImportFileSelected = React.useCallback(async (file) => {
        if (!file) {
            setBuildingImportCsvContent('');
            setBuildingImportFileName('');
            setBuildingImportRowCount(0);
            setBuildingImportError(null);
            setBuildingImportValidation(null);
            return;
        }
        try {
            const content = await file.text();
            const rows = parseCsvText(content);
            const { headerRow, dataRows } = extractBuildingImportRows(rows);
            if (headerRow.length === 0) {
                setBuildingImportError('CSV file is empty');
                setBuildingImportValidation(null);
                setBuildingImportCsvContent('');
                setBuildingImportRowCount(0);
                setBuildingImportFileName(file.name);
                return;
            }
            const validation = validateBuildingImportHeaders(headerRow);
            const rowCount = dataRows.length;
            setBuildingImportCsvContent(content);
            setBuildingImportFileName(file.name);
            setBuildingImportRowCount(rowCount);
            setBuildingImportValidation(validation);
            setBuildingImportError(null);
        }
        catch {
            setBuildingImportError('Unable to read the CSV file');
            setBuildingImportValidation(null);
            setBuildingImportCsvContent('');
            setBuildingImportRowCount(0);
            setBuildingImportFileName(file.name);
        }
    }, []);
    const togglePermissionInDraftAccount = (permission) => {
        setNewPortalAccount((current) => {
            const hasPermission = current.portalPermissions.includes(permission);
            const nextPermissions = hasPermission
                ? current.portalPermissions.filter((item) => item !== permission)
                : [...current.portalPermissions, permission];
            return {
                ...current,
                portalPermissions: nextPermissions,
            };
        });
    };
    const togglePermissionForAccount = (accountId, permission) => {
        setPortalAccounts((current) => current.map((account) => {
            if (account.id !== accountId)
                return account;
            const hasPermission = account.portalPermissions.includes(permission);
            return {
                ...account,
                portalPermissions: hasPermission
                    ? account.portalPermissions.filter((item) => item !== permission)
                    : [...account.portalPermissions, permission],
            };
        }));
    };
    const toggleManagedClubInDraftAccount = (clubId) => {
        setNewPortalAccount((current) => {
            const selected = current.managedClubIds.includes(clubId);
            return {
                ...current,
                managedClubIds: selected
                    ? current.managedClubIds.filter((item) => item !== clubId)
                    : [...current.managedClubIds, clubId],
            };
        });
    };
    const toggleManagedClubForAccount = (accountId, clubId) => {
        setPortalAccounts((current) => current.map((account) => {
            if (account.id !== accountId)
                return account;
            const alreadyManaged = account.managedClubs.some((item) => item.clubId === clubId);
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
                ];
            return {
                ...account,
                managedClubs: nextManagedClubs,
            };
        }));
    };
    const toggleDisabledStudentPage = React.useCallback((universityId, pageKey) => {
        setUniversities((current) => current.map((university) => {
            if (university.id !== universityId) {
                return university;
            }
            const currentDisabled = sanitizeDisabledStudentPages(university.disabledStudentPages);
            const nextDisabled = currentDisabled.includes(pageKey)
                ? currentDisabled.filter((item) => item !== pageKey)
                : [...currentDisabled, pageKey];
            return {
                ...university,
                disabledStudentPages: nextDisabled,
            };
        }));
    }, []);
    const pendingInviteQuery = React.useDeferredValue(normalizeSearchValue(pendingInviteSearchQuery));
    const facultyQuery = React.useDeferredValue(normalizeSearchValue(facultySearchQuery));
    const buildingQuery = React.useDeferredValue(normalizeSearchValue(buildingSearchQuery));
    const linkQuery = React.useDeferredValue(normalizeSearchValue(linkSearchQuery));
    const clubQuery = React.useDeferredValue(normalizeSearchValue(clubSearchQuery));
    const eventQuery = React.useDeferredValue(normalizeSearchValue(eventSearchQuery));
    const portalAccountQuery = React.useDeferredValue(normalizeSearchValue(portalAccountSearchQuery));
    const selectedUniversity = universities.find((university) => university.id === selectedUniversityId) ?? null;
    const selectedUniversityDisabledStudentPages = sanitizeDisabledStudentPages(selectedUniversity?.disabledStudentPages);
    const visibleStudentPageCount = studentPageVisibilityOptions.length - selectedUniversityDisabledStudentPages.length;
    const scopedUniversities = selectedUniversity ? [selectedUniversity] : [];
    const scopedFaculty = React.useMemo(() => withinSelectedUniversity(faculty), [faculty, withinSelectedUniversity]);
    const scopedFacultySignupEmails = React.useMemo(() => withinSelectedUniversity(facultySignupEmails), [facultySignupEmails, withinSelectedUniversity]);
    const scopedBuildings = React.useMemo(() => withinSelectedUniversity(buildings), [buildings, withinSelectedUniversity]);
    const scopedResourceLinks = React.useMemo(() => withinSelectedUniversity(resourceLinks), [resourceLinks, withinSelectedUniversity]);
    const scopedClubs = React.useMemo(() => withinSelectedUniversity(clubs), [clubs, withinSelectedUniversity]);
    const scopedEvents = React.useMemo(() => withinSelectedUniversity(events), [events, withinSelectedUniversity]);
    const scopedPortalAccounts = React.useMemo(() => withinSelectedUniversity(portalAccounts), [portalAccounts, withinSelectedUniversity]);
    const filteredFacultySignupEmails = React.useMemo(() => scopedFacultySignupEmails.filter((record) => matchesAnySearch(record, pendingInviteQuery, ['displayName', 'email', 'facultyRoleTags', (item) => item.managedBuildings.map((entry) => entry.building.name), (item) => item.managedClubs.map((entry) => entry.club.name)])), [pendingInviteQuery, scopedFacultySignupEmails]);
    const filteredFaculty = React.useMemo(() => scopedFaculty.filter((record) => matchesAnySearch(record, facultyQuery, ['name', 'email', 'title', 'department', 'officeLocation', 'officeHours', 'tags', (item) => item.user?.facultyRoleTags ?? [], (item) => item.user?.managedBuildings?.map((entry) => entry.building.name) ?? [], (item) => item.user?.managedClubs?.map((entry) => entry.club.name) ?? []])), [facultyQuery, scopedFaculty]);
    const filteredBuildings = React.useMemo(() => scopedBuildings.filter((record) => matchesAnySearch(record, buildingQuery, ['name', 'code', 'type', 'address', 'mapQuery', 'operationalNote', 'description'])), [buildingQuery, scopedBuildings]);
    const filteredResourceLinks = React.useMemo(() => scopedResourceLinks.filter((record) => matchesAnySearch(record, linkQuery, ['label', 'category', 'href', 'description'])), [linkQuery, scopedResourceLinks]);
    const filteredClubs = React.useMemo(() => scopedClubs.filter((record) => matchesAnySearch(record, clubQuery, ['name', 'category', 'description', 'contactEmail', 'presidentName', 'presidentEmail', 'advisorName', 'advisorEmail', 'meetingInfo'])), [clubQuery, scopedClubs]);
    const filteredEvents = React.useMemo(() => scopedEvents.filter((record) => matchesAnySearch(record, eventQuery, ['title', 'description', 'location', 'organizer', 'category', 'audience'])), [eventQuery, scopedEvents]);
    const filteredPortalAccounts = React.useMemo(() => scopedPortalAccounts.filter((record) => matchesAnySearch(record, portalAccountQuery, ['displayName', 'firstName', 'lastName', 'email', 'role', 'adminAccessLevel', 'portalPermissions', (item) => item.managedClubs.map((entry) => entry.club.name)])), [portalAccountQuery, scopedPortalAccounts]);
    const facultyAccountOptions = React.useMemo(() => {
        const deduped = new Map();
        scopedFaculty.forEach((record) => {
            deduped.set(record.email.toLowerCase(), {
                id: record.id,
                label: record.name,
                secondary: record.title ? `${record.title} · ${record.email}` : record.email,
                email: record.email,
                value: record.name,
            });
        });
        allUsers
            .filter((record) => record.university?.id === selectedUniversityId && record.role === 'FACULTY')
            .forEach((record) => {
            const key = record.email.toLowerCase();
            if (!deduped.has(key)) {
                deduped.set(key, {
                    id: record.id,
                    label: record.displayName,
                    secondary: record.email,
                    email: record.email,
                    value: record.displayName,
                });
            }
        });
        return Array.from(deduped.values());
    }, [allUsers, scopedFaculty, selectedUniversityId]);
    const studentAccountOptions = React.useMemo(() => allUsers
        .filter((record) => record.university?.id === selectedUniversityId && record.role === 'STUDENT')
        .map((record) => ({
        id: record.id,
        label: record.displayName,
        secondary: record.email,
        email: record.email,
        value: record.email,
    })), [allUsers, selectedUniversityId]);
    const universityOptions = universities.map((university) => (<option key={university.id} value={university.id}>
      {university.name}
    </option>));
    const scopedUniversityOptions = scopedUniversities.map((university) => (<option key={university.id} value={university.id}>
      {university.name}
    </option>));
    const requiredBuildingHeaders = BUILDING_IMPORT_REQUIRED_HEADERS.join(', ');
    const optionalBuildingHeaders = BUILDING_IMPORT_OPTIONAL_HEADERS.join(', ');
    return (<div className="space-y-4 animate-in-up">
      {selectedUniversity ? (<Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">

        <TabsContent value="overview" className="mt-0 space-y-4">
          {/* University Info */}
          <Card className="rounded-xl border-border/60">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active University</p>
                  <h2 className="mt-1 text-2xl font-display font-bold">{selectedUniversity.name}</h2>
                  {selectedUniversity.domain && (<p className="text-sm text-muted-foreground mt-0.5">@{selectedUniversity.domain}</p>)}
                </div>
                {(selectedUniversity.themeMainColor || selectedUniversity.themeAccentColor) && (<div className="flex items-center gap-3">
                    {[
                    { label: 'Primary', color: selectedUniversity.themeMainColor },
                    { label: 'Accent', color: selectedUniversity.themeAccentColor },
                ].filter((c) => c.color).map((c) => (<div key={c.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <div style={{ backgroundColor: c.color }} className="h-5 w-5 rounded-full border border-border/60 shadow-sm"/>
                        <span className="font-mono">{c.color}</span>
                        <span className="text-muted-foreground/60">({c.label})</span>
                      </div>))}
                  </div>)}
              </div>
            </CardContent>
          </Card>

          {/* Stats grid — click any to navigate */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {[
                { label: 'Faculty', value: scopedFaculty.length, icon: GraduationCap, tab: 'faculty' },
                { label: 'Buildings', value: scopedBuildings.length, icon: Building2, tab: 'buildings' },
                { label: 'Clubs', value: scopedClubs.length, icon: Landmark, tab: 'clubs' },
                { label: 'Events', value: scopedEvents.length, icon: CalendarDays, tab: 'events' },
                { label: 'Links', value: scopedResourceLinks.length, icon: ExternalLink, tab: 'links' },
                { label: 'Users', value: allUsers.length, icon: Users, tab: 'users' },
            ].map((stat) => (<button key={stat.label} className="rounded-xl border border-border/60 bg-card/70 p-4 text-left hover:bg-card transition-colors duration-150" onClick={() => handleTabChange(stat.tab)}>
                <stat.icon className="h-4 w-4 text-muted-foreground mb-2"/>
                <p className="text-2xl font-extrabold tracking-tight">{stat.value}</p>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">{stat.label}</p>
              </button>))}
          </div>

          {/* Quick actions */}
          <Card className="rounded-xl border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Quick Actions</CardTitle>
              <CardDescription>Jump to any section to manage content for {selectedUniversity.name}.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {[
                { icon: GraduationCap, title: 'Invite Faculty', desc: 'Add faculty and configure access', tab: 'faculty', visible: canManageFaculty },
                { icon: LayoutGrid, title: 'Student Pages', desc: 'Hide or show student-facing pages', tab: 'student-pages', visible: canManageStudentPages },
                { icon: Building2, title: 'Manage Buildings', desc: 'Add buildings and update their status', tab: 'buildings', visible: canManageBuildings },
                { icon: Landmark, title: 'Manage Clubs', desc: 'Update club info and leadership', tab: 'clubs', visible: canManageClubs },
                { icon: CalendarDays, title: 'Publish Events', desc: 'Create and manage campus events', tab: 'events', visible: canManageEvents },
                { icon: ShieldUser, title: 'IT Accounts', desc: 'Provision portal access and permissions', tab: 'it-accounts', visible: canManageAccounts },
            ].filter((action) => action.visible).map((action) => (<button key={action.title} className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-left hover:bg-muted/40 transition-colors" onClick={() => handleTabChange(action.tab)}>
                    <action.icon className="mt-0.5 h-4 w-4 text-primary shrink-0"/>
                    <div>
                      <p className="text-sm font-semibold">{action.title}</p>
                      <p className="text-xs text-muted-foreground">{action.desc}</p>
                    </div>
                  </button>))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="universities" className="mt-0 space-y-4">
          <Card className="rounded-xl border-border/60">
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
                  {scopedUniversities.map((university) => (<TableRow key={university.id}>
                      <TableCell>
                        <Input value={university.name} onChange={(event) => setUniversities((current) => current.map((item) => (item.id === university.id ? { ...item, name: event.target.value } : item)))}/>
                      </TableCell>
                      <TableCell>
                        <Input value={university.slug} onChange={(event) => setUniversities((current) => current.map((item) => (item.id === university.id ? { ...item, slug: event.target.value } : item)))}/>
                      </TableCell>
                      <TableCell>
                        <Input value={university.domain ?? ''} onChange={(event) => setUniversities((current) => current.map((item) => item.id === university.id ? { ...item, domain: event.target.value || null } : item))}/>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <input type="color" value={university.themeMainColor ?? '#2563EB'} onChange={(event) => setUniversities((current) => current.map((item) => item.id === university.id ? { ...item, themeMainColor: event.target.value } : item))} className="h-8 w-8 cursor-pointer rounded border border-border/60 bg-transparent p-0.5"/>
                          <Input value={university.themeMainColor ?? ''} onChange={(event) => setUniversities((current) => current.map((item) => item.id === university.id ? { ...item, themeMainColor: event.target.value || null } : item))} placeholder="#hex" className="w-24 font-mono text-xs"/>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <input type="color" value={university.themeAccentColor ?? '#3B82F6'} onChange={(event) => setUniversities((current) => current.map((item) => item.id === university.id ? { ...item, themeAccentColor: event.target.value } : item))} className="h-8 w-8 cursor-pointer rounded border border-border/60 bg-transparent p-0.5"/>
                          <Input value={university.themeAccentColor ?? ''} onChange={(event) => setUniversities((current) => current.map((item) => item.id === university.id ? { ...item, themeAccentColor: event.target.value || null } : item))} placeholder="#hex" className="w-24 font-mono text-xs"/>
                        </div>
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Button size="sm" variant="outline" disabled={saving} onClick={() => void runMutation(async () => {
                    await apiRequest(`/api/admin/universities/${university.id}`, {
                        method: 'PATCH',
                        body: {
                            name: university.name,
                            slug: university.slug,
                            domain: university.domain || undefined,
                            themeMainColor: university.themeMainColor || undefined,
                            themeAccentColor: university.themeAccentColor || undefined,
                        },
                    });
                }, 'University updated')}>
                          Save
                        </Button>
                        <Button size="sm" variant="destructive" disabled={saving} onClick={() => void runMutation(async () => {
                    await apiRequest(`/api/admin/universities/${university.id}`, {
                        method: 'DELETE',
                    });
                }, 'University deleted')}>
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="student-pages" className="mt-0 space-y-4">
          <Card className="rounded-xl border-border/60">
            <CardHeader>
              <CardTitle>Student Page Visibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{visibleStudentPageCount} visible</Badge>
                <Badge variant="secondary">{selectedUniversityDisabledStudentPages.length} hidden</Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {studentPageVisibilityOptions.map((page) => {
                const isVisible = !selectedUniversityDisabledStudentPages.includes(page.key);
                return (<button key={page.key} type="button" onClick={() => toggleDisabledStudentPage(selectedUniversity.id, page.key)} className={cn('rounded-xl border px-4 py-4 text-left transition-colors', isVisible
                    ? 'border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500/10'
                    : 'border-border/60 bg-card hover:bg-muted/40')}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{page.label}</p>
                        </div>
                        <Badge variant={isVisible ? 'success' : 'secondary'} className="shrink-0 text-[10px]">
                          {isVisible ? 'Visible' : 'Hidden'}
                        </Badge>
                      </div>
                    </button>);
            })}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={saving || !canManageStudentPages || visibleStudentPageCount === 0} onClick={() => void runMutation(async () => {
                await apiRequest(`/api/admin/universities/${selectedUniversity.id}/student-pages`, {
                    method: 'PATCH',
                    body: {
                        disabledStudentPages: selectedUniversityDisabledStudentPages,
                    },
                });
            }, 'Student page visibility updated')}>
                  Save Visibility Settings
                </Button>
                <Button size="sm" variant="ghost" disabled={saving || !canManageStudentPages || selectedUniversityDisabledStudentPages.length === 0} onClick={() => setUniversities((current) => current.map((university) => university.id === selectedUniversity.id
                ? { ...university, disabledStudentPages: [] }
                : university))}>
                  Show All Pages
                </Button>
              </div>

              {visibleStudentPageCount === 0 && (<p className="text-xs text-amber-700 dark:text-amber-300">
                  At least one student page should remain visible before saving.
                </p>)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faculty" className="mt-0 space-y-5">

          {/* ── Invite Faculty Member ─────────────────────────────── */}
          <Card className="rounded-xl border-border/60">
            <CardHeader>
              <CardTitle>Invite Faculty Member</CardTitle>
              <CardDescription>
                Enter their email to allow signup. Configure their access and role assignments before they activate.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 md:grid-cols-3">
                <Input value={newFacultySignupEmail.email} onChange={(event) => setNewFacultySignupEmail((c) => ({ ...c, email: event.target.value.toLowerCase() }))} placeholder="Faculty email (required)"/>
                <Input value={newFacultySignupEmail.firstName} onChange={(event) => setNewFacultySignupEmail((c) => ({ ...c, firstName: event.target.value }))} placeholder="First name (optional)"/>
                <Input value={newFacultySignupEmail.lastName} onChange={(event) => setNewFacultySignupEmail((c) => ({ ...c, lastName: event.target.value }))} placeholder="Last name (optional)"/>
              </div>

              <Separator />

              <SearchableMultiSelect
                title="Permissions"
                description="Choose the faculty permissions for this invite."
                items={[
                    { id: 'announcements', label: 'Can publish campus announcements' },
                    { id: 'deadlines', label: 'Can create deadline events' },
                    { id: 'all-clubs', label: 'Manages all clubs / student orgs' },
                ]}
                selectedIds={[
                    ...(newFacultySignupEmail.canPublishCampusAnnouncements ? ['announcements'] : []),
                    ...(newFacultySignupEmail.canCreateDeadlineEvents ? ['deadlines'] : []),
                    ...(newFacultySignupEmail.managesAllClubs ? ['all-clubs'] : []),
                ]}
                onToggle={(permissionId) => {
                    if (permissionId === 'announcements') {
                        setNewFacultySignupEmail((current) => ({
                            ...current,
                            canPublishCampusAnnouncements: !current.canPublishCampusAnnouncements,
                        }));
                    }
                    if (permissionId === 'deadlines') {
                        setNewFacultySignupEmail((current) => ({
                            ...current,
                            canCreateDeadlineEvents: !current.canCreateDeadlineEvents,
                        }));
                    }
                    if (permissionId === 'all-clubs') {
                        setNewFacultySignupEmail((current) => ({
                            ...current,
                            managesAllClubs: !current.managesAllClubs,
                        }));
                    }
                }}
                placeholder="Search permissions"
              />

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role Tags</p>
                <div className="flex flex-wrap gap-2">
                  {FACULTY_ROLE_TAG_OPTIONS.map((tag) => {
                const isSelected = newFacultySignupEmail.facultyRoleTags.includes(tag);
                return (<button key={tag} type="button" onClick={() => setNewFacultySignupEmail((c) => ({
                        ...c,
                        facultyRoleTags: isSelected
                            ? c.facultyRoleTags.filter((t) => t !== tag)
                            : [...c.facultyRoleTags, tag],
                    }))} className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors', isSelected
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : 'border-border/60 text-muted-foreground hover:border-primary/30 hover:text-foreground')}>
                        <Tag className="h-3 w-3"/>
                        {tag}
                      </button>);
            })}
                </div>
              </div>

              {scopedBuildings.length > 0 ? (<SearchableMultiSelect
                  title="Manages Buildings"
                  description="Search and assign the buildings this faculty member can manage."
                  icon={Building2}
                  items={scopedBuildings.map((building) => ({
                    id: building.id,
                    label: building.name,
                    secondary: [building.code, building.type].filter(Boolean).join(' · '),
                }))}
                  selectedIds={newFacultySignupEmail.managedBuildingIds}
                  onToggle={(buildingId) => setNewFacultySignupEmail((current) => ({
                    ...current,
                    managedBuildingIds: current.managedBuildingIds.includes(buildingId)
                        ? current.managedBuildingIds.filter((id) => id !== buildingId)
                        : [...current.managedBuildingIds, buildingId],
                }))}
                  placeholder="Search buildings"
                />) : null}

              {scopedClubs.length > 0 ? (<SearchableMultiSelect
                  title="Advises Clubs / Orgs"
                  description="Search and assign the clubs or organizations tied to this invite."
                  icon={Landmark}
                  items={scopedClubs.map((club) => ({
                    id: club.id,
                    label: club.name,
                    secondary: club.category,
                }))}
                  selectedIds={newFacultySignupEmail.managedClubIds}
                  onToggle={(clubId) => setNewFacultySignupEmail((current) => ({
                    ...current,
                    managedClubIds: current.managedClubIds.includes(clubId)
                        ? current.managedClubIds.filter((id) => id !== clubId)
                        : [...current.managedClubIds, clubId],
                }))}
                  placeholder="Search clubs or organizations"
                />) : null}

              <div>
                <Button disabled={saving || !newFacultySignupEmail.universityId || !newFacultySignupEmail.email.trim()} onClick={() => void runMutation(async () => {
                await apiRequest('/api/admin/faculty/signup-emails', {
                    method: 'POST',
                    body: {
                        universityId: newFacultySignupEmail.universityId,
                        email: newFacultySignupEmail.email,
                        firstName: newFacultySignupEmail.firstName || undefined,
                        lastName: newFacultySignupEmail.lastName || undefined,
                        canPublishCampusAnnouncements: newFacultySignupEmail.canPublishCampusAnnouncements,
                        canCreateDeadlineEvents: newFacultySignupEmail.canCreateDeadlineEvents,
                        managesAllClubs: newFacultySignupEmail.managesAllClubs,
                        facultyRoleTags: newFacultySignupEmail.facultyRoleTags,
                        managedBuildingIds: newFacultySignupEmail.managedBuildingIds,
                        managedClubIds: newFacultySignupEmail.managedClubIds,
                    },
                });
                setNewFacultySignupEmail({
                    universityId: selectedUniversityId,
                    email: '',
                    firstName: '',
                    lastName: '',
                    canPublishCampusAnnouncements: false,
                    canCreateDeadlineEvents: false,
                    managesAllClubs: false,
                    facultyRoleTags: [],
                    managedBuildingIds: [],
                    managedClubIds: [],
                });
            }, 'Faculty invite sent')}>
                  Send Invite
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ── Pending Invitations ───────────────────────────────── */}
          {scopedFacultySignupEmails.length > 0 && (<Card className="rounded-xl border-border/60">
              <CardHeader>
                <CardTitle>Pending Invitations</CardTitle>
                <CardDescription>Invited faculty who haven&apos;t yet completed their profile.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <SectionSearchBar
                  value={pendingInviteSearchQuery}
                  onChange={setPendingInviteSearchQuery}
                  placeholder="Search invitations by name, email, role tag, building, or club"
                  countLabel={`${filteredFacultySignupEmails.length} invitation${filteredFacultySignupEmails.length === 1 ? '' : 's'}`}
                />
                <div className="divide-y divide-border/40">
                  {filteredFacultySignupEmails.map((record) => {
                    const isExpanded = expandedSignupEmailId === record.id;
                    return (<div key={record.id}>
                        <button className="flex w-full items-center justify-between gap-3 px-6 py-3 text-left hover:bg-muted/30 transition-colors" onClick={() => setExpandedSignupEmailId(isExpanded ? null : record.id)}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                              <GraduationCap className="h-4 w-4 text-primary"/>
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{record.displayName}</p>
                              <p className="truncate text-xs text-muted-foreground">{record.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {record.facultyRoleTags.slice(0, 2).map((tag) => (<Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>))}
                            <Badge variant={ACCOUNT_STATUS_META[record.accountStatus ?? 'DORMANT']?.variant ?? 'secondary'} className="text-[10px] shrink-0">
                              {ACCOUNT_STATUS_META[record.accountStatus ?? 'DORMANT']?.label ?? 'Dormant'}
                            </Badge>
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground"/> : <ChevronDown className="h-4 w-4 text-muted-foreground"/>}
                          </div>
                        </button>
                        {isExpanded && (<div className="border-t border-border/40 bg-muted/20 px-6 py-4 space-y-3">
                            <div className="grid gap-2 md:grid-cols-2 text-sm">
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Email</p>
                                <p>{record.email}</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Status</p>
                                <p>{ACCOUNT_STATUS_META[record.accountStatus ?? 'DORMANT']?.helper ?? 'Awaiting signup claim'}</p>
                              </div>
                            </div>
                            {(record.canPublishCampusAnnouncements || record.portalPermissions?.includes('CAN_CREATE_DEADLINE_EVENTS') || record.managesAllClubs) && (<div className="flex flex-wrap gap-2">
                                {record.canPublishCampusAnnouncements && (<span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="h-3 w-3"/>Can publish announcements
                                  </span>)}
                                {record.portalPermissions?.includes('CAN_CREATE_DEADLINE_EVENTS') && (<span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                                    <Clock className="h-3 w-3"/>Can create deadline events
                                  </span>)}
                                {record.managesAllClubs && (<span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="h-3 w-3"/>Manages all clubs
                                  </span>)}
                              </div>)}
                            {record.facultyRoleTags.length > 0 && (<div>
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">Role Tags</p>
                                <div className="flex flex-wrap gap-1">
                                  {record.facultyRoleTags.map((tag) => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
                                </div>
                              </div>)}
                            {record.managedBuildings.length > 0 && (<div>
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">Manages Buildings</p>
                                <div className="flex flex-wrap gap-1">
                                  {record.managedBuildings.map((mb) => (<Badge key={mb.buildingId} variant="secondary" className="text-xs">
                                      <Building2 className="mr-1 h-3 w-3"/>{mb.building.name}
                                    </Badge>))}
                                </div>
                              </div>)}
                            {record.managedClubs.length > 0 && (<div>
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">Advises Clubs</p>
                                <div className="flex flex-wrap gap-1">
                                  {record.managedClubs.map((mc) => (<Badge key={mc.clubId} variant="secondary" className="text-xs">
                                      <Landmark className="mr-1 h-3 w-3"/>{mc.club.name}
                                    </Badge>))}
                                </div>
                              </div>)}
                            <Button size="sm" variant="destructive" disabled={saving} onClick={() => void runMutation(async () => {
                                await apiRequest(`/api/admin/faculty/signup-emails/${record.id}`, { method: 'DELETE' });
                                setExpandedSignupEmailId(null);
                            }, 'Faculty invite removed')}>
                              <Trash2 className="mr-1.5 h-3.5 w-3.5"/>
                              Remove Invite
                            </Button>
                          </div>)}
                      </div>);
                })}
                </div>
              </CardContent>
            </Card>)}

          {/* ── Faculty Directory ─────────────────────────────────── */}
          <Card className="rounded-xl border-border/60">
            <CardHeader>
              <CardTitle>Faculty Directory</CardTitle>
              <CardDescription>
                {scopedFaculty.length} member{scopedFaculty.length !== 1 ? 's' : ''} — click a row to view and edit.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <SectionSearchBar
                value={facultySearchQuery}
                onChange={setFacultySearchQuery}
                placeholder="Search faculty by name, email, department, title, building, or club"
                countLabel={`${filteredFaculty.length} match${filteredFaculty.length === 1 ? '' : 'es'}`}
              />
              {scopedFaculty.length === 0 ? (<p className="px-2 py-2 text-sm text-muted-foreground">No faculty profiles yet.</p>) : (<div className="divide-y divide-border/40">
                  {filteredFaculty.map((record) => {
                    const isExpanded = expandedFacultyId === record.id;
                    return (<div key={record.id}>
                        <button className="flex w-full items-center justify-between gap-3 px-6 py-3 text-left hover:bg-muted/30 transition-colors" onClick={() => setExpandedFacultyId(isExpanded ? null : record.id)}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                              <GraduationCap className="h-4 w-4 text-muted-foreground"/>
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{record.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{record.title} &bull; {record.department}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="hidden text-xs text-muted-foreground md:block">{record.email}</span>
                            <Badge variant={ACCOUNT_STATUS_META[record.user?.accountStatus ?? 'DORMANT']?.variant ?? 'secondary'} className="text-[10px]">
                              {ACCOUNT_STATUS_META[record.user?.accountStatus ?? 'DORMANT']?.label ?? 'Dormant'}
                            </Badge>
                            {record.user?.managesAllClubs && <Badge variant="outline" className="text-[10px]">All Clubs</Badge>}
                            {(record.user?.facultyRoleTags ?? []).slice(0, 1).map((tag) => (<Badge key={tag} variant="secondary" className="hidden text-[10px] md:inline-flex">{tag}</Badge>))}
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground"/> : <ChevronDown className="h-4 w-4 text-muted-foreground"/>}
                          </div>
                        </button>

                        {isExpanded && (<div className="border-t border-border/40 bg-muted/20 px-6 py-5 space-y-5">
                            {/* Basic info */}
                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Account Status</label>
                                <div className="flex min-h-11 items-center">
                                  <Badge variant={ACCOUNT_STATUS_META[record.user?.accountStatus ?? 'DORMANT']?.variant ?? 'secondary'}>
                                    {ACCOUNT_STATUS_META[record.user?.accountStatus ?? 'DORMANT']?.helper ?? 'Waiting for signup claim'}
                                  </Badge>
                                </div>
                              </div>
                              {[
                                { label: 'Full Name', key: 'name' },
                                { label: 'Email', key: 'email' },
                                { label: 'Title', key: 'title' },
                                { label: 'Department', key: 'department' },
                                { label: 'Office Location', key: 'officeLocation' },
                                { label: 'Office Hours', key: 'officeHours' },
                            ].map(({ label, key }) => (<div key={key} className="space-y-1.5">
                                  <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
                                  <Input value={record[key]} onChange={(event) => setFaculty((current) => current.map((item) => (item.id === record.id ? { ...item, [key]: event.target.value } : item)))}/>
                                </div>))}
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Phone</label>
                                <Input value={record.phone ?? ''} placeholder="Optional" onChange={(event) => setFaculty((current) => current.map((item) => (item.id === record.id ? { ...item, phone: event.target.value || null } : item)))}/>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Courses (comma-separated)</label>
                                <Input value={record.courses.join(', ')} onChange={(event) => setFaculty((current) => current.map((item) => (item.id === record.id ? { ...item, courses: splitCsv(event.target.value) } : item)))}/>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tags (comma-separated)</label>
                                <Input value={record.tags.join(', ')} onChange={(event) => setFaculty((current) => current.map((item) => (item.id === record.id ? { ...item, tags: splitCsv(event.target.value) } : item)))}/>
                              </div>
                              <div className="space-y-1.5 md:col-span-2">
                                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Bio</label>
                                <Textarea value={record.bio ?? ''} placeholder="Optional bio" rows={2} className="resize-none" onChange={(event) => setFaculty((current) => current.map((item) => (item.id === record.id ? { ...item, bio: event.target.value || null } : item)))}/>
                              </div>
                            </div>

                            <Separator />

                            {/* Permissions */}
                            <SearchableMultiSelect
                              title="Permissions"
                              description="Choose faculty permissions for this profile."
                              items={[
                                { id: 'announcements', label: 'Can publish campus announcements' },
                                { id: 'deadlines', label: 'Can create deadline events' },
                                { id: 'all-clubs', label: 'Manages all clubs / student orgs' },
                              ]}
                              selectedIds={[
                                ...(record.user?.canPublishCampusAnnouncements ? ['announcements'] : []),
                                ...(record.user?.portalPermissions?.includes('CAN_CREATE_DEADLINE_EVENTS') ? ['deadlines'] : []),
                                ...(record.user?.managesAllClubs ? ['all-clubs'] : []),
                              ]}
                              onToggle={(permissionId) => setFaculty((current) => current.map((item) => {
                                if (item.id !== record.id || !item.user) {
                                    return item;
                                }
                                if (permissionId === 'announcements') {
                                    return {
                                        ...item,
                                        user: {
                                            ...item.user,
                                            canPublishCampusAnnouncements: !item.user.canPublishCampusAnnouncements,
                                        },
                                    };
                                }
                                if (permissionId === 'deadlines') {
                                    const hasPermission = item.user.portalPermissions?.includes('CAN_CREATE_DEADLINE_EVENTS');
                                    return {
                                        ...item,
                                        user: {
                                            ...item.user,
                                            portalPermissions: hasPermission
                                                ? (item.user.portalPermissions ?? []).filter((permission) => permission !== 'CAN_CREATE_DEADLINE_EVENTS')
                                                : [...new Set([...(item.user.portalPermissions ?? []), 'CAN_CREATE_DEADLINE_EVENTS'])],
                                        },
                                    };
                                }
                                if (permissionId === 'all-clubs') {
                                    return {
                                        ...item,
                                        user: {
                                            ...item.user,
                                            managesAllClubs: !item.user.managesAllClubs,
                                        },
                                    };
                                }
                                return item;
                            }))}
                              placeholder="Search permissions"
                            />

                            {/* Role Tags */}
                            <div className="space-y-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Role Tags</p>
                              <div className="flex flex-wrap gap-2">
                                {FACULTY_ROLE_TAG_OPTIONS.map((tag) => {
                                const currentTags = record.user?.facultyRoleTags ?? [];
                                const isSelected = currentTags.includes(tag);
                                return (<button key={tag} type="button" onClick={() => setFaculty((current) => current.map((item) => item.id === record.id && item.user
                                        ? {
                                            ...item,
                                            user: {
                                                ...item.user,
                                                facultyRoleTags: isSelected
                                                    ? item.user.facultyRoleTags.filter((t) => t !== tag)
                                                    : [...item.user.facultyRoleTags, tag],
                                            },
                                        }
                                        : item))} className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors', isSelected
                                        ? 'border-primary/30 bg-primary/10 text-primary'
                                        : 'border-border/60 text-muted-foreground hover:border-primary/30 hover:text-foreground')}>
                                      <Tag className="h-3 w-3"/>
                                      {tag}
                                    </button>);
                            })}
                              </div>
                            </div>

                            {/* Building Assignments */}
                            {scopedBuildings.length > 0 ? (<SearchableMultiSelect
                                title="Manages Buildings"
                                description="Search and assign the buildings this faculty member manages."
                                icon={Building2}
                                items={scopedBuildings.map((building) => ({
                                    id: building.id,
                                    label: building.name,
                                    secondary: [building.code, building.type].filter(Boolean).join(' · '),
                                }))}
                                selectedIds={(record.user?.managedBuildings ?? []).map((entry) => entry.buildingId)}
                                onToggle={(buildingId) => setFaculty((current) => current.map((item) => {
                                    if (item.id !== record.id || !item.user) {
                                        return item;
                                    }
                                    const isAssigned = item.user.managedBuildings.some((entry) => entry.buildingId === buildingId);
                                    return {
                                        ...item,
                                        user: {
                                            ...item.user,
                                            managedBuildings: isAssigned
                                                ? item.user.managedBuildings.filter((entry) => entry.buildingId !== buildingId)
                                                : [...item.user.managedBuildings, { buildingId, building: { id: buildingId, name: scopedBuildings.find((building) => building.id === buildingId)?.name ?? 'Unknown Building' } }],
                                        },
                                    };
                                }))}
                                placeholder="Search buildings"
                              />) : null}

                            {/* Club Assignments */}
                            {scopedClubs.length > 0 ? (<SearchableMultiSelect
                                title="Advises Clubs / Orgs"
                                description="Search and assign the clubs or organizations this faculty member advises."
                                icon={Landmark}
                                items={scopedClubs.map((club) => ({
                                    id: club.id,
                                    label: club.name,
                                    secondary: club.category,
                                }))}
                                selectedIds={(record.user?.managedClubs ?? []).map((entry) => entry.clubId)}
                                onToggle={(clubId) => setFaculty((current) => current.map((item) => {
                                    if (item.id !== record.id || !item.user) {
                                        return item;
                                    }
                                    const isAssigned = item.user.managedClubs.some((entry) => entry.clubId === clubId);
                                    return {
                                        ...item,
                                        user: {
                                            ...item.user,
                                            managedClubs: isAssigned
                                                ? item.user.managedClubs.filter((entry) => entry.clubId !== clubId)
                                                : [...item.user.managedClubs, { clubId, club: { id: clubId, name: scopedClubs.find((club) => club.id === clubId)?.name ?? 'Unknown Club' } }],
                                        },
                                    };
                                }))}
                                placeholder="Search clubs or organizations"
                              />) : null}

                            <div className="flex gap-2 pt-1">
                              <Button size="sm" variant="outline" disabled={saving} onClick={() => void runMutation(async () => {
                                await apiRequest(`/api/admin/faculty/${record.id}`, {
                                    method: 'PATCH',
                                    body: {
                                        universityId: record.universityId,
                                        name: record.name,
                                        email: record.email,
                                        canPublishCampusAnnouncements: Boolean(record.user?.canPublishCampusAnnouncements),
                                        canCreateDeadlineEvents: Boolean(record.user?.portalPermissions?.includes('CAN_CREATE_DEADLINE_EVENTS')),
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
                                });
                            }, 'Faculty updated')}>
                                <Pencil className="mr-1.5 h-3.5 w-3.5"/>
                                Save Changes
                              </Button>
                              <Button size="sm" variant="destructive" disabled={saving} onClick={() => void runMutation(async () => {
                                await apiRequest(`/api/admin/faculty/${record.id}`, { method: 'DELETE' });
                                setExpandedFacultyId(null);
                            }, 'Faculty deleted')}>
                                <Trash2 className="mr-1.5 h-3.5 w-3.5"/>
                                Delete
                              </Button>
                            </div>
                          </div>)}
                      </div>);
                })}
                </div>)}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Buildings Tab ─────────────────────────────────────── */}
        <TabsContent value="buildings" className="mt-0 space-y-5">

          {/* Header actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setExpandedBuildingId(expandedBuildingId === 'new' ? null : 'new')}>
                <Plus className="mr-1.5 h-4 w-4"/>
                Add Building
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowBuildingImport(true)}>
                <Upload className="mr-1.5 h-4 w-4"/>
                Import from CSV
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {scopedBuildings.length} building{scopedBuildings.length !== 1 ? 's' : ''}
            </p>
          </div>

          <SectionSearchBar
            value={buildingSearchQuery}
            onChange={setBuildingSearchQuery}
            placeholder="Search buildings by name, code, type, address, or note"
            countLabel={`${filteredBuildings.length} result${filteredBuildings.length === 1 ? '' : 's'}`}
          />

          {/* New building form */}
          {expandedBuildingId === 'new' && (<Card className="rounded-xl border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">New Building</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Building Name *</label>
                    <Input value={newBuilding.name} onChange={(event) => setNewBuilding((c) => ({ ...c, name: event.target.value }))} placeholder="e.g. Science Hall"/>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Code</label>
                    <Input value={newBuilding.code} onChange={(event) => setNewBuilding((c) => ({ ...c, code: event.target.value }))} placeholder="e.g. SCI"/>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Type *</label>
                    <Input value={newBuilding.type} onChange={(event) => setNewBuilding((c) => ({ ...c, type: event.target.value }))} placeholder="e.g. Academic, Resource, Dining"/>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Address *</label>
                    <Input value={newBuilding.address} onChange={(event) => setNewBuilding((c) => ({ ...c, address: event.target.value }))} placeholder="Street address"/>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Map Query *</label>
                    <Input value={newBuilding.mapQuery} onChange={(event) => setNewBuilding((c) => ({ ...c, mapQuery: event.target.value }))} placeholder="Search term for maps"/>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Latitude</label>
                    <Input type="number" step="any" min={coordinateFieldConfig.latitude.min} max={coordinateFieldConfig.latitude.max} inputMode="decimal" value={newBuilding.latitude} onChange={(event) => setNewBuilding((c) => ({ ...c, latitude: event.target.value }))} placeholder="e.g. 36.6159"/>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Longitude</label>
                    <Input type="number" step="any" min={coordinateFieldConfig.longitude.min} max={coordinateFieldConfig.longitude.max} inputMode="decimal" value={newBuilding.longitude} onChange={(event) => setNewBuilding((c) => ({ ...c, longitude: event.target.value }))} placeholder="e.g. -88.3227"/>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {hasMeaningfulBuildingHoursSchedule(newBuilding.operatingHoursSchedule) ? 'Hours Summary' : 'Hours Summary / Fallback'}
                    </label>
                    <Input
                      value={
                        hasMeaningfulBuildingHoursSchedule(newBuilding.operatingHoursSchedule)
                          ? summarizeBuildingHoursSchedule(newBuilding.operatingHoursSchedule, newBuilding.operatingHours) ?? ''
                          : newBuilding.operatingHours
                      }
                      onChange={(event) => setNewBuilding((c) => ({ ...c, operatingHours: event.target.value }))}
                      placeholder="e.g. Mon–Fri 8am–6pm"
                      readOnly={hasMeaningfulBuildingHoursSchedule(newBuilding.operatingHoursSchedule)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Operational Status</label>
                    <select value={newBuilding.operationalStatus} onChange={(event) => setNewBuilding((c) => ({ ...c, operationalStatus: event.target.value }))} className="h-11 min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                      <option value="OPEN">Open</option>
                      <option value="CLOSED">Closed</option>
                      <option value="LIMITED">Limited Access</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status Note</label>
                    <Input value={newBuilding.operationalNote} onChange={(event) => setNewBuilding((c) => ({ ...c, operationalNote: event.target.value }))} placeholder="e.g. Closed for renovation"/>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Purpose (AI descriptor)</label>
                  <Textarea value={newBuilding.purpose} onChange={(event) => setNewBuilding((c) => ({ ...c, purpose: event.target.value }))} placeholder="Describe what this building is used for so the AI assistant can surface it in relevant queries..." rows={2} className="resize-none"/>
                </div>
                <BuildingHoursEditor
                  value={newBuilding.operatingHoursSchedule}
                  fallbackSummary={newBuilding.operatingHours}
                  onChange={(operatingHoursSchedule) => setNewBuilding((current) => ({ ...current, operatingHoursSchedule }))}
                />
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Description</label>
                  <Textarea value={newBuilding.description} onChange={(event) => setNewBuilding((c) => ({ ...c, description: event.target.value }))} placeholder="Optional public-facing description" rows={2} className="resize-none"/>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" disabled={saving || !newBuilding.name || !newBuilding.type || !newBuilding.address || !newBuilding.mapQuery} onClick={() => void runMutation(async () => {
                    await apiRequest('/api/admin/buildings', {
                        method: 'POST',
                        body: buildBuildingPayload(newBuilding),
                    });
                    setNewBuilding({
                        universityId: selectedUniversityId,
                        name: '', code: '', type: '', address: '', mapQuery: '', latitude: '', longitude: '',
                        purpose: '', operatingHours: '', operatingHoursSchedule: null, operationalStatus: 'OPEN',
                        operationalNote: '', description: '',
                    });
                    setExpandedBuildingId(null);
                }, 'Building created')}>
                    <Plus className="mr-1.5 h-3.5 w-3.5"/>
                    Create Building
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setExpandedBuildingId(null)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>)}

          {/* Buildings list */}
          <Card className="rounded-xl border-border/60">
            <CardContent className="p-0">
              {scopedBuildings.length === 0 ? (<p className="px-6 py-6 text-sm text-muted-foreground">No buildings yet. Add one above or import from CSV.</p>) : filteredBuildings.length === 0 ? (<p className="px-6 py-6 text-sm text-muted-foreground">No buildings matched that search.</p>) : (<div className="divide-y divide-border/40">
                  {filteredBuildings.map((building) => {
                    const isExpanded = expandedBuildingId === building.id;
                    const statusMeta = STATUS_CONFIG[building.operationalStatus ?? 'OPEN'];
                    return (<div key={building.id}>
                        <button className="flex w-full items-center justify-between gap-3 px-6 py-3 text-left hover:bg-muted/30 transition-colors" onClick={() => setExpandedBuildingId(isExpanded ? null : building.id)}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                              <Building2 className="h-4 w-4 text-muted-foreground"/>
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
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground"/> : <ChevronDown className="h-4 w-4 text-muted-foreground"/>}
                          </div>
                        </button>

                        {isExpanded && (<div className="border-t border-border/40 bg-muted/20 px-6 py-5 space-y-4">
                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                              {[
                                { label: 'Building Name', key: 'name' },
                                { label: 'Code', key: 'code' },
                                { label: 'Type', key: 'type' },
                                { label: 'Address', key: 'address' },
                                { label: 'Map Query', key: 'mapQuery' },
                                { label: 'Latitude', key: 'latitude', type: 'number', min: coordinateFieldConfig.latitude.min, max: coordinateFieldConfig.latitude.max },
                                { label: 'Longitude', key: 'longitude', type: 'number', min: coordinateFieldConfig.longitude.min, max: coordinateFieldConfig.longitude.max },
                            ].map(({ label, key }) => (<div key={String(key)} className="space-y-1.5">
                                  <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
                                  <Input type={key === 'latitude' || key === 'longitude' ? 'number' : undefined} step={key === 'latitude' || key === 'longitude' ? 'any' : undefined} inputMode={key === 'latitude' || key === 'longitude' ? 'decimal' : undefined} min={key === 'latitude' ? coordinateFieldConfig.latitude.min : key === 'longitude' ? coordinateFieldConfig.longitude.min : undefined} max={key === 'latitude' ? coordinateFieldConfig.latitude.max : key === 'longitude' ? coordinateFieldConfig.longitude.max : undefined} value={key === 'latitude' || key === 'longitude' ? formatCoordinateInput(building[key]) : building[key] ?? ''} onChange={(event) => setBuildings((current) => current.map((item) => (item.id === building.id ? { ...item, [key]: event.target.value } : item)))}/>
                                </div>))}
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  {hasMeaningfulBuildingHoursSchedule(building.operatingHoursSchedule) ? 'Hours Summary' : 'Hours Summary / Fallback'}
                                </label>
                                <Input
                                  value={
                                    hasMeaningfulBuildingHoursSchedule(building.operatingHoursSchedule)
                                      ? summarizeBuildingHoursSchedule(building.operatingHoursSchedule, building.operatingHours) ?? ''
                                      : building.operatingHours ?? ''
                                  }
                                  onChange={(event) => setBuildings((current) => current.map((item) => (item.id === building.id ? { ...item, operatingHours: event.target.value } : item)))}
                                  readOnly={hasMeaningfulBuildingHoursSchedule(building.operatingHoursSchedule)}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Operational Status</label>
                                <select value={building.operationalStatus ?? 'OPEN'} onChange={(event) => setBuildings((current) => current.map((item) => (item.id === building.id ? { ...item, operationalStatus: event.target.value } : item)))} className="h-11 min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                                  <option value="OPEN">Open</option>
                                  <option value="CLOSED">Closed</option>
                                  <option value="LIMITED">Limited Access</option>
                                </select>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status Note</label>
                                <Input value={building.operationalNote ?? ''} placeholder="e.g. Closed for renovation" onChange={(event) => setBuildings((current) => current.map((item) => (item.id === building.id ? { ...item, operationalNote: event.target.value } : item)))}/>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Purpose (AI descriptor)</label>
                              <Textarea value={building.purpose ?? ''} placeholder="Describe what this building is used for so the AI assistant can surface it in relevant queries..." rows={2} className="resize-none" onChange={(event) => setBuildings((current) => current.map((item) => (item.id === building.id ? { ...item, purpose: event.target.value } : item)))}/>
                            </div>
                            <BuildingHoursEditor
                              value={building.operatingHoursSchedule}
                              fallbackSummary={building.operatingHours ?? ''}
                              onChange={(operatingHoursSchedule) => setBuildings((current) => current.map((item) => (item.id === building.id ? { ...item, operatingHoursSchedule } : item)))}
                            />
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Description</label>
                              <Textarea value={building.description ?? ''} placeholder="Optional public-facing description" rows={2} className="resize-none" onChange={(event) => setBuildings((current) => current.map((item) => (item.id === building.id ? { ...item, description: event.target.value } : item)))}/>
                            </div>

                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" disabled={saving} onClick={() => void runMutation(async () => {
                                await apiRequest(`/api/admin/buildings/${building.id}`, {
                                    method: 'PATCH',
                                    body: buildBuildingPayload(building, { clearBlankCoordinates: true }),
                                });
                            }, 'Building updated')}>
                                <Pencil className="mr-1.5 h-3.5 w-3.5"/>
                                Save Changes
                              </Button>
                              <Button size="sm" variant="destructive" disabled={saving} onClick={() => void runMutation(async () => {
                                await apiRequest(`/api/admin/buildings/${building.id}`, { method: 'DELETE' });
                                setExpandedBuildingId(null);
                            }, 'Building deleted')}>
                                <Trash2 className="mr-1.5 h-3.5 w-3.5"/>
                                Delete
                              </Button>
                            </div>
                          </div>)}
                      </div>);
                })}
                </div>)}
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
                  <Input type="file" accept=".csv,text/csv" onChange={(event) => void handleBuildingImportFileSelected(event.target.files?.[0] ?? null)}/>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">Required columns (exact names):</p>
                  <p className="mt-1 font-mono">{requiredBuildingHeaders}</p>
                  <p className="mt-2 font-semibold text-foreground">Optional columns:</p>
                  <p className="mt-1 font-mono">{optionalBuildingHeaders}</p>
                </div>

                {buildingImportFileName && (<p className="text-xs text-muted-foreground">
                    File selected: <span className="font-medium text-foreground">{buildingImportFileName}</span>
                  </p>)}

                {buildingImportError && (<p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                    {buildingImportError}
                  </p>)}

                {buildingImportValidation && (<div className={cn('rounded-lg border px-3 py-2 text-xs', buildingImportValidation.valid
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300')}>
                    <p className="font-semibold">
                      {buildingImportValidation.valid ? 'CSV headers look good.' : 'CSV headers do not match the required format.'}
                    </p>
                    {buildingImportValidation.missingHeaders.length > 0 && (<p>Missing: {buildingImportValidation.missingHeaders.join(', ')}</p>)}
                    {buildingImportValidation.unexpectedHeaders.length > 0 && (<p>Unexpected: {buildingImportValidation.unexpectedHeaders.join(', ')}</p>)}
                    {buildingImportValidation.duplicateHeaders.length > 0 && (<p>Duplicate: {buildingImportValidation.duplicateHeaders.join(', ')}</p>)}
                    <p>Detected data rows: {buildingImportRowCount}</p>
                  </div>)}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowBuildingImport(false)}>
                    Cancel
                  </Button>
                  <Button disabled={saving ||
                !buildingImportCsvContent ||
                !buildingImportValidation?.valid ||
                buildingImportRowCount === 0} onClick={() => void runMutation(async () => {
                const result = await apiRequest('/api/admin/buildings/import', {
                    method: 'POST',
                    body: {
                        universityId: buildingImportUniversityId,
                        csvContent: buildingImportCsvContent,
                    },
                });
                setBuildingImportCsvContent('');
                setBuildingImportFileName('');
                setBuildingImportRowCount(0);
                setBuildingImportError(null);
                setBuildingImportValidation(null);
                setShowBuildingImport(false);
                return result;
            }, (result) => `Imported ${result.totalRows} rows (${result.createdCount} created, ${result.updatedCount} updated)`)}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Import Buildings'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

        </TabsContent>

        {/* building-import is now embedded in buildings tab — keep empty for compat */}
        <TabsContent value="building-import" className="mt-0"/>

        <TabsContent value="links" className="mt-0 space-y-4">
          <SimpleCreateCard title="Create Resource Link" description="Links appear in the student Links Directory for the selected university." content={<>
                <select value={newLink.universityId} onChange={(event) => setNewLink((current) => ({ ...current, universityId: event.target.value }))} className="h-11 min-h-11 rounded-xl border border-input bg-background px-3 text-sm">
                  {scopedUniversityOptions}
                </select>
                <Input value={newLink.label} onChange={(event) => setNewLink((current) => ({ ...current, label: event.target.value }))} placeholder="Link label"/>
                <select value={newLink.category} onChange={(event) => setNewLink((current) => ({ ...current, category: event.target.value }))} className="h-11 min-h-11 rounded-xl border border-input bg-background px-3 text-sm">
                  {resourceCategories.map((category) => (<option key={category} value={category}>{category}</option>))}
                </select>
                <Input value={newLink.href} onChange={(event) => setNewLink((current) => ({ ...current, href: event.target.value }))} placeholder="https://..."/>
                <Input value={newLink.description} onChange={(event) => setNewLink((current) => ({ ...current, description: event.target.value }))} placeholder="Description"/>
                <Button disabled={saving || !newLink.universityId || !newLink.label || !newLink.href || !newLink.description} onClick={() => void runMutation(async () => {
                    await apiRequest('/api/admin/resource-links', {
                        method: 'POST',
                        body: newLink,
                    });
                    setNewLink({
                        universityId: selectedUniversityId,
                        label: '',
                        category: 'LEARNING',
                        href: '',
                        description: '',
                    });
                }, 'Resource link created')}>
                  Create Link
                </Button>
              </>}/>

          <SectionSearchBar
            value={linkSearchQuery}
            onChange={setLinkSearchQuery}
            placeholder="Search links by label, category, URL, or description"
            countLabel={`${filteredResourceLinks.length} link${filteredResourceLinks.length === 1 ? '' : 's'}`}
          />

          <CrudLinkTable records={filteredResourceLinks} universities={scopedUniversities} saving={saving} onChange={setResourceLinks} onSave={(record) => runMutation(async () => {
                await apiRequest(`/api/admin/resource-links/${record.id}`, {
                    method: 'PATCH',
                    body: {
                        universityId: record.universityId,
                        label: record.label,
                        category: record.category,
                        href: record.href,
                        description: record.description,
                    },
                });
            }, 'Resource link updated')} onDelete={(recordId) => runMutation(async () => {
                await apiRequest(`/api/admin/resource-links/${recordId}`, { method: 'DELETE' });
            }, 'Resource link deleted')}/>
        </TabsContent>

        <TabsContent value="clubs" className="mt-0 space-y-4">
          <Card className="rounded-xl border-border/60">
            <CardHeader>
              <CardTitle>Murray State Directory Import</CardTitle>
              <CardDescription>
                Load the 131 public Murray State student organizations from the reviewed directory sheet into this university. Existing clubs are matched by name and updated in place.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                This imports category, public leadership contacts, source URLs, and import notes used across Clubhouse, admin CRUD, and the chatbot.
              </p>
              <Button disabled={saving || !selectedUniversityId} onClick={() => void runMutation(async () => {
                return apiRequest('/api/admin/clubs/import', {
                    method: 'POST',
                    body: {
                        universityId: selectedUniversityId,
                        preset: 'murray-state-organizations',
                    },
                });
            }, (result) => `Synced ${result.totalRows} Murray State organizations (${result.createdCount} created, ${result.updatedCount} updated)`)}>
                Import Murray State organizations
              </Button>
            </CardContent>
          </Card>

          <SimpleCreateCard title="Create Club/Organization" description="Organizations can be displayed across student discovery experiences." content={<>
                <select value={newClub.universityId} onChange={(event) => setNewClub((current) => ({ ...current, universityId: event.target.value }))} className="h-11 min-h-11 rounded-xl border border-input bg-background px-3 text-sm">
                  {scopedUniversityOptions}
                </select>
                <Input value={newClub.name} onChange={(event) => setNewClub((current) => ({ ...current, name: event.target.value }))} placeholder="Club name"/>
                <Input value={newClub.category} onChange={(event) => setNewClub((current) => ({ ...current, category: event.target.value }))} placeholder="Category"/>
                <Input value={newClub.description} onChange={(event) => setNewClub((current) => ({ ...current, description: event.target.value }))} placeholder="Description"/>
                <Input value={newClub.contactEmail} onChange={(event) => setNewClub((current) => ({ ...current, contactEmail: event.target.value }))} placeholder="Contact email (optional)"/>
                <Input value={newClub.presidentName} onChange={(event) => setNewClub((current) => ({ ...current, presidentName: event.target.value }))} placeholder="President name (optional)"/>
                <AutocompleteField
                  value={newClub.presidentEmail}
                  onChange={(value) => setNewClub((current) => ({ ...current, presidentEmail: value }))}
                  onSelect={(option) => setNewClub((current) => ({
                    ...current,
                    presidentName: option.label,
                    presidentEmail: option.email,
                  }))}
                  options={studentAccountOptions}
                  placeholder="President email (search existing student accounts)"
                  emptyLabel="No matching student accounts"
                />
                <AutocompleteField
                  value={newClub.advisorName}
                  onChange={(value) => setNewClub((current) => ({ ...current, advisorName: value }))}
                  onSelect={(option) => setNewClub((current) => ({
                    ...current,
                    advisorName: option.label,
                    advisorEmail: option.email,
                  }))}
                  options={facultyAccountOptions}
                  placeholder="Campus advisor (search faculty by name)"
                  emptyLabel="No matching faculty accounts"
                />
                <Input value={newClub.advisorEmail} onChange={(event) => setNewClub((current) => ({ ...current, advisorEmail: event.target.value }))} placeholder="Advisor email(s) (optional)"/>
                <Input value={newClub.publicContactInfo} onChange={(event) => setNewClub((current) => ({ ...current, publicContactInfo: event.target.value }))} placeholder="Public contact listing (optional)"/>
                <Input value={newClub.sourceUrls} onChange={(event) => setNewClub((current) => ({ ...current, sourceUrls: event.target.value }))} placeholder="Source URL(s) (optional)"/>
                <Input value={newClub.importNotes} onChange={(event) => setNewClub((current) => ({ ...current, importNotes: event.target.value }))} placeholder="Import notes (optional)"/>
                <Input value={newClub.websiteUrl} onChange={(event) => setNewClub((current) => ({ ...current, websiteUrl: event.target.value }))} placeholder="Website URL (optional)"/>
                <Input value={newClub.meetingInfo} onChange={(event) => setNewClub((current) => ({ ...current, meetingInfo: event.target.value }))} placeholder="Meeting info (optional)"/>
                <Button disabled={saving || !newClub.universityId || !newClub.name || !newClub.category || !newClub.description} onClick={() => void runMutation(async () => {
                    await apiRequest('/api/admin/clubs', {
                        method: 'POST',
                        body: {
                            ...newClub,
                            contactEmail: newClub.contactEmail || undefined,
                            presidentName: newClub.presidentName || undefined,
                            presidentEmail: newClub.presidentEmail || undefined,
                            advisorName: newClub.advisorName || undefined,
                            advisorEmail: newClub.advisorEmail || undefined,
                            publicContactInfo: newClub.publicContactInfo || undefined,
                            sourceUrls: newClub.sourceUrls || undefined,
                            importNotes: newClub.importNotes || undefined,
                            websiteUrl: newClub.websiteUrl || undefined,
                            meetingInfo: newClub.meetingInfo || undefined,
                        },
                    });
                    setNewClub({
                        universityId: selectedUniversityId,
                        name: '',
                        category: '',
                        description: '',
                        contactEmail: '',
                        presidentName: '',
                        presidentEmail: '',
                        advisorName: '',
                        advisorEmail: '',
                        publicContactInfo: '',
                        sourceUrls: '',
                        importNotes: '',
                        websiteUrl: '',
                        meetingInfo: '',
                    });
                }, 'Club created')}>
                  Create Club
                </Button>
              </>}/>

          <SectionSearchBar
            value={clubSearchQuery}
            onChange={setClubSearchQuery}
            placeholder="Search clubs by name, category, advisor, president, or meeting info"
            countLabel={`${filteredClubs.length} club${filteredClubs.length === 1 ? '' : 's'}`}
          />

          <CrudClubTable records={filteredClubs} universities={scopedUniversities} saving={saving} onChange={setClubs} advisorOptions={facultyAccountOptions} studentOptions={studentAccountOptions} onSave={(record) => runMutation(async () => {
                await apiRequest(`/api/admin/clubs/${record.id}`, {
                    method: 'PATCH',
                    body: {
                        universityId: record.universityId,
                        name: record.name,
                        category: record.category,
                        description: record.description,
                        contactEmail: record.contactEmail || null,
                        presidentName: record.presidentName || null,
                        presidentEmail: record.presidentEmail || null,
                        advisorName: record.advisorName || null,
                        advisorEmail: record.advisorEmail || null,
                        publicContactInfo: record.publicContactInfo || null,
                        sourceUrls: record.sourceUrls || null,
                        importNotes: record.importNotes || null,
                        websiteUrl: record.websiteUrl || null,
                        meetingInfo: record.meetingInfo || null,
                    },
                });
            }, 'Club updated')} onDelete={(recordId) => runMutation(async () => {
                await apiRequest(`/api/admin/clubs/${recordId}`, { method: 'DELETE' });
                }, 'Club deleted')}/>
        </TabsContent>

        <TabsContent value="events" className="mt-0 space-y-4">
          <SimpleCreateCard title="Create Event" description="Events appear in the student events workflow." content={<>
                <select value={newEvent.universityId} onChange={(event) => setNewEvent((current) => ({ ...current, universityId: event.target.value }))} className="h-11 min-h-11 rounded-xl border border-input bg-background px-3 text-sm">
                  {scopedUniversityOptions}
                </select>
                <Input value={newEvent.title} onChange={(event) => setNewEvent((current) => ({ ...current, title: event.target.value }))} placeholder="Event title"/>
                <Input value={newEvent.description} onChange={(event) => setNewEvent((current) => ({ ...current, description: event.target.value }))} placeholder="Description"/>
                <Input type="datetime-local" value={newEvent.date} onChange={(event) => setNewEvent((current) => ({ ...current, date: event.target.value }))}/>
                <Input value={newEvent.time} onChange={(event) => setNewEvent((current) => ({ ...current, time: event.target.value }))} placeholder="Time label"/>
                <Input value={newEvent.location} onChange={(event) => setNewEvent((current) => ({ ...current, location: event.target.value }))} placeholder="Location"/>
                <select value={newEvent.category} onChange={(event) => setNewEvent((current) => ({ ...current, category: event.target.value }))} className="h-11 min-h-11 rounded-xl border border-input bg-background px-3 text-sm">
                  {eventCategories.map((category) => (<option key={category} value={category}>{category}</option>))}
                </select>
                <select value={newEvent.audience} onChange={(event) => setNewEvent((current) => ({ ...current, audience: event.target.value }))} className="h-11 min-h-11 rounded-xl border border-input bg-background px-3 text-sm">
                  {eventAudienceOptions.map((audience) => (<option key={audience} value={audience}>{eventAudienceLabels[audience]}</option>))}
                </select>
                <Input value={newEvent.organizer} onChange={(event) => setNewEvent((current) => ({ ...current, organizer: event.target.value }))} placeholder="Organizer"/>
                <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={newEvent.isPublished} onChange={(event) => setNewEvent((current) => ({ ...current, isPublished: event.target.checked }))}/>
                  Published
                </label>
                <Button disabled={saving || !newEvent.universityId || !newEvent.title || !newEvent.description || !newEvent.date || !newEvent.time || !newEvent.location || !newEvent.organizer} onClick={() => void runMutation(async () => {
                    await apiRequest('/api/admin/events', {
                        method: 'POST',
                        body: {
                            ...newEvent,
                            date: new Date(newEvent.date).toISOString(),
                        },
                    });
                    setNewEvent({
                        universityId: selectedUniversityId,
                        title: '',
                        description: '',
                        date: '',
                        time: '',
                        location: '',
                        category: 'ACADEMIC',
                        audience: 'ALL_CAMPUS',
                        organizer: '',
                        isPublished: true,
                    });
                }, 'Event created')}>
                  Create Event
                </Button>
              </>}/>

          <SectionSearchBar
            value={eventSearchQuery}
            onChange={setEventSearchQuery}
            placeholder="Search events by title, organizer, category, location, or audience"
            countLabel={`${filteredEvents.length} event${filteredEvents.length === 1 ? '' : 's'}`}
          />

          <CrudEventTable records={filteredEvents} universities={scopedUniversities} saving={saving} onChange={setEvents} onSave={(record) => runMutation(async () => {
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
                        audience: record.audience,
                        organizer: record.organizer,
                        isPublished: record.isPublished,
                    },
                });
            }, 'Event updated')} onDelete={(recordId) => runMutation(async () => {
                await apiRequest(`/api/admin/events/${recordId}`, { method: 'DELETE' });
            }, 'Event deleted')}/>
        </TabsContent>

        <TabsContent value="it-accounts" className="mt-0 space-y-4">
          {temporaryAccountPassword && (<Card className="rounded-2xl border-[#002144]/10 bg-card shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Temporary Password
                </p>
                <p className="mt-2 font-mono text-sm text-foreground">
                  {temporaryAccountPassword}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Share this securely and require the user to reset it at first login.
                </p>
              </CardContent>
            </Card>)}

          <Card className="rounded-2xl border-[#002144]/10 shadow-sm">
            <CardHeader>
              <CardTitle className="font-display text-2xl text-[#002144]">Create IT / Portal Account</CardTitle>
              <CardDescription>
                Provision IT admins and scoped portal users with tab-level access controls.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <select value={newPortalAccount.universityId} onChange={(event) => setNewPortalAccount((current) => ({
                ...current,
                universityId: event.target.value,
            }))} className="h-11 min-h-11 rounded-xl border border-input bg-background px-3 text-sm">
                  {scopedUniversityOptions}
                </select>
                <Input value={newPortalAccount.firstName} onChange={(event) => setNewPortalAccount((current) => ({
                ...current,
                firstName: event.target.value,
            }))} placeholder="First name"/>
                <Input value={newPortalAccount.lastName} onChange={(event) => setNewPortalAccount((current) => ({
                ...current,
                lastName: event.target.value,
            }))} placeholder="Last name"/>
                <Input value={newPortalAccount.email} onChange={(event) => setNewPortalAccount((current) => ({
                ...current,
                email: event.target.value.toLowerCase(),
            }))} placeholder="Email address"/>
                <select value={newPortalAccount.role} onChange={(event) => setNewPortalAccount((current) => ({
                ...current,
                role: event.target.value,
            }))} className="h-11 min-h-11 rounded-xl border border-input bg-background px-3 text-sm">
                  <option value="ADMIN">Admin</option>
                  <option value="FACULTY">Faculty</option>
                  <option value="STUDENT">Student</option>
                </select>
                <select value={newPortalAccount.accessLevel} onChange={(event) => setNewPortalAccount((current) => ({
                ...current,
                accessLevel: event.target.value,
            }))} className="h-11 min-h-11 rounded-xl border border-input bg-background px-3 text-sm">
                  {accessLevelOptions.map((level) => (<option key={level} value={level}>
                      {level.replaceAll('_', ' ')}
                    </option>))}
                </select>
                <Input value={newPortalAccount.password} onChange={(event) => setNewPortalAccount((current) => ({
                ...current,
                password: event.target.value,
            }))} placeholder="Password (optional)"/>
              </div>

              <SearchableMultiSelect
                title="Portal Permissions"
                description="Search and assign tab permissions for this account."
                items={portalPermissionOptions.map((permission) => ({
                    id: permission,
                    label: portalPermissionLabels[permission],
                    secondary: permission,
                }))}
                selectedIds={newPortalAccount.portalPermissions}
                onToggle={togglePermissionInDraftAccount}
                placeholder="Search permissions"
              />

              <SearchableMultiSelect
                title="Managed Clubs"
                description="Assign clubs for club leadership roles."
                icon={Landmark}
                items={scopedClubs.map((club) => ({
                    id: club.id,
                    label: club.name,
                    secondary: club.category,
                }))}
                selectedIds={newPortalAccount.managedClubIds}
                onToggle={toggleManagedClubInDraftAccount}
                placeholder="Search clubs"
              />

              <Button disabled={saving ||
                !newPortalAccount.universityId ||
                !newPortalAccount.firstName.trim() ||
                !newPortalAccount.lastName.trim() ||
                !newPortalAccount.email.trim()} onClick={() => void runMutation(async () => {
                const result = await apiRequest('/api/admin/accounts', {
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
                });
                setTemporaryAccountPassword(result.temporaryPassword);
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
                });
            }, 'Portal account created')}>
                <KeyRound className="mr-1.5 h-4 w-4"/>
                Create Account
              </Button>
            </CardContent>
          </Card>

          <SectionSearchBar
            value={portalAccountSearchQuery}
            onChange={setPortalAccountSearchQuery}
            placeholder="Search portal accounts by name, email, role, permission, or club"
            countLabel={`${filteredPortalAccounts.length} account${filteredPortalAccounts.length === 1 ? '' : 's'}`}
          />

          <CrudPortalAccountsTable records={filteredPortalAccounts} universities={scopedUniversities} clubs={scopedClubs} saving={saving} onChange={setPortalAccounts} onTogglePermission={togglePermissionForAccount} onToggleManagedClub={toggleManagedClubForAccount} onSave={(record) => runMutation(async () => {
                await apiRequest(`/api/admin/accounts/${record.id}`, {
                    method: 'PATCH',
                    body: {
                        firstName: record.firstName,
                        lastName: record.lastName,
                        role: record.role,
                        accessLevel: record.adminAccessLevel,
                        portalPermissions: record.portalPermissions,
                        managedClubIds: record.managedClubs.map((assignment) => assignment.clubId),
                        canPublishCampusAnnouncements: record.portalPermissions.includes('CAN_PUBLISH_ANNOUNCEMENTS'),
                    },
                });
            }, 'Account updated')} onDelete={(recordId) => runMutation(async () => {
                await apiRequest(`/api/admin/accounts/${recordId}`, {
                    method: 'DELETE',
                });
            }, 'Account deleted')}/>
        </TabsContent>

        <TabsContent value="users" className="mt-0 space-y-4">
          {/* Filters */}
          <Card className="rounded-xl border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">All Users</CardTitle>
              <CardDescription>
                View and manage every user account for {selectedUniversity?.name ?? 'this university'}. Use the search and filter to narrow down results.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Input className="max-w-xs" placeholder="Search by name or email…" value={userSearchQuery} onChange={(event) => setUserSearchQuery(event.target.value)}/>
              <select value={userRoleFilter} onChange={(event) => setUserRoleFilter(event.target.value)} className="h-11 min-h-11 rounded-xl border border-input bg-background px-3 text-sm">
                <option value="">All Roles</option>
                <option value="STUDENT">Student</option>
                <option value="FACULTY">Faculty</option>
                <option value="ADMIN">Admin</option>
              </select>
              <Badge variant="outline" className="self-center">
                {(() => {
                const filtered = allUsers.filter((u) => {
                    const matchesRole = !userRoleFilter || u.role === userRoleFilter;
                    const q = userSearchQuery.toLowerCase();
                    const matchesSearch = !q ||
                        u.email.toLowerCase().includes(q) ||
                        u.firstName.toLowerCase().includes(q) ||
                        u.lastName.toLowerCase().includes(q) ||
                        u.displayName.toLowerCase().includes(q);
                    return matchesRole && matchesSearch;
                });
                return `${filtered.length} user${filtered.length !== 1 ? 's' : ''}`;
            })()}
              </Badge>
            </CardContent>
          </Card>

          <CrudUsersTable records={allUsers} searchQuery={userSearchQuery} roleFilter={userRoleFilter} saving={saving} onChange={setAllUsers} onSave={(record) => runMutation(async () => {
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
                });
            }, 'User updated')} onDelete={(recordId) => runMutation(async () => {
                await apiRequest(`/api/admin/users/${recordId}`, {
                    method: 'DELETE',
                });
            }, 'User deleted')}/>
        </TabsContent>
        </Tabs>) : (<Card className="mx-auto w-full max-w-2xl rounded-xl border-border/60">
          <CardHeader>
            <CardTitle>What university are you working on?</CardTitle>
            <CardDescription>
              Select one university to load a scoped dashboard and run CRUD operations for that tenant only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {universities.length > 0 ? (<form className="space-y-4" onSubmit={(event) => {
                    event.preventDefault();
                    if (!universitySelectionDraft)
                        return;
                    applyUniversitySelection(universitySelectionDraft);
                }}>
                <div className="space-y-1.5">
                  <label htmlFor="admin-university-selection" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    University
                  </label>
                  <select id="admin-university-selection" value={universitySelectionDraft} onChange={(event) => setUniversitySelectionDraft(event.target.value)} className="h-11 min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                    <option value="">Select university</option>
                    {universityOptions}
                  </select>
                </div>

                <Button type="submit" disabled={!universitySelectionDraft}>
                  Load Dashboard
                </Button>
              </form>) : (<p className="text-sm text-muted-foreground">
                No universities are available for this account.
              </p>)}
          </CardContent>
        </Card>)}

      {loading && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
          <div className="rounded-xl border border-border/60 bg-card px-4 py-3 text-sm text-muted-foreground">
            Loading admin data...
          </div>
        </div>)}
    </div>);
}
function SimpleCreateCard({ title, description, content, }) {
    return (<Card className="rounded-xl border-border/60">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">{content}</CardContent>
    </Card>);
}
function SectionSearchBar({ value, onChange, placeholder, countLabel }) {
    return (<div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
        <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="pl-10"/>
      </div>
      {countLabel ? <Badge variant="outline" className="self-start sm:self-center">{countLabel}</Badge> : null}
    </div>);
}
function SearchableMultiSelect({ title, description, items, selectedIds, onToggle, icon: Icon, placeholder = 'Search options', emptyLabel = 'No matches found.', }) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');
    const normalizedQuery = normalizeSearchValue(query);
    const filteredItems = React.useMemo(() => items.filter((item) => matchesAnySearch(item, normalizedQuery, ['label', 'secondary'])), [items, normalizedQuery]);
    const selectedItems = items.filter((item) => selectedIds.includes(item.id));
    return (<div className="space-y-2 rounded-xl border border-border/60 bg-card/60 p-3">
      <button type="button" onClick={() => setIsOpen((current) => !current)} className="flex w-full items-center justify-between gap-3 text-left">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {selectedItems.length === 0
                ? description
                : `${selectedItems.length} selected${selectedItems.length <= 3 ? `: ${selectedItems.map((item) => item.label).join(', ')}` : ''}`}
          </p>
        </div>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')}/>
      </button>

      {selectedItems.length > 0 ? (<div className="flex flex-wrap gap-1.5">
          {selectedItems.map((item) => (<Badge key={item.id} variant="secondary" className="gap-1 pr-1.5">
              {Icon ? <Icon className="h-3 w-3"/> : null}
              <span className="max-w-[160px] truncate">{item.label}</span>
              <button type="button" className="rounded-full p-0.5 text-muted-foreground hover:text-foreground" onClick={(event) => {
                    event.stopPropagation();
                    onToggle(item.id);
                }}>
                <X className="h-3 w-3"/>
              </button>
            </Badge>))}
        </div>) : null}

      {isOpen ? (<div className="space-y-2 rounded-xl border border-border/60 bg-background p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} className="pl-10"/>
          </div>
          <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
            {filteredItems.length === 0 ? (<p className="px-2 py-3 text-sm text-muted-foreground">{emptyLabel}</p>) : (filteredItems.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                return (<button key={item.id} type="button" onClick={() => onToggle(item.id)} className={cn('flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors', isSelected
                        ? 'bg-primary/10 text-foreground'
                        : 'hover:bg-muted')}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{item.label}</p>
                      {item.secondary ? <p className="mt-1 text-xs text-muted-foreground">{item.secondary}</p> : null}
                    </div>
                    <Badge variant={isSelected ? 'success' : 'outline'}>{isSelected ? 'Selected' : 'Add'}</Badge>
                  </button>);
            }))}
          </div>
        </div>) : null}
    </div>);
}
function AutocompleteField({ value, onChange, onSelect, options, placeholder, emptyLabel = 'No matches found.', }) {
    const normalizedValue = normalizeSearchValue(value);
    const filteredOptions = React.useMemo(() => {
        if (!normalizedValue) {
            return options.slice(0, 6);
        }
        return options
            .filter((option) => matchesAnySearch(option, normalizedValue, ['label', 'secondary', 'value', 'email']))
            .slice(0, 6);
    }, [normalizedValue, options]);
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    return (<div className="relative">
      <Input value={value} onChange={(event) => {
            onChange(event.target.value);
            setShowSuggestions(true);
        }} onFocus={() => setShowSuggestions(true)} onBlur={() => {
            window.setTimeout(() => setShowSuggestions(false), 120);
        }} placeholder={placeholder}/>
      {showSuggestions ? (<div className="absolute z-20 mt-2 w-full rounded-xl border border-border/70 bg-background p-2 shadow-lg">
          {filteredOptions.length === 0 ? (<p className="px-2 py-3 text-sm text-muted-foreground">{emptyLabel}</p>) : (filteredOptions.map((option) => (<button key={option.id} type="button" onMouseDown={(event) => {
                    event.preventDefault();
                    onSelect(option);
                    setShowSuggestions(false);
                }} className="flex w-full flex-col rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted">
                <span className="text-sm font-medium">{option.label}</span>
                {option.secondary ? <span className="mt-1 text-xs text-muted-foreground">{option.secondary}</span> : null}
              </button>)))}
        </div>) : null}
    </div>);
}
function CrudLinkTable({ records, universities, saving, onChange, onSave, onDelete, }) {
    return (<CrudCard title="Manage Resource Links" description="Update portal links shown to students without the table overflow.">
      <div className="space-y-3">
        {records.length === 0 ? (<p className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
            No resource links matched that search.
          </p>) : (records.map((record) => (<div key={record.id} className="rounded-xl border border-border/60 bg-card/70 p-4">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_220px]">
                <div className="grid gap-3 md:grid-cols-2">
                  <Input value={record.label} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, label: event.target.value } : item)))} placeholder="Link label"/>
                  <select value={record.category} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, category: event.target.value } : item)))} className="h-11 min-h-11 rounded-xl border border-input bg-background px-3 text-sm">
                    {resourceCategories.map((category) => (<option key={category} value={category}>{category}</option>))}
                  </select>
                  <div className="md:col-span-2">
                    <Input value={record.href} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, href: event.target.value } : item)))} placeholder="https://..."/>
                  </div>
                  <div className="md:col-span-2">
                    <Input value={record.description} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, description: event.target.value } : item)))} placeholder="Description"/>
                  </div>
                </div>
                <div className="space-y-3">
                  <select value={record.universityId} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, universityId: event.target.value } : item)))} className="h-11 min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                    {universities.map((university) => (<option key={university.id} value={university.id}>{university.name}</option>))}
                  </select>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={saving} onClick={() => void onSave(record)}>Save</Button>
                    <Button size="sm" variant="destructive" disabled={saving} onClick={() => void onDelete(record.id)}>Delete</Button>
                  </div>
                </div>
              </div>
            </div>)))}
      </div>
    </CrudCard>);
}
function CrudClubTable({ records, universities, saving, onChange, onSave, onDelete, advisorOptions = [], studentOptions = [], }) {
    return (<CrudCard title="Manage Clubs" description="Compact club cards with searchable advisor and president lookups.">
      <div className="space-y-3">
        {records.length === 0 ? (<p className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
            No clubs matched that search.
          </p>) : (records.map((record) => (<details key={record.id} className="group rounded-xl border border-border/60 bg-card/70 p-4">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{record.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[record.category, record.advisorName, record.meetingInfo].filter(Boolean).join(' · ') || 'No additional details yet'}
                  </p>
                </div>
                <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"/>
              </summary>
              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="grid gap-3 md:grid-cols-2">
                  <Input value={record.name} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, name: event.target.value } : item)))} placeholder="Club name"/>
                  <Input value={record.category} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, category: event.target.value } : item)))} placeholder="Category"/>
                  <div className="md:col-span-2">
                    <Input value={record.description} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, description: event.target.value } : item)))} placeholder="Description"/>
                  </div>
                  <Input value={record.contactEmail ?? ''} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, contactEmail: event.target.value || null } : item)))} placeholder="Contact email"/>
                  <Input value={record.presidentName ?? ''} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, presidentName: event.target.value || null } : item)))} placeholder="President name"/>
                  <AutocompleteField
                    value={record.presidentEmail ?? ''}
                    onChange={(value) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, presidentEmail: value || null } : item)))}
                    onSelect={(option) => onChange((current) => current.map((item) => (item.id === record.id ? {
                            ...item,
                            presidentName: option.label,
                            presidentEmail: option.email,
                        } : item)))}
                    options={studentOptions}
                    placeholder="President email (search student accounts)"
                    emptyLabel="No matching student accounts"
                  />
                  <AutocompleteField
                    value={record.advisorName ?? ''}
                    onChange={(value) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, advisorName: value || null } : item)))}
                    onSelect={(option) => onChange((current) => current.map((item) => (item.id === record.id ? {
                            ...item,
                            advisorName: option.label,
                            advisorEmail: option.email,
                        } : item)))}
                    options={advisorOptions}
                    placeholder="Advisor name (search faculty)"
                    emptyLabel="No matching faculty accounts"
                  />
                  <Input value={record.advisorEmail ?? ''} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, advisorEmail: event.target.value || null } : item)))} placeholder="Advisor email"/>
                  <Input value={record.meetingInfo ?? ''} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, meetingInfo: event.target.value || null } : item)))} placeholder="Meeting info"/>
                  <Input value={record.websiteUrl ?? ''} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, websiteUrl: event.target.value || null } : item)))} placeholder="Website URL"/>
                  <Input value={record.publicContactInfo ?? ''} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, publicContactInfo: event.target.value || null } : item)))} placeholder="Public contact listing"/>
                  <Input value={record.sourceUrls ?? ''} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, sourceUrls: event.target.value || null } : item)))} placeholder="Source URL(s)"/>
                  <div className="md:col-span-2">
                    <Input value={record.importNotes ?? ''} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, importNotes: event.target.value || null } : item)))} placeholder="Import notes"/>
                  </div>
                </div>
                <div className="space-y-3">
                  <select value={record.universityId} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, universityId: event.target.value } : item)))} className="h-11 min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                    {universities.map((university) => (<option key={university.id} value={university.id}>{university.name}</option>))}
                  </select>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={saving} onClick={() => void onSave(record)}>Save</Button>
                    <Button size="sm" variant="destructive" disabled={saving} onClick={() => void onDelete(record.id)}>Delete</Button>
                  </div>
                </div>
              </div>
            </details>)))}
      </div>
    </CrudCard>);
}
function CrudEventTable({ records, universities, saving, onChange, onSave, onDelete, }) {
    return (<CrudCard title="Manage Events" description="Searchable event cards. Expired events are cleaned out automatically before this list loads.">
      <div className="space-y-3">
        {records.length === 0 ? (<p className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
            No events matched that search.
          </p>) : (records.map((record) => (<details key={record.id} className="group rounded-xl border border-border/60 bg-card/70 p-4">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{record.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[new Date(record.date).toLocaleDateString(), record.time, record.location].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={record.isPublished ? 'success' : 'secondary'}>{record.isPublished ? 'Live' : 'Draft'}</Badge>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180"/>
                </div>
              </summary>
              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="grid gap-3 md:grid-cols-2">
                  <Input value={record.title} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, title: event.target.value } : item)))}/>
                  <Input value={record.organizer} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, organizer: event.target.value } : item)))}/>
                  <div className="md:col-span-2">
                    <Input value={record.description} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, description: event.target.value } : item)))}/>
                  </div>
                  <Input type="datetime-local" value={formatDateTimeInput(record.date)} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, date: new Date(event.target.value).toISOString() } : item)))}/>
                  <Input value={record.time} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, time: event.target.value } : item)))}/>
                  <Input value={record.location} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, location: event.target.value } : item)))}/>
                  <select value={record.category} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, category: event.target.value } : item)))} className="h-11 min-h-11 rounded-xl border border-input bg-background px-3 text-sm">
                    {eventCategories.map((category) => (<option key={category} value={category}>{category}</option>))}
                  </select>
                  <select value={record.audience ?? 'ALL_CAMPUS'} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, audience: event.target.value } : item)))} className="h-11 min-h-11 rounded-xl border border-input bg-background px-3 text-sm">
                    {eventAudienceOptions.map((audience) => (<option key={audience} value={audience}>{eventAudienceLabels[audience]}</option>))}
                  </select>
                </div>
                <div className="space-y-3">
                  <select value={record.universityId ?? ''} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, universityId: event.target.value } : item)))} className="h-11 min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                    {universities.map((university) => (<option key={university.id} value={university.id}>{university.name}</option>))}
                  </select>
                  <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" checked={record.isPublished} onChange={(event) => onChange((current) => current.map((item) => (item.id === record.id ? { ...item, isPublished: event.target.checked } : item)))}/>
                    Published
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={saving || !record.universityId} onClick={() => void onSave(record)}>Save</Button>
                    <Button size="sm" variant="destructive" disabled={saving} onClick={() => void onDelete(record.id)}>Delete</Button>
                  </div>
                </div>
              </div>
            </details>)))}
      </div>
    </CrudCard>);
}
function CrudPortalAccountsTable({ records, universities, clubs, saving, onChange, onTogglePermission, onToggleManagedClub, onSave, onDelete, }) {
    return (<CrudCard title="Manage Portal Accounts" description="Update role access levels, tab permissions, and club assignment scope.">
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
            const assignedClubIds = new Set(record.managedClubs.map((assignment) => assignment.clubId));
            return (<TableRow key={record.id}>
                  <TableCell className="space-y-2 min-w-[260px]">
                    <Input value={record.firstName} onChange={(event) => onChange((current) => current.map((item) => item.id === record.id
                    ? {
                        ...item,
                        firstName: event.target.value,
                        displayName: `${event.target.value} ${item.lastName}`.trim(),
                    }
                    : item))}/>
                    <Input value={record.lastName} onChange={(event) => onChange((current) => current.map((item) => item.id === record.id
                    ? {
                        ...item,
                        lastName: event.target.value,
                        displayName: `${item.firstName} ${event.target.value}`.trim(),
                    }
                    : item))}/>
                    <Input value={record.email} disabled/>
                  </TableCell>
                  <TableCell>
                    <select value={record.universityId ?? ''} disabled className="h-11 min-h-11 rounded-xl border border-input bg-background px-3 text-sm">
                      <option value="">Unscoped</option>
                      {universities.map((university) => (<option key={university.id} value={university.id}>
                          {university.name}
                        </option>))}
                    </select>
                  </TableCell>
                  <TableCell className="space-y-2 min-w-[220px]">
                    <select value={record.role} onChange={(event) => onChange((current) => current.map((item) => item.id === record.id
                    ? {
                        ...item,
                        role: event.target.value,
                    }
                    : item))} className="h-11 min-h-11 rounded-xl border border-input bg-background px-3 text-sm">
                      <option value="ADMIN">Admin</option>
                      <option value="FACULTY">Faculty</option>
                      <option value="STUDENT">Student</option>
                    </select>
                    <select value={record.adminAccessLevel ?? ''} onChange={(event) => onChange((current) => current.map((item) => item.id === record.id
                    ? {
                        ...item,
                        adminAccessLevel: (event.target.value || null),
                    }
                    : item))} className="h-11 min-h-11 rounded-xl border border-input bg-background px-3 text-sm">
                      <option value="">No access level</option>
                      {accessLevelOptions.map((level) => (<option key={level} value={level}>
                          {level.replaceAll('_', ' ')}
                        </option>))}
                    </select>
                    <Badge variant="outline">{record.adminAccessLevel ?? 'CUSTOM'}</Badge>
                  </TableCell>
                  <TableCell className="min-w-[360px]">
                    <div className="grid gap-1.5 md:grid-cols-2">
                      {portalPermissionOptions.map((permission) => (<label key={`${record.id}-${permission}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-input px-2 py-2 text-[11px]">
                          <input type="checkbox" checked={record.portalPermissions.includes(permission)} onChange={() => onTogglePermission(record.id, permission)}/>
                          {portalPermissionLabels[permission]}
                        </label>))}
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[240px]">
                    <div className="grid gap-1.5">
                      {clubs.map((club) => (<label key={`${record.id}-${club.id}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-input px-2 py-2 text-[11px]">
                          <input type="checkbox" checked={assignedClubIds.has(club.id)} onChange={() => onToggleManagedClub(record.id, club.id)}/>
                          {club.name}
                        </label>))}
                    </div>
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button size="sm" variant="outline" disabled={saving} onClick={() => void onSave(record)}>
                      Save
                    </Button>
                    <Button size="sm" variant="destructive" disabled={saving} onClick={() => void onDelete(record.id)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>);
        })}
          </TableBody>
        </Table>
      </div>
    </CrudCard>);
}
function CrudUsersTable({ records, searchQuery, roleFilter, saving, onChange, onSave, onDelete, }) {
    const q = searchQuery.toLowerCase();
    const filtered = records.filter((u) => {
        const matchesRole = !roleFilter || u.role === roleFilter;
        const matchesSearch = !q ||
            u.email.toLowerCase().includes(q) ||
            u.firstName.toLowerCase().includes(q) ||
            u.lastName.toLowerCase().includes(q) ||
            u.displayName.toLowerCase().includes(q);
        return matchesRole && matchesSearch;
    });
    const roleBadgeVariant = (role) => {
        switch (role) {
            case 'ADMIN':
                return 'destructive';
            case 'FACULTY':
                return 'default';
            default:
                return 'secondary';
        }
    };
    return (<CrudCard title="Manage Users" description="Edit active and dormant user records directly. Dormant users are preloaded accounts waiting to be claimed at signup.">
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
            {filtered.length === 0 && (<TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>)}
            {filtered.map((record) => (<TableRow key={record.id}>
                <TableCell className="space-y-2 min-w-[260px]">
                  <Input value={record.firstName} placeholder="First name" onChange={(event) => onChange((current) => current.map((item) => item.id === record.id
                ? {
                    ...item,
                    firstName: event.target.value,
                    displayName: `${event.target.value} ${item.lastName}`.trim(),
                }
                : item))}/>
                  <Input value={record.lastName} placeholder="Last name" onChange={(event) => onChange((current) => current.map((item) => item.id === record.id
                ? {
                    ...item,
                    lastName: event.target.value,
                    displayName: `${item.firstName} ${event.target.value}`.trim(),
                }
                : item))}/>
                  <Input value={record.email} disabled className="text-xs text-muted-foreground"/>
                </TableCell>
                <TableCell className="space-y-2 min-w-[160px]">
                  <select value={record.role} onChange={(event) => onChange((current) => current.map((item) => item.id === record.id
                ? { ...item, role: event.target.value }
                : item))} className="h-11 min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                    <option value="STUDENT">Student</option>
                    <option value="FACULTY">Faculty</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  {record.role === 'ADMIN' && (<select value={record.adminAccessLevel ?? ''} onChange={(event) => onChange((current) => current.map((item) => item.id === record.id
                    ? {
                        ...item,
                        adminAccessLevel: (event.target.value || null),
                    }
                    : item))} className="h-11 min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                      <option value="">No Access Level</option>
                      <option value="OWNER">Owner</option>
                      <option value="IT_ADMIN">IT Admin</option>
                      <option value="CLUB_PRESIDENT">Club President</option>
                    </select>)}
                </TableCell>
                <TableCell className="space-y-2 min-w-[220px]">
                  <Input value={record.major ?? ''} placeholder="Major" onChange={(event) => onChange((current) => current.map((item) => item.id === record.id ? { ...item, major: event.target.value || null } : item))}/>
                  <Input value={record.department ?? ''} placeholder="Department" onChange={(event) => onChange((current) => current.map((item) => item.id === record.id ? { ...item, department: event.target.value || null } : item))}/>
                  <Input value={record.year ?? ''} placeholder="Year" onChange={(event) => onChange((current) => current.map((item) => item.id === record.id ? { ...item, year: event.target.value || null } : item))}/>
                </TableCell>
                <TableCell className="space-y-1.5 min-w-[140px]">
                  <Badge variant={roleBadgeVariant(record.role)}>{record.role}</Badge>
                  <Badge variant={ACCOUNT_STATUS_META[record.accountStatus ?? 'ACTIVE']?.variant ?? 'secondary'}>
                    {ACCOUNT_STATUS_META[record.accountStatus ?? 'ACTIVE']?.label ?? 'Active'}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {record.emailVerified ? (<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500"/>) : (<AlertCircle className="h-3.5 w-3.5 text-amber-500"/>)}
                    {record.emailVerified ? 'Verified' : 'Unverified'}
                  </div>
                  <p className="text-[10px] text-muted-foreground/70">
                    {ACCOUNT_STATUS_META[record.accountStatus ?? 'ACTIVE']?.helper ?? 'Can sign in normally'}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {record.onboardingComplete ? (<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500"/>) : (<Clock className="h-3.5 w-3.5 text-amber-500"/>)}
                    {record.onboardingComplete ? 'Onboarded' : 'Pending'}
                  </div>
                  {record.createdAt && (<p className="text-[10px] text-muted-foreground/70">
                      Joined {new Date(record.createdAt).toLocaleDateString()}
                    </p>)}
                  {record.lastLogin && (<p className="text-[10px] text-muted-foreground/70">
                      Last login {new Date(record.lastLogin).toLocaleDateString()}
                    </p>)}
                </TableCell>
                <TableCell className="space-x-2">
                  <Button size="sm" variant="outline" disabled={saving} onClick={() => void onSave(record)}>
                    Save
                  </Button>
                  <Button size="sm" variant="destructive" disabled={saving} onClick={() => void onDelete(record.id)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>))}
          </TableBody>
        </Table>
      </div>
    </CrudCard>);
}
function CrudCard({ title, description, children }) {
    return (<Card className="rounded-xl border-border/60">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>);
}
function BaseCrudTable({ rows }) {
    return (<div className="overflow-x-auto">
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
    </div>);
}
