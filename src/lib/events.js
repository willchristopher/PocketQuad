const TWELVE_HOUR_TIME_RE = /(\d{1,2}):(\d{2})\s*([AP]M)/i;
const TWENTY_FOUR_HOUR_TIME_RE = /(\d{1,2}):(\d{2})/;
const CLOCK_TIME_RE = /(?<!\d)(\d{1,2})(?::(\d{2}))?\s*([AP]\.?M\.?)?(?!\d)/gi;
const DATE_ONLY_VALUE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const EVENT_FEED_SOURCE_KEY = 'murray-state-main-rss';
export const EVENT_FEED_SYNC_INTERVAL_MS = 1000 * 60 * 60 * 48;
export const EXTERNAL_CALENDAR_PROVIDERS = ['GOOGLE', 'OUTLOOK', 'APPLE'];
export const EVENT_TIME_ZONE = 'America/Chicago';

export function slugifyEventToken(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function normalizePeriod(value) {
  const normalized = String(value ?? '').replace(/\./g, '').toUpperCase();
  return normalized === 'AM' || normalized === 'PM' ? normalized : null;
}

function toClockTime(hoursRaw, minutesRaw, periodRaw) {
  const period = normalizePeriod(periodRaw);
  const hoursValue = Number(hoursRaw);
  const minutesValue = typeof minutesRaw === 'string' ? Number(minutesRaw) : 0;

  if (
    !Number.isInteger(hoursValue) ||
    !Number.isInteger(minutesValue) ||
    minutesValue < 0 ||
    minutesValue > 59
  ) {
    return null;
  }

  if (period) {
    if (hoursValue < 1 || hoursValue > 12) {
      return null;
    }

    return {
      hours: (hoursValue % 12) + (period === 'PM' ? 12 : 0),
      minutes: minutesValue,
    };
  }

  if (hoursValue < 0 || hoursValue > 23) {
    return null;
  }

  return {
    hours: hoursValue,
    minutes: minutesValue,
  };
}

function getDatePartsInTimeZone(dateValue, { preferUtcDateOnly = false } = {}) {
  const rawValue = String(dateValue ?? '').trim();
  const dateOnlyMatch = rawValue.match(DATE_ONLY_VALUE_RE);
  if (dateOnlyMatch) {
    return {
      year: Number(dateOnlyMatch[1]),
      month: Number(dateOnlyMatch[2]),
      day: Number(dateOnlyMatch[3]),
    };
  }

  const date = dateValue instanceof Date ? dateValue : new Date(rawValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (
    preferUtcDateOnly &&
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  ) {
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    };
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(valueByType.year),
    month: Number(valueByType.month),
    day: Number(valueByType.day),
  };
}

function getTimeZoneOffsetMs(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const zonedTimestamp = Date.UTC(
    Number(valueByType.year),
    Number(valueByType.month) - 1,
    Number(valueByType.day),
    Number(valueByType.hour),
    Number(valueByType.minute),
    Number(valueByType.second),
  );

  return zonedTimestamp - date.getTime();
}

function createDateInTimeZone(dateParts, clockTime) {
  const utcGuess = Date.UTC(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    clockTime.hours,
    clockTime.minutes,
    0,
    0,
  );
  let offset = getTimeZoneOffsetMs(new Date(utcGuess), EVENT_TIME_ZONE);
  let resolved = new Date(utcGuess - offset);
  const nextOffset = getTimeZoneOffsetMs(resolved, EVENT_TIME_ZONE);

  if (nextOffset !== offset) {
    offset = nextOffset;
    resolved = new Date(utcGuess - offset);
  }

  return resolved;
}

function combineEventDateAndClock(dateValue, clockTime, options) {
  const dateParts = getDatePartsInTimeZone(dateValue, options);
  if (!dateParts) {
    return null;
  }

  return createDateInTimeZone(dateParts, clockTime);
}

export function parseEventTimeRange(timeValue) {
  const trimmed = String(timeValue ?? '').trim();
  if (!trimmed || isAllDayEventLabel(trimmed) || isTimeTbaLabel(trimmed)) {
    return {
      start: null,
      end: null,
    };
  }

  const matches = Array.from(trimmed.matchAll(CLOCK_TIME_RE));
  const lastPeriod = [...matches].reverse().map((match) => normalizePeriod(match[3])).find(Boolean);
  const clocks = matches
    .map((match) => {
      const minutes = match[2];
      const explicitPeriod = normalizePeriod(match[3]);
      const inferredPeriod = explicitPeriod ?? (matches.length > 1 ? lastPeriod : null);

      if (!minutes && !inferredPeriod) {
        return null;
      }

      return toClockTime(match[1], minutes, inferredPeriod);
    })
    .filter(Boolean);

  return {
    start: clocks[0] ?? null,
    end: clocks[1] ?? null,
  };
}

export function formatEventTimeLabel(timeValue) {
  const trimmed = String(timeValue ?? '').trim();
  if (!trimmed) {
    return 'Time TBA';
  }

  if (/all[-\s]?day/i.test(trimmed)) {
    return 'All day';
  }

  const twelveHourMatch = trimmed.match(TWELVE_HOUR_TIME_RE);
  if (twelveHourMatch) {
    const [, hoursRaw, minutesRaw, periodRaw] = twelveHourMatch;
    const hours = Number(hoursRaw) % 12 || 12;
    return `${hours}:${minutesRaw} ${periodRaw.toUpperCase()}`;
  }

  const twentyFourHourMatch = trimmed.match(TWENTY_FOUR_HOUR_TIME_RE);
  if (!twentyFourHourMatch) {
    return trimmed;
  }

  const [, hoursRaw, minutesRaw] = twentyFourHourMatch;
  const hoursNumber = Number(hoursRaw);
  const minutes = pad(Number(minutesRaw));
  const period = hoursNumber >= 12 ? 'PM' : 'AM';
  const hours = hoursNumber % 12 || 12;
  return `${hours}:${minutes} ${period}`;
}

export function isAllDayEventLabel(timeValue) {
  return /all[-\s]?day/i.test(String(timeValue ?? ''));
}

export function isTimeTbaLabel(timeValue) {
  return /^\s*(?:time\s*tba|tba)\s*$/i.test(String(timeValue ?? ''));
}

export function parseClockTime(timeValue) {
  return parseEventTimeRange(timeValue).start;
}

export function combineEventDateTime(dateValue, timeValue) {
  const clockTime = parseClockTime(timeValue);
  if (!clockTime) {
    return combineEventDateAndClock(dateValue, { hours: 0, minutes: 0 }, { preferUtcDateOnly: true });
  }

  return combineEventDateAndClock(dateValue, clockTime);
}

export function resolveEventDateRange(event, fallbackMinutes = 60) {
  const timeRange = parseEventTimeRange(event.time);
  const start =
    (timeRange.start ? combineEventDateAndClock(event.date, timeRange.start) : combineEventDateTime(event.date, event.time)) ??
    new Date(event.date);
  const allDay = isAllDayEventLabel(event.time) || isTimeTbaLabel(event.time);
  let end = null;

  if (event.endDate) {
    end = timeRange.end
      ? combineEventDateAndClock(event.endDate, timeRange.end)
      : combineEventDateTime(event.endDate, event.endTime ?? event.time);
    end ??= new Date(event.endDate);
  } else if (timeRange.end) {
    end = combineEventDateAndClock(event.date, timeRange.end);
  }

  if (end && end.getTime() <= start.getTime() && timeRange.end) {
    end = new Date(end);
    end.setUTCDate(end.getUTCDate() + 1);
  }

  if (!end || Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    if (allDay) {
      end =
        combineEventDateAndClock(event.endDate ?? event.date, { hours: 23, minutes: 59 }, { preferUtcDateOnly: true }) ??
        new Date(start);
    } else {
      end = new Date(start.getTime() + fallbackMinutes * 60 * 1000);
    }
  }

  return {
    start,
    end,
    allDay,
  };
}

function formatCalendarTimestamp(date) {
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    'T',
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
    'Z',
  ].join('');
}

function formatAllDayCalendarDate(date) {
  return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('');
}

export function buildExternalCalendarUrl(event, provider) {
  const { start, end, allDay } = resolveEventDateRange(event);
  const details = [
    event.description,
    event.externalUrl ? `Details: ${event.externalUrl}` : null,
  ]
    .filter(Boolean)
    .join('\n\n');

  if (provider === 'GOOGLE') {
    const allDayEnd = new Date(end);
    allDayEnd.setDate(allDayEnd.getDate() + 1);
    const dates = allDay
      ? `${formatAllDayCalendarDate(start)}/${formatAllDayCalendarDate(allDayEnd)}`
      : `${formatCalendarTimestamp(start)}/${formatCalendarTimestamp(end)}`;

    const url = new URL('https://calendar.google.com/calendar/render');
    url.searchParams.set('action', 'TEMPLATE');
    url.searchParams.set('text', event.title);
    url.searchParams.set('details', details);
    url.searchParams.set('location', event.location ?? '');
    url.searchParams.set('dates', dates);
    return url.toString();
  }

  if (provider === 'OUTLOOK') {
    const url = new URL('https://outlook.office.com/calendar/0/deeplink/compose');
    url.searchParams.set('path', '/calendar/action/compose');
    url.searchParams.set('rru', 'addevent');
    url.searchParams.set('subject', event.title);
    url.searchParams.set('body', details);
    url.searchParams.set('location', event.location ?? '');
    url.searchParams.set('startdt', start.toISOString());
    url.searchParams.set('enddt', end.toISOString());
    url.searchParams.set('allday', allDay ? 'true' : 'false');
    return url.toString();
  }

  return null;
}

export function buildEventMatchKey(event) {
  const { start } = resolveEventDateRange(event);
  return `${slugifyEventToken(event.title)}:${start.toISOString().slice(0, 10)}`;
}

export function uniqueEventTags(values, limit = 8) {
  const seen = new Set();
  const nextTags = [];

  values.forEach((value) => {
    const trimmed = String(value ?? '').trim();
    if (!trimmed) {
      return;
    }

    const normalized = trimmed.toLowerCase();
    if (seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    nextTags.push(trimmed);
  });

  return nextTags.slice(0, limit);
}
