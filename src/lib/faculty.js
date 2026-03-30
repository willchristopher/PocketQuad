export const FACULTY_AVAILABILITY_STATES = ['AVAILABLE', 'LIMITED', 'AWAY'];
const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function formatTo12Hour(time24) {
    const [hoursRaw, minutes] = time24.split(':').map(Number);
    const isPm = hoursRaw >= 12;
    const hours = hoursRaw % 12 || 12;
    return `${hours}:${String(minutes).padStart(2, '0')} ${isPm ? 'PM' : 'AM'}`;
}
function toMinutes(time24) {
    const [hoursRaw, minutes] = time24.split(':').map(Number);
    return hoursRaw * 60 + minutes;
}
export function normalizeFacultyTags(tags) {
    const seen = new Set();
    return tags
        .map((tag) => tag.trim().replace(/\s+/g, ' '))
        .filter((tag) => {
        if (!tag)
            return false;
        const normalized = tag.toLowerCase();
        if (seen.has(normalized))
            return false;
        seen.add(normalized);
        return true;
    });
}
export function formatFacultyAvailability(status, note) {
    const details = note?.trim();
    if (status === 'AWAY') {
        return details ? `Away: ${details}` : 'Away';
    }
    if (status === 'LIMITED') {
        return details ? `Limited availability: ${details}` : 'Limited availability';
    }
    return details ? `Available: ${details}` : 'Available';
}
export function parseLegacyFacultyAvailability(officeHours) {
    const value = officeHours?.trim() ?? '';
    const lowerValue = value.toLowerCase();
    if (lowerValue.startsWith('away:')) {
        return {
            status: 'AWAY',
            note: value.slice('away:'.length).trim(),
        };
    }
    if (lowerValue.startsWith('out of office:')) {
        return {
            status: 'AWAY',
            note: value.slice('out of office:'.length).trim(),
        };
    }
    if (lowerValue.startsWith('limited availability:')) {
        return {
            status: 'LIMITED',
            note: value.slice('limited availability:'.length).trim(),
        };
    }
    if (lowerValue.startsWith('available:')) {
        return {
            status: 'AVAILABLE',
            note: value.slice('available:'.length).trim(),
        };
    }
    return {
        status: 'AVAILABLE',
        note: '',
    };
}
export function summarizeFacultyOfficeHours(slots) {
    if (slots.length === 0) {
        return 'TBD';
    }
    const ordered = [...slots].sort((left, right) => {
        if (left.dayOfWeek !== right.dayOfWeek) {
            return left.dayOfWeek - right.dayOfWeek;
        }
        return left.startTime.localeCompare(right.startTime);
    });
    const summary = ordered
        .slice(0, 3)
        .map((slot) => `${weekdayNames[slot.dayOfWeek]} ${formatTo12Hour(slot.startTime)}-${formatTo12Hour(slot.endTime)}`)
        .join(' • ');
    if (ordered.length <= 3) {
        return summary;
    }
    return `${summary} • +${ordered.length - 3} more`;
}
export function composeFacultyOfficeHoursSummary(status, note, slots) {
    const scheduleSummary = summarizeFacultyOfficeHours(slots);
    const availabilitySummary = formatFacultyAvailability(status, note);
    if (status === 'AVAILABLE') {
        return note?.trim()
            ? `${scheduleSummary} • ${availabilitySummary}`
            : scheduleSummary;
    }
    return slots.length > 0
        ? `${availabilitySummary} • ${scheduleSummary}`
        : availabilitySummary;
}
export function getFacultyAvailabilityTone(status) {
    if (status === 'AWAY')
        return 'rose';
    if (status === 'LIMITED')
        return 'amber';
    return 'emerald';
}
export function getStudentFacingFacultyAvailabilityTone(state) {
    if (state === 'AWAY')
        return 'rose';
    if (state === 'LIMITED')
        return 'amber';
    if (state === 'AVAILABLE')
        return 'emerald';
    return 'slate';
}
export function formatFacultySlotLabel(slot) {
    return `${weekdayNames[slot.dayOfWeek]} ${formatTo12Hour(slot.startTime)}-${formatTo12Hour(slot.endTime)}`;
}
export function isWithinOfficeHours(slots, now = new Date()) {
    const currentDay = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return slots.some((slot) => (slot.dayOfWeek === currentDay &&
        currentMinutes >= toMinutes(slot.startTime) &&
        currentMinutes < toMinutes(slot.endTime)));
}
export function getStudentFacingFacultyAvailability(status, note, slots, now = new Date()) {
    if (status === 'AWAY') {
        return {
            label: formatFacultyAvailability(status, note),
            state: status,
        };
    }
    if (status === 'LIMITED') {
        return {
            label: formatFacultyAvailability(status, note),
            state: status,
        };
    }
    if (slots.length === 0) {
        return {
            label: 'Office hours TBD',
            state: 'TBD',
        };
    }
    if (isWithinOfficeHours(slots, now)) {
        return {
            label: formatFacultyAvailability(status, note),
            state: status,
        };
    }
    return {
        label: 'Out of office hours',
        state: 'OUT_OF_OFFICE_HOURS',
    };
}
