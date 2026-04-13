const TWELVE_HOUR_TIME_RE = /(\d{1,2}):(\d{2})\s*([AP]M)/i;
const TWENTY_FOUR_HOUR_TIME_RE = /(\d{1,2}):(\d{2})/;

export const EVENT_FEED_SOURCE_KEY = 'murray-state-main-rss';
export const EVENT_FEED_SYNC_INTERVAL_MS = 1000 * 60 * 60 * 48;
export const EXTERNAL_CALENDAR_PROVIDERS = ['GOOGLE', 'OUTLOOK', 'APPLE'];

export function slugifyEventToken(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function pad(value) {
  return String(value).padStart(2, '0');
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
  const trimmed = String(timeValue ?? '').trim();
  if (!trimmed || isAllDayEventLabel(trimmed)) {
    return null;
  }

  const twelveHourMatch = trimmed.match(TWELVE_HOUR_TIME_RE);
  if (twelveHourMatch) {
    const [, hoursRaw, minutesRaw, periodRaw] = twelveHourMatch;
    const hoursNumber = Number(hoursRaw) % 12 + (periodRaw.toUpperCase() === 'PM' ? 12 : 0);
    return {
      hours: hoursNumber % 24,
      minutes: Number(minutesRaw),
    };
  }

  const twentyFourHourMatch = trimmed.match(TWENTY_FOUR_HOUR_TIME_RE);
  if (!twentyFourHourMatch) {
    return null;
  }

  return {
    hours: Number(twentyFourHourMatch[1]),
    minutes: Number(twentyFourHourMatch[2]),
  };
}

export function combineEventDateTime(dateValue, timeValue) {
  const baseDate = dateValue instanceof Date ? new Date(dateValue) : new Date(String(dateValue ?? ''));
  if (Number.isNaN(baseDate.getTime())) {
    return null;
  }

  const nextDate = new Date(baseDate);
  const clockTime = parseClockTime(timeValue);
  if (!clockTime) {
    nextDate.setHours(0, 0, 0, 0);
    return nextDate;
  }

  nextDate.setHours(clockTime.hours, clockTime.minutes, 0, 0);
  return nextDate;
}

export function resolveEventDateRange(event, fallbackMinutes = 60) {
  const start = combineEventDateTime(event.date, event.time) ?? new Date(event.date);
  const allDay = isAllDayEventLabel(event.time) || isTimeTbaLabel(event.time);
  let end = null;

  if (event.endDate) {
    end = combineEventDateTime(event.endDate, event.endTime ?? event.time) ?? new Date(event.endDate);
  }

  if (!end || Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    end = new Date(start);
    if (allDay) {
      end.setHours(23, 59, 0, 0);
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
