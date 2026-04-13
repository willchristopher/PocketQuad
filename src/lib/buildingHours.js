const BUILDING_HOURS_TIMEZONE = 'America/Chicago';

export const BUILDING_HOURS_DAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const BUILDING_HOURS_SHORT_DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const BUILDING_HOURS_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const BUILDING_HOURS_DAY_MODES = ['closed', 'open', 'all_day', 'text'];

const DAY_NAME_TO_INDEX = new Map(
  BUILDING_HOURS_DAY_LABELS.flatMap((label, index) => [
    [label.toLowerCase(), index],
    [BUILDING_HOURS_SHORT_DAY_LABELS[index].toLowerCase(), index],
  ]),
);

const TIME_RANGE_SEPARATOR_PATTERN = /\s*(?:-|–|—|to)\s*/i;
const TIME_VALUE_PATTERN = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i;

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeTimeRangeLabel(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function toMinuteValue(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function fromMinuteValue(value) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function parseTimeToken(value) {
  const normalized = value?.replace(/\u00A0/g, ' ').trim();
  if (!normalized) {
    return null;
  }

  const match = normalized.match(TIME_VALUE_PATTERN);
  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? '00');
  const period = match[3]?.toUpperCase();

  if (minutes < 0 || minutes > 59 || hours < 0 || hours > 24) {
    return null;
  }

  if (period) {
    hours %= 12;
    if (period === 'PM') {
      hours += 12;
    }
  }

  if (hours > 23) {
    return null;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function formatBuildingHoursTime(value) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    return value ?? '';
  }

  const [hoursRaw, minutes] = value.split(':').map(Number);
  const period = hoursRaw >= 12 ? 'PM' : 'AM';
  const hours = hoursRaw % 12 || 12;
  return `${hours}:${String(minutes).padStart(2, '0')} ${period}`;
}

export function createDefaultBuildingHoursDay(dayOfWeek) {
  return {
    dayOfWeek,
    kind: 'closed',
    label: 'Closed',
    slots: [],
  };
}

export function createDefaultBuildingHoursSchedule(timezone = BUILDING_HOURS_TIMEZONE) {
  return {
    timezone,
    days: BUILDING_HOURS_DAY_LABELS.map((_, dayOfWeek) => createDefaultBuildingHoursDay(dayOfWeek)),
  };
}

export function normalizeBuildingHoursDay(day, dayOfWeek) {
  const fallback = createDefaultBuildingHoursDay(dayOfWeek);
  if (!isObject(day)) {
    return fallback;
  }

  const kind = BUILDING_HOURS_DAY_MODES.includes(day.kind) ? day.kind : fallback.kind;
  const slots = Array.isArray(day.slots)
    ? day.slots
        .map((slot) => {
          if (!isObject(slot)) {
            return null;
          }

          const openTime = parseTimeToken(slot.openTime);
          const closeTime = parseTimeToken(slot.closeTime);

          if (!openTime || !closeTime || toMinuteValue(closeTime) <= toMinuteValue(openTime)) {
            return null;
          }

          return {
            openTime,
            closeTime,
          };
        })
        .filter(Boolean)
        .sort((left, right) => toMinuteValue(left.openTime) - toMinuteValue(right.openTime))
    : [];

  const label = typeof day.label === 'string' ? day.label.trim() : '';

  if (kind === 'open' && slots.length === 0) {
    return fallback;
  }

  return {
    dayOfWeek,
    kind,
    label:
      kind === 'closed'
        ? label || 'Closed'
        : kind === 'all_day'
          ? label || 'Open 24 hours'
          : kind === 'text'
            ? label || 'Hours vary'
            : label || '',
    slots,
  };
}

export function normalizeBuildingHoursSchedule(schedule) {
  if (!isObject(schedule) || !Array.isArray(schedule.days)) {
    return null;
  }

  return {
    timezone:
      typeof schedule.timezone === 'string' && schedule.timezone.trim().length > 0
        ? schedule.timezone.trim()
        : BUILDING_HOURS_TIMEZONE,
    days: BUILDING_HOURS_DAY_LABELS.map((_, dayOfWeek) =>
      normalizeBuildingHoursDay(
        schedule.days.find((item) => Number(item?.dayOfWeek) === dayOfWeek),
        dayOfWeek,
      ),
    ),
  };
}

export function hasMeaningfulBuildingHoursSchedule(schedule) {
  const normalized = normalizeBuildingHoursSchedule(schedule);
  if (!normalized) {
    return false;
  }

  return normalized.days.some(
    (day) =>
      day.kind === 'open' ||
      day.kind === 'all_day' ||
      (day.kind === 'text' && day.label.trim().length > 0),
  );
}

export function summarizeBuildingHoursDay(day, { short = false } = {}) {
  const normalized = normalizeBuildingHoursDay(day, Number(day?.dayOfWeek) || 0);
  const prefix = short ? BUILDING_HOURS_SHORT_DAY_LABELS[normalized.dayOfWeek] : BUILDING_HOURS_DAY_LABELS[normalized.dayOfWeek];

  if (normalized.kind === 'closed') {
    return `${prefix}: Closed`;
  }

  if (normalized.kind === 'all_day') {
    return `${prefix}: ${normalized.label || 'Open 24 hours'}`;
  }

  if (normalized.kind === 'text') {
    return `${prefix}: ${normalized.label || 'Hours vary'}`;
  }

  const slotLabel = normalized.slots
    .map((slot) => `${formatBuildingHoursTime(slot.openTime)} - ${formatBuildingHoursTime(slot.closeTime)}`)
    .join(', ');

  return `${prefix}: ${slotLabel}`;
}

function buildSummaryGroups(schedule) {
  const groups = [];

  for (const [displayIndex, dayOfWeek] of BUILDING_HOURS_DISPLAY_ORDER.entries()) {
    const day = schedule.days[dayOfWeek];
    const value = summarizeBuildingHoursDay(day, { short: true }).replace(/^[A-Za-z]{3}:\s*/, '');
    const last = groups[groups.length - 1];

    if (last && last.value === value && last.endDisplayIndex === displayIndex - 1) {
      last.endDayOfWeek = day.dayOfWeek;
      last.endDisplayIndex = displayIndex;
      last.length += 1;
      continue;
    }

    groups.push({
      value,
      length: 1,
      startDayOfWeek: day.dayOfWeek,
      endDayOfWeek: day.dayOfWeek,
      endDisplayIndex: displayIndex,
    });
  }

  return groups;
}

function formatSummaryDayRange(group) {
  if (group.length === 7) {
    return 'Daily';
  }

  const { startDayOfWeek, endDayOfWeek } = group;
  if (startDayOfWeek === endDayOfWeek) {
    return BUILDING_HOURS_SHORT_DAY_LABELS[startDayOfWeek];
  }

  return `${BUILDING_HOURS_SHORT_DAY_LABELS[startDayOfWeek]}-${BUILDING_HOURS_SHORT_DAY_LABELS[endDayOfWeek]}`;
}

export function summarizeBuildingHoursSchedule(schedule, fallback = null) {
  const normalized = normalizeBuildingHoursSchedule(schedule);
  if (!normalized || !hasMeaningfulBuildingHoursSchedule(normalized)) {
    return fallback?.trim() || null;
  }

  const groups = buildSummaryGroups(normalized);
  return groups
    .map((group) => `${formatSummaryDayRange(group)} ${group.value}`)
    .join(' · ');
}

function getLocalDateParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekday = DAY_NAME_TO_INDEX.get(values.weekday?.toLowerCase?.() ?? '') ?? date.getDay();
  const minuteOfDay = Number(values.hour) * 60 + Number(values.minute);
  return {
    weekday,
    minuteOfDay,
  };
}

function findNextOpening(schedule, currentDayOfWeek, minuteOfDay) {
  for (let offset = 0; offset < 7; offset += 1) {
    const dayOfWeek = (currentDayOfWeek + offset) % 7;
    const day = schedule.days[dayOfWeek];

    if (day.kind === 'all_day') {
      return offset === 0
        ? `${BUILDING_HOURS_DAY_LABELS[dayOfWeek]}: ${day.label || 'Open 24 hours'}`
        : `Opens ${BUILDING_HOURS_DAY_LABELS[dayOfWeek]} (${day.label || '24 hours'})`;
    }

    if (day.kind === 'text') {
      return offset === 0
        ? `${BUILDING_HOURS_DAY_LABELS[dayOfWeek]}: ${day.label || 'Hours vary'}`
        : `Check ${BUILDING_HOURS_DAY_LABELS[dayOfWeek]} hours`;
    }

    if (day.kind !== 'open') {
      continue;
    }

    const nextSlot = day.slots.find((slot) => offset > 0 || toMinuteValue(slot.openTime) > minuteOfDay);
    if (!nextSlot) {
      continue;
    }

    const prefix = offset === 0 ? 'Opens today' : `Opens ${BUILDING_HOURS_DAY_LABELS[dayOfWeek]}`;
    return `${prefix} at ${formatBuildingHoursTime(nextSlot.openTime)}`;
  }

  return null;
}

export function getCurrentBuildingAvailability(building, now = new Date()) {
  const schedule = normalizeBuildingHoursSchedule(building?.operatingHoursSchedule);
  const summary = summarizeBuildingHoursSchedule(schedule, building?.operatingHours ?? null);
  const manualStatus = building?.operationalStatus ?? 'OPEN';
  const timeZone = schedule?.timezone ?? BUILDING_HOURS_TIMEZONE;

  if (!schedule || !hasMeaningfulBuildingHoursSchedule(schedule)) {
    return {
      currentOperationalStatus: manualStatus,
      currentOperationalLabel:
        manualStatus === 'LIMITED'
          ? 'Operating with limited access'
          : manualStatus === 'CLOSED'
            ? 'Currently closed'
            : null,
      currentOperationalDetail: building?.operationalNote ?? null,
      operatingHours: summary,
      operatingHoursSchedule: schedule,
      todayHoursLabel: null,
    };
  }

  const { weekday, minuteOfDay } = getLocalDateParts(now, timeZone);
  const day = schedule.days[weekday];
  const todayHoursLabel = summarizeBuildingHoursDay(day);

  if (manualStatus === 'CLOSED') {
    return {
      currentOperationalStatus: 'CLOSED',
      currentOperationalLabel: 'Currently closed',
      currentOperationalDetail: building?.operationalNote || findNextOpening(schedule, weekday, minuteOfDay),
      operatingHours: summary,
      operatingHoursSchedule: schedule,
      todayHoursLabel,
    };
  }

  if (day.kind === 'all_day') {
    return {
      currentOperationalStatus: manualStatus === 'LIMITED' ? 'LIMITED' : 'OPEN',
      currentOperationalLabel:
        manualStatus === 'LIMITED' ? 'Operating with limited access today' : day.label || 'Open 24 hours today',
      currentOperationalDetail: building?.operationalNote ?? null,
      operatingHours: summary,
      operatingHoursSchedule: schedule,
      todayHoursLabel,
    };
  }

  if (day.kind === 'text') {
    return {
      currentOperationalStatus: manualStatus === 'OPEN' ? 'LIMITED' : manualStatus,
      currentOperationalLabel: day.label || 'Hours vary today',
      currentOperationalDetail: building?.operationalNote ?? null,
      operatingHours: summary,
      operatingHoursSchedule: schedule,
      todayHoursLabel,
    };
  }

  if (day.kind === 'open') {
    const currentSlot = day.slots.find(
      (slot) =>
        minuteOfDay >= toMinuteValue(slot.openTime) && minuteOfDay < toMinuteValue(slot.closeTime),
    );

    if (currentSlot) {
      return {
        currentOperationalStatus: manualStatus === 'LIMITED' ? 'LIMITED' : 'OPEN',
        currentOperationalLabel:
          manualStatus === 'LIMITED'
            ? 'Open now with limited access'
            : `Open now until ${formatBuildingHoursTime(currentSlot.closeTime)}`,
        currentOperationalDetail: building?.operationalNote ?? null,
        operatingHours: summary,
        operatingHoursSchedule: schedule,
        todayHoursLabel,
      };
    }
  }

  return {
    currentOperationalStatus: 'CLOSED',
    currentOperationalLabel: 'Closed now',
    currentOperationalDetail: findNextOpening(schedule, weekday, minuteOfDay) ?? building?.operationalNote ?? null,
    operatingHours: summary,
    operatingHoursSchedule: schedule,
    todayHoursLabel,
  };
}

export function parseBuildingHoursRangeLabel(value) {
  const normalized = normalizeTimeRangeLabel(value?.replace(/\u00A0/g, ' ') ?? '');
  if (!normalized) {
    return null;
  }

  const [startRaw, endRaw, ...rest] = normalized.split(TIME_RANGE_SEPARATOR_PATTERN);
  if (!startRaw || !endRaw || rest.length > 0) {
    return null;
  }

  const openTime = parseTimeToken(startRaw);
  const closeTime = parseTimeToken(endRaw);
  if (!openTime || !closeTime || toMinuteValue(closeTime) <= toMinuteValue(openTime)) {
    return null;
  }

  return {
    openTime,
    closeTime,
  };
}

export function parseBuildingHoursCell(value, dayOfWeek) {
  const normalized = normalizeTimeRangeLabel(value?.replace(/\u00A0/g, ' ') ?? '');
  if (!normalized) {
    return createDefaultBuildingHoursDay(dayOfWeek);
  }

  if (/^closed$/i.test(normalized)) {
    return {
      dayOfWeek,
      kind: 'closed',
      label: 'Closed',
      slots: [],
    };
  }

  if (/^24\s*hours/i.test(normalized)) {
    return {
      dayOfWeek,
      kind: 'all_day',
      label: normalized,
      slots: [],
    };
  }

  const multiRangeParts = normalized.split(/\s*;\s*/).filter(Boolean);
  const slots = multiRangeParts
    .map((part) => parseBuildingHoursRangeLabel(part))
    .filter(Boolean);

  if (slots.length === multiRangeParts.length && slots.length > 0) {
    return {
      dayOfWeek,
      kind: 'open',
      label: '',
      slots,
    };
  }

  return {
    dayOfWeek,
    kind: 'text',
    label: normalized,
    slots: [],
  };
}

export function cleanBuildingOperationalNote(value) {
  const normalized = value
    ?.replace(/\u00A0/g, ' ')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/www\.\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized || null;
}

export function buildBuildingHoursScheduleFromCsvRow(row) {
  const dayHeaders = [
    'Sunday_hours',
    'Monday_hours',
    'Tuesday_hours',
    'Wednesday_hours',
    'Thursday_hours',
    'Friday_hours',
    'Saturday_hours',
  ];

  const days = dayHeaders.map((header, dayOfWeek) =>
    parseBuildingHoursCell(row[header] ?? '', dayOfWeek),
  );

  const schedule = {
    timezone: BUILDING_HOURS_TIMEZONE,
    days,
  };

  return hasMeaningfulBuildingHoursSchedule(schedule) ? schedule : null;
}

export function buildBuildingHoursScheduleFromSummary(summary) {
  const normalized = summary?.replace(/\u00A0/g, ' ').trim();
  if (!normalized) {
    return null;
  }

  const dailyMatch = normalized.match(/^(?:daily\s+)?(.+?)(?:\s+daily)?$/i);
  const weekdayMatch = normalized.match(/^mon(?:day)?\s*-\s*fri(?:day)?\s+(.+)$/i);

  if (weekdayMatch) {
    const slot = parseBuildingHoursRangeLabel(weekdayMatch[1]);
    if (!slot) {
      return null;
    }

    const schedule = createDefaultBuildingHoursSchedule();
    schedule.days = schedule.days.map((day) =>
      day.dayOfWeek >= 1 && day.dayOfWeek <= 5
        ? { dayOfWeek: day.dayOfWeek, kind: 'open', label: '', slots: [slot] }
        : day,
    );
    return schedule;
  }

  if (dailyMatch) {
    const slot = parseBuildingHoursRangeLabel(dailyMatch[1]);
    if (!slot) {
      return null;
    }

    return {
      timezone: BUILDING_HOURS_TIMEZONE,
      days: BUILDING_HOURS_DAY_LABELS.map((_, dayOfWeek) => ({
        dayOfWeek,
        kind: 'open',
        label: '',
        slots: [slot],
      })),
    };
  }

  return null;
}

export function buildBuildingHoursPayload({ operatingHours, operatingHoursSchedule }) {
  const normalizedSchedule = normalizeBuildingHoursSchedule(operatingHoursSchedule);
  const scheduleIsMeaningful = hasMeaningfulBuildingHoursSchedule(normalizedSchedule);
  const summary = scheduleIsMeaningful
    ? summarizeBuildingHoursSchedule(normalizedSchedule, operatingHours)
    : operatingHours?.trim() || null;

  return {
    operatingHours: summary,
    operatingHoursSchedule: scheduleIsMeaningful ? normalizedSchedule : null,
  };
}

export function getBuildingHoursDayCopy(day) {
  return normalizeBuildingHoursDay(day, Number(day?.dayOfWeek) || 0);
}

export function copyBuildingHoursDayToSchedule(schedule, sourceDayOfWeek, targetDayOfWeeks) {
  const normalized = normalizeBuildingHoursSchedule(schedule) ?? createDefaultBuildingHoursSchedule();
  const sourceDay = getBuildingHoursDayCopy(normalized.days[sourceDayOfWeek]);
  return {
    ...normalized,
    days: normalized.days.map((day) =>
      targetDayOfWeeks.includes(day.dayOfWeek)
        ? { ...sourceDay, dayOfWeek: day.dayOfWeek }
        : day,
    ),
  };
}

export { BUILDING_HOURS_TIMEZONE };
