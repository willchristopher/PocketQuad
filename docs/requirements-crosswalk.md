# MyQuad Requirements Crosswalk

Date: 2026-02-08
Repository: `/Users/willchristopher/MyQuad`

## 1) Current Tech Stack

- Frontend: Next.js 16 (App Router), React 19, TypeScript
- Styling/UI: Tailwind CSS, Radix UI primitives, Lucide icons, Framer Motion
- Data fetching/state: `fetch` + typed API client, React state, TanStack Query provider
- Backend: Next.js Route Handlers under `src/app/api/**`
- Database: PostgreSQL via Supabase, Prisma ORM (`/Users/willchristopher/MyQuad/prisma/schema.prisma`)
- Auth: Supabase Auth + SSR helpers + role-aware middleware (`/Users/willchristopher/MyQuad/src/middleware.ts`)
- Realtime: Supabase Realtime subscriptions for chat, notifications, office-hour queue
- AI: Vercel AI SDK + Groq (`/Users/willchristopher/MyQuad/src/app/api/ai/chat/route.ts`)
- Storage: Supabase Storage for avatars (`/Users/willchristopher/MyQuad/src/app/api/users/me/avatar/route.ts`)
- Validation: Zod schemas for auth/domain/admin payloads
- Email: Resend helper exists, but not currently wired to active flows (`/Users/willchristopher/MyQuad/src/lib/email/index.ts`)

## 2) Implemented Feature Inventory

- Student portal with dashboard, calendar, event discovery/detail, faculty directory/detail, AI advisor, chatroom, map locations, services status, links directory, clubs, notifications, and profile pages.
- Faculty portal with office-hour CRUD, faculty availability status updates, event creation, and permission-based announcement publishing.
- Admin portal with multi-university CRUD for universities, faculty, buildings, resource links, services, clubs, and events.
- API surface includes auth/session, users/me, notifications, channels/messages/reactions, events/interests, calendar/deadlines, faculty/favorites/status, office-hours/queue, announcements, AI conversations, and admin CRUD.
- Multi-tenant data model by university with domain mapping on registration.

## 3) Functional Requirements Crosswalk (Your FR-01 to FR-12)

| FR | Status | Current Behavior | Update Needed |
|---|---|---|---|
| FR-01 Account + university email verification | Partial | `.edu` validation and registration exist; verify endpoint exists (`/api/auth/verify-email`) | Wire verification UI and enforce `emailVerified` before app access |
| FR-02 Personalized dashboard | Partial | Dashboard aggregates events/deadlines/services/links/clubs; personalization mostly by profile and local storage | Replace static news with API data; persist user dashboard config server-side |
| FR-03 Unified calendar aggregation + filters | Partial | Calendar merges campus events + personal calendar + deadlines with filters | Add true external academic-calendar ingestion/source sync |
| FR-04 Campus event discovery | Implemented | Search/filter by category/date/location, event detail, interest toggle, add-to-calendar | Add RSVP/capacity workflows if required |
| FR-05 Faculty directory search + office hours | Implemented | Search by department/query; detail pages include office location/hours and favorites | Optional rating/review system if required |
| FR-06 AI chatbot for campus queries | Implemented | AI advisor UI + backend persistence/conversations | Add grounding/citation controls and moderation policies |
| FR-07 Profile + notification prefs + dashboard customization | Partial | Profile edit, avatar upload, notification preferences exist | Dashboard layout customization UI/persistence is incomplete |
| FR-08 Real-time chatroom | Partial | Realtime message updates in channels are live | Unread counts, moderation, and richer chat controls are incomplete |
| FR-09 Campus map with pins + directions | Partial | Building/location cards with directions links | Embedded map with visual pins is currently placeholder UI |
| FR-10 Favorite/bookmark system | Partial | Faculty favorites persisted; event interest exists; dashboard favorites localStorage-only | Add server-backed favorites for events/resources and dashboard sync |
| FR-11 Campus services status indicator | Implemented | Service status list (OPEN/CLOSED/LIMITED) with directions | Optional auto-status scheduling/automation not present |
| FR-12 External link directory | Implemented | Categorized searchable link directory backed by API | Optional usage analytics/health checks not present |

## 4) Updated Epics and User Stories with Technical Tasks

### Epic 1: Identity, Access, and Security

User Story 1: As a new student/faculty user, I want account creation with university email validation and verification so only valid campus users can access protected features.

Status: Partial

Completed developer tasks:
- Implemented `POST /api/auth/register` with Zod validation (`/Users/willchristopher/MyQuad/src/app/api/auth/register/route.ts`).
- Added `.edu` enforcement for student/faculty roles (`/Users/willchristopher/MyQuad/src/lib/validations/auth.ts`).
- Added university domain mapping during registration (`/Users/willchristopher/MyQuad/src/lib/university.ts`).
- Added auth middleware route protection and role redirects (`/Users/willchristopher/MyQuad/src/middleware.ts`).

Remaining developer tasks:
- Implement verification page logic to consume token/tokenHash and call `/api/auth/verify-email`.
- Enforce `emailVerified` in middleware/session gate before granting portal access.
- Add resend verification endpoint with request throttling.
- Restrict `ADMIN` self-registration at API level.

User Story 2: As a returning user, I want secure login/session/logout with role-based portal routing so I land in the correct workspace.

Status: Implemented

Completed developer tasks:
- Built auth routes for login/logout/session (`/Users/willchristopher/MyQuad/src/app/api/auth/login/route.ts`, `/Users/willchristopher/MyQuad/src/app/api/auth/logout/route.ts`, `/Users/willchristopher/MyQuad/src/app/api/auth/session/route.ts`).
- Added safe redirect handling and role-based home routing (`/Users/willchristopher/MyQuad/src/lib/auth/routing.ts`).
- Synced Supabase user IDs into Prisma profiles at login/session lookup.

Remaining developer tasks:
- Add brute-force protection/rate limiting to auth endpoints.
- Add structured auth audit logging for security/compliance.

### Epic 2: Student Planning and Discovery

User Story 3: As a student, I want a personalized dashboard with important campus data at login so I can start my day quickly.

Status: Partial

Completed developer tasks:
- Implemented dashboard data aggregation calls to events, deadlines, services, links, clubs (`/Users/willchristopher/MyQuad/src/app/(student)/dashboard/page.tsx`).
- Built responsive bento-style dashboard modules (`/Users/willchristopher/MyQuad/src/components/dashboard/BentoGrid.tsx`).
- Added quick links to map, services, clubs, advisor.

Remaining developer tasks:
- Replace static `campusNews` with announcement/news API data.
- Add dashboard module preference editor (currently reads localStorage but no management UI).
- Add server-backed dashboard layout/config persistence per user.

User Story 4: As a student, I want a unified calendar for events, deadlines, and personal items so I can plan academics and campus life in one view.

Status: Partial

Completed developer tasks:
- Built month grid calendar UI with filters and day detail modal (`/Users/willchristopher/MyQuad/src/components/calendar/UnifiedCalendar.tsx`).
- Implemented calendar and deadline CRUD APIs (`/Users/willchristopher/MyQuad/src/app/api/calendar/**`).
- Integrated event data from `GET /api/events` into calendar aggregation.

Remaining developer tasks:
- Add external academic-calendar ingestion (ICS/feed integration).
- Add timezone normalization tests and cross-timezone edge-case handling.
- Add server-side aggregation endpoint to reduce client fan-out requests.

User Story 5: As a student, I want to discover campus events by category/date/location and add them to my calendar so I do not miss opportunities.

Status: Implemented

Completed developer tasks:
- Implemented search/filter UI for category/date/location (`/Users/willchristopher/MyQuad/src/app/(student)/events/page.tsx`).
- Implemented `GET /api/events`, `GET /api/events/[id]`, `POST /api/events/[id]/interest`.
- Added add-to-calendar behavior via `POST /api/calendar`.

Remaining developer tasks:
- Add RSVP/capacity enforcement and waitlist flow if required by product scope.
- Add pagination or infinite scroll for large event catalogs.

User Story 6: As a student, I want searchable faculty information and quick favorite actions so I can reach instructors efficiently.

Status: Partial

Completed developer tasks:
- Implemented faculty list/search/filter APIs and detail fetch (`/Users/willchristopher/MyQuad/src/app/api/faculty/**`).
- Implemented faculty favorite toggle API (`/Users/willchristopher/MyQuad/src/app/api/faculty/[id]/favorite/route.ts`).
- Built student directory and faculty profile pages.

Remaining developer tasks:
- Reflect persisted faculty favorites in dashboard quick-access modules.
- Extend favorites model to include events/resources (currently mixed localStorage + separate interest model).

User Story 7: As a student, I want quick access to campus locations, services, external portals, and clubs so navigation and resource discovery are centralized.

Status: Partial

Completed developer tasks:
- Implemented buildings/services/resource-links/clubs APIs scoped by university.
- Built student pages for campus map, services status, links directory, and clubs.
- Added directions links in map/service cards.

Remaining developer tasks:
- Replace map placeholder with embedded map provider and visual pins.
- Add pin clustering/layer filters (resource/faculty/event venue).

### Epic 3: Community, Chat, and Notifications

User Story 8: As a student, I want a real-time chatroom for campus conversations so peer communication feels immediate.

Status: Partial

Completed developer tasks:
- Implemented channel and message APIs (`/Users/willchristopher/MyQuad/src/app/api/channels/**`).
- Added realtime chat subscriptions with Supabase (`/Users/willchristopher/MyQuad/src/lib/supabase/realtime.ts`).
- Built chatroom UI with channel selection and message send.

Remaining developer tasks:
- Implement unread count tracking (currently hardcoded `unreadCount: 0` in channel responses).
- Expose message edit/delete/reaction APIs in UI controls.
- Add moderation/reporting, rate limit, and anti-spam protection.

User Story 9: As a user, I want notification feeds and read-state controls so I can triage updates effectively.

Status: Implemented

Completed developer tasks:
- Implemented notifications API with pagination/unread/count-only.
- Added mark-one and mark-all-as-read endpoints.
- Integrated realtime notification badge updates and notification center filtering.

Remaining developer tasks:
- Add push/email digest job processing that honors notification preferences.
- Add notification retention/archival policies.

User Story 10: As a user, I want AI assistant support for campus questions so I can get immediate guidance.

Status: Implemented

Completed developer tasks:
- Implemented AI chat endpoint using Vercel AI SDK + Groq with persisted conversations/messages.
- Built advisor page and floating AI widget experiences.
- Added non-stream and stream handling in API.

Remaining developer tasks:
- Add retrieval grounding over campus content and source citations.
- Add guardrails/content policies and model fallback strategy.

### Epic 4: Faculty Productivity

User Story 11: As faculty, I want to manage office hours and status updates so students know availability in real time.

Status: Partial

Completed developer tasks:
- Implemented office-hour slot CRUD and active toggle APIs.
- Implemented faculty status API with notifications to favoriting students.
- Built faculty dashboard forms for office-hour management and status save.

Remaining developer tasks:
- Ship student-facing queue join/leave UX (queue APIs exist but student UI is missing).
- Add faculty queue operations UI in active production surface (existing `OfficeHoursManager` component is not wired into routes).

User Story 12: As faculty, I want to publish events and campus announcements (with permissions) so I can communicate academic/community updates.

Status: Implemented

Completed developer tasks:
- Implemented faculty event creation via `POST /api/events` with follower notification fan-out.
- Implemented announcements permission checks (`canPublishCampusAnnouncements`).
- Added faculty dashboard forms for event/announcement creation.

Remaining developer tasks:
- Add announcement moderation/approval workflow if required.
- Add scheduled publish windows and post-expiration controls.

### Epic 5: Admin Multi-Tenant Operations

User Story 13: As an admin, I want university-scoped CRUD across core campus entities so tenant data can be managed centrally.

Status: Implemented

Completed developer tasks:
- Implemented admin-only auth gate (`getAuthenticatedAdmin`) and guarded routes.
- Built admin CRUD APIs for universities, faculty, buildings, links, services, clubs, events.
- Built tabbed admin console with create/edit/delete workflows and university filtering.

Remaining developer tasks:
- Add audit log tables and action history for each admin mutation.
- Add soft-delete + restore patterns for safer content operations.
- Add bulk import/export tooling for onboarding campuses.

User Story 14: As an admin, I want domain-based university assignment so users automatically land in the right tenant context.

Status: Implemented

Completed developer tasks:
- Added `University.domain` and registration-time domain matching.
- Added university-scoped query filtering behavior in student/faculty APIs.

Remaining developer tasks:
- Add admin reassignment workflow for users when domains change.
- Add conflict handling for shared/alias domains.

## 5) Platform Backlog (Cross-Cutting)

- Add automated tests: unit tests for route validators/services, integration tests for role/tenant auth, E2E flows for student/faculty/admin critical paths.
- Add API contract docs (OpenAPI) and client generation.
- Add observability: structured logs, request IDs, error tracking, and performance tracing.
- Add endpoint-level rate limiting for auth/chat/announcement/chat-message APIs.
- Remove or wire currently unused legacy components with mock data to reduce maintenance noise.

