# SaferSay Three-Pass Product Test Plan

**Audience:** Senior Solution Architect, Product Owner  
**Purpose:** Run three structured tests after each meaningful product change, compare average outcomes, and avoid treating one exception as the norm.  
**North star:** security first, ease of use second, premium feel third.

---

## 1. Test Philosophy

Each pass must test the product as a real SME/startup HR user would experience it:

- Can HR start without technical help?
- Can employees understand confidentiality before answering?
- Can managers/viewers understand what they are allowed to see?
- Can the product produce useful, threshold-safe recommendations?
- Can the product show whether actions were seen, not seen, done, or pending?
- Can failures be understood without damaging trust?

One failed step is not automatically a failed product. Failures are grouped into:

- **Blocker:** prevents a real pilot.
- **Major:** pilot can run, but trust or usability is harmed.
- **Minor:** polish issue or confusing copy.
- **Exception:** rare case that should be noted but not treated as the norm.

---

## 2. Pass Design

### Pass 1: HR Admin First-Run Test

**Persona:** junior HR person at a 25-person startup.

**Scenario:**

1. Log in.
2. Understand where to start.
3. Upload employees.
4. Create a survey from template.
5. Prepare invite outbox.
6. Send test invite.
7. Check report state.
8. Understand what is pending before production.

**Success signal:** HR can run the first pilot path without asking what each screen means.

### Pass 2: Employee Survey-Taker Test

**Persona:** nontechnical employee using a mobile phone.

**Scenario:**

1. Open invite/survey link.
2. Understand confidentiality before Q1.
3. Complete survey without confusion.
4. See submission confirmation.
5. Try the same token again.

**Success signal:** employee trusts the survey enough to answer honestly, and token reuse is blocked.

### Pass 3: Viewer / Manager / Product Value Test

**Persona:** founder, HR manager, or team lead viewing results.

**Scenario:**

1. Open viewer portal.
2. Check organisation/team/comments/actions.
3. Confirm small groups stay protected.
4. Read recommendations or guidance.
5. Mark recommendation/action as seen, not seen, accepted, rejected, or done.
6. Check whether product explains what cannot be shown.

**Success signal:** viewer gets useful next steps without seeing anything that could identify respondents.

---

## 3. Scoring Template

Each pass receives scores from 1 to 5:

| Dimension | What It Measures |
|---|---|
| Security confidence | Does the product preserve confidentiality and explain it honestly? |
| Ease of start | Can the user begin without training? |
| Ease of understanding | Does the user know what each page/action means? |
| Recommendation usefulness | Are next steps practical and credible? |
| Action loop | Can users track seen/not seen/accepted/rejected/done? |
| Premium feel | Does it feel worth paying for by an SME/startup? |
| Production readiness | Could this be used with a real 10-60 person company? |

Average score is useful, but blockers override averages.

---

## 4. Report Template

### Executive Summary

- **Overall result:** Go / Conditional Go / No Go
- **Average score:** x/5
- **Blockers:** count
- **Major issues:** count
- **Recommendation:** continue, fix specific items, or pause.

### Pass Results

| Pass | Persona | Average | Result | Main Finding |
|---|---|---:|---|---|
| 1 | HR Admin | TBD | TBD | TBD |
| 2 | Employee | TBD | TBD | TBD |
| 3 | Viewer/Manager | TBD | TBD | TBD |

### Findings

| Severity | Area | Finding | Recommendation |
|---|---|---|---|
| Blocker/Major/Minor/Exception | TBD | TBD | TBD |

### Feature Coverage

| Feature | Tested In | Status |
|---|---|---|
| Admin navigation | Pass 1 | TBD |
| CSV employee upload | Pass 1 | TBD |
| Template selection | Pass 1 | TBD |
| Invite outbox | Pass 1 | TBD |
| Test email sending | Pass 1 | TBD |
| Survey taker confidentiality screen | Pass 2 | TBD |
| Token spend / duplicate block | Pass 2 | TBD |
| Protected report threshold | Pass 3 | TBD |
| Viewer portal | Pass 3 | TBD |
| Recommendations/guidance | Pass 3 | TBD |
| Seen/not seen/action status | Pass 3 | TBD |

---

## 5. Current Expected Result Before Running The Passes

**Likely result:** Conditional Go for internal prototype testing, No Go for real production pilot.

**Why:**

- The severed Supabase spine exists.
- Admin navigation has improved.
- Resend test-mode sending exists.
- Reports are threshold protected.
- But verified-domain email, real respondent delivery links for new cycles, Stripe, real SSO, and production privacy contact are still not complete.

**Recommended next build before full three-pass UAT:**

1. Add delivery-safe respondent links for newly created cycles.
2. Add recommendation/action tracking with seen/not seen/accepted/rejected/done.
3. Add a guided walkthrough overlay for first-run HR use.
