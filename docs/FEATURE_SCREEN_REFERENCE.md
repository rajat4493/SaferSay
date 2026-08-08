# SaferSay — Feature & Screen Reference

**Purpose:** Complete inventory of every screen in the product, organized by user segment. For each screen: every visible element and its position, every interactive behavior, and the exact backend call it triggers (endpoint, method, request/response shape, database tables touched).

**As-of:** This reflects the codebase after the three-zone admin refactor, the four-role permission model, and the SAFERSAY design implementation directive (crisp-white admin / warm-gray taker). Verified against source directly, not from memory — file paths are given throughout so anything here can be re-checked.

**Three segments, three surfaces:**

| Segment | Who | Routes | Register |
|---|---|---|---|
| Survey Taker | Anonymous employee respondent, token-only | `/s/[token]` | Warm-gray, Oura/iA Writer |
| Client Admin | HR / Customer Admin at a tenant company | `/app/*` | Crisp white, Stripe/Tally/Linear |
| Platform Owner | SaferSay staff running the whole platform | `/console/*` | Same crisp-white register as Client Admin |

---

## 0. Foundations (read this before the screens — everything below depends on it)

### 0.1 Authentication flow

1. Unauthenticated visitor hits a protected path (`/app/*` or `/viewer/*`) → `middleware.ts` intercepts, checks Supabase session cookie via `updateSession()` (`src/utils/supabase/middleware.ts`). No session → redirect to `/login?next=<original path>`.
   - **`/console/*` is NOT in the middleware matcher.** Its protection happens one layer deeper, in `src/app/console/layout.tsx` (server component, runs `requireSessionContext` then checks `isSuperAdmin`, redirects to `/app` if false). Functionally protected either way, just at a different layer than `/app`.
2. `/login` (`src/app/login/page.tsx`) — two-column layout: left panel (desktop only, `lg:flex`, hidden on mobile) is a dark hero (`bg-[var(--brand-ink)]`, white text) with the BrandMark, "Confidential by design" pill, headline "Say the *unsayable.*", and the tagline. Right panel: `OAuthLoginButtons` (Google, Microsoft — Supabase `signInWithOAuth`) and, only when the dev bypass is enabled, `DevLoginPanel`.
   - `DevLoginPanel` (`src/components/DevLoginPanel.tsx`) checks `GET /api/dev/login` on mount; that route 404s outright when `SAFERSAY_RUNTIME_MODE=production`, so the panel silently never renders on the real deployment. When it does render, it's a plain email field + "Sign in" button that `POST`s to `/api/dev/login`, setting a `safersay_dev_auth_email` cookie and skipping OAuth entirely — local/staging testing only.
3. OAuth completes → Supabase redirects to `/auth/callback?code=...&next=...` (`src/app/auth/callback/route.ts`) → exchanges the code for a session, redirects to `next` (defaults to `/app`) on success, or to `/login?error=oauth_failed` on failure.
4. First-ever sign-in for a brand-new identity: `resolveUserRecord()` (`src/lib/server/authSession.ts`) finds no existing user, auto-creates a new tenant (`"<name or email>'s workspace"`) and a `customer_admin` user row via `IdentityRepository.createUser`. **There is no separate signup flow** — signing in for the first time *is* signup, and you always land as the owner of a brand-new single-tenant workspace.

### 0.2 Role model

Four roles, one `identity.users.role` column, enforced both server-side (route/layout checks) and client-side (nav visibility only — not a real security boundary, just UX):

| Role | Surveys | People | Workspace | Ships today? |
|---|---|---|---|---|
| `customer_admin` | full | full | full | ✅ yes |
| `survey_creator` | full | full | hidden | code exists, not surfaced in any invite/assign UI yet |
| `auditor` | view only | — | read-only | code exists (`permissions.ts`), `getVisibleNavZones()` returns `[]` for it — no nav, no screens built |
| `employee` | — | — | — | token-link only, never signs in |

Permission functions live in `src/lib/permissions.ts` and gate two server-side layouts:
- `src/app/app/people/layout.tsx` → `canAccessPeople(role)` (`customer_admin` or `survey_creator`), else `redirect("/app")`.
- `src/app/app/workspace/layout.tsx` → `canAccessWorkspace(role)` (`customer_admin` only), else `redirect("/app")`.
- `src/app/app/layout.tsx` just requires *any* session (`requireSessionContext`), no role check — every role can reach `/app` itself.

The "Pure Owner" client-side concept (`AppShell.tsx`): a platform Owner who is signed in but **not currently impersonating a tenant** (`isSuperAdmin && !isImpersonating`) sees the entire Surveys/People/Workspace nav collapse to nothing — the redirect logic on the Surveys home page (`src/app/app/page.tsx`) sends them straight to `/console` instead. An Owner sees tenant-running nav after explicitly entering a tenant via the "Enter workspace →" button on Tenant Detail (§3.4).

### 0.3 Data severance (the confidentiality architecture every screen's copy refers to)

Two logically separate schemas in the same Postgres database:
- `identity.*` — who exists, who was invited, participation/token state. Tables: `tenants`, `users`, `employees`, `survey_participants`, `invite_outbox`, `cycle_actions`, `tenant_settings`, `audit_logs`.
- `responses.*` — the actual answers. Tables: `survey_templates`, `template_questions`, `survey_cycles`, `submissions`, `answers`.

`responses.submissions` has **no** `employee_id` or `email` column — only `tenant_id`, `cycle_id`, `spent_token_hash`. There is no foreign key from `responses.*` back to `identity.*`; a `db.not.toMatch(/responses\.[\s\S]+references identity\./i)` test (`src/lib/server/repositories/severance.test.ts`) enforces this at the schema level.

The join between "who" and "what they said" is severed by construction: `submitWithSeveredRepositories()` (`src/lib/server/confidentialSubmissionService.ts`) is the **only** place a submission gets written. It hashes the raw token, looks up the participant in `identity.*` to check it's still `issued` (never spent), writes the answer into `responses.*` under just `tenant_id`/`cycle_id`, then marks the token spent in `identity.*` — same transaction, two schemas, no shared identifier written to the response side.

Reports never show individual answers: `responses.report_question_scores(cycle_id, min_group_size)` is a Postgres function (`SECURITY DEFINER`) that returns `protected = true` with zero rows whenever `n < min_group_size` for that question. The API layer (`ResponseRepository.getProtectedReport*`) also independently checks the *overall* submission count against the threshold before calling that function at all.

### 0.4 Design tokens (both surfaces, all colors/type/spacing referenced below)

Full source: `src/app/globals.css`.

**Admin** (`:root`, applies everywhere except inside `.taker-surface`):
```
--bg:#F6F6F7  --bg-subtle:#EDEDEF  --bg-faint:#FAFAFA  --bg-hover:#F5F5F5  --bg-active:#F0F0F0
--ink:#0F0F0F  --ink-hover:#262626  --ink-mid:#525252  --ink-soft:#737373  --ink-faint:#A0A0A0
--border:#E4E4E6  --border-hover:#A0A0A0
--green:#16A34A  --green-bg:#F0FDF4  --green-border:#BBF7D0
--red:#EF4444  --red-bg:#FEF2F2  --red-border:#FECACA
--radius-card:8px  --radius-input:6px  --radius-button:6px  --radius-pill:100px
```
Semantic rule enforced throughout: **green = live/active/positive only. Red = attention/destructive only. Black = everything else, including all primary actions.** No third "warning" color — anything that would have been amber collapses to red (told apart by label text where the distinction matters, e.g. Owner Console's "Attention" vs "At risk" tenant-health badges).

**Taker** (`.taker-surface` re-scopes the *same variable names* to warm values, so shared classes like `.btn-primary` automatically render correctly in whichever surface they're nested in):
```
--bg:#F7F6F3  --ink:#111110  --ink-mid:#6B6860  --ink-soft:#9B9890  --border:#E2E0DA
--green:#1A7A55  --green-bg:#F0F7F3  --red:#C0392B  --red-bg:#FDF0EF
```

Shared utility classes (defined once in `globals.css`, used everywhere instead of ad-hoc Tailwind): `.card`, `.card-interactive` (hover = border-color change only, no shadow/lift/transform), `.btn-primary` / `.btn-secondary` / `.btn-destructive` (+ `.btn-pill` modifier for 100px radius), `.admin-input`, `.page-title` (22px/600), `.section-title` (16px/600), `.secondary-text` (13px), `.meta-label` (11px/600/uppercase), `.label-text`, `.data-number` (24px/700), `.live-tag` (green pill + animated pulse dot), `.seal-strip`.

Font: **Inter only**, both surfaces, all weights. Bricolage Grotesque still loads (`layout.tsx`) but is only referenced by the public landing page's (`src/app/page.tsx`, out of scope for both segments below) hero headline — nothing in `/app`, `/console`, or `/s/[token]` uses it.

Reduced motion: one global rule in `globals.css` (`@media (prefers-reduced-motion: reduce)`) collapses all animation/transition durations to `0.01ms` app-wide — covers the taker's question-entry animation, the live-pulse dot, and every hover transition without any screen needing its own opt-out.

---

## 1. SEGMENT: SURVEY TAKER — `/s/[token]`

One file: `src/app/s/[token]/page.tsx`. One route, five states rendered from a single `step` variable: `loading → intro → survey → done`, or `invalid` at any point the token fails. No sidebar, no nav, no login — the token *is* the entire session.

### 1.1 Persistent chrome (present on every state except none — always rendered)

**Position:** top of a centered `max-w-xl` column, `mb-8`.
- Left: brand name, 13.5px/500/-0.15px tracking, `var(--ink)`.
- Right: `progressText` — `"5 MIN"` before the survey starts, `"{current+1} / {total}"` once inside it. 11px/500/uppercase/0.04em tracking, `var(--ink-soft)`.
- **Both wrapped in `.taker-chrome` → `opacity: 0.65`.** This is the one non-negotiable visual signature of the surface: chrome recedes, only the active question card sits at full contrast. No icon, no border, no background — just two text elements at reduced opacity.

Background of the whole page: `.taker-surface` (warm `#F7F6F3`), `min-height:100vh`.

### 1.2 State: `loading`

Fetches `GET /api/respondent/session?token=<token>` on mount (`useEffect`, runs once per `token`). While in flight: a plain white card (`Panel` helper component) — heading "Checking your link" + text "This takes a moment." No spinner, no skeleton — this call is typically sub-200ms so a skeleton would flash more than it'd help.

**Backend:** `src/app/api/respondent/session/route.ts`. Requires no auth — the token itself is the credential. Two paths depending on whether `DATABASE_URL_APP` (the restricted role) is configured:
- Restricted-role path: hashes the token (`hashServerToken`), does a **cross-tenant** lookup on the privileged pool (`IdentityRepository.findIssuedTokenForRespondentSession`) purely to discover which `tenant_id` this token belongs to — this is the one place in the whole app that legitimately needs to look across tenants before RLS can apply, since the respondent doesn't know their own tenant. Everything after that runs inside `withTenantContext` for that specific tenant.
- Then `getRespondentSurveySession()` (`src/lib/server/respondentSessionService.ts`) joins `identity.survey_participants` → `responses.survey_cycles` → `responses.template_questions` to return the question list *for this specific token's cycle*, in position order, with `id/position/text/type/construct/optional` per question.
- 404 (`"This survey link is not active."`) if the token doesn't resolve to an issued, unspent participant row.

### 1.3 State: `invalid`

Same `Panel` layout as loading. Heading "This link is not active", body = the server's error message (falls back to a generic line if none). Reached from: session-fetch 404/error, or a submission failure later in the flow (see §1.6). Dead end — no retry button, no link back anywhere (a respondent has nowhere else to go; this is intentional, not an oversight).

### 1.4 State: `intro` — the confidentiality screen

**This is the Wise-style three-row pattern**, applied to trust instead of fees. Full-width white card (`rounded-[var(--radius-shell)]`, `border`, `p-7`, no shadow).

Top to bottom:
1. **Badge**, `mb-5`: green `ShieldCheck` icon (15px) + text, 13.5px/500, `var(--ink-mid)`. Exact copy (approved product voice, do not reword): **"Confidential — not even we can trace this to you"**.
2. **Heading**, 24px/500/-0.35px/1.3 line-height: "How your answers stay confidential".
3. **Three rows**, `mt-6`, `space-y-2`, each a bordered card (`ConfidentialityRow` helper) — icon in an 8px-radius colored square (32px), bold 14px heading, 13.5px description below it:
   - 🟢 Green — **"Grouped results only"** — "Your employer sees aggregate scores once enough people respond -- never your name next to an answer."
   - 🟢 Green — **"Confirms you're eligible, once"** — "This link checks you're an active employee and prevents duplicate responses. That's all it's for."
   - 🔴 Red (`EyeOff` icon) — **"Who said what"** — "Your answers are stored completely separately from your identity. There's no join between the two -- not even we can trace this back to you."
4. **"Start survey" button**, `mt-7`, full-width, `.btn-primary` (black, white text) — advances local `step` state to `"survey"`. No API call; this is a pure client-side transition.

### 1.5 State: `survey` — one question per screen

Card re-keys on `question.id` (`key={question.id}` on the wrapping div) so React fully remounts the card on every question change — this is what re-triggers the CSS entry animation (`.taker-question-enter`, `opacity 0→1` + `translateY(8px→0)`, `0.4s cubic-bezier(.2,.8,.3,1)`) every single time, not just once.

**Layout, top to bottom inside the card:**
1. **Progress bar** — 2px height, `var(--border)` track, `var(--ink)` fill, width = `(current+1)/total * 100%`, `transition: width 0.6s cubic-bezier(.4,0,.2,1)`. The *only* other animation on this surface besides the question-entry one.
2. **Question meta** (construct label, e.g. "ROLE CLARITY", or template name as fallback) — 11px/500/uppercase/0.04em, `var(--ink-soft)`.
3. **Question text** — 24px/500/-0.35px/1.3.
4. **Hint line**, fixed exact copy on *every* question regardless of type: **"No wrong answers — honest is the only answer that helps."** — 13.5px, `var(--ink-mid)`.
5. **Answer input** — branches on `question.type`:

   **`likert_5`** (values 1–5) or **`enps_0_10`** (values 0–10) — a vertical stack of option rows (`.taker-option` class):
   - Each option: white bg, 1px border, 8px radius, `12px 14px` padding, flex row.
   - **Key badge** (22px square, 4px radius) shown only when the scale has ≤5 options — i.e. `likert_5` gets `A B C D E` badges, `enps_0_10` (11 options) gets **no letter badges at all**, since there's no natural 5-letter mapping onto 11 values. This is a deliberate, documented adaptation (code comment in the page file), not an oversight.
   - Label text: the numeric value + a word anchor at the extremes only (e.g. "1 Strongly disagree" / "5 Strongly agree" / "2", "3", "4" plain; eNPS shows "Not at all likely" / "Extremely likely" at 0 and 10).
   - **Hover** (mouse only): border → `#B8B5AD`, `translateX(2px)` — the one lateral-slide micro-interaction on this surface.
   - **Click behavior is two-step, not instant-advance:**
     - First click on an unselected option → sets `selectedValue` in local state only. That option's row flips to **selected style**: `var(--ink)` background, white text, and — if it has a key badge — the badge itself flips to a white square with dark text. A **"Continue (or press Enter)"** button appears below the option list.
     - Second click on the *same* (already-selected) option, or a click on the Continue button, or pressing **Enter** → calls `commitSelection(value)`, which resets `selectedValue` to `null` and calls `recordAnswer()`.
   - **Keyboard support** (a `window`-level `keydown` listener, active only while `step === "survey"` and the current question isn't open-text): letter keys `A`–`E` map by index onto the current question's scale values (`SELECT_KEYS.indexOf(key.toUpperCase())`) — only wired up when the scale has ≤5 options. **Enter** commits whichever value is currently selected, regardless of question type. Verified live end-to-end during this build: letter-select and Enter-to-advance both confirmed working through a real 8-question submission.

   **`open_text`** — a `min-h-36` textarea (warm bg, border, 8px radius) + a **"Continue"** button (`.btn-primary`, disabled implicitly by the guard below) +, only if `question.optional` is true, a plain-text **"Skip"** link underneath. Continue is blocked client-side if the field is empty *and* the question isn't optional (`if (!textValue.trim() && !question.optional) return;`).

6. **Back button**, `mt-5`, plain text + `ArrowLeft` icon, 13px/500, `var(--ink-mid)`. Disabled (30% opacity) on the first question. Pops the last answer off local `answers[]` state (`answers.slice(0, -1)`) and resets `selectedValue` to null — no API call, pure client-side navigation backward through already-answered questions.

**Backend, per answer:** `recordAnswer()` pushes to local `answers[]`. If that's not yet the last question, nothing hits the network — the whole survey is answered client-side first. Only on the **final** question's answer does it call `POST /api/respondent/submit` with `{ token, answers: [...] }` (only entries that actually have a `numberValue` or non-empty `textValue` are sent). On success → `step = "done"`. On failure → `step = "invalid"`, error shown from the server's message.

### 1.6 State: `done`

White card, centered text, `p-8`.
1. **Icon** — 56px circle, `var(--green-bg)` background, `var(--green)` checkmark (26px, stroke-width 2). The *only* green element on this entire surface besides the intro screen's two safe rows — deliberately restrained, "no celebration, no confetti."
2. **Heading**, 24px/500/-0.35px: exact copy **"That's everything — thank you."**
3. One line, 13.5px, `var(--ink-mid)`: "Your participation was marked complete separately from your response content."
4. **Reminder box**, `mt-6`, bordered white card, left-aligned, 13.5px: "Your employer will only ever see grouped scores once enough people respond. Nobody -- including us -- can trace this response back to you." — restating the confidentiality claim one more time, post-submission.
5. **"Download a copy of your answers"** button, `.btn-secondary`, `Download` icon — client-side only, builds a `.txt` blob from local `answers[]` + the question list (`brand.name — your survey answers\n\n1. <question>\n   Your answer: <value>...`) and triggers a browser download. No network call, no server involvement — this is the respondent's own copy, generated from data already in their browser.

**Backend recap for the whole flow:** exactly two network calls total per respondent, ever — one `GET` to load the session, one `POST` to submit all answers at once at the very end. Nothing is written to the database until that final submit.

---

## 2. SEGMENT: CLIENT ADMIN (HR) — `/app/*`

Three nav zones (**Surveys / People / Workspace**), survey-as-object model: instead of separate top-level "Templates / Invites / Reports" destinations, each survey you open has its own three internal stages (**Build → Send → Results**).

### 2.1 Shell (present on every `/app/*` screen via `AppShell` — `src/components/AppShell.tsx`)

**Desktop (`lg:` and up) — two-column flex layout, no outer padding/gap/rounded-shell (that's the *old* floating-glass look; the current one is flush, Stripe/Linear-style):**

**Left: sidebar**, `sticky top-0`, fixed **200px** width, full viewport height, white bg, 1px right border.
- Top (`px-4 pt-4 pb-3`): BrandMark (logo, 40px default but rendered smaller here) + workspace name, 14px/600, truncates on overflow.
- Nav (`flex-1 overflow-y-auto`), three groups, each preceded by an 11px/600/uppercase/`var(--ink-faint)` label:
  - **SURVEYS** — one item: "All surveys" → `/app`.
  - **PEOPLE** — one item: "Employee list" → `/app/people`. *Entire group hidden if `canAccessPeople(role)` is false.*
  - **WORKSPACE** — collapsible (chevron toggles open/closed, remembers state per-group in local `openGroups` state; auto-opens if the current path matches one of its children). Four items: Settings, Go-live, Security, Billing, all under `/app/workspace/*`. *Entire group hidden if `canAccessWorkspace(role)` is false.*
  - Nav item styling: 13px, 6px radius, `7px 10px` padding, 15px icon (stroke 1.8). Active = `var(--bg-active)` background + 500 weight. Hover (inactive) = `var(--bg-hover)` background.
- Footer, `mt-auto` (pinned to bottom), 1px top border: workspace/tenant name (13px/500) + role label below it via `RoleTag` (11.5px, `var(--ink-faint)`, or red if actively impersonating as Owner).

**Right: everything else**, flex column:
- **Topbar**, `sticky top-0`, white, 1px bottom border, `11px` vertical / `24px` horizontal padding. Left: quiet confidentiality line — `Lock` icon (13px) + **"Confidential — you see numbers, never names"**, 12px/500, `var(--ink-mid)` — hidden below `sm:` breakpoint to save space on phones. Right: "First-run guide" text link (→ `/app/pilot`, hidden below `sm:`), a **26px circular avatar** (black bg, white text, first letter of workspace name, 10px/600 — purely decorative, not a menu trigger), and the Sign Out button.
- **Content area**, `flex-1 overflow-y-auto`, `px-6 py-7` (`px-4` on mobile), max-width `5xl`, centered. Every page's own `<h1>` (`.page-title`, 22px/600) + subtitle (`.secondary-text`) render here — **not** in the topbar; the topbar stays uniform across every screen.
- `ImpersonationBanner` renders here too, directly under the title, only when `info.isImpersonating` is true — red card (border/bg/text all `--red-*` tokens), "Viewing **{tenant}** as SaferSay Owner" + a "Return to console" button that `POST`s an empty body to `/api/super-admin/switch` (clears the impersonation cookie) and redirects to `/app` (which immediately bounces back to `/console` per the Pure-Owner redirect above, now that impersonation is cleared).

**Mobile (below `lg:`):** sidebar is **not** simply hidden — that was a real bug caught during this build (sidebar had `max-lg:hidden` with zero replacement, silently vanishing with no way to navigate at all below 1024px). Fixed with a proper pattern: a `Menu` (hamburger) icon button appears top-left of the topbar; tapping it opens the *same* sidebar content as a fixed-position slide-in drawer (240px wide) over a `bg-black/30` backdrop, with an `X` close button and backdrop-click-to-close. Tapping any nav link inside the drawer also closes it (`onNavigate` callback). Same pattern replicated identically in `OwnerConsoleShell` and `ViewerShell`.

### 2.2 Zone: Surveys

#### 2.2.1 Surveys home — `/app` (`src/app/app/page.tsx`)

The landing screen for every non-Owner login. Two-stage client-side load:
1. `GET /api/tenants/current` — if the caller is a Pure Owner (super admin, not impersonating), `router.replace("/console")` immediately and render nothing else.
2. `GET /api/cycles` — lists every survey cycle for the tenant.

**Visible, top to bottom:**
1. `ConfidentialitySeal` (see §2.6) — "Sealed by design — You see the numbers, never the names. Neither can we." + "How it works →" link to `/app/workspace/security`.
2. **`FirstRunGuide`** (`src/components/FirstRunGuide.tsx`, new) — only rendered while `firstRunCompleted` (from `GET /api/tenants/current`, step 1's response) is false; a tenant that's already finished first-run never sees it again, not even briefly. See §2.7 for the component itself.
3. **"Create a new survey"** row: heading + one-line description left, **"+ New survey"** black pill button right → `/app/surveys/new`. This is the page's one primary action.
4. Survey list, three possible states:
   - **Loading** (`cycles === null`): two `SkeletonCard` placeholders.
   - **Empty** (`cycles.length === 0`): "No surveys yet. Create your first survey to get started."
   - **Populated**: split into "Live survey" (the one cycle with `status === "open"`, shown larger/first if present) and "Past surveys" (everything else). Each is a `SurveyCard` — a full-width clickable card (`.card.card-interactive`, hover = border-color only) showing the survey name, a `SurveyStatusBadge`, and "{n} responses · Created {date}". Clicking → `/app/{cycleId}` (the Build/detail stage).

**Backend:** `GET /api/cycles` (`src/app/api/cycles/route.ts`) → `ResponseRepository.listCyclesForTenant()` — one query joining `responses.survey_cycles` to a `LEFT JOIN` aggregate on `responses.submissions` grouped by `cycle_id`, so each row carries `id/name/status/minGroupSize/createdAt/responseCount` in a single round trip. No pagination — returns every cycle for the tenant.

**Coherence-directive change:** cycles created without an explicit name are stored as `"{tenantName} {templateName}"` (e.g. "Rajat Pandey's workspace Engagement Check") — the sidebar footer already shows workspace context, so that prefix was redundant noise on every card. `listCyclesForTenant()` (and `getCycleForTenant()` / `getLatestCycleForTenant()` / `getLatestProtectedReportForTenant()`) now take an optional `tenantName` and strip it as a display-only transform (`stripTenantPrefix()` in `responseRepository.ts`) — the stored name is untouched, and every caller (Surveys home, survey detail, Send, Results, the pilot guide) passes `session.tenant.name` through so the stripped name shows consistently everywhere, not just here.

#### 2.2.2 New survey (Build) — `/app/surveys/new` (`src/app/app/surveys/new/page.tsx`)

The **only** place template selection happens — there's no separate `/app/templates` route (the old standalone destination was retired; a `next.config.ts` redirect sends `/app/templates` here).

**Route guard (coherence-directive addition):** on mount, fetches `GET /api/employees?limit=1` and `router.replace("/app/people")`s if `total === 0` — creating a cycle with zero employees used to be reachable and fail server-side with a generic error; this catches it before the page is even useful, consistent with Gap 1's "load people first" step.

**Layout:** `PageGuide` banner ("Pick a template and create your survey" + "Back: people" link) → two-column grid:
- Left card: **template picker**, four options (`surveyTemplates` from `src/lib/templates.ts`) — Engagement Check (8Q/5min), eNPS Pulse (4Q/2min), Team Health (8Q/5min), Onboarding Check-In (7Q/4min). Each a clickable row showing name + duration; selected = black border + `var(--bg-active)` fill (neutral, no accent color per the design directive).
- Right card: live preview of the selected template's name, description, and question count.
- Below both: `CreateSurveyCycle` — the actual question editor + create button:
  - Header: "Create draft cycle" + a name input (placeholder e.g. "Engagement Check - July pulse") + **"Create"** button.
  - Question list: every template question shown with a checkbox (include/exclude), an inline-editable text field, and up/down reorder arrows. Unchecking or editing *any* question flags the cycle as customized.
  - **"Create"** is blocked client-side if zero questions remain checked.

**Backend on Create:** `POST /api/cycles/create` (`src/app/api/cycles/create/route.ts`) with `{ templateSlug, cycleName, questions? }` (questions only sent if the user customized the template). Server-side (`createTenantSurveyCycle()`, `src/lib/server/surveyCycleService.ts`):
1. Requires at least 1 active employee (`countActiveEmployees`) — throws otherwise ("Upload employees before creating a survey cycle.").
2. If customized: creates a **cycle-scoped copy** of the template (`createCycleScopedTemplate`) so editing one tenant's questions never mutates the shared base template other tenants use unmodified. If unmodified: `upsertTemplate` (stable-UUID-keyed, shared across tenants).
3. Inserts `responses.survey_cycles` row, `status='draft'`, `payment_status='free_preview'`, `min_group_size` = the tenant's current threshold.
4. **Immediately issues one token per active employee** (`identity.issueTokens`) and **prepares invite-outbox rows for every one of them** (`createInviteOutboxForIssuedTokens`) — there is no "select which employees get this survey" step anywhere in the product; creating a cycle targets the entire active roster at that moment.
5. Logs an audit event (`logSurveyCreated`, `identity.audit_logs`) — actor role/id, action `survey_created`, target the new cycle, safe detail = template name only (no respondent data).
6. Response: `{ cycle: { cycleId, employees, tokensIssued, invitesPrepared } }`.

On success, a toast fires ("Survey created. N secure invite links prepared.") and the browser is redirected straight to `/app/{cycleId}/send` — Build → Send is a hard navigation, not a tab click, matching "template first, then light editing, then launch."

#### 2.2.3 Survey detail — `/app/[surveyId]` (Build tab, read-only) (`src/app/app/[surveyId]/page.tsx`)

Reached by clicking any survey card on the home screen (an *existing* cycle, as opposed to `/app/surveys/new` which is for creating one). Component is keyed by `surveyId` (`<SurveyBuildContent key={surveyId} .../>`) so navigating between two different surveys fully remounts rather than trying to patch state in place.

**`SurveyStageTabs`** (shared component, `src/components/SurveyStageTabs.tsx`, reused verbatim on all three per-survey pages): "Stage 1 of 3" meta label + the survey's `SurveyStatusBadge` + a plain-text (non-clickable) `Build / Send / Results` breadcrumb with the current stage bolded.

**Body:**
- "Template" card: template name (or "Custom"), question count, minimum group size, and an explanatory note — **"Questions are locked once a survey is created, so results stay comparable across the run. Start a new survey to change them."** This is a deliberate, honest constraint: there is no backend endpoint to edit a cycle's questions after creation, so this screen shows them **read-only** rather than pretending an editor exists.
- "Questions" card: every question listed with its construct label and text, in position order.
- Nav: "Back to surveys" (`/app`) and "Next: Send survey" (`/app/{surveyId}/send`).

**Backend:** `GET /api/cycles/[id]` (`src/app/api/cycles/[id]/route.ts`) → merges three things in one response: `ResponseRepository.getCycleForTenant()` (the cycle row itself), `ResponseRepository.getRespondentSurveySession()` (template name + question list — the *same* function the taker's session endpoint uses, reused here for the admin's read-only view), and `IdentityRepository.getInviteOutbox()` (returned but not currently rendered on this particular tab — see §2.2.4 for where it *is* used). 404 with a "This survey doesn't exist or you don't have access to it" panel if the cycle isn't found for this tenant.

#### 2.2.4 Send — `/app/[surveyId]/send` (`src/app/app/[surveyId]/send/page.tsx`)

Same stage-tabs header (stage 2 of 3). Body is entirely the `InviteOutboxPanel` component (`src/components/InviteOutboxPanel.tsx`), passed `cycleId={surveyId}` — the same component the old standalone `/app/integrations` route used to render, now scoped to one specific survey instead of silently acting on "whichever cycle is most recent."

**Panel layout (coherence-directive restructure):** header ("Send" label, "Invite outbox" title, one-line description), then **Tier 1** — a single smart-action row — then a collapsed **Tier 2** `<details>` ("Developer / test mode") holding the original seven buttons unchanged, for anyone who needs manual control.

**Tier 1 — smart action** (`SendAction`, inline in `InviteOutboxPanel.tsx`): on mount, fetches `GET /api/cycles/[cycleId]` for `cycle.status`, `outbox.sentInvites`, and the new `participation: {issued, spent}` field, then renders exactly one of:

| Condition | Rendered |
|---|---|
| `cycle.status === 'closed'` | plain text "Survey closed — no further sending" |
| `participation.issued === 0` | plain text "No participants yet — upload employees to issue survey tokens." |
| `participation.issued === participation.spent` | plain text (green) "Everyone has responded" |
| `sentInvites === 0` | button: "Send invites to N people" (N = issued − spent) |
| otherwise | button: "Remind N people who haven't responded" |

Clicking the button calls the single new `POST /api/invites/send {cycleId, deliveryType}` endpoint (see below), then re-fetches state so the button/text updates in place — no page reload needed.

**Tier 2 — "Developer / test mode"** (collapsed `<details>`), same seven action buttons as before, each an independent `fetch` call:
| Button | Style | Calls |
|---|---|---|
| Refresh | secondary, 6px radius | `GET /api/invites/outbox?cycleId=` |
| Prepare invites | primary, 6px | `POST /api/invites/outbox {cycleId}` |
| Prepare reminders | secondary, 6px | `POST /api/invites/outbox {cycleId, includeReminders:true}` |
| Queue invites | primary, **pill** | `POST /api/invites/queue {cycleId, deliveryType:'invite'}` |
| Send test invites | primary, **pill** | `POST /api/invites/queue {cycleId, deliveryType:'invite', sendNow:true}` |
| Queue reminders | secondary, **pill** | `POST /api/invites/queue {cycleId, deliveryType:'reminder'}` |
| Send test reminders | secondary, **pill** | `POST /api/invites/queue {cycleId, deliveryType:'reminder', sendNow:true}` |

(Pill radius reserved for "send/nudge" actions per the design directive; Refresh/Prepare stay rectangular.) While a call is in flight: `InlineSpinnerRow`. On completion: a toast, and Tier 1's state is re-fetched too so the two tiers never show stale-relative-to-each-other numbers.

**Live summary** (inside Tier 2), 3-column grid of six `Metric` tiles: Pending/Queued/Sent invites, Pending/Queued/Sent reminders. **Row table** (inside Tier 2, up to 12 rows), per invited employee: name/email, a "Copy link" button (copies `{origin}{respondentPath}` to clipboard, shows a checkmark for 2s) and an "Open" link (`target="_blank"` to the actual `/s/[token]` URL) — this is how an HR admin can grab a real respondent link during testing. Delivery type, delivery status, and token status shown as plain text columns.

**Backend, in depth:**
- `POST /api/invites/send` (`src/app/api/invites/send/route.ts`, new) — the Tier 1 button's endpoint. Does prepare → queue → send-now in one call on one tenant-scoped connection (prepare/queue loops run sequentially, never `Promise.all`'d — see the `GET /api/cycles/[id]` note below for why), reusing the exact same `IdentityRepository` methods Tier 2's buttons call individually. Returns the same outbox summary/rows shape as the other two routes, plus `participation: {issued, spent}` so the client can re-render Tier 1 from one response. Logs `logInvitesSent`/`logRemindersSent` on `sent > 0`, same aggregate-count-only rule as below.
- `GET /api/cycles/[id]` (`src/app/api/cycles/[id]/route.ts`) — extended with `participation: {issued, spent}` (`IdentityRepository.getParticipationSummary()`, counting `identity.survey_participants` rows only — never `responses.*`). Its three sub-queries (survey session, outbox, participation) now run as sequential `await`s, not `Promise.all` — `withTenantScopedDb` hands routes a single checked-out client when `DATABASE_URL_APP` is configured, and concurrent queries on one `pg` connection corrupt the query stream (the exact crash class already fixed once in `/api/invites/queue`, see git history — this route had the same latent bug, now closed).
- `GET/POST /api/invites/outbox` (`src/app/api/invites/outbox/route.ts`) — both accept an optional `cycleId`; if omitted, falls back to `getLatestCycleIdForTenant()` (this fallback convention is why the *old* standalone `/app/integrations` route used to silently drift onto whichever survey was newest — the new per-survey Send page always passes `cycleId` explicitly, closing that gap). `prepareInviteOutbox`/`prepareReminderOutbox` insert `identity.invite_outbox` rows (one per active, not-yet-outboxed employee) in `pending` status.
- `POST /api/invites/queue` (`src/app/api/invites/queue/route.ts`) — `markOutboxQueued()` flips matching rows to `queued`. If `sendNow: true`: fetches the queued rows (`getQueuedOutboxDeliveries`), calls `sendQueuedInviteDeliveries()` (`src/lib/server/resendDelivery.ts`) which sends real emails via the Resend API (subject/body built in `buildInviteMessage`, includes the respondent's actual survey link), then marks each row `sent` or `failed` individually. **Requires `RESEND_API_KEY`**; in production mode, also refuses to send from the shared `resend.dev` sandbox sender — real domain required. On `sent > 0`, logs an audit event (`logInvitesSent` or `logRemindersSent` depending on delivery type) with an **aggregate count only** — no per-recipient email ever touches the audit log, by design (see §0.3-adjacent "hard rule" in the audit log module's own doc comment: never log anything that could let someone infer who responded).

**Known limitation, not introduced by this change:** if a send attempt fails (e.g. the Resend sandbox sender's "verified recipients only" restriction — confirmed live during this build's verification pass, 5/5 test sends failed with that exact error against a non-owner recipient), the failed `invite_outbox` rows stay in `failed` status. Because `prepareInviteOutbox`'s insert is `on conflict (participant_id, delivery_type) do nothing` and `markOutboxQueued` only picks up rows still in `pending`, clicking the Tier 1 button again does not retry them — this is inherited unchanged from the pre-existing prepare/queue state machine, not something Gap 2 introduced or was scoped to fix. A stuck failed send currently needs Tier 2's manual buttons (or a fixed Resend sender) to recover.

#### 2.2.5 Results — `/app/[surveyId]/results` (`src/app/app/[surveyId]/results/page.tsx`)

Stage 3 of 3. Subtitle on this page is the exact approved copy: **"Sealed — scores only, sources never"**.

**Layout, top to bottom:**
1. Stage tabs.
2. `ProtectedReportPanel` (`src/components/ProtectedReportPanel.tsx`), `cycleId` passed in — the same component also used (in `mode="viewer"`, swapping `.card` for `ViewerCard` styling) by `/viewer` for the manager-scoped read-only portal. Contents:
   - `ConfidentialitySeal` again (appears on every report screen per the design directive, not just Surveys home).
   - Three stat cards: Responses (`n`), Minimum group size, Report state ("Protected" in a plain card, or "Unlocked" in a solid black card with white text — the one place on this whole surface a card gets an inverted black background, deliberately used to make "results have actually unlocked" visually unmissable).
   - Below that: **if `n < minGroupSize`** → "Results hidden" message with an `EyeOff` icon, no chart at all. **If unlocked** → one horizontal bar per question: label + numeric average (2 decimal places) above a 3px track, fill color **black by default, red if the score falls under an adapted attention threshold**. (Documented adaptation: the design directive's literal cutoff of <6.5 assumes a 0–10 scale; this panel already normalizes every bar's width against a /5 scale to handle the product's mix of 1–5 Likert and 0–10 eNPS questions with no per-row scale metadata in the API response, so the cutoff is scaled proportionally, 6.5/10 → 3.25/5, rather than applied as a raw number that would misclassify every Likert question as "attention." Called out explicitly in the code comment.) **No green bars anywhere in reports** — black/red only, per spec.
   - Refresh / Export CSV / Share score buttons (CSV export and "share score" clipboard-copy are both pure client-side, generated from the already-fetched report data — no extra network call).
   - **"Commit to one change"** card, shown only once results are unlocked: a text input + "Commit" button that posts a short freeform note the team is committing to act on, plus a list of previously committed notes (author + relative timestamp). This is the "close the loop" feature — turning a number into an action, not just a dashboard.
3. **"Manage survey"** card, two buttons:
   - **"Send reminders to non-respondents"** (secondary) — calls `POST /api/invites/send {cycleId, deliveryType:'reminder'}` (the same Tier 1 endpoint the Send page's smart button uses), one request instead of the two sequential round trips this used to make. Disabled once the survey is closed.
   - **"Close survey & lock responses"** (**red, `.btn-destructive`** — the design directive's one explicit destructive-action color usage) — guarded by a native `window.confirm()` before it does anything ("No one will be able to submit after this."). Disabled once already closed; label switches to "Survey closed" in that state.
4. "Back to surveys" link.

**Backend:**
- `GET /api/report?cycleId=` (`src/app/api/report/route.ts`, extended during this build to accept an optional `cycleId` — same optional-param convention as the invites endpoints; omitted, it falls back to the tenant's latest cycle) → `ResponseRepository.getProtectedReportForTenant()`, which counts submissions for the cycle and only calls `report_question_scores()` (per-question breakdown) once that count clears the threshold.
- `GET/POST /api/report/action?cycleId=` — list/add "commit to one change" notes (`identity.cycle_actions`). The `POST` handler independently re-checks that the report is actually unlocked server-side before allowing a commitment to be written — you can't commit to acting on a score you're not allowed to see yet.
- `POST /api/cycles/[id]/close` (`src/app/api/cycles/[id]/close/route.ts`) → `ResponseRepository.closeCycle()` (`UPDATE ... SET status='closed' WHERE status <> 'closed'`, idempotent) → on success, `logSurveyClosed()` audit event.
- Reminders: identical `POST /api/invites/outbox {includeReminders:true}` → `POST /api/invites/queue {deliveryType:'reminder', sendNow:true}` sequence as the Send page.

### 2.3 Zone: People — `/app/people` (`src/app/app/people/page.tsx`)

Gated by `canAccessPeople` at the layout level (§0.2). Two stacked components:

**`EmployeeCsvImport`** (`src/components/EmployeeCsvImport.tsx`):
- Header: "CSV import" label, "Load employees" title, "Use columns: email, name, team, location."
- "Use sample CSV" button (loads a hardcoded 5-row demo CSV) and a "Choose CSV" file-upload label (accepts `.csv`/`text/csv`).
- Once a file is loaded: a live preview table (first 6 valid rows) + a stat card showing valid-employee count, any parse errors (red text, up to 4 shown), and an "Import" button (disabled until at least one valid row exists and zero errors remain).

**CSV validation rules** (`src/lib/csvEmployees.ts`, all client-side before anything hits the network): required column `email`; optional `name`/`team`/`location`/`manager_email`; header normalization (lowercase, spaces→underscores); rejects unknown columns, duplicate columns, duplicate emails within the file, and malformed email addresses — every failure becomes a specific "Row N: ..." message, not a generic "invalid file."

**Backend on Import:** `POST /api/employees/import` (`src/app/api/employees/import/route.ts`) — re-parses the CSV server-side (never trusts the client's own validation), `IdentityRepository.importEmployees()` (upsert into `identity.employees`), emits an onboarding event, and — new this build — logs an audit event (`logEmployeeImport`) with **only the row count**, never the imported emails themselves.

**`EmployeeDirectory`** (`src/components/EmployeeDirectory.tsx`), below the import panel:
- Header: "Employee directory", total/active counts, a debounced (250ms) search box (name/email/team).
- Inline "add one person" row: email + optional-name inputs + "Add person" button — for the one-off case that doesn't warrant a CSV.
- The list itself (max-height scrollable, up to 50 shown per `GET /api/employees?search=&limit=50`): each row shows name/email/team/location, a status pill (**green** for `active` — "active" is explicitly one of the design directive's named positive states — neutral gray for `inactive`), and a "Deactivate"/"Reactivate" toggle button.

**Backend:** `GET /api/employees` (search/limit/offset) → `IdentityRepository.listEmployees()`. `POST /api/employees` (add one). `POST /api/employees/[id]/status` (`{status:"active"|"inactive"}`) → `IdentityRepository.setEmployeeStatus()`. None of these three currently emit audit events (only the *bulk* import path does).

### 2.4 Zone: Workspace — `/app/workspace/*` (owner-gated, `canAccessWorkspace`)

Four screens, all sharing the same `AppShell` chrome, collapsible under "WORKSPACE" in the sidebar. (A fifth, Go-live Readiness, used to live here — see the note in §2.4.2 for why it moved to the Owner Console.) Every route under `/app/workspace/*` is also guarded server-side by `src/app/app/workspace/layout.tsx` (redirects to `/app` if `!canAccessWorkspace(session.role)`) — not just hidden from nav, actually unreachable by URL for `survey_creator`/`auditor`.

#### 2.4.1 Settings — `/app/workspace/settings` (`src/app/app/workspace/settings/page.tsx`)

Subtitle exact copy: **"Settings configure the wall, never breach it"**. Body is `TenantSettingsPanel` (`src/components/TenantSettingsPanel.tsx`), four stacked cards:

1. **Confidentiality threshold** — a `<input type=range>` slider, **min 3, max 10**, live value shown next to it (`.data-number`). Explanatory copy: "...can never go below 3 — that's the point at which 'confidential' stops meaning anything." Every drag emits `PATCH /api/tenants/settings {minGroupSize}` on change (no separate save button — the slider *is* the save action), server-clamps to [3,10] regardless of what's sent (`IdentityRepository.setMinGroupSize`), success toast: "Minimum group size set to N."
2. **Plan & features** — current plan tier (read-only text) + a checklist of feature flags (custom question editing, manager hierarchy import, custom workspace branding) each shown as "Included"/"Not included" (green text for included) — **not editable from here**; explicit copy says so ("set by your account"). Only the Owner Console's Tenant Detail screen (§3) can actually change these.
3. **Branding** — one line + an "Open Brand" link to `/app/brand`.
4. **Data export & deletion** — "Export employee list (CSV)" button (client-side generated from a fresh `GET /api/employees?limit=10000` call, no server-side export endpoint) and a `mailto:privacy@safersay.com?subject=Account%20deletion%20request` link (not an in-app deletion flow — deliberately routes to a human).

**Backend:** `GET/PATCH /api/tenants/settings` (`src/app/api/tenants/settings/route.ts`) → `IdentityRepository.getTenantSelfSettings()` / `setMinGroupSize()`.

#### 2.4.2 Security — `/app/workspace/security` (`src/app/app/workspace/security/page.tsx`)

Static content page (no API calls beyond what `AppShell`/`ConfidentialitySeal` already need). `ConfidentialitySeal` at top, then a 2-column grid of six plain-English control cards (Identity store / Response store / Minimum group size / Reminder isolation / Payment isolation / No emotion inference — each a one-line plain-English claim about the architecture), then a "Production safety status" card linking to `/privacy` and `/dpa`.

**Coherence-directive change:** this card used to also link to a "Check go-live readiness" screen at `/app/workspace/go-live`. That screen is a technical/operator checklist (Supabase config, token secrets, Stripe/Resend readiness) — the wrong audience for an HR admin, so it was removed from here and the whole screen relocated to the Owner Console (see §3.9). The old URL now redirects to `/console/readiness` (owner-gated; a tenant admin hitting it by stale bookmark bounces to `/app`).

#### 2.4.3 Team — `/app/workspace/team` (`src/app/app/workspace/team/page.tsx`, coherence-directive Gap 4)

Body is `TeamPanel` (`src/components/TeamPanel.tsx`): an invite row (email + role `<select>` + "Invite" button) above a list of everyone on the team, active and pending mixed together, newest-invited last.

**Role picker labels** (deliberately different from the `identity.users.role` DB values): "HR Admin" (`customer_admin`), "Survey Creator" (`survey_creator`), "Viewer" (`auditor`) — **confirmed decision: "Viewer" is a UI label for the existing `auditor` role, not a new role.** `RoleTag.tsx` (§2.1) was updated to match — it used to say "Auditor," now says "Viewer" everywhere, so a person invited as "Viewer" sees their own role tag say the same word back to them.

**List rows:** name/email, an "Invited" (gray) or "Active" (green) pill, the role label, and a "Remove" button — hidden on the signed-in user's own row (`member.id === selfId`, from `GET /api/tenants/team`'s response) so nobody can remove themselves and lock themselves out. Removing asks `window.confirm()` first, phrased differently for a pending invite ("Remove the invite for X?") vs. an active member ("Remove X?").

**Backend — the actual invite mechanism:** a new `identity.pending_invites` table (migration `0017_team_invites.sql`, tenant-isolated, `unique(tenant_id, email)`) rather than touching `identity.users` directly, because the invited person has no auth identity yet. `resolveUserRecord()` (`src/lib/server/authSession.ts`) gained a new branch, checked between "existing user by email" and "brand-new tenant, sign up as customer_admin": if a not-yet-accepted `pending_invites` row matches the signing-in email, a real `identity.users` row is created with **that invite's tenant and role** (not a new tenant), `accepted_at` is stamped, and the person lands directly in their inviter's workspace on first login — no separate "accept invite" screen or token link needed, since the invite email itself *is* the credential (matches whatever auth the person signs in with).

- `POST /api/tenants/team/invite {email, role}` (`src/app/api/tenants/team/invite/route.ts`) — `canManageTeam(role)` (`src/lib/permissions.ts`, `customer_admin`-only) gated, 403 otherwise. Rejects if `findUserByEmail(email)` already resolves to a real account (any tenant) — "That email already belongs to a SaferSay account." Upserts on `(tenant_id, email)` conflict (re-inviting the same email just updates the pending role), returns the refreshed team list.
- `GET /api/tenants/team` — `IdentityRepository.listTeam()`, `customer_admin`-only, returns active `identity.users` rows and not-yet-accepted `pending_invites` rows as one merged list, plus `selfId` for the "hide my own Remove button" check.
- `POST /api/tenants/team/[id]/remove` — `id` may be either a pending invite id or a real user id; tries the invite delete first (cheap, no destructive side effect), falls back to deleting the user row (nothing else in the schema has a foreign key to `identity.users`, so this is a safe hard delete). Blocks self-removal and blocks removing the tenant's last active `customer_admin` ("A workspace needs at least one HR Admin...").

**Verified end-to-end in the browser this build:** invited a second account as Viewer, signed in as that email, confirmed it landed in the *same* tenant (not a new one) with `auditor`'s nav restrictions already in effect (no People or Workspace zones visible) — all pre-existing role-gating, now reachable through a real invite for the first time.

#### 2.4.4 Billing — `/app/workspace/billing` (`src/app/app/workspace/billing/page.tsx`)

Two static pricing cards (£200/survey flat, £15/month optional history floor) + a **"Cancel plan"** button styled `.btn-destructive` (red) — guarded by `window.confirm()`, then shows an info toast pointing to `support@safersay.com`, since there's no actual cancellation backend wired up yet (honest placeholder, not a fake success state).

### 2.5 Other `/app` screens

- **`/app/brand`** (`src/app/app/brand/page.tsx`) — Brand Studio, scoped down during the design-directive build to **identity fields only**: workspace name, tagline, logo upload (client-side `FileReader` → data URL, `localStorage`-persisted via `BrandProvider`). The color/font override capability that used to exist here (four presets: Violet/Slate/Coral/Graphite, each swapping `--brand-accent`/`--brand-bg`/etc.) was **removed** — it directly conflicted with the locked black/white/gray admin palette. A "Reset to SaferSay" button restores defaults. **Note: this is entirely `localStorage`-backed, per-browser, not synced to any server** — it doesn't represent real multi-user tenant branding, just a local preview/demo mechanism.
- **`/app/pilot`** (`src/app/app/pilot/page.tsx`) — `PilotGuide` component: an 8-step onboarding checklist (upload employees → create cycle → issue tokens → prepare outbox → queue → collect responses → unlock report), each step showing done/not-done (green check vs. gray circle) and a "next click" call-to-action card highlighting whichever step isn't done yet. Backend: `GET /api/pilot/state` → `getPilotState()` (`src/lib/server/pilotStateService.ts`), which derives step-completion straight from real counts (employee count, participant count, outbox summary, report `n`/`protected`) rather than tracking its own separate "onboarding progress" state — nothing to get out of sync.
- **`src/app/app/error.tsx`** — segment-scoped error boundary (Next.js `error.tsx` convention): red-tinted alert icon, "This page hit a snag," Try again / Surveys home buttons. Catches render/data errors anywhere under `/app/*` without falling back to the generic root boundary.

### 2.6 Shared component used everywhere: `ConfidentialitySeal`

Appears on Surveys home and above every Results/report screen — **nowhere else**, per the design directive ("the single distinctive element in the admin... appears here, nowhere else"). `.seal-strip` class: soft off-white background (`--bg-faint`), 1px border, `ShieldCheck` icon in a white tile, the exact approved copy, and a "How it works →" link to `/app/workspace/security`.

### 2.7 `FirstRunGuide` (`src/components/FirstRunGuide.tsx`, coherence-directive Gap 1)

Rendered atop Surveys home only while `firstRunCompleted` is false (§2.2.1). Deliberately **one step at a time**, not a checklist like `PilotGuide` (§2.5) — three steps, not eight:

| Step | Done when | Action |
|---|---|---|
| 1. "Load the people who should receive surveys" | `identity.employees > 0` | "Upload employees" → `/app/people` |
| 2. "Create your first survey" | a cycle exists | "Create survey" → `/app/surveys/new` |
| 3. "Send it" | `identity.sentInvites > 0` | "Send invites" → `/app/{cycleId}/send` |

Fetches `GET /api/pilot/state` on mount (reusing `getPilotState()`'s existing counts rather than adding new queries) and derives the current step client-side from `done.findIndex((isDone) => !isDone)`. When all three are done, renders plain text "You're set up — your first survey is live." instead of a step card — this is a **client-derived** completion state, separate from the server-side `first_run_completed_at` flag; it can flash briefly on the same page load right after step 3 finishes, before the *next* full page load picks up the persisted flag and Surveys home stops rendering `FirstRunGuide` at all.

**Completion is persisted server-side**, not derived from `/api/pilot/state` on every load: `IdentityRepository.markFirstRunCompleted()` (`identity.tenant_settings.first_run_completed_at`, migration `0016_first_run_tracking.sql`) is called from inside `POST /api/invites/send` and `POST /api/invites/queue`'s `sendNow` branch, gated on `deliveryType === "invite" && delivery.sent > 0`. The upsert is `coalesce`-guarded so a second invite send later in the tenant's life never bumps the timestamp forward. `GET /api/tenants/current` exposes it as `firstRunCompleted`.

---

## 3. SEGMENT: PLATFORM OWNER — `/console/*`

Gated entirely by `session.isSuperAdmin` (`src/app/console/layout.tsx`) — a tenant admin hitting any `/console` URL by guessing gets redirected to `/app`, no exception.

### 3.1 Shell (`OwnerConsoleShell`, `src/components/OwnerConsoleShell.tsx`)

Structurally identical pattern to the Client Admin shell (200px sidebar / slim topbar / mobile drawer), separate implementation, same design tokens.

**Sidebar:** SaferSay's own logo (never a tenant's Brand-Studio logo — "this console is not white-labeled," per an explicit code comment) + "Console" label. Eight nav items: Overview, Tenants, Billing, Usage & Health, Plans & Features, Support & Alerts, Readiness, Settings. Footer: plain "Owner" text.

**Topbar:** an environment pill (**green** "Production" or neutral-gray "Development", derived from `process.env.NODE_ENV`) + a tenant search box (`Enter` submits, routes to `/console/tenants?q=<query>`) + Sign Out. No confidentiality badge here — that's an admin-surface concept specific to a tenant's own data, not meaningful at the platform level.

### 3.2 Overview — `/console` (`OverviewDashboard.tsx`)

1. Four stat tiles: Active tenants, Live surveys, Employees under management, "Inactive 30+ days" (with a hint that this is a placeholder until Stripe lands for real MRR/trial data).
2. Two-column: **"Needs attention"** card (up to 8 items, each a clickable row → that tenant's detail page) and **"Recent activity"** card (up to 10 platform-wide onboarding events with relative timestamps, e.g. "Acme Co uploaded employees · 2d ago").
3. **"Tenant growth (8 weeks)"** card: an inline hand-rolled SVG sparkline (no charting library) plotting cumulative tenant count week-over-week, black stroke; falls back to an `EmptyState` card if fewer than 2 data points exist.

**Backend:** one call, `GET /api/super-admin/overview` → `IdentityRepository.getPlatformOverview()` — a single method that runs five separate queries and assembles them: platform-wide summary counts, an 8-week growth series (`generate_series` + a per-week cumulative count subquery), and three distinct "attention" categories computed independently and merged into one list:
- `no_employees` — tenants with zero active employees.
- `stalled_draft` — cycles stuck in `draft` status for over 7 days.
- `delivery_failures` — tenants with any `failed`-status invite-outbox rows.

### 3.3 Tenants — `/console/tenants` (`TenantsDirectory.tsx`)

Table view: search box (name, client-side filtered against an already-fetched list) + a **"Create tenant"** button opening a modal (name input → `POST`, closes and reloads the list on success). Columns: Client name, Plan (neutral gray pill, no color differentiation between tiers — deliberately, since plan tier isn't a "status"), Employee count, Survey status ("{status} · {name}" or "No survey yet"), **Health**, Joined date, Last active date. Rows are clickable → `/console/tenants/[id]`.

**Health is computed entirely client-side** (`deriveHealth()`, not a server field) from data already on the row:
- `at_risk` (red) if zero employees, **or** no activity in 30+ days.
- `attention` (also rendered red — no third color exists in this palette, only the label text differs) if the latest cycle is still a draft, or no activity in 7+ days.
- `ok` (green) otherwise.

**Backend:** `GET/POST /api/super-admin/tenants` (`src/app/api/super-admin/tenants/route.ts`) → `listTenantsWithStats()` / `createTenant()`.

### 3.4 Tenant detail — `/console/tenants/[id]` (`TenantDetailPanel.tsx`)

"← All tenants" link, then name + slug + `PlanBadge` + an **"Enter workspace →"** button (`.btn-secondary`) that `POST`s `{tenantId}` to `/api/super-admin/switch` (sets the impersonation cookie) and pushes to `/app` — this is the only UI path into a tenant's actual workspace as the Owner; leaving again goes through the `ImpersonationBanner`'s "Return to console" button (§2.1). Then a 2×2 card grid:

1. **Metadata** — joined date, primary contact email (or "No owner user yet" — derived by finding the earliest-created `customer_admin` user for that tenant), data residency, employee count.
2. **Survey activity** — latest cycle's name/status/response-counts/completion-rate, or "No survey created yet." Explicit note: "Counts and rates only. No answers or reports are visible here" — the Owner literally cannot see survey content from this screen, only operational metadata, by architectural design (§0.1's "even the vendor can't read this" rule extends to the Owner Console itself).
3. **Plan & features** — three plan-tier buttons (Standard/Growth/Enterprise, selected = black fill) that `PATCH` immediately on click, plus three feature checkboxes (custom questions / manager hierarchy import / custom workspace branding) that also `PATCH` immediately on toggle. A confidentiality-threshold slider identical to the tenant-side one (min 3, max 10) — **this is the same underlying `min_group_size` value the tenant's own Workspace/Settings page controls; either side can change it.**
4. **Billing** — placeholder card, "Stripe isn't connected yet."

Below the grid: **Support notes** — a freeform note input + list of prior notes (author, relative time) for this specific tenant. Explicit copy: "Operational notes only — never a path to this tenant's data."

**Backend:** `GET/PATCH /api/super-admin/tenants/[id]` (`src/app/api/super-admin/tenants/[id]/route.ts`) — a single `PATCH` handler accepts any combination of `planTier`/`features`/`minGroupSize`/`note` in one body and applies whichever fields are present.

### 3.5 Billing — `/console/billing` (`BillingPanel.tsx`)

Three stat tiles (MRR "—", Churn rate "—", Billable tenants = live tenant count) + an `EmptyState` card: "Stripe isn't connected yet." Entirely a placeholder screen today — no real billing data exists to show.

### 3.6 Usage & Health — `/console/usage` (`UsageHealthPanel.tsx`)

Four stat tiles (Surveys created / Responses submitted / Invites sent / Invites failed, all-time platform totals) + a "System health" card with two status-dot lines: database connectivity (green/red dot) and delivery-queue pending count (green if zero pending, red otherwise — again, no amber middle state).

**Backend:** `GET /api/super-admin/usage` → `IdentityRepository.getPlatformUsageHealth()`.

### 3.7 Plans & Features — `/console/plans` (`PlansFeaturesPanel.tsx`)

Static reference card per tier (Standard/Growth/Enterprise — name, description, bullet list of what's included) plus a live "N tenants" count per tier, computed client-side by fetching the tenant list and tallying `planTier`. Read-only summary — actually *assigning* a tenant's plan happens on the Tenant Detail screen, not here.

### 3.8 Support & Alerts — `/console/support` (`SupportAlertsPanel.tsx`)

Two cards: "System alerts" (same `attention` list as the Overview dashboard, fetched independently here) and "Support inbox" (every tenant's support notes, platform-wide, newest first — each row links to that tenant's detail page).

**Backend:** `GET /api/super-admin/overview` (reused for the alerts half) + `GET /api/super-admin/support-notes` → `IdentityRepository.listAllSupportNotes()`.

### 3.9 Readiness — `/console/readiness` (`ReadinessPanel.tsx`, `src/components/console/ReadinessPanel.tsx`)

The platform-wide go-live checklist — relocated here from the tenant-facing `/app/workspace/go-live` per the coherence directive (a technical/operator screen a real HR admin has no reason to see). Three stat tiles (current runtime mode / "N of 7 required checks configured" / "Ready" or "Blocked" — green text if ready, red if blocked), then a card per check:

| Check | What it verifies |
|---|---|
| Supabase Postgres | `DATABASE_URL` set |
| Supabase app client | `NEXT_PUBLIC_SUPABASE_URL` + publishable key set |
| Google + Microsoft sign-in | A **manual** env flag (`SUPABASE_OAUTH_PROVIDERS_CONFIRMED=true`) — cannot be auto-detected, since provider enablement lives entirely in the Supabase dashboard, outside this app's config |
| Token signing secret | `TOKEN_SECRET` set, not a placeholder value, ≥32 chars |
| Stripe | secret key + webhook secret both set |
| Resend | API key + a `FROM` address that is **not** the shared `resend.dev` sandbox sender |
| Privacy contact | `PRIVACY_CONTACT_EMAIL` set |

Each renders a **green** "Configured" or **red** "Placeholder" pill, using the Owner Console's own `ConsoleCard`/`StatTile` primitives rather than the tenant-side `Card`/`AppShell`. Same underlying `runtimeChecks()` function (`src/lib/runtimeConfig.ts`) that `GET /api/readiness` exposes publicly (that endpoint has no auth check — worth knowing it's technically fetchable by anyone, though it only reveals boolean configured/not-configured state, no secret values). Owner-gated like the rest of `/console/*`; both old URLs (`/app/workspace/go-live`, `/app/readiness`) redirect here.

### 3.10 Settings — `/console/settings` (`SettingsPanel.tsx`)

Two read-only cards: "Platform admins" (lists every email in the `SUPER_ADMIN_EMAILS` env var — explicit note that this isn't editable from the UI, only via the env var) and "Global config" (runtime mode, default data residency, legal entity name — all read from env vars server-side).

**Backend:** `GET /api/super-admin/settings` — reads four env vars directly, no database call at all.

---

## 4. Cross-cutting: full API index

Every route under `src/app/api/`, grouped by what calls it. "Auth" column: **None** = no session check at all; **Session** = any signed-in user; **Owner** = `session.isSuperAdmin` required.

| Route | Method | Auth | Called from |
|---|---|---|---|
| `/api/dev/login` | GET/POST/DELETE | None | `DevLoginPanel` (non-prod only — 404s in production) |
| `/api/tenants/current` | GET | Session | `useTenantSession` hook (nav role-gating, Surveys home Pure-Owner redirect), Surveys home `firstRunCompleted` gate |
| `/api/tenants/settings` | GET/PATCH | Session | `TenantSettingsPanel` |
| `/api/tenants/bootstrap` | POST | None | **Not called from any UI** — dev/testing utility only |
| `/api/cycles` | GET | Session | Surveys home |
| `/api/cycles/create` | POST | Session | `CreateSurveyCycle` |
| `/api/cycles/[id]` | GET | Session | Survey Build tab, Results tab (status poll) |
| `/api/cycles/[id]/close` | POST | Session | Results tab |
| `/api/cycles/launch`, `/api/cycles/pay`, `/api/cycles/seed` | POST | Session | `ServerOpsPanel` only — **that component is orphaned, not rendered anywhere** |
| `/api/employees`, `/api/employees/[id]/status`, `/api/employees/import` | GET/POST | Session | People zone |
| `/api/invites/send` | POST | Session | Send tab (Tier 1 smart button), Results tab (reminders) |
| `/api/invites/outbox`, `/api/invites/queue` | GET/POST | Session | Send tab (Tier 2 "Developer / test mode") |
| `/api/report`, `/api/report/action` | GET/POST | Session (report also blocks impersonating Owners explicitly, 403) | Results tab, `/viewer` |
| `/api/pilot/state` | GET | Session | `/app/pilot`, `FirstRunGuide` (§2.7) |
| `/api/tenants/team`, `/api/tenants/team/invite`, `/api/tenants/team/[id]/remove` | GET/POST | Session, `customer_admin`-only | Team screen (§2.4.3) |
| `/api/readiness` | GET | **None** | Go-live page's underlying data source (fetched server-side, not via this API, but the API itself is also publicly reachable) |
| `/api/respondent/session`, `/api/respondent/submit` | GET/POST | **None** (token is the credential) | Survey Taker |
| `/api/super-admin/*` (overview, settings, support-notes, tenants, tenants/[id], usage, switch) | GET/POST/PATCH | **Owner** | `/console/*` |
| `/api/internal/db-health` | GET | — | Infra/monitoring, not user-facing |
| `/auth/callback` | GET | — | OAuth redirect target |

---

## 5. Known gaps — capability exists but isn't reachable from any screen

Flagging these explicitly rather than letting the doc imply full coverage where it isn't:

1. ~~Owner "enter this tenant" flow.~~ **Resolved** — Tenant Detail's "Enter workspace →" button (§3.4) now calls `POST /api/super-admin/switch` with the real `tenantId`.
2. ~~`survey_creator` and `auditor` roles unreachable.~~ **Partially resolved** — the Team screen (§2.4.3) now invites teammates with a role, so both roles are reachable through real UI, not just `permissions.ts`. Still true: `getVisibleNavZones("auditor")` returns an empty array, and no audit-log viewer screen exists yet for the "Viewer" role to actually view anything beyond k-safe survey results.
3. **`ServerOpsPanel`** (raw API test buttons for seed/pay/launch/prepare/queue/read-report) is orphaned — the component file exists, nothing imports it.
4. **Brand Studio color/font customization** was removed during the design-directive build (conflicted with the locked palette); only name/tagline/logo remain, and that data is `localStorage`-only, never synced server-side.
5. **Billing** (both `/app/workspace/billing` and `/console/billing`) are placeholder screens — no Stripe integration wired up; `/api/cycles/pay` exists but nothing currently calls it from a reachable UI path.
6. **No employee-level survey targeting.** Creating a cycle always issues tokens to every currently-active employee — there's no "select which employees receive this survey" step anywhere.
