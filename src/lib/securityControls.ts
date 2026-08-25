/**
 * Plain-English trust/architecture claims shown on both the public
 * `/security` page (no SaferSay account needed -- an HR admin forwards the
 * link straight to a DPO or works-council rep) and the in-app
 * `/app/workspace/security` page (same content, inside the app shell for a
 * signed-in admin). Single source so the two copies can't drift apart.
 */
export const securityControls: Array<[title: string, text: string]> = [
  ["Identity store", "Sign-in, eligibility, reminder status, token issue state. No answers."],
  ["Response store", "Answers, cycle id, safe tags only. No name, email, employee id, IP, or user agent."],
  ["Minimum group size", "Reports and exports suppress groups below the threshold Settings sets for new surveys -- a survey already collecting responses keeps the threshold it launched with."],
  ["Reminder isolation", "Reminders target unspent participation tokens only; they never read answers."],
  ["Payment isolation", "Stripe receives billing metadata only, never employee answers or survey tokens."],
  ["No emotion inference", "No psychological or emotional state classification, now or later."],
];
