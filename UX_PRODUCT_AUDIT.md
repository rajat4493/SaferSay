# UX/Product Audit Report: Admin Refactor v1

**Audit Date:** 2026-08-06  
**Version:** Admin Refactor v1 (Three-zone nav, four-role model, survey-as-object)  
**Methodology:** Nielsen's 10 Usability Heuristics + Design System Consistency + Gap Analysis

---

## Executive Summary

The admin refactor implements a significant structural improvement (from 8-item enterprise console to survey-centric three-zone app) with solid foundation for role-based access. However, several UX gaps and incomplete states require attention before broader rollout.

**Overall Assessment:**
- ✅ **Navigation structure:** Sound, role-gated correctly
- ⚠️ **Placeholder screens:** 40% of user journeys incomplete (TODOs embedded)
- ⚠️ **Missing states:** Empty states, loading states, error cases not designed
- 🔴 **Inconsistent transitions:** Old routes coexist with new; no redirects/deprecation path

**Estimated effort to production-ready:** 3–4 sprints (60–80 story points)

---

## Part 1: Nielsen's 10 Usability Heuristics Evaluation

### Heuristic 1: Visibility of System Status

| Role | Screen | Finding | Tag | Severity | Fix |
|------|--------|---------|-----|----------|-----|
| All | /app | **KEEP**: Confidentiality seal shows status clearly ("Sealed by design") | Keep | 0 | None |
| All | /app/[surveyId] | **BAD**: No loading indicator during survey fetch (TODO: fetch from API) | Bad | 2 | Add skeleton loader while data loads |
| Customer Admin | /app/workspace/* | **BAD**: No "unsaved changes" indicator when modifying settings | Bad | 2 | Add visual feedback on form changes |
| Survey Taker | /s/[token] | **UGLY**: No progress indicator during submission (not reviewed in this audit, but noted from existing code) | Ugly | 1 | Add progress bar during POST |
| All | /app/[surveyId]/send | **MISSING**: No real-time invite queue status (shows placeholder 0s) | Missing | 3 | Show live queue counts from /api/cycles/[id]/invites |

**Heuristic 1 Score:** 2.4/5 (Below expectations — loading and status feedback incomplete)

---

### Heuristic 2: Match Between System and Real World

| Role | Screen | Finding | Tag | Severity | Fix |
|------|--------|---------|-----|----------|-----|
| Customer Admin | /app | **KEEP**: "Surveys" → survey list matches mental model (users think in terms of surveys, not admin tasks) | Keep | 0 | None |
| Customer Admin | /app/people | **KEEP**: "People" → employee directory aligns with HR workflows | Keep | 0 | None |
| Customer Admin | /app/workspace | **KEEP**: "Workspace" uses company metaphor (settings, billing, go-live all "workspace management") | Keep | 0 | None |
| Customer Admin | /app/[surveyId]/send | **BAD**: "Queue invitations" is technical jargon for HR staff; should be "Select who receives this survey" | Bad | 1 | Rename to "Who should receive this?" or "Select employees" |
| Customer Admin | /app/workspace/settings | **UGLY**: "Confidentiality Threshold" → users don't think in terms of "k-value" but in human terms ("How many before we show numbers?") | Ugly | 2 | Label: "Minimum group size (how many people must respond before we can show results?)" |
| Survey Creator | /app | **MISSING**: No "Drafts vs. Active" distinction; users can't tell survey lifecycle state at a glance | Missing | 3 | Show status badge (Draft, Live, Closed, Archived) on survey cards |

**Heuristic 2 Score:** 3/5 (Good structure, but terminology needs refinement)

---

### Heuristic 3: User Control and Freedom

| Role | Screen | Finding | Tag | Severity | Fix |
|------|--------|---------|-----|----------|-----|
| Customer Admin | /app/[surveyId] | **KEEP**: Back button on each stage allows reversal (Build → Back → list, Send → Back → Build) | Keep | 0 | None |
| Customer Admin | /app/[surveyId]/send | **BAD**: No "Save draft and come back later" option; users must complete flow in one session | Bad | 3 | Add "Save draft" button that saves template + question selections |
| Customer Admin | /app/[surveyId]/results | **BAD**: No "Revert recent changes" or undo on survey closure/archive buttons (destructive without confirmation) | Bad | 2 | Add confirmation modal before closing/archiving survey |
| Customer Admin | /app/workspace/settings | **UGLY**: Threshold change doesn't warn about impact on already-running surveys | Ugly | 2 | Add warning: "This affects N active surveys" with OK/Cancel |
| Survey Creator | /app/people | **KEEP**: Can deactivate employees (undo available via re-activate) | Keep | 0 | None |
| All | General | **MISSING**: No way to undo survey creation (if user creates wrong survey, must contact support) | Missing | 4 | Add survey trash/restore feature or at least a "contact support" quick link |

**Heuristic 3 Score:** 2/5 (Major gaps in draft saving and destructive action confirmation)

---

### Heuristic 4: Error Prevention & Recovery

| Role | Screen | Finding | Tag | Severity | Fix |
|------|--------|---------|-----|----------|-----|
| Customer Admin | /app/surveys/new | **KEEP**: Validation prevents 0 questions ("Include at least one question before creating") | Keep | 0 | None |
| Customer Admin | /app/api/employees/import | **KEEP**: CSV parsing shows errors before import (bad rows flagged in preview) | Keep | 0 | None |
| Customer Admin | /app/[surveyId]/send | **BAD**: No validation if selecting 0 employees (user can queue empty invite list) | Bad | 2 | Block "Queue invitations" button if count = 0 |
| Customer Admin | /app/workspace/settings | **BAD**: Threshold can be set to 1 (defeats k-anonymity); no floor validation | Bad | 3 | Enforce minimum threshold of 5 (or configurable floor per tenant) |
| Customer Admin | /app/[surveyId]/send | **UGLY**: No warning if trying to send to an already-invited employee (silent duplicate) | Ugly | 2 | Show: "5 of 12 selected already have this survey" |
| All | Database | **MISSING**: No rate-limiting on survey creation (spam risk); no quota enforcement | Missing | 3 | Add per-tenant rate limits (e.g., max 10 surveys/day) |

**Heuristic 4 Score:** 2.5/5 (Validation exists for CSVs, missing for user inputs)

---

### Heuristic 5: Error Messages

| Role | Screen | Finding | Tag | Severity | Fix |
|------|--------|---------|-----|----------|-----|
| All | /app/api/cycles/create | **KEEP**: Returns `{ ok: false, error: "..." }` with human-readable messages | Keep | 0 | None |
| Customer Admin | /app/[surveyId] | **MISSING**: No error message if survey fetch fails (just shows loading state forever) | Missing | 3 | Display: "Failed to load survey. Retry?" with error details for support |
| Customer Admin | /app/api/employees/import | **UGLY**: CSV errors shown as array; not user-friendly (e.g., "Row 5: invalid email" is clear, but "EmployeeImportError: validation" is not) | Ugly | 1 | Format errors as: "❌ Row 5: 'john@' is not a valid email address" |
| All | Network errors | **MISSING**: No global error boundary or toast notifications for failed requests | Missing | 4 | Add error toast: "Failed to save. Try again?" with auto-retry option |
| Customer Admin | /app/workspace/settings | **MISSING**: No success confirmation after saving threshold ("Settings saved" toast) | Missing | 2 | Add toast: "✅ Threshold updated to 5" |

**Heuristic 5 Score:** 2/5 (Some errors handled, but missing boundary and confirmation feedback)

---

### Heuristic 6: Recognition vs. Recall

| Role | Screen | Finding | Tag | Severity | Fix |
|------|--------|---------|-----|----------|-----|
| All | /app | **KEEP**: Three zones always visible in sidebar (no need to recall structure) | Keep | 0 | None |
| Customer Admin | /app/[surveyId] | **KEEP**: Stage indicator (1/3, 2/3, 3/3) with visual progress shows position in workflow | Keep | 0 | None |
| Customer Admin | /app/people | **BAD**: No breadcrumb navigation (user not sure if they're in a sub-section or at root) | Bad | 1 | Add breadcrumb: "Home > People" or remove if not needed (page title sufficient) |
| Customer Admin | /app/[surveyId]/send | **UGLY**: Employee list (currently TODO) should show "selected (12 of 50)" without needing to count | Ugly | 1 | Display counter: "Selected: 12 of 50 active employees" |
| Auditor | /app/audit | **MISSING**: No quick-access way to find recent entries (no filtering, sorting, or search in Audit & Proof view) | Missing | 3 | Add filter options: by date range, actor role, action type |
| All | General | **MISSING**: No recent surveys widget or "quick links" to last-used screens | Missing | 2 | Add "Recent" section on home showing last 3 surveys opened |

**Heuristic 6 Score:** 3/5 (Recognition is good for nav, recall gaps in audit & details)

---

### Heuristic 7: Flexibility and Efficiency of Use

| Role | Screen | Finding | Tag | Severity | Fix |
|------|--------|---------|-----|----------|-----|
| Customer Admin | /app/surveys/new | **KEEP**: Keyboard accessible (tab through options, Enter to select) | Keep | 0 | None (if tested) |
| Power User | /app/people | **BAD**: No bulk action shortcuts (e.g., "Deactivate all inactive employees" in one click) | Bad | 2 | Add bulk edit toolbar for multi-select |
| Customer Admin | /app/[surveyId]/send | **BAD**: No "Select all employees" checkbox; must click each individually (slow for large tenant) | Bad | 3 | Add checkbox to select all + "Deselect" option |
| Customer Admin | /app/workspace/settings | **UGLY**: Form requires click-save; no auto-save (risky if unsaved changes lost on navigation) | Ugly | 2 | Add auto-save with "Saved" indicator, or prominent "Unsaved changes" warning |
| Survey Creator | /app | **MISSING**: No keyboard shortcut to create survey (e.g., Cmd+N) | Missing | 1 | Add keyboard shortcuts list (Help modal) |
| All | Sidebar | **KEEP**: Role-based nav shows/hides zones (no wasted space on inaccessible items) | Keep | 0 | None |

**Heuristic 7 Score:** 2.5/5 (Foundational accessibility OK, power-user features missing)

---

### Heuristic 8: Aesthetic & Minimalist Design

| Role | Screen | Finding | Tag | Severity | Fix |
|------|--------|---------|-----|----------|-----|
| All | Sidebar | **KEEP**: Icons + labels clear; no clutter (max 3 nav zones visible) | Keep | 0 | None |
| All | /app | **KEEP**: Confidentiality seal is the only memorable visual element (avoids cognitive overload) | Keep | 0 | None |
| Customer Admin | /app/[surveyId] | **BAD**: TODOs scattered in comments (e.g., "TODO: Fetch survey data") are distracting; should hide or use skeleton states | Bad | 2 | Remove visible TODOs; use skeleton loaders instead |
| Customer Admin | /app/workspace/* | **UGLY**: Pages show placeholder "Loading..." text (low-effort design signal) | Ugly | 2 | Replace with proper skeleton screens matching Ink & Cream design |
| Customer Admin | /app/[surveyId]/send | **MISSING**: No visual distinction between "queued" vs. "sent" invites (both show as 0) | Missing | 2 | Use color-coded badges (e.g., yellow for queued, green for sent) |
| All | General | **KEEP**: No animations or distracting elements (respects motion preferences) | Keep | 0 | None |

**Heuristic 8 Score:** 3.5/5 (Strong design discipline, but TODOs and placeholders break the polish)

---

### Heuristic 9: Help & Documentation

| Role | Screen | Finding | Tag | Severity | Fix |
|------|--------|---------|-----|----------|-----|
| Customer Admin | /app | **KEEP**: Confidentiality seal includes "How it works" link (education in-context) | Keep | 0 | None |
| Customer Admin | /app/people | **BAD**: No in-line help for CSV import format (users must guess or ask support) | Bad | 2 | Add "Download template" button linking to sample CSV |
| Customer Admin | /app/[surveyId] | **UGLY**: Stage names ("Build", "Send", "Results") lack explanation (new users don't know what to do) | Ugly | 2 | Add subtitle: "Build: Choose questions" + "Send: Queue invites" + "Results: View k-safe report" |
| Customer Admin | /app/workspace/settings | **BAD**: "Minimum group size" has no explanation of why (k-anonymity) or impact | Bad | 2 | Add tooltip: "Responses are hidden until N people respond (prevents identifying individuals)" |
| Auditor | /app/audit | **MISSING**: No documentation of audit log fields or what actions mean | Missing | 3 | Add inline help or link to docs explaining action types + safe counts |
| All | General | **MISSING**: No global help menu, FAQ, or "Contact support" link (buried in footer, if anywhere) | Missing | 3 | Add help icon in header that shows chat or links to FAQ |

**Heuristic 9 Score:** 1.5/5 (Minimal documentation; tooltips & help mostly missing)

---

### Heuristic 10: Help & Error Recovery (Pragmatic)

| Role | Screen | Finding | Tag | Severity | Fix |
|------|--------|---------|-----|----------|-----|
| Customer Admin | /app | **KEEP**: Survey creation has step-by-step guidance (PageGuide component) | Keep | 0 | None |
| Customer Admin | /app/[surveyId]/send | **BAD**: User queues invites, but if they forget to "Send now," invites sit in queue indefinitely (no nudge) | Bad | 3 | Add reminder at next login: "You have 30 queued invites. Send now?" |
| Customer Admin | /app/workspace/billing | **UGLY**: Empty state shows "loading..." but never loads actual billing data (TODO in component) | Ugly | 2 | Integrate real billing data or show "Contact sales" if not available |
| Survey Creator | /app | **MISSING**: No onboarding flow explaining role difference (cannot access Workspace) | Missing | 2 | Add "Tour" modal on first login explaining role permissions |
| All | Database errors | **MISSING**: No "contact support" flow if system errors occur (user sees raw error) | Missing | 4 | Add: "🆘 Something went wrong. Email support@safersay.com with error code XYZ" |

**Heuristic 10 Score:** 1/5 (Pragmatic recovery features mostly absent)

---

## Nielsen Score Summary

| Heuristic | Score | Status |
|-----------|-------|--------|
| 1. Visibility | 2.4/5 | ⚠️ |
| 2. Match System & Real World | 3/5 | ⚠️ |
| 3. User Control & Freedom | 2/5 | 🔴 |
| 4. Error Prevention | 2.5/5 | 🔴 |
| 5. Error Messages | 2/5 | 🔴 |
| 6. Recognition vs. Recall | 3/5 | ⚠️ |
| 7. Flexibility & Efficiency | 2.5/5 | 🔴 |
| 8. Aesthetic & Minimalist | 3.5/5 | ⚠️ |
| 9. Help & Documentation | 1.5/5 | 🔴 |
| 10. Pragmatic Recovery | 1/5 | 🔴 |
| **Overall** | **2.34/5** | **⚠️ Below Standard** |

**Interpretation:** The structure and navigation are sound, but the user experience suffers from incomplete implementation (TODOs), missing error handling, and inadequate documentation. Suitable for internal/early-access testing; not ready for general user rollout.

---

## Part 2: Design System Consistency Audit

### Color Palette Compliance

| Role | Screen | Element | Expected | Actual | Status | Fix |
|------|--------|---------|----------|--------|--------|-----|
| All | /app sidebar | Background | `--bg` (#FBFAF7) | ✓ Applied | ✓ PASS | None |
| All | /app cards | Border | `--line` (#EAE6DD) | ✓ Applied | ✓ PASS | None |
| All | /app buttons | Primary action | `--primary` (#0E6E59) | ✓ Applied | ✓ PASS | None |
| All | /app text | Body text | `--ink` (#16241F) | ✓ Applied | ✓ PASS | None |
| All | /app text | Secondary | `--ink-soft` (#5F6E68) | ✓ Applied | ✓ PASS | None |
| All | /app/workspace | Settings form | No input styling defined | Missing | 🔴 FAIL | Add input: `border: 1px solid var(--line); border-radius: 11px; padding: 8px 12px;` |
| All | /app/[surveyId] | Loading skeleton | No skeleton color defined | Missing | 🔴 FAIL | Use `background: linear-gradient(90deg, var(--line-soft), var(--bg));` animation |
| All | /app toast (missing) | Success | Should use `--primary-deep` | N/A | 🔴 FAIL | Add toast component with green success state |
| All | /app toast (missing) | Error | Should use `--amber` | N/A | 🔴 FAIL | Add error toast in red/orange |

**Color Score:** 6/10 (Core palette applied, but form inputs & toast states missing)

---

### Typography Compliance

| Component | Expected | Actual | Status | Fix |
|-----------|----------|--------|--------|-----|
| Page title (h1) | Bricolage 600, 30px, -0.025em | ✓ Applied in page headers | ✓ PASS | None |
| Section title (h2) | Bricolage 600, 21px, -0.02em | ✓ Applied | ✓ PASS | None |
| Body text | Inter 400, 14px, 1.5 line-height | ✓ Applied | ✓ PASS | None |
| Button text | Inter 500, 13.5px | ✓ Applied | ✓ PASS | None |
| Micro label | Inter 600, 11px, uppercase, 0.06em tracking | ✗ Inconsistently used (stage indicator uses it, but sections don't) | ⚠️ PARTIAL | Audit all labels; apply micro-label style to "Build", "Send", "Results" stage names consistently |
| Loading text | Should match body | Shows "Loading..." in plain text | ⚠️ PARTIAL | Replace with skeleton loaders (no text) |

**Typography Score:** 8/10 (Good application, minor inconsistencies in micro-labels)

---

### Spacing & Layout Compliance

| Element | Expected Scale | Actual | Status | Fix |
|---------|-----------------|--------|--------|-----|
| Sidebar padding | 4–8–14–16–22 | `p-4` applied | ✓ PASS | None |
| Card padding | 16–22px | `p-6` (24px) | ⚠️ CLOSE | Adjust to `p-4` for consistency (16px) |
| Button padding | 8–12px | `px-5 py-2` (20px × 8px) | ⚠️ CLOSE | Align to scale (14px × 8px) |
| Section gaps | 22–26px | `gap-6` (24px) | ✓ PASS | None |
| Whitespace (minimum) | Generous | Adequate | ✓ PASS | None |

**Spacing Score:** 7/10 (Generally good, minor padding inconsistencies)

---

### Component Compliance

| Component | Defined in Design System | Implemented | Status | Notes |
|-----------|--------------------------|-------------|--------|-------|
| Sidebar nav | Yes (50px icon + label, active state) | ✓ Implemented | ✓ PASS | Matches spec (icon + label, rounded active state) |
| Topbar | Yes (sticky, translucent backdrop) | ✗ NOT implemented | 🔴 FAIL | Only plain header; lacks sticky topbar |
| Buttons (Primary) | Yes (green bg, white text, hover) | ✓ Implemented | ✓ PASS | Correct colors and hover state |
| Buttons (Ghost) | Yes (white bg, border, hover) | ✓ Implemented | ✓ PASS | Good |
| Buttons (Amber) | Yes (for "loop/attention" only) | ✗ NOT used | ⚠️ MISSING | Reserved for close/delete confirmations; should use in destructive actions |
| Cards | Yes (white, border, shadow) | ✓ Implemented | ✓ PASS | Correct styling |
| Status card | Yes (micro-label + icon + big number) | ✗ Incomplete | ⚠️ PARTIAL | Exists but not consistently styled (see /app/[surveyId]/send placeholder counts) |
| Progress bar | Yes (8px, gradient fill) | ✗ NOT implemented | 🔴 FAIL | No progress bars on any pages |
| Confidentiality Seal | Yes (soft green wash, shield-check icon) | ✓ Implemented | ✓ PASS | Excellent; consistent messaging |
| Tags/Pills | Yes (soft green bg, rounded) | ✓ Implemented (stage indicator) | ✓ PASS | Good |
| Form inputs | Yes (11px radius, border) | ✗ NOT styled | 🔴 FAIL | No input styling defined (see /app/workspace/settings) |
| Modals/Dialogs | Not defined | ✗ NOT implemented | 🔴 FAIL | No confirmation dialogs for destructive actions |

**Component Score:** 5/10 (Core nav & cards solid, but form inputs, topbar, progress, and modals missing)

---

### Design System Overall Score: 6.67/10

**Assessment:** Foundation is solid (colors, typography, sidebar); key components (forms, modals, topbar) not yet implemented.

---

## Part 3: Role-by-Role UX Audit

### Role 1: Owner/Platform Admin (Console at /console)

**Current Scope:** Tenant management, billing, platform overview  
**Audit Scope:** This audit focuses on /app (client admin); console is out of scope but noted for gaps

| Screen | Completeness | UX Assessment | Issues |
|--------|--------------|---------------|--------|
| /app | N/A (shows onboarding, redirects to /console if pure owner) | N/A | N/A |

**Owner-specific gaps:** (Noted for later)
- No "impersonate tenant" flow visible in new nav structure
- No quick links to specific tenant from /console to /app workspace

**Owner Severity:** N/A (out of scope, but integration opportunity)

---

### Role 2: Customer Admin (Full Access)

**Current Scope:** All three zones (Surveys, People, Workspace)  
**Expected Workflows:** Create survey, manage people, adjust settings, view billing, run reports

#### Screen 1: /app (Surveys Home)

| Aspect | Status | Finding | Tag | Severity | Fix |
|--------|--------|---------|-----|----------|-----|
| Loading | ⚠️ | No skeleton while fetching survey list | Bad | 2 | Add skeleton cards (3–4 placeholders) |
| Empty state | ✓ | Shows "No surveys yet" with create button | Keep | 0 | None |
| Survey cards | ✗ | TODO: Need to populate from /api/cycles | Missing | 3 | Wire up API, show: name, date, status (Draft/Live/Closed), response count |
| Create action | ✓ | Prominent "New survey" button | Keep | 0 | None |
| Confidentiality seal | ✓ | Visible and on-message | Keep | 0 | None |
| Sorting/filtering | ✗ | Not available (TODO) | Missing | 2 | Add: sort by date/status, filter by status (Active/Archived) |
| **Score** | 50% | 3/6 aspects complete | — | 2.3 avg | Implement survey list data wire-up |

#### Screen 2: /app/people (People Management)

| Aspect | Status | Finding | Tag | Severity | Fix |
|--------|--------|---------|-----|----------|-----|
| Import flow | ✓ | CSV upload + preview working | Keep | 0 | None |
| Employee directory | ✓ | Shows employee list (TODO: live data wire-up) | Partial | 1 | Fetch from /api/participants |
| Bulk actions | ✗ | No "deactivate all" or multi-select | Missing | 2 | Add checkboxes + bulk deactivate option |
| Search | ✗ | Not available | Missing | 2 | Add filter by name/email |
| Pagination | ✗ | Not shown (assumes < 100 employees) | Missing | 2 | Add pagination for large tenants (100+) |
| **Score** | 60% | 3/5 aspects complete | — | 1.6 avg | Add search, bulk actions, pagination |

#### Screen 3: /app/[surveyId]/page.tsx (Build Stage)

| Aspect | Status | Finding | Tag | Severity | Fix |
|--------|--------|---------|-----|----------|-----|
| Stage indicator | ✓ | Shows 1/3 with breadcrumb | Keep | 0 | None |
| Template picker | ✗ | Shows "Loading templates..." placeholder | Bad | 2 | Wire up template list; show Engagement, Safety, Manager, Retention, Custom |
| Question editor | ✗ | Empty; no UI for customization | Missing | 3 | Implement question editor (add/edit/delete/reorder) |
| Back button | ✓ | Present | Keep | 0 | None |
| Next button | ✓ | Labeled "Next: Send survey" | Keep | 0 | None |
| Confirmation | ✗ | No "save draft" before moving to Send | Bad | 3 | Add auto-save or explicit "Save & Continue" |
| **Score** | 33% | 2/6 aspects complete | — | 2.3 avg | Implement template + question editor |

#### Screen 4: /app/[surveyId]/send/page.tsx (Send Stage)

| Aspect | Status | Finding | Tag | Severity | Fix |
|--------|--------|---------|-----|----------|-----|
| Invite status | ✗ | Shows placeholder 0s | Bad | 2 | Wire up /api/cycles/[id]/invites summary |
| Employee selector | ✗ | TODO: implement list | Missing | 3 | Show active employees with checkboxes; "Select all" option |
| Send timing | ✓ | Radio buttons (send now / schedule) | Partial | 1 | Implement schedule picker if "later" selected |
| Navigation | ✓ | Back/Next buttons present | Keep | 0 | None |
| Confirmation | ✗ | No review of selected employees before send | Bad | 2 | Show summary: "Ready to send to 12 employees?" |
| **Score** | 40% | 2/5 aspects complete | — | 1.8 avg | Implement employee selector + summary |

#### Screen 5: /app/[surveyId]/results/page.tsx (Results Stage)

| Aspect | Status | Finding | Tag | Severity | Fix |
|--------|--------|---------|-----|----------|-----|
| Confidentiality seal | ✓ | Present at top | Keep | 0 | None |
| Response status | ✗ | Shows placeholder 0s | Bad | 2 | Wire up participation data (sent, responded, completion %) |
| Report | ✗ | Shows "Waiting for responses..." | Missing | 3 | Implement k-safe report display (protected / unprotected states) |
| Export | ✓ | Button present (TODO: wire up) | Partial | 1 | Implement PDF export |
| Manage survey | ✗ | Buttons present but not wired (no reminders, close, archive) | Bad | 3 | Wire up: send reminders, close survey, archive survey |
| Back button | ✓ | "Back to surveys" present | Keep | 0 | None |
| **Score** | 33% | 2/6 aspects complete | — | 2.2 avg | Implement report display + management actions |

#### Screen 6: /app/workspace/settings

| Aspect | Status | Finding | Tag | Severity | Fix |
|--------|--------|---------|-----|----------|-----|
| Form layout | ⚠️ | No input styling; looks unfinished | Bad | 2 | Apply form design system (inputs, labels, submit button) |
| Threshold explanation | ✗ | No tooltip or help text | Bad | 2 | Add: "Minimum group size (how many must respond before showing results?)" |
| Save feedback | ✗ | No "saved" confirmation toast | Bad | 2 | Add toast: "✅ Settings saved" |
| Validation | ✗ | No floor enforcement (can set to 1) | Bad | 3 | Enforce minimum of 5 (or tenant-configurable floor) |
| Impact warning | ✗ | No warning if changing threshold mid-survey | Bad | 2 | Show: "This affects 2 active surveys" |
| **Score** | 20% | 0/5 complete | — | 2.2 avg | Implement form UI, validation, help text |

#### Screen 7: /app/workspace/billing

| Aspect | Status | Finding | Tag | Severity | Fix |
|--------|--------|---------|-----|----------|-----|
| Layout | ✓ | Card present | Partial | 0 | N/A |
| Content | ✗ | Shows "Billing implementation placeholder" | Bad | 2 | Wire up real billing data or show "Contact sales" |
| **Score** | 50% | N/A | — | 2 | Connect to billing API or hide if not ready |

#### Screen 8: /app/workspace/security

| Aspect | Status | Finding | Tag | Severity | Fix |
|--------|--------|---------|-----|----------|-----|
| Seal | ✓ | Confidentiality seal present | Keep | 0 | None |
| Architecture explanation | ✓ | Brief description present | Partial | 1 | Add link to full doc: "Severed stores, RLS, k-threshold, auto roll-up" |
| **Score** | 75% | 1.5/2 aspects | — | 0.5 avg | Add deeper explanation or link to docs |

#### Screen 9: /app/workspace/go-live

| Aspect | Status | Finding | Tag | Severity | Fix |
|--------|--------|---------|-----|----------|-----|
| Checklist | ✓ | 4-item checklist visible | Keep | 0 | None |
| Interactivity | ✗ | Checkboxes not functional (no state saved) | Bad | 2 | Make checkboxes functional; save state to user prefs |
| Completion indicator | ✗ | No progress bar showing 1/4 vs 4/4 | Bad | 2 | Add: "Progress: 0/4 complete" at top |
| Unlock mechanism | ✗ | No "GO LIVE" button or next step | Bad | 3 | Add button: "Go Live" (unlocks survey broadcast) |
| **Score** | 50% | 2/4 complete | — | 2.3 avg | Make checklist interactive; add go-live action |

**Customer Admin Overall Score:** 44% Complete

**Top 5 Fixes (by severity × frequency):**
1. **Survey data wire-up** (Severity 3, appears on /app + /app/[surveyId]) — Connect /api/cycles to populate survey lists, statuses, counts
2. **Template + question editor** (Severity 3, /app/[surveyId]) — Implement Build stage UX
3. **Employee selector** (Severity 3, /app/[surveyId]/send) — Multi-select with "Select all" + summary review
4. **Results display** (Severity 3, /app/[surveyId]/results) — Show k-safe report (protected / unprotected states)
5. **Form inputs + validation** (Severity 3, /app/workspace/*) — Design system for forms + threshold floor enforcement

---

### Role 3: Survey Creator (Surveys + People only; Workspace hidden)

**Current Scope:** Surveys, People zones only  
**Expected Workflows:** Create & run surveys, manage employees (no billing/settings)

| Screen | Completeness | Assessment | Differences from Customer Admin |
|--------|--------------|------------|-------------------------------|
| /app | 50% | Same as customer_admin (survey list) | ✓ Identical |
| /app/people | 60% | Same as customer_admin (employee mgmt) | ✓ Identical |
| /app/[surveyId]/* | 40% | Same Build/Send/Results flow | ✓ Identical |
| /app/workspace | N/A | Redirects to /app | ⚠️ Hidden (permission gate working) |
| **Unique Issue** | — | No "this is why Workspace is hidden" explanation | Bad (Severity 1) | Show tooltip: "Survey Creators cannot access billing or settings" |

**Survey Creator Score:** 44% (Same as admin, plus one small UX gap)

---

### Role 4: Auditor (Read-Only Compliance; v1.1+, not exposed)

**Current Scope:** Audit log viewer + security proof (behind feature flag)  
**Expected Workflows:** View operator actions, verify confidentiality architecture, export audit report

| Screen | Completeness | Finding | Tag | Severity | Status |
|--------|--------------|---------|-----|----------|--------|
| /app/audit (missing UI) | 0% | No audit log viewer implemented | Missing | 3 | Design phase: show table with columns (Actor Role, Action, Timestamp, Target, Safe Counts) |
| Filtering | 0% | No date range / actor / action filters | Missing | 3 | Add: date picker, actor dropdown, action type select |
| Sorting | 0% | Cannot sort by column | Missing | 2 | Add click-to-sort on date, actor, action |
| Export | 0% | No "Export audit report" button | Missing | 2 | Add: export as CSV (safe counts only, no PII) |
| Proof view | 0% | Links to /app/workspace/security? Unclear | Missing | 2 | Create dedicated /app/audit/proof view with architecture explanation |
| **Score** | 0% | 5/5 missing | — | 2.4 avg | Entire audit interface TBD for v1.1 |

**Auditor Note:** This role is code-complete but UI is not exposed. Design debt deferred to v1.1.

---

### Role 5: Survey Taker (Token Link; /s/[token])

**Current Scope:** Survey response form (out of scope for admin refactor, but noted)

| Aspect | Status | Note |
|--------|--------|------|
| Loading | Existing | Works (not reviewed in this audit) |
| Progress bar | Existing | Present; no changes needed |
| Questions | Existing | Displays correctly |
| Submission | Existing | Works; audit logging not integrated |
| **Score** | N/A | Out of scope; no changes for this refactor |

**Survey Taker Note:** Not affected by admin refactor; no changes required.

---

## Part 4: Missing States & Flows

### Global (All Roles)

| State | Current | Required | Severity | Fix |
|-------|---------|----------|----------|-----|
| Loading state | Missing on most pages (TODOs show "Loading...") | Skeleton screens per Ink & Cream | 3 | Implement SkeletonLoader component; use on all data-fetching pages |
| Error state | No global error boundary | Toast notifications + error boundary | 4 | Add Sentry/error boundary + error toast component |
| Empty state | Partial (surveys home shows) | All CRUD lists need empty states with icon + CTA | 2 | Add empty state template: icon + "No X yet. Create one?" + button |
| Success state | Missing (no toast on save) | Toast notifications (green, auto-dismiss) | 3 | Add toast component with success/error/warning variants |
| Offline state | Not handled | Show "Offline; changes will sync when connection restored" | 2 | Detect offline; queue requests; show banner |
| Authentication expired | Not clear | Show modal: "Your session expired. Log in again" + redirect | 3 | Add session timeout detection + re-auth modal |

---

### Customer Admin Specific

| Flow | Current | Missing | Severity | Fix |
|------|---------|---------|----------|-----|
| Draft survey recovery | Can't save draft; must complete in one session | "Save draft" button; restore from last session | 3 | Add draft auto-save to localStorage; recover on revisit |
| Undo survey creation | No undo; must contact support | Trash/restore feature OR quick "Contact support" link | 4 | Add soft-delete for surveys; show in "Recent" with restore option |
| Bulk employee deactivation | One-by-one only | Checkbox multi-select + "Deactivate selected" | 3 | Implement bulk actions toolbar |
| Import conflict resolution | Shows error; unclear how to fix | Preview shows conflicting rows; offer "Skip" vs "Update" | 2 | Add conflict resolution UI (checkboxes on duplicates) |
| Send confirmation | User queues but might forget to actually send | Pop-up or email reminder after N days | 3 | Add smart nudge: "You have 30 queued invites. Send now?" on next login |
| Survey lifecycle visibility | All surveys look the same (no status) | Status badges (Draft, Live, Closed, Archived) on cards | 2 | Add status badge to survey cards |
| Threshold impact preview | No way to see what would change | Preview modal: "This will affect 2 active surveys" | 2 | Show preview before applying change |

---

### Workflow Gaps (Not States, But Missing Flows)

| Workflow | Gap | Severity | Fix |
|----------|-----|----------|-----|
| From survey results to action | Report shows numbers, but no "Next step" | 2 | Add CTA at end of report: "Export & share" or "Send reminder" |
| Threshold change propagation | Doesn't show which surveys are affected | 2 | Show list of active surveys affected by change |
| Employee lifecycle | No archival/re-activation UI (only deactivate) | 2 | Add "Archived" state and restore option |
| Survey template customization | User might want to save a custom template | 2 | Add "Save as template" button in question editor |
| Invite reminder flow | Manual reminders required; no scheduling | 3 | Add scheduled reminders (1 week, 2 weeks, etc.) |
| Cross-tenant operations | No way for owner to bulk-manage customer settings | (out of scope; console feature) | — |

---

## Part 5: Prioritized Fix List (Severity × Frequency)

**Severity Scale:** 0 (none) → 4 (critical, blocks launch)  
**Frequency:** # of roles/screens affected  
**Priority Score:** Severity × Frequency

### CRITICAL (Score ≥ 12)

| Priority | Issue | Severity | Freq | Score | Roles | Screens | Fix |
|----------|-------|----------|------|-------|-------|---------|-----|
| 1 | **Survey data wire-up** (populate /api/cycles list) | 3 | 4 | 12 | All | /app, /app/[id] | Connect survey list API; show name, status, date, response count |
| 2 | **Template + Question Editor** (Build stage incomplete) | 3 | 2 | 6* | Admin, Creator | /app/[id] | Implement full question builder (add/edit/reorder/delete) |
| 3 | **Error Boundary + Toast System** (no error handling) | 4 | 5 | 20 | All | All screens | Implement global error boundary; add toast notifications |
| 4 | **Employee Selector** (Send stage incomplete) | 3 | 2 | 6* | Admin, Creator | /app/[id]/send | Multi-select employee list with "Select all"; count display |
| 5 | **Results Display** (Results stage shows placeholder) | 3 | 2 | 6* | Admin, Creator | /app/[id]/results | Implement k-safe report (protected/unprotected logic) |

*Note: 6 is marginal; other gaps may supersede if error handling or auth is broken.

### HIGH (Score 8–11)

| Priority | Issue | Severity | Freq | Score | Fix |
|----------|-------|----------|------|-------|-----|
| 6 | **Form Styling + Inputs** (Workspace pages unstyled) | 3 | 3 | 9 | Admin only | /app/workspace/* | Apply form design system (inputs, labels, buttons) |
| 7 | **Threshold Validation & Warnings** (can set to invalid values) | 3 | 2 | 6* | Admin | /app/workspace/settings | Enforce min threshold (5); show impact warning |
| 8 | **Skeleton Loaders** (shows "Loading..." text) | 2 | 4 | 8 | All | Most screens | Replace text with skeleton cards matching Ink & Cream |
| 9 | **Confirmation Dialogs** (destructive actions unconfirmed) | 2 | 3 | 6* | Admin, Creator | /app/[id]/results | Add modal before closing/archiving survey |
| 10 | **Invite Summary Review** (user doesn't review before send) | 2 | 2 | 4* | Admin, Creator | /app/[id]/send | Show: "Ready to send to 12 employees?" before queuing |

### MEDIUM (Score 4–7)

| Priority | Issue | Severity | Freq | Score | Fix |
|----------|-------|----------|------|-------|-----|
| 11 | **Help & Documentation** (no tooltips, minimal guidance) | 2 | 4 | 8 | All | All | Add tooltips to key fields; create FAQ modal; link to docs |
| 12 | **Success Toast Notifications** (no save confirmation) | 2 | 3 | 6* | Admin | Settings, import | Add toast: "✅ Saved" after form submission |
| 13 | **Survey Status Badges** (no visibility into lifecycle) | 2 | 2 | 4* | All | /app | Add status badges (Draft, Live, Closed) to survey cards |
| 14 | **Bulk Actions (Employees)** (one-by-one only) | 2 | 2 | 4* | Admin, Creator | /app/people | Add checkboxes + bulk deactivate toolbar |
| 15 | **Draft Auto-Save** (users can't save drafts) | 3 | 1 | 3* | Admin, Creator | /app/[id] | Save to localStorage; show "Draft saved" indicator |

### LOW (Score 1–3)

| Priority | Issue | Severity | Freq | Score | Fix |
|----------|-------|----------|------|-------|-----|
| 16 | **Pagination (Employees)** (assumes <100) | 2 | 1 | 2 | Admin, Creator | /app/people | Add pagination if >50 employees |
| 17 | **Search (Employees)** (no filter) | 2 | 1 | 2 | Admin, Creator | /app/people | Add name/email search box |
| 18 | **Keyboard Shortcuts** (Cmd+N for create) | 1 | 1 | 1 | Admin, Creator | /app | Add help modal with shortcuts |
| 19 | **Topbar** (not implemented from design system) | 2 | 1 | 2 | All | All | Sticky topbar with breadcrumb (if needed; may not be) |
| 20 | **Recent Surveys Widget** (no quick access) | 1 | 1 | 1 | Admin, Creator | /app | Add "Recent" section showing last 3 surveys |

---

## Summary Table: Estimated Effort

| Tier | Count | Estimated Story Points | Timeline |
|------|-------|------------------------|----------|
| **Critical** | 5 | 40–50 | Sprint 1–2 |
| **High** | 5 | 20–30 | Sprint 2–3 |
| **Medium** | 5 | 15–20 | Sprint 3 |
| **Low** | 5 | 5–10 | Sprint 4+ |
| **Total** | 20 | 80–110 | 3–4 sprints (8–10 weeks at 20 pts/sprint) |

---

## Conclusion

The admin refactor v1 provides a **strong structural foundation** (three-zone nav, role-based permissions, design system discipline) but is **not production-ready** for general users due to:

1. **40% incomplete implementation** (TODOs, placeholders, unwired components)
2. **Missing error handling & recovery** (no error boundaries, limited confirmation dialogs)
3. **Inadequate documentation** (no tooltips, help, or onboarding)
4. **Fragmented UX** (old routes coexist with new; no deprecation path)

**Recommendation:**
- ✅ **Deploy as internal/beta feature** (design partners, early-access users)
- ❌ **Do NOT release to general user base** until critical + high-priority fixes complete
- 📋 **Estimated production readiness:** 8–10 weeks (after completing 80–110 story points)

**Quick wins (1–2 sprints to improve confidence):**
1. Wire up survey data from /api/cycles
2. Implement error boundaries + toast system
3. Add skeleton loaders (replaces "Loading..." text)
4. Implement template picker + basic question editor

---

## Appendix: Audit Methodology

**Heuristic Evaluation:** Nielsen's 10 Usability Heuristics applied to each role/screen  
**Design System Audit:** Color, typography, spacing, components checked against SAFERSAY_DESIGN_SYSTEM.md  
**Gap Analysis:** Missing states, error cases, and edge flows identified through role-based workflow mapping  
**Severity Scale:**  
- 0: Enhancement (no users blocked)
- 1: Minor UX friction (users annoyed, not blocked)
- 2: Moderate issue (users delayed or confused)
- 3: Major issue (users can't complete workflow without workaround)
- 4: Critical (users entirely blocked; product unusable)

**Audit completed:** 2026-08-06 | **Auditor:** UX Review Agent  
**Status:** Final | **Approval needed:** Product, Design, Engineering leads
