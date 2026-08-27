export type TemplateQuestionOption = { key: string; label: string };

export type SurveyTemplate = {
  slug: string;
  name: string;
  category: "Engagement" | "Pulse" | "Onboarding";
  duration: string;
  description: string;
  questions: Array<{
    id: string;
    construct: string;
    type: "likert_5" | "enps_0_10" | "open_text" | "multiple_choice" | "ranking" | "matrix";
    text: string;
    optional?: boolean;
    /** multiple_choice/ranking: the choice list. matrix: the shared column
     * set every row in the group answers against. Unused otherwise. */
    options?: TemplateQuestionOption[];
    /** Matrix rows sharing this key render as one grid on the taker
     * surface and tally as one visual group in reports -- see
     * db/migrations/0030_question_types_and_branching.sql's doc comment.
     * A stable per-template UUID is derived from this key in
     * surveyCycleService.ts, not stored here. */
    matrixGroup?: string;
  }>;
};

export const surveyTemplates: SurveyTemplate[] = [
  {
    slug: "full-engagement-survey",
    name: "Full Engagement Survey",
    category: "Engagement",
    duration: "22 questions · 10 minutes",
    description:
      "A complete engagement survey across seven themes, plus eNPS -- enough breadth for a real theme heatmap and strengths/priorities read, not just a handful of one-off questions.",
    questions: [
      // Two to three questions per theme -- a single question per construct
      // can't produce a meaningful per-theme average, and a report with
      // only 7-8 one-question "themes" reads as a flat list, not the
      // heatmap this template is built to feed.
      { id: "q1", construct: "Engagement", type: "likert_5", text: "I would recommend this company as a great place to work." },
      { id: "q2", construct: "Engagement", type: "likert_5", text: "I feel motivated to go above and beyond in my role." },
      { id: "q3", construct: "Purpose & Values", type: "likert_5", text: "I understand how my work connects to the company's mission." },
      { id: "q4", construct: "Purpose & Values", type: "likert_5", text: "I am proud to work at this company." },
      { id: "q5", construct: "Clarity & Autonomy", type: "likert_5", text: "I understand what is expected of me at work." },
      { id: "q6", construct: "Clarity & Autonomy", type: "likert_5", text: "I have enough autonomy to do my job well." },
      { id: "q7", construct: "Growth & Support", type: "likert_5", text: "I can see a path to learn and grow in my role." },
      { id: "q8", construct: "Growth & Support", type: "likert_5", text: "I have the tools and resources I need to do good work." },
      { id: "q9", construct: "Growth & Support", type: "likert_5", text: "I receive useful feedback on my performance." },
      { id: "q10", construct: "Inclusion & Voice", type: "likert_5", text: "I can raise concerns here without it counting against me." },
      { id: "q11", construct: "Inclusion & Voice", type: "likert_5", text: "People of all backgrounds are treated fairly here." },
      { id: "q12", construct: "Inclusion & Voice", type: "likert_5", text: "My opinion seems to matter in decisions that affect my work." },
      { id: "q13", construct: "Wellbeing & Reward", type: "likert_5", text: "My workload is manageable." },
      { id: "q14", construct: "Wellbeing & Reward", type: "likert_5", text: "I am fairly compensated for the work I do." },
      { id: "q15", construct: "Wellbeing & Reward", type: "likert_5", text: "I can maintain a healthy balance between work and life outside it." },
      { id: "q16", construct: "Leadership & Direction", type: "likert_5", text: "I understand where the company is heading and why." },
      { id: "q17", construct: "Leadership & Direction", type: "likert_5", text: "Senior leaders communicate clearly and often." },
      // NOTE: multiple_choice/ranking/matrix answers are captured and can
      // be suppression-aggregated (getProtectedOptionReport already
      // exists), but that method has zero callers anywhere in the app --
      // no API route, no UI. Using those question types here would collect
      // real respondent data nobody could ever see in a report. Kept to
      // likert_5 until that reporting surface actually exists; see the
      // follow-up note where this template is documented.
      { id: "q18", construct: "Leadership & Direction", type: "likert_5", text: "My manager is approachable when I need to talk." },
      { id: "q19", construct: "Leadership & Direction", type: "likert_5", text: "My manager gives me feedback that helps me improve." },
      { id: "q20", construct: "Leadership & Direction", type: "likert_5", text: "My manager treats decisions about my work fairly." },
      { id: "q21", construct: "eNPS", type: "enps_0_10", text: "How likely are you to recommend this company as a place to work?" },
      { id: "q22", construct: "Open text", type: "open_text", text: "What is the one thing we should change to make this a better place to work?", optional: true },
    ],
  },
  {
    slug: "engagement-check",
    name: "Engagement Check",
    category: "Engagement",
    duration: "8 questions · 5 minutes",
    description: "A short full-team engagement survey grounded in clarity, support, recognition, growth, and voice.",
    questions: [
      { id: "q1", construct: "Role clarity", type: "likert_5", text: "I understand what is expected of me at work." },
      { id: "q2", construct: "Resources", type: "likert_5", text: "I have the tools and information I need to do good work." },
      { id: "q3", construct: "Manager support", type: "likert_5", text: "My manager gives me useful support when I need it." },
      { id: "q4", construct: "Recognition", type: "likert_5", text: "Good work is noticed and recognised here." },
      { id: "q5", construct: "Voice", type: "likert_5", text: "People here can raise concerns without it counting against them." },
      { id: "q6", construct: "Growth", type: "likert_5", text: "I can see a path to learn and grow in my role." },
      { id: "q7", construct: "Direction", type: "likert_5", text: "I understand where the company is heading." },
      { id: "q8", construct: "Open text", type: "open_text", text: "What one change would most improve your work experience?", optional: true },
    ],
  },
  {
    slug: "enps-pulse",
    name: "eNPS Pulse",
    category: "Pulse",
    duration: "4 questions · 2 minutes",
    description: "Fast recommendation pulse for a first run or lightweight quarterly check.",
    questions: [
      { id: "q1", construct: "eNPS", type: "enps_0_10", text: "How likely are you to recommend this company as a place to work?" },
      { id: "q2", construct: "Direction", type: "likert_5", text: "I feel confident about the company’s direction." },
      { id: "q3", construct: "Support", type: "likert_5", text: "I get the support I need to do my best work." },
      { id: "q4", construct: "Open text", type: "open_text", text: "What is the main reason for your score?", optional: true },
    ],
  },
  {
    slug: "team-health",
    name: "Team Health",
    category: "Pulse",
    duration: "8 questions · 5 minutes",
    description: "Practical team survey focused on workload, clarity, collaboration, and follow-through.",
    questions: [
      { id: "q1", construct: "Priorities", type: "likert_5", text: "Our team priorities are clear." },
      { id: "q2", construct: "Workload", type: "likert_5", text: "Our workload is sustainable." },
      { id: "q3", construct: "Collaboration", type: "likert_5", text: "People on this team collaborate well across responsibilities." },
      { id: "q4", construct: "Meetings", type: "likert_5", text: "Our meetings help us make progress." },
      { id: "q5", construct: "Decision quality", type: "likert_5", text: "Decisions are made at the right level and communicated clearly." },
      { id: "q6", construct: "Manager support", type: "likert_5", text: "My manager helps remove blockers." },
      { id: "q7", construct: "Action loop", type: "likert_5", text: "Feedback from previous surveys led to visible action." },
      { id: "q8", construct: "Open text", type: "open_text", text: "What should this team start, stop, or continue?", optional: true },
    ],
  },
  {
    slug: "onboarding-checkin",
    name: "Onboarding Check-In",
    category: "Onboarding",
    duration: "7 questions · 4 minutes",
    description: "For new starters after 4+ weeks. Warns admins if the cohort cannot meet the confidentiality threshold.",
    questions: [
      { id: "q1", construct: "Expectations", type: "likert_5", text: "I understand what success looks like in my role." },
      { id: "q2", construct: "Tools", type: "likert_5", text: "I have the tools and access I need." },
      { id: "q3", construct: "Manager check-in", type: "likert_5", text: "My manager checks in with me at the right frequency." },
      { id: "q4", construct: "Team connection", type: "likert_5", text: "I feel connected to my team." },
      { id: "q5", construct: "Process", type: "likert_5", text: "I know where to find important company information." },
      { id: "q6", construct: "Workload", type: "likert_5", text: "My workload feels reasonable for this stage." },
      { id: "q7", construct: "Open text", type: "open_text", text: "What would have made your first weeks easier?", optional: true },
    ],
  },
];

export function getTemplate(slug: string) {
  return surveyTemplates.find((template) => template.slug === slug);
}
