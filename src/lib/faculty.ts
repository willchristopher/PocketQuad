export const FACULTY_AVAILABILITY_STATES = ['AVAILABLE', 'LIMITED', 'AWAY'] as const

export type FacultyAvailabilityState = (typeof FACULTY_AVAILABILITY_STATES)[number]

export type OfficeHourSummaryInput = {
  dayOfWeek: number
  startTime: string
  endTime: string
}

export type StudentFacingFacultyAvailabilityState =
  | FacultyAvailabilityState
  | 'OUT_OF_OFFICE_HOURS'
  | 'TBD'

export type StudentFacingFacultyAvailability = {
  label: string
  state: StudentFacingFacultyAvailabilityState
}

const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatTo12Hour(time24: string) {
  const [hoursRaw, minutes] = time24.split(':').map(Number)
  const isPm = hoursRaw >= 12
  const hours = hoursRaw % 12 || 12
  return `${hours}:${String(minutes).padStart(2, '0')} ${isPm ? 'PM' : 'AM'}`
}

function toMinutes(time24: string) {
  const [hoursRaw, minutes] = time24.split(':').map(Number)
  return hoursRaw * 60 + minutes
}

export function normalizeFacultyTags(tags: string[]) {
  const seen = new Set<string>()

  return tags
    .map((tag) => tag.trim().replace(/\s+/g, ' '))
    .filter((tag) => {
      if (!tag) return false

      const normalized = tag.toLowerCase()
      if (seen.has(normalized)) return false

      seen.add(normalized)
      return true
    })
}

export function formatFacultyAvailability(
  status: FacultyAvailabilityState,
  note?: string | null,
) {
  const details = note?.trim()

  if (status === 'AWAY') {
    return details ? `Away: ${details}` : 'Away'
  }

  if (status === 'LIMITED') {
    return details ? `Limited availability: ${details}` : 'Limited availability'
  }

  return details ? `Available: ${details}` : 'Available'
}

export function parseLegacyFacultyAvailability(officeHours: string | null | undefined): {
  status: FacultyAvailabilityState
  note: string
} {
  const value = officeHours?.trim() ?? ''
  const lowerValue = value.toLowerCase()

  if (lowerValue.startsWith('away:')) {
    return {
      status: 'AWAY',
      note: value.slice('away:'.length).trim(),
    }
  }

  if (lowerValue.startsWith('out of office:')) {
    return {
      status: 'AWAY',
      note: value.slice('out of office:'.length).trim(),
    }
  }

  if (lowerValue.startsWith('limited availability:')) {
    return {
      status: 'LIMITED',
      note: value.slice('limited availability:'.length).trim(),
    }
  }

  if (lowerValue.startsWith('available:')) {
    return {
      status: 'AVAILABLE',
      note: value.slice('available:'.length).trim(),
    }
  }

  return {
    status: 'AVAILABLE',
    note: '',
  }
}

export function summarizeFacultyOfficeHours(slots: OfficeHourSummaryInput[]) {
  if (slots.length === 0) {
    return 'TBD'
  }

  const ordered = [...slots].sort((left, right) => {
    if (left.dayOfWeek !== right.dayOfWeek) {
      return left.dayOfWeek - right.dayOfWeek
    }

    return left.startTime.localeCompare(right.startTime)
  })

  const summary = ordered
    .slice(0, 3)
    .map((slot) => `${weekdayNames[slot.dayOfWeek]} ${formatTo12Hour(slot.startTime)}-${formatTo12Hour(slot.endTime)}`)
    .join(' • ')

  if (ordered.length <= 3) {
    return summary
  }

  return `${summary} • +${ordered.length - 3} more`
}

export function composeFacultyOfficeHoursSummary(
  status: FacultyAvailabilityState,
  note: string | null | undefined,
  slots: OfficeHourSummaryInput[],
) {
  const scheduleSummary = summarizeFacultyOfficeHours(slots)
  const availabilitySummary = formatFacultyAvailability(status, note)

  if (status === 'AVAILABLE') {
    return note?.trim()
      ? `${scheduleSummary} • ${availabilitySummary}`
      : scheduleSummary
  }

  return slots.length > 0
    ? `${availabilitySummary} • ${scheduleSummary}`
    : availabilitySummary
}

export function getFacultyAvailabilityTone(status: FacultyAvailabilityState) {
  if (status === 'AWAY') return 'rose'
  if (status === 'LIMITED') return 'amber'
  return 'emerald'
}

export function getStudentFacingFacultyAvailabilityTone(
  state: StudentFacingFacultyAvailabilityState,
) {
  if (state === 'AWAY') return 'rose'
  if (state === 'LIMITED') return 'amber'
  if (state === 'AVAILABLE') return 'emerald'
  return 'slate'
}

export function formatFacultySlotLabel(slot: OfficeHourSummaryInput) {
  return `${weekdayNames[slot.dayOfWeek]} ${formatTo12Hour(slot.startTime)}-${formatTo12Hour(slot.endTime)}`
}

export function isWithinOfficeHours(
  slots: OfficeHourSummaryInput[],
  now: Date = new Date(),
) {
  const currentDay = now.getDay()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  return slots.some((slot) => (
    slot.dayOfWeek === currentDay &&
    currentMinutes >= toMinutes(slot.startTime) &&
    currentMinutes < toMinutes(slot.endTime)
  ))
}

export function getStudentFacingFacultyAvailability(
  status: FacultyAvailabilityState,
  note: string | null | undefined,
  slots: OfficeHourSummaryInput[],
  now: Date = new Date(),
): StudentFacingFacultyAvailability {
  if (status === 'AWAY') {
    return {
      label: formatFacultyAvailability(status, note),
      state: status,
    }
  }

  if (status === 'LIMITED') {
    return {
      label: formatFacultyAvailability(status, note),
      state: status,
    }
  }

  if (slots.length === 0) {
    return {
      label: 'Office hours TBD',
      state: 'TBD',
    }
  }

  if (isWithinOfficeHours(slots, now)) {
    return {
      label: formatFacultyAvailability(status, note),
      state: status,
    }
  }

  return {
    label: 'Out of office hours',
    state: 'OUT_OF_OFFICE_HOURS',
  }
}
