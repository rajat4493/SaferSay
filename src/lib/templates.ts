export type SurveyTemplate = {
  slug: string;
  name: string;
  category: "Engagement" | "Pulse" | "Onboarding";
  duration: string;
  description: string;
  questions: Array<{
    id: string;
    construct: string;
    type: "likert_5" | "enps_0_10" | "open_text";
    text: string;
    optional?: boolean;
  }>;
};

export const surveyTemplates: SurveyTemplate[] = [
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
