# PocketQuad - Full-Stack Implementation Plan

## Current State

The app is a **Next.js 16 (App Router)** frontend-only prototype. All 14+ pages are built with mock/hardcoded data. No API routes, database, authentication, or backend logic exists. Installed but unused: `@tanstack/react-query`, `zod`, `react-hook-form`.

---

## Technology Choices (Free Tier)

| Concern | Choice | Free Tier Limits | Justification |
|---------|--------|------------------|---------------|
| **Database** | Supabase PostgreSQL | 500MB DB, 50k MAU, 2GB bandwidth | All-in-one: DB + Auth + Realtime + Storage |
| **ORM** | Prisma | N/A (OSS) | Schema-first, strong TypeScript, mature ecosystem |
| **Auth** | Supabase Auth | Unlimited users | Already using Supabase; email + OAuth built-in |
| **Realtime** | Supabase Realtime | Included in free tier | WebSocket-based, Postgres LISTEN/NOTIFY, Presence |
| **AI Chatbot** | Vercel AI SDK + Groq | Groq free tier (Llama 3.1 8B) | Fast inference, free, streaming support |
| **File Storage** | Supabase Storage | 1GB free | CDN, image transforms, auth-integrated |
| **Email** | Resend | 3,000/month (100/day) | Modern API, React Email support |

---

## Phase 1: Foundation Setup

### 1.1 Install Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr prisma @prisma/client
npm install ai @ai-sdk/groq
npm install resend
npm install bcryptjs jsonwebtoken @hookform/resolvers
npm install --save-dev @types/bcryptjs @types/jsonwebtoken
```

### 1.2 Create Environment Files

**Create `/.env.example`** and **`/.env.local`** (gitignored):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]

# Database (from Supabase connection string)
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[password]@[host]:5432/postgres

# AI (Groq)
GROQ_API_KEY=[groq-api-key]

# Email (Resend)
RESEND_API_KEY=[resend-api-key]
EMAIL_FROM=noreply@pocketquad.app

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 1.3 Create Prisma Schema

**Create `/prisma/schema.prisma`**

Full schema with these models (details in sections below):
- `User` (with `UserRole` enum: STUDENT, FACULTY, ADMIN)
- `NotificationPreferences` (1:1 with User)
- `Notification` (with `NotificationType` enum)
- `Channel` (with `ChannelType` enum: PUBLIC, PRIVATE, DIRECT)
- `ChannelMember` (join: Channel <-> User)
- `ChatMessage` (belongs to Channel + User, self-referential for replies)
- `MessageReaction` (join: ChatMessage <-> User + emoji)
- `Event` (with `EventCategory` enum)
- `EventInterest` (join: Event <-> User)
- `Faculty` (linked to User via userId)
- `FacultyFavorite` (join: Faculty <-> User)
- `OfficeHour` (belongs to Faculty, with `OfficeHourMode` enum)
- `OfficeHourQueue` (join: OfficeHour <-> User, with `QueueStatus` enum)
- `CalendarEvent` (belongs to User, with `CalendarEventType` enum)
- `Deadline` (belongs to User, with `DeadlinePriority` enum)
- `AIConversation` (belongs to User)
- `AIMessage` (belongs to AIConversation)
- `QuickLink` (standalone)
- `Announcement` (standalone)

#### Key Schema Details

**User model:**
```
id, email (unique), displayName, firstName, lastName, avatar?, role (enum),
major?, department?, bio?, location?, website?, year?,
emailVerified (default false), createdAt, updatedAt, lastLogin?
```

**ChatMessage model:**
```
id, channelId (FK), userId (FK), content, isEdited, isDeleted,
replyToId? (self-FK), createdAt, updatedAt
+ relations: user, channel, reactions[], replyTo?, replies[]
+ index on [channelId, createdAt]
```

**Event model:**
```
id, title, description, imageUrl?, date (DateTime), endDate?,
time (String), location, category (enum), organizer, organizerId?,
maxAttendees?, isPublished, isCancelled, createdAt, updatedAt
+ index on [date], [category]
```

**Faculty model:**
```
id, userId (unique FK), name, title, department, email, phone?,
officeLocation, officeHours (display string), imageUrl?, bio?,
courses (String[]), rating (Float), ratingCount (Int), tags (String[])
```

**OfficeHour model:**
```
id, facultyId (FK), userId (FK), dayOfWeek (0-6), startTime ("HH:MM"),
endTime ("HH:MM"), location, mode (enum), isActive, maxQueue, meetingLink?
```

**OfficeHourQueue model:**
```
id, officeHourId (FK), studentId (FK), topic, position,
status (enum: WAITING/IN_PROGRESS/COMPLETED/CANCELLED/NO_SHOW),
joinedAt, startedAt?, completedAt?
```

### 1.4 Create Core Library Files

**Create `/src/lib/prisma.ts`:**
- Singleton Prisma client with global caching for dev hot-reload

**Create `/src/lib/supabase/client.ts`:**
- Browser-side Supabase client using `createBrowserClient` from `@supabase/ssr`

**Create `/src/lib/supabase/server.ts`:**
- Server-side Supabase client using `createServerClient` with Next.js cookies

### 1.5 Run Initial Migration

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 1.6 Supabase Project Setup

In the Supabase dashboard:
1. Create project
2. Create storage buckets: `avatars` (public), `event-images` (public)
3. Enable Realtime on tables: `chat_messages`, `notifications`, `office_hour_queue`
4. Copy connection strings and keys to `.env.local`

---

## Phase 2: Authentication System

### 2.1 Zod Validation Schemas

**Create `/src/lib/validations/auth.ts`:**

| Schema | Fields | Validations |
|--------|--------|-------------|
| `loginSchema` | email, password, rememberMe? | email format, password min 8 |
| `registerSchema` | firstName, lastName, email, password, role | .edu email, uppercase + number in password, role enum |
| `forgotPasswordSchema` | email | email format |
| `resetPasswordSchema` | token, password | token required, password min 8 |

### 2.2 Auth API Routes

**Create these route files under `/src/app/api/auth/`:**

| Route File | Method | What It Does |
|------------|--------|-------------|
| `register/route.ts` | POST | Validate with Zod, create Supabase auth user, create Prisma User + NotificationPreferences, send verification email via Resend |
| `login/route.ts` | POST | Validate, call `supabase.auth.signInWithPassword`, update `lastLogin` in Prisma |
| `logout/route.ts` | POST | Call `supabase.auth.signOut` |
| `forgot-password/route.ts` | POST | Call `supabase.auth.resetPasswordForEmail` |
| `verify-email/route.ts` | POST | Verify token, update `emailVerified` in Prisma |
| `session/route.ts` | GET | Return current session and user profile |

### 2.3 Auth Middleware

**Create `/src/middleware.ts`:**

- Use `@supabase/ssr` `createServerClient` in middleware
- Define route groups:
  - **Public**: `/`, `/login`, `/register`, `/forgot-password`, `/verify-email`
  - **Student**: `/dashboard`, `/calendar`, `/events/**`, `/faculty-directory/**`, `/chatroom`, `/notifications`, `/profile`
  - **Faculty**: `/faculty/**`
  - **Admin**: `/admin/**`
- Redirect unauthenticated users to `/login?redirect=[originalPath]`
- Redirect authenticated users away from `/login`, `/register`
- Refresh auth tokens on each request

### 2.4 Auth Context Provider

**Create `/src/lib/auth/context.tsx`:**

- `AuthProvider` component wrapping children
- Manages state: `user` (Supabase User), `profile` (Prisma User), `loading`
- Listens to `supabase.auth.onAuthStateChange`
- Fetches user profile from `/api/users/me` on auth state change
- Exposes: `useAuth()` hook returning `{ user, profile, loading, signOut, refreshProfile }`

### 2.5 Update Providers

**Modify `/src/app/providers.tsx`:**
- Add `AuthProvider` wrapping children (inside QueryClientProvider)
- Configure QueryClient with `staleTime: 60_000`, `retry: 1`, `refetchOnWindowFocus: false`

### 2.6 Update Auth Pages

**Modify `/src/app/(auth)/login/page.tsx`:**
- Integrate `react-hook-form` with `zodResolver` using `loginSchema`
- Call `supabase.auth.signInWithPassword` on submit
- Show field-level validation errors
- Handle loading state with spinner
- Redirect to `searchParams.redirect` or `/dashboard` on success
- Show toast on error

**Modify `/src/app/(auth)/register/page.tsx`:**
- Same pattern: `react-hook-form` + `zodResolver` + `registerSchema`
- Call `POST /api/auth/register`
- Redirect to `/verify-email` on success

**Modify `/src/app/(auth)/forgot-password/page.tsx`:**
- Form with email field, calls `supabase.auth.resetPasswordForEmail`

**Modify `/src/app/(auth)/verify-email/page.tsx`:**
- Check for token in URL params, call verify endpoint
- Show success/error state

---

## Phase 3: Core API Routes

### 3.1 API Utilities

**Create `/src/lib/api/utils.ts`:**

- `ApiError` class (statusCode + message)
- `getAuthenticatedUser()` - gets Supabase user, fetches Prisma profile, throws 401 if not authenticated
- `handleApiError(error)` - catches ZodError (400), ApiError (custom status), generic (500)
- `successResponse(data, status)` - wraps `NextResponse.json`

### 3.2 Validation Schemas

**Create `/src/lib/validations/index.ts`:**

| Schema | Purpose |
|--------|---------|
| `updateProfileSchema` | displayName, bio, location, website, major, year |
| `updatePreferencesSchema` | All notification toggles + theme |
| `sendMessageSchema` | content (1-4000 chars), replyToId? |
| `createChannelSchema` | name, description?, type |
| `eventQuerySchema` | category?, search?, upcoming?, page, limit |
| `createCalendarEventSchema` | title, description?, start, end, allDay, type, location? |
| `createDeadlineSchema` | title, course, dueDate, priority, notes? |
| `createOfficeHourSchema` | dayOfWeek, startTime, endTime, location, mode, maxQueue, meetingLink? |
| `joinQueueSchema` | topic |

### 3.3 User Routes

**Create `/src/app/api/users/me/route.ts`:**
- `GET` - Return authenticated user profile with notification preferences
- `PATCH` - Validate with `updateProfileSchema`, update Prisma user

**Create `/src/app/api/users/me/preferences/route.ts`:**
- `PATCH` - Validate with `updatePreferencesSchema`, upsert NotificationPreferences

**Create `/src/app/api/users/me/avatar/route.ts`:**
- `POST` - Accept `FormData` with file, validate type (image/*) and size (<5MB), upload to Supabase Storage `avatars` bucket, update user.avatar
- `DELETE` - Remove from Supabase Storage, set user.avatar to null

### 3.4 Notification Routes

**Create `/src/app/api/notifications/route.ts`:**
- `GET` - Paginated list of user's notifications, optional `?unread=true` filter, ordered by createdAt desc

**Create `/src/app/api/notifications/[id]/read/route.ts`:**
- `PATCH` - Mark single notification as read, verify ownership

**Create `/src/app/api/notifications/read-all/route.ts`:**
- `POST` - Mark all user's unread notifications as read

### 3.5 Chat Routes

**Create `/src/app/api/channels/route.ts`:**
- `GET` - List channels user is a member of, include unread counts and member counts
- `POST` - Create channel, add creator as admin member

**Create `/src/app/api/channels/[id]/messages/route.ts`:**
- `GET` - Cursor-based paginated messages for channel (verify membership), include user info and reactions
- `POST` - Send message (verify membership), validate with `sendMessageSchema`

**Create `/src/app/api/messages/[id]/route.ts`:**
- `PATCH` - Edit message (verify ownership, within time limit)
- `DELETE` - Soft-delete message (set isDeleted=true, verify ownership, within 5 min)

**Create `/src/app/api/messages/[id]/reactions/route.ts`:**
- `POST` - Add reaction (emoji + userId, unique constraint)
- `DELETE` - Remove reaction

### 3.6 Event Routes

**Create `/src/app/api/events/route.ts`:**
- `GET` - Filterable, paginated events list with interest count and user's interest status. Query params: category, search (title ILIKE), upcoming (date >= now), page, limit

**Create `/src/app/api/events/[id]/route.ts`:**
- `GET` - Single event with interest count and user's interest status

**Create `/src/app/api/events/[id]/interest/route.ts`:**
- `POST` - Toggle interest (create if not exists, delete if exists). Return new count.

### 3.7 Faculty Routes

**Create `/src/app/api/faculty/route.ts`:**
- `GET` - Filterable faculty list. Query params: department, search (name ILIKE). Include favorite status for authenticated user.

**Create `/src/app/api/faculty/[id]/route.ts`:**
- `GET` - Single faculty profile with courses, office hour slots, favorite status

**Create `/src/app/api/faculty/[id]/favorite/route.ts`:**
- `POST` - Toggle favorite (create/delete)

### 3.8 Office Hours Routes

**Create `/src/app/api/office-hours/route.ts`:**
- `GET` - Faculty's own office hour slots (faculty only)
- `POST` - Create office hour slot (faculty only), validate with `createOfficeHourSchema`

**Create `/src/app/api/office-hours/[id]/route.ts`:**
- `PATCH` - Update slot (verify faculty ownership)
- `DELETE` - Delete slot (verify faculty ownership)

**Create `/src/app/api/office-hours/[id]/toggle/route.ts`:**
- `PATCH` - Toggle `isActive` (start/pause office hours session)

**Create `/src/app/api/office-hours/[id]/queue/route.ts`:**
- `GET` - Get queue entries for this office hour (ordered by position)
- `POST` - Student joins queue, validate with `joinQueueSchema`, assign next position

**Create `/src/app/api/office-hours/queue/[id]/route.ts`:**
- `PATCH` - Update queue entry status (faculty: IN_PROGRESS, COMPLETED, NO_SHOW; student: CANCELLED)
- `DELETE` - Student leaves queue (delete if status=WAITING)

### 3.9 Calendar Routes

**Create `/src/app/api/calendar/route.ts`:**
- `GET` - User's calendar events in date range. Query params: start, end (ISO strings). Returns CalendarEvents.
- `POST` - Create personal calendar event, validate with `createCalendarEventSchema`

**Create `/src/app/api/calendar/[id]/route.ts`:**
- `PATCH` - Update calendar event (verify ownership)
- `DELETE` - Delete calendar event (verify ownership)

**Create `/src/app/api/calendar/deadlines/route.ts`:**
- `GET` - User's deadlines, ordered by dueDate. Optional `?upcoming=true` for future only.
- `POST` - Create deadline, validate with `createDeadlineSchema`

**Create `/src/app/api/calendar/deadlines/[id]/route.ts`:**
- `PATCH` - Update deadline (verify ownership). Supports toggling `completed`.
- `DELETE` - Delete deadline (verify ownership)

### 3.10 AI Chatbot Route

**Create `/src/app/api/ai/chat/route.ts`:**
- `POST` - Accept `{ messages, conversationId? }`, validate auth
- Create/get AIConversation, save user message to AIMessage
- Use `streamText` from `ai` package with `createGroq` provider and `llama-3.1-8b-instant` model
- System prompt: campus advisor persona with knowledge of events, faculty, campus resources
- `onFinish` callback: save assistant response to AIMessage
- Return `result.toDataStreamResponse()` for streaming

**Create `/src/app/api/ai/conversations/route.ts`:**
- `GET` - List user's AI conversations ordered by updatedAt desc

---

## Phase 4: Realtime Features

### 4.1 Supabase Realtime Utilities

**Create `/src/lib/supabase/realtime.ts`:**

| Function | Subscribes To | Purpose |
|----------|--------------|---------|
| `subscribeToChannel(channelId, onMessage)` | `postgres_changes` INSERT on `chat_messages` filtered by channelId | Live chat messages |
| `subscribeToNotifications(userId, onNotification)` | `postgres_changes` INSERT on `notifications` filtered by userId | Live notifications |
| `subscribeToOfficeHourQueue(officeHourId, onUpdate)` | `postgres_changes` * on `office_hour_queue` filtered by officeHourId | Live queue updates |
| `subscribeToPresence(channelId, userId, onPresenceChange)` | Presence channel | Online users in chatroom |

### 4.2 Realtime Hooks

**Create `/src/hooks/useRealtimeMessages.ts`:**
- Subscribe to channel on mount, unsubscribe on unmount
- On new message: add to TanStack Query cache via `queryClient.setQueryData`

**Create `/src/hooks/useRealtimeNotifications.ts`:**
- Subscribe to user's notifications on mount
- On new notification: invalidate `['notifications']` query, show toast via Sonner

**Create `/src/hooks/useRealtimeQueue.ts`:**
- Subscribe to office hour queue changes
- Invalidate `['officeHourQueue', id]` query on any change

---

## Phase 5: Frontend Integration

### 5.1 TanStack Query Hooks

**Create `/src/lib/api/hooks.ts`:**

Create a generic `fetchApi<T>(url, options)` wrapper that handles JSON parsing and error throwing.

Then create these hooks:

| Hook | Query Key | Endpoint | Notes |
|------|-----------|----------|-------|
| `useCurrentUser()` | `['currentUser']` | `GET /api/users/me` | staleTime: 5min |
| `useUpdateProfile()` | mutation | `PATCH /api/users/me` | invalidates `['currentUser']` |
| `useNotifications(options?)` | `['notifications', options]` | `GET /api/notifications` | refetchInterval: 30s |
| `useUnreadNotificationCount()` | `['notificationCount']` | `GET /api/notifications?unread=true&countOnly=true` | refetchInterval: 30s |
| `useMarkNotificationRead()` | mutation | `PATCH /api/notifications/:id/read` | invalidates `['notifications']` |
| `useMarkAllNotificationsRead()` | mutation | `POST /api/notifications/read-all` | invalidates `['notifications']` |
| `useChannels()` | `['channels']` | `GET /api/channels` | |
| `useMessages(channelId)` | `['messages', channelId]` | `GET /api/channels/:id/messages` | useInfiniteQuery, cursor-based |
| `useSendMessage(channelId)` | mutation | `POST /api/channels/:id/messages` | optimistic update |
| `useEvents(filters?)` | `['events', filters]` | `GET /api/events` | |
| `useEvent(id)` | `['events', id]` | `GET /api/events/:id` | enabled: !!id |
| `useToggleEventInterest()` | mutation | `POST /api/events/:id/interest` | optimistic update on count + boolean |
| `useFaculty(filters?)` | `['faculty', filters]` | `GET /api/faculty` | |
| `useFacultyMember(id)` | `['faculty', id]` | `GET /api/faculty/:id` | |
| `useToggleFacultyFavorite()` | mutation | `POST /api/faculty/:id/favorite` | optimistic update |
| `useCalendarEvents(start, end)` | `['calendar', start, end]` | `GET /api/calendar` | |
| `useDeadlines()` | `['deadlines']` | `GET /api/calendar/deadlines` | |
| `useToggleDeadlineComplete()` | mutation | `PATCH /api/calendar/deadlines/:id` | optimistic update |
| `useOfficeHours()` | `['officeHours']` | `GET /api/office-hours` | faculty only |
| `useOfficeHourQueue(id)` | `['officeHourQueue', id]` | `GET /api/office-hours/:id/queue` | refetchInterval: 10s |

### 5.2 AI Chat Hook

**Create `/src/hooks/useAIChat.ts`:**
- Wraps `useChat` from `ai/react` package
- Sends to `/api/ai/chat`
- Passes `conversationId` in body
- Tracks current conversation ID from response headers

### 5.3 Email Service

**Create `/src/lib/email/index.ts`:**

| Function | Purpose | Email Content |
|----------|---------|---------------|
| `sendVerificationEmail(email, token)` | Account verification | Link to `/verify-email?token=...` |
| `sendPasswordResetEmail(email, token)` | Password reset | Link to `/reset-password?token=...` |
| `sendNotificationEmail(email, notification)` | Email digest/important notifications | Notification title + message + action link |

---

## Phase 6: Page-by-Page Frontend Updates

### 6.1 Files to Modify

Every student/faculty page needs mock data replaced with real API calls. Here is every file and what changes:

**`/src/app/providers.tsx`:**
- Add `AuthProvider` (inside `QueryClientProvider`)
- Add `ReactQueryDevtools` in dev mode

**`/src/app/(student)/layout.tsx`:**
- Add `useRealtimeNotifications()` hook call
- Pass real user data to Header/Sidebar components

**`/src/components/layout/Header.tsx`:**
- Replace hardcoded avatar/name with `useAuth()` profile data
- Replace hardcoded notification count with `useUnreadNotificationCount()`

**`/src/components/layout/Sidebar.tsx`:**
- Replace hardcoded notification badge with `useUnreadNotificationCount()`

**`/src/components/notifications/NotificationBadge.tsx`:**
- Accept count from parent via props (already does this) - no change needed

**`/src/app/(auth)/login/page.tsx`:**
- Add `react-hook-form` + `zodResolver`, real Supabase auth call, loading/error states

**`/src/app/(auth)/register/page.tsx`:**
- Add `react-hook-form` + `zodResolver`, call `/api/auth/register`, handle validation

**`/src/app/(auth)/forgot-password/page.tsx`:**
- Add form submission with Supabase password reset

**`/src/app/(auth)/verify-email/page.tsx`:**
- Check token on mount, call verify endpoint

**`/src/app/(student)/dashboard/page.tsx`:**
- Replace hardcoded greeting with `useAuth()` profile firstName
- Remove inline mock data

**`/src/components/dashboard/TodayScheduleWidget.tsx`:**
- Replace `mockEvents` with `useCalendarEvents(todayStart, todayEnd)`
- Show loading skeleton while fetching

**`/src/components/dashboard/UpcomingDeadlinesWidget.tsx`:**
- Replace `mockDeadlines` with `useDeadlines()`
- Use `useToggleDeadlineComplete()` for checkbox

**`/src/components/dashboard/CampusEventsWidget.tsx`:**
- Replace `mockEvents` with `useEvents({ upcoming: true, limit: 4 })`
- Use `useToggleEventInterest()` for heart button

**`/src/app/(student)/calendar/page.tsx`:**
- Pass real data to UnifiedCalendar via `useCalendarEvents(monthStart, monthEnd)`

**`/src/components/calendar/UnifiedCalendar.tsx`:**
- Accept events via props instead of internal mock data
- Add create/edit/delete event forms calling calendar API

**`/src/app/(student)/events/page.tsx`:**
- Replace `mockEvents` with `useEvents(filters)`
- Wire up search input (debounced 300ms) and category filters to query params
- Use `useToggleEventInterest()` for interest button

**`/src/app/(student)/events/[id]/page.tsx`:**
- Replace hardcoded event with `useEvent(params.id)`
- Wire up interest/save/share buttons

**`/src/app/(student)/faculty-directory/page.tsx`:**
- Replace `mockFaculty` with `useFaculty(filters)`
- Wire up search and department filter
- Use `useToggleFacultyFavorite()` for star button

**`/src/app/(student)/faculty-directory/[id]/page.tsx`:**
- Replace hardcoded faculty with `useFacultyMember(params.id)`
- Wire up favorite button and "Book Appointment" to office hours queue

**`/src/app/(student)/chatroom/page.tsx`:**
- Replace mock channels/messages with `useChannels()` and `useMessages(channelId)`
- Use `useSendMessage(channelId)` for message composer
- Add `useRealtimeMessages(channelId)` for live updates
- Add presence tracking with `subscribeToPresence`

**`/src/app/(student)/notifications/page.tsx`:**
- Replace mock notifications with `useNotifications()`
- Use `useMarkNotificationRead()` for individual marks
- Use `useMarkAllNotificationsRead()` for "mark all" button
- Fix type inconsistency (currently uses local interface; switch to API response type)

**`/src/app/(student)/profile/page.tsx`:**
- Replace hardcoded profile with `useAuth()` profile
- Use `useUpdateProfile()` mutation for form saves
- Add avatar upload calling `/api/users/me/avatar`
- Use `react-hook-form` + `zodResolver` for form validation
- Wire up notification preferences to `useUpdatePreferences()`

**`/src/app/faculty/dashboard/page.tsx`:**
- Replace hardcoded stats with real data from API queries

**`/src/components/dashboard/FacultyDashboard.tsx`:**
- Wire up to real office hour, student request, and activity data

**`/src/components/dashboard/OfficeHoursStatusCard.tsx`:**
- Use `useOfficeHours()` and `useOfficeHourQueue()` for live status
- Add `useRealtimeQueue()` for live queue updates

**`/src/app/faculty/office-hours/page.tsx`:**
- Wire up to real office hours API

**`/src/components/office-hours/OfficeHoursManager.tsx`:**
- Replace mock slots with `useOfficeHours()`
- Replace mock queue with `useOfficeHourQueue(activeSlotId)`
- Wire up create/edit/delete slot forms
- Wire up queue management (start, complete, no-show)

### 6.2 New Components to Create

**Create `/src/components/ai/AIChatWidget.tsx`:**
- Floating action button (bottom-right) that opens slide-out chat panel
- Uses `useAIChat()` hook
- Streaming message display with typing indicator
- Quick action suggestions
- Message history with auto-scroll

**Create `/src/components/ai/AIChatDialog.tsx`:**
- Full-screen dialog variant for mobile
- Same functionality as widget

**Create `/src/components/shared/ErrorBoundary.tsx`:**
- React error boundary component
- Fallback UI with "Try Again" button
- Logs errors to console

**Create `/src/components/shared/EmptyState.tsx`:**
- Reusable empty state component with icon, title, description, action button
- Used for: no events, no notifications, no messages, no deadlines

---

## Phase 7: Type System Cleanup

### 7.1 Fix Type Inconsistencies

**Modify `/src/types/index.ts`:**
- After Prisma is set up, re-export Prisma-generated types as the canonical types
- Remove duplicate/conflicting interfaces (e.g., `Event` vs `CampusEvent`)
- Add API response wrapper types: `PaginatedResponse<T>`, `CursorPaginatedResponse<T>`
- Keep `ScheduleEvent`, `QuickLink`, `StudySession` as manual interfaces (not in DB or used only on frontend)

### 7.2 Specific Fixes

| Issue | Current | Fix |
|-------|---------|-----|
| Notification type enum mismatch | `notifications/page.tsx` uses local `'event' \| 'academic' \| 'social'` | Use Prisma `NotificationType` enum everywhere |
| Notification field names | Page uses `body` + `time` (string) | Standardize to `message` + `createdAt` (Date) from Prisma |
| Event date inconsistency | `Event.date: string`, `CampusEvent.date: Date` | Use Prisma `Event.date: DateTime` everywhere |
| Chatroom message type | Different from `ChatroomMessage` interface | Use Prisma `ChatMessage` with included user relation |
| Profile type | Profile page uses local object shape | Use `UserProfile` from Prisma |

---

## Phase 8: Database Seeding

**Create `/prisma/seed.ts`:**

Seed script that populates the database with realistic demo data:

| Entity | Count | Notes |
|--------|-------|-------|
| Users | 10-15 | Mix of students (8), faculty (5), admin (1-2) |
| Channels | 5 | General, Study Groups, Events, Housing, Clubs |
| ChannelMembers | All users in General | Auto-join General on registration |
| ChatMessages | 20-30 | Spread across channels |
| Events | 10-15 | Mix of categories, some past/future |
| Faculty | 5 | Linked to faculty users, with courses and tags |
| OfficeHours | 8-10 | 2 per faculty member |
| Deadlines | 8-10 | For student users |
| CalendarEvents | 15-20 | Mix of types for demo user |
| Notifications | 10 | For demo user |
| QuickLinks | 6 | Default links (Library, Grades, etc.) |
| Announcements | 2-3 | System announcements |

Add to `package.json`:
```json
"prisma": { "seed": "npx tsx prisma/seed.ts" }
```

---

## Phase 9: Error Handling & Polish

### 9.1 Global Error Handling

- Add error boundaries at route segment level in student/faculty layouts
- Add `loading.tsx` files with skeleton screens for each route group
- Add `error.tsx` files with retry buttons for each route group
- Add `not-found.tsx` for custom 404 pages

### 9.2 Loading States

Every data-fetching component should:
- Show `LoadingSkeleton` while `isLoading`
- Show `EmptyState` when data is empty
- Show error message with retry when `isError`
- Use skeleton shapes matching the actual content layout

### 9.3 Optimistic Updates

Implement optimistic updates for:
- Event interest toggle (update count + boolean immediately)
- Faculty favorite toggle (update star immediately)
- Deadline completion toggle (update checkbox immediately)
- Message sending (show message immediately, replace when confirmed)
- Notification mark as read (remove from unread immediately)

### 9.4 Accessibility Audit

- Verify all form inputs have associated labels
- Verify all buttons have accessible names
- Test keyboard navigation through all interactive elements
- Verify color contrast meets WCAG 2.2 AA (4.5:1 text, 3:1 UI)
- Add `aria-live` regions for real-time content (chat, notifications, queue)
- Verify `prefers-reduced-motion` disables animations

---

## File Creation/Modification Summary

### New Files (55+ files)

```
/.env.example
/.env.local
/prisma/schema.prisma
/prisma/seed.ts
/src/middleware.ts
/src/lib/prisma.ts
/src/lib/supabase/client.ts
/src/lib/supabase/server.ts
/src/lib/supabase/realtime.ts
/src/lib/auth/context.tsx
/src/lib/api/utils.ts
/src/lib/api/hooks.ts
/src/lib/email/index.ts
/src/lib/validations/auth.ts
/src/lib/validations/index.ts
/src/app/api/auth/register/route.ts
/src/app/api/auth/login/route.ts
/src/app/api/auth/logout/route.ts
/src/app/api/auth/forgot-password/route.ts
/src/app/api/auth/verify-email/route.ts
/src/app/api/auth/session/route.ts
/src/app/api/users/me/route.ts
/src/app/api/users/me/preferences/route.ts
/src/app/api/users/me/avatar/route.ts
/src/app/api/notifications/route.ts
/src/app/api/notifications/[id]/read/route.ts
/src/app/api/notifications/read-all/route.ts
/src/app/api/channels/route.ts
/src/app/api/channels/[id]/messages/route.ts
/src/app/api/messages/[id]/route.ts
/src/app/api/messages/[id]/reactions/route.ts
/src/app/api/events/route.ts
/src/app/api/events/[id]/route.ts
/src/app/api/events/[id]/interest/route.ts
/src/app/api/faculty/route.ts
/src/app/api/faculty/[id]/route.ts
/src/app/api/faculty/[id]/favorite/route.ts
/src/app/api/office-hours/route.ts
/src/app/api/office-hours/[id]/route.ts
/src/app/api/office-hours/[id]/toggle/route.ts
/src/app/api/office-hours/[id]/queue/route.ts
/src/app/api/office-hours/queue/[id]/route.ts
/src/app/api/calendar/route.ts
/src/app/api/calendar/[id]/route.ts
/src/app/api/calendar/deadlines/route.ts
/src/app/api/calendar/deadlines/[id]/route.ts
/src/app/api/ai/chat/route.ts
/src/app/api/ai/conversations/route.ts
/src/hooks/useRealtimeMessages.ts
/src/hooks/useRealtimeNotifications.ts
/src/hooks/useRealtimeQueue.ts
/src/hooks/useAIChat.ts
/src/components/ai/AIChatWidget.tsx
/src/components/ai/AIChatDialog.tsx
/src/components/shared/ErrorBoundary.tsx
/src/components/shared/EmptyState.tsx
```

### Files to Modify (27 files)

```
/src/types/index.ts
/src/app/providers.tsx
/src/app/(student)/layout.tsx
/src/app/(auth)/login/page.tsx
/src/app/(auth)/register/page.tsx
/src/app/(auth)/forgot-password/page.tsx
/src/app/(auth)/verify-email/page.tsx
/src/app/(student)/dashboard/page.tsx
/src/app/(student)/calendar/page.tsx
/src/app/(student)/chatroom/page.tsx
/src/app/(student)/events/page.tsx
/src/app/(student)/events/[id]/page.tsx
/src/app/(student)/faculty-directory/page.tsx
/src/app/(student)/faculty-directory/[id]/page.tsx
/src/app/(student)/notifications/page.tsx
/src/app/(student)/profile/page.tsx
/src/app/faculty/dashboard/page.tsx
/src/app/faculty/office-hours/page.tsx
/src/components/layout/Header.tsx
/src/components/layout/Sidebar.tsx
/src/components/dashboard/TodayScheduleWidget.tsx
/src/components/dashboard/UpcomingDeadlinesWidget.tsx
/src/components/dashboard/CampusEventsWidget.tsx
/src/components/dashboard/FacultyDashboard.tsx
/src/components/dashboard/OfficeHoursStatusCard.tsx
/src/components/calendar/UnifiedCalendar.tsx
/src/components/office-hours/OfficeHoursManager.tsx
```

---

## Verification Plan

### End-to-End Testing Checklist

1. **Auth Flow**: Register with .edu email -> verify email -> login -> see dashboard with real name -> logout -> redirect to login
2. **Dashboard**: After login, dashboard shows real user greeting, real deadlines, real events, real schedule
3. **Events**: Search events, filter by category, toggle interest (count updates optimistically), view event detail
4. **Faculty**: Search faculty, filter by department, toggle favorite, view faculty profile, see office hours
5. **Calendar**: View month/week, see personal + campus events, create new event, edit event, delete event
6. **Chatroom**: See channels, send message (appears instantly via realtime), see other users' messages, add reaction, delete own message
7. **Notifications**: Receive real-time notification toast when event is created, see in notification center, mark as read
8. **AI Chat**: Open chat widget, send question, receive streaming response, see conversation history
9. **Profile**: Update display name/bio, upload avatar (appears in header), change notification preferences, change theme
10. **Office Hours (Faculty)**: Create office hour slot, toggle active, see queue update in real-time when student joins
11. **Build**: `npm run build` completes without errors
12. **Type Safety**: `npx tsc --noEmit` passes with no type errors
