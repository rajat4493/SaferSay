# RESEARCH_FINDINGS.md — Confidential Employee Survey Platform

**Date:** 30 July 2026  
**Purpose:** Required pre-build research for the confidential employee survey platform brief. This document should inform `BUILD_PLAN.md` before implementation begins.

---

## Executive Findings

1. The brief's core positioning is directionally right: small teams have a gap between free form tools and annual HR suites. The strongest wedge is not "better surveys"; it is a credible confidentiality architecture plus a fast, polished first run.
2. The product must say **confidential**, not **anonymous**, unless a specific dataset has been irreversibly anonymised. EU/UK data-protection guidance distinguishes pseudonymisation from anonymisation; pseudonymised records remain personal data when additional information can re-identify a person.
3. The severed-store architecture is necessary but not sufficient. Reporting controls, segment thresholds, retention rules, access controls, audit logs, and privacy copy are all part of the confidentiality claim.
4. A minimum reporting threshold of 5 is defensible for v1, but it must apply to every rendered cell, export, filter, comparison, segment, chart, and open-text display. Suppression must be automatic and tested.
5. Competitor pricing supports the anti-lock-in argument. Culture Amp is annual and sales-led; Workday Peakon/Viva Glint are enterprise/Microsoft ecosystem plays; Workleap now starts at multi-thousand annual pricing; Lattice and 15Five are per-seat annual platforms; SurveyMonkey is generic survey SaaS with paid export/analysis tiers.
6. EU AI Act risk is real: do not build emotion recognition, psychological-state inference, deception detection, affect detection, or employee risk scoring. Even future AI summarisation should be limited to thematic summarisation of text and manager-facing playbooks, with no claims about respondents' mental or emotional states.

---

## 2026 Market Gap Addendum

**Date:** 3 August 2026  
**Purpose:** Answer five product-strategy questions: what is actually missing, what different companies want, where the pain sits for employers and survey takers, and what could become a best-in-category idea for SaferSay.

### 1. What Is Actually Missing In The Market

The market is crowded, but the missing product is narrow and real:

**A trust-first employee listening product for 10-60 person companies that can be launched in minutes, paid for without an annual suite contract, and closed with visible action.**

Current tools cluster into four groups:

| Category | Examples | What they do well | What is missing |
|---|---|---|---|
| Enterprise listening suites | Culture Amp, Peakon, Viva Glint | Benchmarks, people science, enterprise security, mature analytics | Too much procurement, setup, annual commitment, and HR maturity for small companies |
| People/performance suites | Lattice, 15Five, Workleap | Engagement connected to reviews, manager workflows, goals, action plans | Bundled platform economics; engagement is one module inside a larger people suite |
| SMB pulse tools | Officevibe / Workleap Officevibe | Simplicity, pulse cadence, manager guidance, integrations | Small-group anonymity tension; weaker proof that identity and answers cannot be joined |
| Generic forms | Google Forms, Typeform, Tally, SurveyMonkey | Fast form creation, familiar UX, cheap/free starts | No built-in confidentiality architecture, threshold suppression, safe reporting, or action accountability |

The highest-value gap is not another survey builder. It is the **confidentiality-to-action gap**:

1. Employees do not fully trust "anonymous" claims, especially in small teams.
2. Companies still need enough signal to act.
3. Managers need safe guidance without seeing raw identity-linked comments.
4. HR needs proof that follow-up happened, otherwise every later survey gets weaker.

Evidence:

- Gallup states that what matters is not only whether surveys are anonymous, but whether employees believe responses are confidential and used responsibly.
- A 2025 qualitative pulse-survey study found confidentiality was considered essential for truthful responses, but also found common reporting for groups of only 3-5, creating anonymity and reliability problems.
- SurveyMonkey's 2025 benchmark data shows employee engagement surveys averaging roughly 21% response rates on its platform, while mature/high-trust internal programs can be far higher.
- Lattice publishes a $4/user/month Engagement module but also a $4,000 annual minimum, which creates a real purchase barrier for very small teams.
- Workleap/Officevibe positions around SMB simplicity and starts around $5/user/month, but its help docs show scores can display with a minimum of 3 responses per metric, which is weaker than SaferSay's stricter k>=5 trust posture.

### 2. What Different Companies Want

Different company types are not buying the same thing:

| Company type | What they want | What they fear | SaferSay fit |
|---|---|---|---|
| 10-25 person founder-led startup | "Tell me if something is wrong without creating HR admin work." | Employees may not trust the founder-run process; small groups make anonymity fragile | Strong fit if positioned as an external confidential pulse with no setup burden |
| 25-60 person startup/SME | "Give me enough signal to retain people and stop small problems becoming exits." | Tool cost, lack of HR expertise, low response rates, no action follow-through | Core ICP |
| 60-250 scaling company | "Segment by team/location/manager safely and track action." | Losing trust, manager misuse, needing more role controls | Fit after role/viewer scopes and manager action loop |
| 250+ mid-market | Benchmarks, HRIS integration, manager enablement, sophisticated analytics | Security review, works council/privacy concerns, procurement | Later market; do not chase first |
| Regulated / public / healthcare | Defensible process, audit logs, safe reporting, legal review | Retaliation, compliance breach, discovery/legal exposure | Only after audit logs, legal/privacy maturity, and grievance separation |

Buying triggers by type:

- **Founder/CEO:** retention risk, culture uncertainty, recent resignation, funding/scale stress.
- **Junior HR / People Ops:** needs a credible survey without becoming a data analyst.
- **COO/Ops:** wants operational clarity, not HR theatre.
- **Manager:** wants one practical action, not a 40-page report.
- **Employee:** wants protection, proof of follow-up, and low effort.

### 3. Company Pain Areas

Company-side pain is practical and economic:

1. **Low trust creates bad data.** If employees think responses can be traced, the result is either low response or "safe" answers.
2. **Small teams break anonymity.** A company of 20 people may only have 3 engineers, 2 salespeople, or 1 new starter. Segment-level reporting can expose people.
3. **No HR expertise.** In SMEs, the buyer may be a founder, office manager, COO, or junior HR generalist.
4. **Enterprise tools are overbuilt.** They assume HR process maturity, procurement, annual contracts, people analytics literacy, and manager training.
5. **Free tools create liability.** Google Forms can collect sensitive employee data, exact timestamps, free-text identifiers, and raw exports without guardrails.
6. **Reports do not change behavior.** Many tools collect data but do not force a visible action loop.
7. **Managers need help, but AI can become unsafe.** Companies want recommendations, but workplace emotion inference and individual risk scoring are legally and ethically dangerous.
8. **Cost predictability matters.** SMBs dislike annual commitments and per-seat suites when they only want one pulse or quarterly cycle.
9. **Legal/compliance ambiguity.** "Anonymous feedback" and grievance/harassment reporting are often conflated, but they need separate handling.

For SaferSay, the product should sell:

- "Launch one confidential pulse in 10 minutes."
- "No annual lock-in."
- "No raw identity-answer join."
- "Reports only show groups of 5+."
- "Every survey ends with one visible action."

### 4. Survey-Taker Pain Areas

Employee/respondent pain is different from company pain:

1. **Fear of being identified.** Small-team demographics, writing style, timing, and unique situations can reveal identity.
2. **Fear of retaliation.** Speaking-up research repeatedly shows retaliation fear suppresses honest reporting.
3. **Belief that nothing will change.** If last survey produced no action, the next survey feels performative.
4. **Survey fatigue.** Long surveys and repeated pulses without visible outcome train people to ignore the next invite.
5. **Unclear confidentiality copy.** "Anonymous" without explanation can reduce trust rather than increase it.
6. **Open text risk.** Employees may self-identify accidentally, or avoid writing the useful detail because they are afraid.
7. **Unhelpful questions.** Generic questions that do not map to action feel like HR box-ticking.
8. **No feedback loop to respondents.** Employees rarely see "what we heard / what we will do / what we cannot show because it would identify people."

Respondent trust requirements:

- Show the confidentiality screen before Q1.
- Explain identity store vs answer store in plain language.
- Say exactly what the employer can and cannot see.
- Warn against self-identifying details in open text.
- Show after submission what happens next.
- Later, show a team-facing action note after the report is reviewed.

### 5. Best Idea In This Field

The strongest product idea is:

## The Confidential Action Loop

Not "AI survey recommendations." Not "anonymous forms." The best wedge is a product that guarantees every survey becomes a safe, visible, tracked action without exposing people.

Core concept:

1. **Run a confidential pulse.**
2. **Suppress unsafe data automatically.**
3. **Generate 1-3 safe, manager-facing action options from a curated playbook.**
4. **Require the manager/founder to choose one action.**
5. **Share a short "You said / we will" note back to employees.**
6. **Track whether the action was seen, accepted, rejected, in progress, or done.**
7. **Ask the next survey whether the action was noticed.**

This is more powerful than a dashboard because it solves the trust flywheel:

- Employees trust the system because identity is protected and follow-up is visible.
- Companies trust the system because it gives one practical next step, not an overwhelming analytics dump.
- Future response rates improve because people see the loop close.

### SaferSay's Differentiating Product Principles

1. **Confidentiality is a product feature, not a policy sentence.**
2. **Small-company defaults must be safer than enterprise defaults.**
3. **If a report cell is unsafe, the product should explain why and suggest what to do instead.**
4. **No open-ended AI advice in v1. Use curated playbooks mapped to question constructs.**
5. **Every survey must end with an action note, even if the note says "we cannot show team-level data yet because fewer than five people responded."**
6. **Respondents should see the action loop too, not only HR.**

### Recommended Product Bets

| Bet | Why it matters | Build timing |
|---|---|---|
| Delivery-safe invite links | Makes live survey cycles real | Now |
| Verified sending domain/mailbox | Makes employee delivery credible | Now |
| Google/Microsoft OAuth with tenant allowlist | Makes admin login realistic without open signup risk | Now |
| Confidential Action Loop | Converts reports into visible trust-building behavior | Now/Next |
| TAT instrumentation | Measures whether "easy to start" is real | Now/Next |
| Curated playbook recommendations | Gives useful guidance without risky AI inference | Next |
| Grievance channel separation | Prevents anonymity/legal-duty contradiction | Later, legal-reviewed |
| Slack/Teams delivery | Useful reminder/action surface but not first critical path | Later |

### Updated Answer To "What Is Missing?"

The missing product is **not** a cheaper Culture Amp clone.

The missing product is a **small-company confidential listening loop**:

- Fast enough for a founder or junior HR person.
- Strict enough that employees believe it.
- Cheap/flexible enough for 10-60 people.
- Honest enough to say when data cannot be shown.
- Action-oriented enough that the next survey gets more trust, not less.

### Additional 2026 Sources

- [Gallup: Employee Surveys, anonymity and confidentiality](https://www.gallup.com/workplace/692474/workplace-employee-surveys.aspx)
- [Frontiers 2025 qualitative study on pulse survey implementation](https://www.frontiersin.org/journals/organizational-psychology/articles/10.3389/forgp.2025.1696769/full)
- [SurveyMonkey 2025 response-rate benchmarks](https://www.surveymonkey.com/learn/survey-best-practices/survey-response-rate-benchmarks/)
- [Capterra: 2026 HR challenges for SMBs](https://www.capterra.com/resources/key-hr-challenges-smbs/)
- [Wiley Workplace Intelligence 2026 HR/L&D leader survey](https://newsroom.wiley.com/press-releases/press-release-details/2026/New-Wiley-Survey-HR-Leaders-Express-Optimism-About-2026-Despite-Expecting-Challenges-Change/default.aspx)
- [Gartner 2026 CHRO priorities](https://www.gartner.com/en/human-resources/trends/11-trends-that-will-shape-work-in-2022-and-beyond-hbr)
- [G2 Culture Amp reviews and pros/cons](https://www.g2.com/products/culture-amp/reviews)
- [Lattice pricing](https://lattice.com/pricing)
- [Workleap pricing](https://workleap.com/pricing)
- [Workleap Officevibe surveys](https://workleap.com/officevibe/surveys)
- [Workleap Officevibe score/report threshold help](https://help.workleap.com/en/articles/10281693-understand-workleap-officevibe-scores-and-survey-reports)
- [Institute of Business Ethics 2024 Ethics at Work Survey](https://www.ibe.org.uk/knowledge-hub/bullying-and-sexual-harassment-go-unreported-as-employees-fear-retaliation/)

---

## 1. Onboarding UX Benchmark

### Patterns To Copy

**First valuable object exists immediately.** Calendly's onboarding is often analysed as effective because new users quickly land on a pre-built meeting/event object and can copy/share a booking link or view the booking flow. The lesson for this product: after SSO, create a ready survey cycle from a recommended template rather than dropping users into an empty builder.

**Template-first, not blank-page-first.** Typeform and Tally both lean heavily on templates. Typeform positions its forms around a polished one-question-at-a-time experience and publishes many templates; Tally advertises simple document-like form creation plus a template gallery. For this product, the buyer's first action should be selecting from 3-4 credible survey templates, not writing questions.

**Progressive disclosure.** The setup should ask only what is needed to launch: company name/logo, employee list/import, template, survey window, and sender details. Advanced settings should be hidden until after the first launch.

**SSO/connect-first signup.** Calendly's core onboarding maps directly to connecting a calendar. Here, the equivalent is Google Workspace/Microsoft 365 login and directory import. The first screen after auth should show "employees found" and "recommended template" rather than account setup.

**Respondent UX as trust device.** Typeform's one-question-per-screen, mobile-optimised flow matters because response quality is damaged by fatigue and distrust. The respondent flow should feel calm and single-purpose: confidentiality explanation, one question per screen, visible progress, no clutter, no manager/admin language.

### Product Implications

- Activation metric: "survey cycle scheduled or launched" within 10 minutes, not "account created."
- Default path: SSO -> imported employees -> choose recommended template -> confirm confidentiality screen -> schedule/send.
- Avoid an elaborate builder in v1. Use lightweight editing only after template selection.
- Show a preview of the respondent confidentiality screen during setup; it helps the buyer understand the trust story they are buying.

### Sources

- [Calendly customer onboarding](https://calendly.com/blog/customer-onboarding)
- [Typeform product onboarding template](https://www.typeform.com/templates/product-onboarding-form-template)
- [Typeform homepage](https://www.typeform.com/)
- [Tally homepage](https://tally.so/)
- [Tally templates](https://tally.so/templates)
- [Userpilot onboarding UX examples, Calendly analysis](https://userpilot.com/blog/onboarding-ux-examples/)
- [Formbricks onboarding best practices](https://formbricks.com/blog/user-onboarding-best-practices)

---

## 2. Confidentiality Architecture

### What Must Be True

The system needs identity for SSO, eligibility, one-response-per-person, and reminders. But it must prevent employers and ordinary application paths from linking identity to response content.

The architecture should treat this as **severance plus suppression**:

1. **Identity/participation store:** tenant membership, SSO subject IDs, emails, eligibility, delivery/reminder state, and issued token metadata.
2. **Response store:** survey cycle, answers, coarse segment labels, token hash used for deduplication, timestamps rounded or withheld from reporting.
3. **No direct person key in responses:** no `user_id`, email, name, SSO ID, employee ID, IP address, user agent, raw token, invitation ID, or delivery event ID in response tables.
4. **One-way token flow:** Store A issues a high-entropy random submission token. Store A keeps only a hash plus participation state. The respondent submits using the token; Store B stores only a keyed hash or digest used to prevent duplicate submission. The raw token is never persisted after issue.
5. **Reminder isolation:** reminders operate from Store A by checking issued token hashes marked unsubmitted. They do not query Store B for answers. Submission should update Store A participation state through a narrow, audited function that receives only a token proof, never answer content.
6. **Reporting threshold:** every report query enforces k >= 5. If a segment, filter, trend cell, export row, open-text list, or comparison has fewer than 5 responses, it is suppressed.
7. **Time and metadata minimisation:** exact submission timestamps, IP addresses, user agents, and email open/click events can re-identify people in small teams. Do not store them in Store B; if operational logs exist, keep them isolated, short-lived, and excluded from product/admin access.

### Why Pseudonymisation Is Not Enough

European data-protection guidance draws a hard line between pseudonymisation and anonymisation. Pseudonymisation reduces linkability but remains personal data if additional information can attribute the data back to a person. Anonymisation requires data to be unlinkable to an individual in practice. Therefore the product should not claim "anonymous" at the system level. It should claim confidentiality with a clear explanation of what the system knows and what the employer cannot see.

### Recommended v1 Technical Controls

- Separate Postgres schemas: `identity` and `responses`.
- Separate database roles:
  - app admin role can manage Store A.
  - response write role can insert answers but cannot read Store A.
  - report role can read only thresholded views/functions, not raw response rows.
- Row-level security on all tenant-owned tables.
- No cross-schema foreign keys from `responses` to `identity`.
- Migration/test guard that fails if a response table contains forbidden columns such as `user_id`, `email`, `employee_id`, `sso_subject`, `ip_address`, `user_agent`, `invitation_id`.
- Report functions must require `min_n` default 5 and return suppressed cells as `null`/`protected`, not zero.
- CSV/PDF exports use the same thresholded reporting layer, unless exporting raw cycle-level answers with no person-identifying metadata and no sub-5 segment labels.
- Open text should not render until cycle response count is >= 5; later, consider stricter thresholds or redaction.

### Architectural Risk To Flag

The brief says "even by a database admin." Strictly, a superuser with unrestricted database, application log, email provider, and infrastructure access can often correlate timing, delivery logs, or raw tokens if systems are poorly configured. To make the claim credible, v1 should phrase the stronger guarantee as: **product and employer admin interfaces cannot link identity to answers; database-level design contains no person-response join path; operational access is minimised and audited.** If the marketing claim remains "even a database admin cannot," then we need stricter measures: physically separate databases/projects, separate credentials, no shared logs, hardened access controls, and possibly a one-way submission service boundary.

### Sources

- [EDPB: anonymisation and pseudonymisation](https://www.edpb.europa.eu/topics/ai-and-technology/anonymisation-pseudonymisation_en)
- [EDPB Guidelines 01/2025 on Pseudonymisation](https://www.edpb.europa.eu/system/files/2025-01/edpb_guidelines_202501_pseudonymisation_en.pdf)
- [ICO anonymisation guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/)
- [ICO pseudonymisation guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/pseudonymisation/)
- [ICO: ensuring anonymisation is effective](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/how-do-we-ensure-anonymisation-is-effective/)
- [Kultify example of k-anonymity reporting at k=5](https://kultify.de/en/datenschutz)

---

## 3. Competitor Feature + Pricing Teardown

| Competitor | Current pricing signal | Confidentiality/anonymity signal | Contract/data concern | v1 positioning implication |
|---|---:|---|---|---|
| Culture Amp | Sales-led; annual billing based on employee count/product/service tier. Third-party buyer data suggests multi-thousand annual contracts. | Strong people-science/privacy positioning; enterprise security claims. | Annual basis; not self-serve for small episodic use. | Position against annual commitment and procurement friction, not against feature depth. |
| Workday Peakon Employee Voice | Sales-led enterprise. Public marketplace references around USD 20k/year; UK G-Cloud doc references 3-year subscription assumptions. | Employee voice/sentiment platform integrated with Workday ecosystem. | Enterprise deployment and Workday ecosystem gravity. | Position as separate from HRIS and launchable in minutes, not weeks. |
| Lattice | Public pricing: Foundations around $13/seat/month; Engagement add-on around $4/seat/month, typically annual. | Engagement includes Pulse, Surveys, eNPS, onboarding/exit, exports, AI insights. | Per-seat platform economics; broader performance suite. | For 10-60 employees, a per-cycle product is easier to buy for episodic surveys. |
| 15Five | Public pricing: Engage $4/user/month, Perform $11, Total Platform $16. | Engagement surveys, AI analytics, action planning. | Per-user platform, annual billing commonly implied. | Similar price-per-seat issue; differentiate on confidential architecture and pay-per-cycle. |
| SurveyMonkey | Team Premier shown at EUR 75/user/month, 3+ users, billed annually; additional responses over quota charged. | Generic survey anonymity options, not employee-confidential architecture. | Data export/advanced analysis tied to paid plans; generic tool. | "Your data always exportable, never held hostage" is a strong contrast. |
| Microsoft Viva Glint / Viva | Viva Workplace Analytics and Employee Feedback listed at $6/user/month paid yearly; Viva Suite $12/user/month paid yearly. | Employee feedback inside Microsoft ecosystem. | Annual per-user Microsoft bundle; employer-system adjacency. | Separate-from-HR/Microsoft trust story is key. |
| Officevibe / Workleap | Workleap pricing page shows Standard starting at $4,999 USD, Pro at $11,999 USD; Officevibe pages are demo-led. | Anonymous feedback/pulse positioning. | Multi-thousand annual package, broader employee experience suite. | Strong validation that small-company floor remains open. |
| Google Forms | Free with Google account/workspace; exports to Sheets. | No purpose-built confidentiality architecture or safe employee segmentation. | Free, but employer/admin can design traceable forms and inspect raw data. | Beat on trust, reports, and guardrails, never on price. |
| FormGrid | Generic/low-cost form builder positioning; not a dedicated confidential employee survey platform. | No clear evidence of provable employee confidentiality/min-k reporting as core product moat. | Form-builder category weakness: raw data collection and manual analysis. | Treat as "free/cheap but not trusted." |

### Notes

- Public pricing is inconsistent across regions and often sales-led. The exact competitor number is less important than the repeated pattern: annual, per-seat, suite-led, or generic form-tool pricing.
- Be careful with "paywall collected data" claims. SurveyMonkey does offer exports, but export formats and analysis depth are plan-dependent. Use precise copy: **"we never make you upgrade to export your own completed survey data."**

### Sources

- [Culture Amp pricing](https://www.cultureamp.com/platform/plans-and-pricing)
- [Vendr Culture Amp pricing data](https://www.vendr.com/marketplace/culture-amp)
- [Workday Peakon overview](https://www.workday.com/en-au/products/employee-voice/overview.html)
- [Capterra Workday Peakon pricing reference](https://www.capterra.com.au/software/151069/peakon)
- [UK G-Cloud Workday Peakon pricing PDF](https://assets.applytosupply.digitalmarketplace.service.gov.uk/g-cloud-14/documents/700649/571438267625250-pricing-document-2024-05-07-0803.pdf)
- [Lattice pricing](https://lattice.com/pricing)
- [15Five pricing](https://www.15five.com/pricing)
- [SurveyMonkey pricing](https://www.surveymonkey.com/pricing/)
- [SurveyMonkey export help](https://help.surveymonkey.com/en/surveymonkey/analyze/exports/)
- [Microsoft Viva pricing](https://www.microsoft.com/en-us/microsoft-viva/pricing)
- [Microsoft Viva Glint licensing](https://learn.microsoft.com/en-us/viva/glint/setup/glint-order-teams)
- [Workleap pricing](https://workleap.com/pricing)
- [Workleap Officevibe](https://workleap.com/officevibe)
- [Tally homepage](https://tally.so/)
- [Google Forms](https://www.google.com/forms/about/)

---

## 4. Legal / Compliance Baseline

### GDPR Requirements For v1

This product processes employee personal data at least in Store A, and potentially in Store B if response content or segment data could identify a person. v1 should assume GDPR applies.

Minimum baseline:

- Define roles clearly: customer/employer is likely controller; platform is processor for survey administration, with possible independent-controller obligations for operational/security processing depending on final model.
- Provide a Data Processing Agreement before paid launch.
- Lawful basis: for employers, consent can be problematic in employment contexts because of power imbalance. Legitimate interests or legal/HR obligations may be more realistic, but the product should not decide this for customers. Provide configurable privacy notice text and require customer confirmation of lawful basis.
- Data minimisation: collect only identity data needed for eligibility, delivery, deduplication, and reminders. Do not collect birthdate, gender, exact age, manager, location, or team unless needed for segmentation, and suppress small groups.
- Transparency: respondent privacy notice before Q1 must explain identity store, response store, tokens, reminders, employer-visible outputs, retention, and rights.
- Security: EU data residency option, encryption in transit/at rest, RLS, least-privilege roles, audit logs, separate secrets, short-lived operational logs.
- Rights and retention: export/delete tenant data, delete participation records after retention period, retain history only for paid floor tier, define response retention by cycle.
- Subprocessors: Stripe, Resend, hosting, database provider, auth providers must be disclosed.
- DPIA readiness: provide documentation explaining confidentiality controls, data flow, and residual re-identification risk.

### Confidential vs Anonymous

Use "confidential" for the product. Use "anonymous" only for aggregated outputs or datasets that are actually anonymised under the relevant identifiability standard. The respondent screen should say plainly:

> We use your sign-in only to confirm you are eligible and to prevent duplicate responses. Your answers are stored separately from your identity. Your employer sees only grouped results, and groups smaller than 5 are hidden.

### EU AI Act

The EU AI Act prohibits AI systems intended to infer emotions of people in workplace and educational contexts, with narrow medical/safety exceptions. For this product:

- Do not classify comments by emotion, mood, sentiment-as-emotional-state, stress, burnout risk, deception, intent, mental health, personality, psychological safety of a person, or individual risk.
- Do not infer anything about individual respondents.
- Later AI summarisation, if built, should summarise themes at group level only, with k-thresholds, no individual-level claims, and no emotion-recognition language.

### Sources

- [GDPR Article 5 principles](https://gdpr-info.eu/art-5-gdpr/)
- [EDPB SME guide: secure personal data](https://www.edpb.europa.eu/sme/be-compliant/secure-personal-data_en)
- [EDPB: anonymisation and pseudonymisation](https://www.edpb.europa.eu/topics/ai-and-technology/anonymisation-pseudonymisation_en)
- [ICO anonymisation guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/)
- [EU AI Act Article 5](https://artificialintelligenceact.eu/article/5/)
- [Future of Privacy Forum: emotion recognition prohibition in workplace and education](https://fpf.org/blog/red-lines-under-eu-ai-act-unpacking-the-prohibition-of-emotion-recognition-in-the-workplace-and-education-institutions/)

---

## 5. Question-Bank Sourcing

### Validated Constructs To Use

Do not copy proprietary question text verbatim. Build original questions around established constructs:

**Engagement / Gallup Q12-style needs**

- Role clarity
- Tools/resources
- Strengths fit
- Recognition
- Manager care/support
- Growth/development
- Voice/opinions count
- Mission/purpose connection
- Quality/accountability
- Team commitment
- Belonging/relationships
- Progress/learning

**eNPS**

- One 0-10 recommendation question.
- Scoring: promoters 9-10, passives 7-8, detractors 0-6; eNPS = % promoters - % detractors.
- Add one open follow-up: "What is the main reason for your score?" Render only when safe threshold is met.

**Pulse**

- Workload sustainability
- Priorities/clarity
- Manager support
- Collaboration
- Confidence in company direction
- Psychological safety as a team climate construct, not individual psychological inference
- Action follow-through from previous survey

**Onboarding**

- Role expectations
- Access to tools
- Manager check-ins
- Connection to team
- Confidence navigating company processes
- Early workload reasonableness
- Understanding of success criteria

### Recommended v1 Templates

1. **5-Minute Engagement Check**
   - 8 Likert questions, 1 optional open text.
   - Constructs: clarity, resources, recognition, voice, growth, manager support, team trust, direction.

2. **eNPS Pulse**
   - 1 eNPS rating, 3 diagnostic Likert questions, 1 optional open text.
   - Fastest buyer activation path.

3. **New Starter Check-In**
   - 8 Likert questions for employees in first 30-90 days.
   - Requires careful segmentation threshold; small companies may not have k >= 5 new starters, so v1 should warn before use.

4. **Team Health Pulse**
   - 8 Likert questions focused on workload, collaboration, clarity, and action follow-through.

### Question Design Rules

- Use 5-point Likert scales for most items: Strongly disagree to Strongly agree.
- Keep each template to 8-10 questions.
- Avoid double-barrelled questions.
- Avoid leading language.
- Use plain English.
- Include at most one optional open-text question in v1 reports, and suppress display/export if threshold is not met.

### Sources

- [Gallup Q12 overview](https://www.gallup.com/workplace/356063/gallup-q12-employee-engagement-survey.aspx)
- [Gallup Q12 question summary](https://www.gallup.com/workplace/356045/q12-question-summary.aspx)
- [Questback eNPS guide](https://www.questback.com/guides/employee-net-promoter-score-enps/)
- [Lattice eNPS guide](https://lattice.com/articles/what-is-employee-net-promoter-score-enps)
- [BambooHR eNPS glossary](https://www.bamboohr.com/resources/hr-glossary/employee-net-promoter-score-enps)

---

## Build-Relevant Decisions

1. Build the confidentiality spine before UI polish.
2. Treat `min_group_size = 5` as a system invariant, not a report preference.
3. Put privacy/trust copy in the product from day one; it is part of the product, not marketing.
4. Keep v1 templates original but traceable to known constructs.
5. Avoid raw response exports that include small-group segment tags.
6. Avoid any AI features in v1.
7. Use exact, narrow competitive claims:
   - "No annual lock-in."
   - "Pay per survey cycle."
   - "Export your data on every paid cycle."
   - "Confidential by design; identity and answers are stored separately."

---

## Risks / Brief Corrections

1. **"Even by a database admin" is too strong unless we use physically separate stores, strict infrastructure access, and no correlatable logs.** Separate schemas alone do not defeat a database superuser. The build plan should either strengthen architecture or soften copy.
2. **Directory import can create setup and permissions friction.** To preserve the 10-minute promise, v1 should support CSV paste/upload as a fallback even if SSO import is the premium path.
3. **New-starter onboarding surveys may violate k >= 5 for many 10-60 person companies.** The app should show "not enough eligible employees for confidential reporting" before launch.
4. **Open text is high re-identification risk.** Keep optional, suppress under threshold, and consider warning respondents not to include identifying details.
5. **Works council thresholds vary and are more nuanced than a single headcount cutoff.** The product should not make legal claims about not needing consultation.
6. **Payment model currencies need a product choice.** The brief uses pounds while ICP is EU. Pick GBP for owner preference or EUR for EU market fit before Stripe implementation.

---

## 6. Market Validation & Competitive Gap Analysis (Added 2026-08-03)

### Key Finding: The SMB Price Floor Is Open

Competitive pricing research confirms that no major competitor prices for 10–60 person companies as a primary segment:
- **Lattice:** ~$13–17/seat/month, $4k/year minimum = unaffordable for target market.
- **15Five:** ~$4–16/seat/month, annual lock-in, per-seat economics don't fit episodic survey use.
- **Culture Amp:** Sales-led, custom pricing, annual contracts, enterprise-focused.
- **Officevibe/Workleap:** $5k–12k/year minimum, repositioned as a suite, not pure survey tool.

**Implication:** A per-survey-cycle pricing model in the $3–5/employee/month range (or fixed $50–200/cycle for SMBs) is genuinely vacant. This is not a feature differentiation; it's a business-model wedge.

### Trust As The Actual Moat, Not Features

Research across G2, Capterra, and industry sources shows ~25% of employees admit dishonesty on pulse surveys at large tech firms, with 50%+ fearing backlash. The reason isn't missing survey features—it's doubts about whether "anonymous" actually means anonymous. Competitors claim anonymity; SaferSay's severance architecture *proves* it structurally.

**Implication:** Don't compete on features (Culture Amp has better analytics, Lattice has integration depth). Compete on "your identity and answers are stored separately by design, not by policy." Make this visible in the product, not just in marketing copy.

### Competitor Ease-of-Use Gap At The High End

Culture Amp users report report navigation is hard without training. Officevibe wins SMB on simplicity but feels constrained for larger orgs. SaferSay's strength is simplicity for SMB *with* a clear confidentiality explanation—this is not an accident to hide, it's a selling point.

### Sources
- [G2 Lattice, Culture Amp, 15Five reviews](https://www.g2.com/)
- [Capterra Officevibe/Workleap pricing](https://www.capterra.com/)
- [Blind: 25% of employees dishonest on pulse surveys](https://www.teamblind.com/blog/index.php/2019/12/19/nearly-a-quarter-of-employees-are-not-being-honest-on-employee-pulse-surveys)

---

## 7. Legal Disclosure Design: Resolving the Anonymity vs Legal Duty Contradiction

### The Problem
v1's core claim is "no one can link identity to answers." That's legally and functionally correct for engagement/pulse surveys (eNPS, workload, manager support). But companies have a *legal duty* to investigate reports of harassment (POSH Act in India, similar in EU/UK), discrimination, or financial misconduct—which requires identifying the reporter, at least to an investigation team, under due process.

A single "anonymous" system that tries to guarantee both absolute anonymity and legal investigation is a contradiction that breaks the first time it's tested.

### The Solution: Two Structurally Separate Channels

**Engagement Survey (existing severance model):** identity and answers are structurally severed in `identity` and `responses` schemas. Absolute anonymity, no disclosure path ever.

**Grievance Channel (new, separate system):** confidential (not anonymous-by-default), with identity known to a limited "investigator" role, protected by audit logs and dual-approval before any disclosure. Kept in a separate `grievance` schema, never mixed with engagement data.

**Critical UX requirement:** these must have different entry points, different consent screens, and different visual language in-product. Users must never reasonably confuse the two.

### EU Whistleblowing Directive Requirements (2023)
Companies with 50+ workers must provide a reporting channel; receipt acknowledged within 7 days, investigation outcome within 3 months. Anonymous reporting is allowed but not mandated (member-state discretion). Identity must remain confidential even where anonymity isn't guaranteed. GDPR applies; violations carry fines up to 4% of global revenue. ([EU Whistleblowing Directive](https://whistleblowersoftware.com/en/eu-whistleblowing-directive-summary))

### Before Shipping
- [ ] Outside employment-law review of the grievance-channel spec, especially jurisdiction-specific requirements (POSH in India, Works Council in Germany/Austria, etc.).
- [ ] Legal review of the in-product consent/privacy copy for both channels.
- [ ] Audit-log infrastructure built as part of this feature, not deferred.

### Sources
- [docs/strategy/grievance-channel-spec.md](docs/strategy/grievance-channel-spec.md) (full design)
- [EU Whistleblower Directive 2023](https://www.corporate complianceinsights.com/eu-whistleblower-directive-details/)
- [GDPR + Whistleblowing data-protection tension](https://www.lawcode.eu/en/blog/whistleblowing-directive-dsgvo-data-protection-notice-system/)

---

## 8. Onboarding TAT Instrumentation & Activation Metrics

### Current State
"Activation metric" is currently undefined and unmeasurable. The pilot checklist in `pilotStateService.ts` models the exact funnel but never records *when* steps complete.

### Proposed Instrumentation
Track these server-side events (reusing pilotStateService step keys):
1. `signup` — first user SSO login (single point, ~2 lines in authSession.ts)
2. `employees` — first employee CSV import succeeds
3. `cycle` — first survey cycle created
4. `tokens` — first tokens issued
5. `outbox` — first invite prepared
6. `queue` — first invite queued
7. `responses` — first response submitted
8. `report` — report unlocked (>= k-threshold)

Store in new `identity.onboarding_events` table (tenant_id, user_id, event_key, occurred_at). Cheap, additive, no severance-model risk.

**Activation metric:** cycle created within 10 minutes of signup. **Ultimate TAT:** first response collected within 48 hours.

### Why This Matters
Every downstream prioritization call (should we build directory import, should we enforce template selection, etc.) depends on data, not guesses. Instrument this early.

### Sources
- [docs/strategy/onboarding-tat-plan.md](docs/strategy/onboarding-tat-plan.md) (full spec)
- [pilotStateService.ts](src/lib/server/pilotStateService.ts) (existing step model)

---

## 9. Prioritized Implementation Roadmap (P0/P1/P2)

See [docs/strategy/roadmap.md](docs/strategy/roadmap.md) for the full roadmap. Re-sequenced 2026-08-03 per founder direction: the grievance channel, while strategically important, was mis-prioritized in the first pass — it adds legal complexity, new roles, and audit trails not needed to prove the core product. The real validation question comes first: can a 10–60 person company run one confidential survey, get enough responses, see useful output, and pay?

**Update, 2026-08-04 — real end-to-end proof + a new gap found by actually using the product:**
- Ran the full product spine live against production: real Google OAuth login, real CSV employee upload, real survey cycle, 5 real respondent submissions clicked through the actual browser UI, report correctly protected below k=5 and unlocked exactly at n=5 (verified via the app's own DB function). Tenant isolation confirmed (`401` from an unauthenticated session on another tenant's report).
- Founder asked directly whether they'd buy this as a founder — honest answer was no, chiefly because there was no way to customize a survey (only 3 hardcoded templates, zero editing). Built and shipped a minimal fix same-day: `/app/surveys/new` now supports include/exclude, reorder, and inline wording edits per question before creating a cycle. Customized cycles get their own cycle-scoped template row so edits never mutate the shared base template other tenants use — proven via a real Postgres-backed test against production, not just unit-level.
- Known bug found during the walkthrough, not yet fixed: TAT `outbox`/`queue` onboarding events aren't firing even though invites were genuinely prepared/queued successfully — needs root-causing.

**P0 — make one real paid confidential survey work:**
1. Verified Resend sender domain (`survey@safersay.com`) — untrusted sandbox sender hurts response rate and trust directly. *Still pending real domain verification; code now fails closed on the sandbox sender in production.*
2. ~~End-to-end live survey test~~ — **done, 2026-08-04**, proven live against production (see above).
3. **Minimal survey customization** — **done, 2026-08-04** (see above). Re-prioritized here from P2 after using the live product surfaced it as the top gap.
4. DB migration verification + integration tests, repeatable against Supabase. *Migrations through `0007` applied and verified against production.*
5. Stripe checkout + webhook + persisted billing (per-cycle pricing first). *Not yet built.*
6. Security hardening (rate limiting, CSP, secret rotation, fail-closed production mode).
7. CI/CD (lint/test/build/migration gates).

**P1 — make the pilot trustworthy and measurable:**
8. In-product confidentiality explainer — ships before grievance, not after.
9. TAT instrumentation completion (first-response and report-unlock events still unwired; outbox/queue events have a known firing bug, see above).
10. Observability (Sentry-class error tracking).
11. Action loop / recommendations ("You said / we will / done") — likely the biggest real differentiator; build before grievance.

**P2 — after first pilot signal:**
12. Role/access matrix, data retention/deletion controls, real PDF export, directory connectors.
13. Grievance/lawful-disclosure channel with legal review — deliberately deferred until core product has proven demand.
