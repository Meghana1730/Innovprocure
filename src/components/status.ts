// Label and tone of every status code used in the app.

export type Tone = 'danger' | 'warning' | 'success' | 'info' | 'neutral' | 'demo' | 'primary'

export const STATUS: Record<string, { label: string; tone: Tone }> = {
  // challenge brief review
  DRAFT: { label: 'Draft', tone: 'neutral' },
  IN_REVIEW: { label: 'In review', tone: 'warning' },
  PUBLISHED: { label: 'Published', tone: 'success' },
  // eligibility and applications
  SUBMITTED: { label: 'Submitted', tone: 'info' },
  NOT_SCREENED: { label: 'Not screened yet', tone: 'neutral' },
  ELIGIBLE: { label: 'Eligible', tone: 'success' },
  INELIGIBLE: { label: 'Ineligible', tone: 'danger' },
  CLARIFICATION: { label: 'Clarification needed', tone: 'warning' },
  SHORTLISTED: { label: 'Shortlisted (reserve)', tone: 'info' },
  SELECTED: { label: 'Selected for pilot', tone: 'success' },
  NOT_SELECTED: { label: 'Not selected', tone: 'neutral' },
  // rule results
  PASS: { label: 'Pass', tone: 'success' },
  FAIL: { label: 'Fail', tone: 'danger' },
  RELAXED: { label: 'Not required from startups', tone: 'primary' },
  CLARIFY: { label: 'Clarify', tone: 'warning' },
  // milestones and payments
  PLANNED: { label: 'Planned', tone: 'neutral' },
  ACCEPTED: { label: 'Accepted', tone: 'success' },
  NOT_DUE: { label: 'Not due', tone: 'neutral' },
  REQUESTED: { label: 'Payment requested', tone: 'warning' },
  APPROVED: { label: 'Payment approved', tone: 'info' },
  PAID: { label: 'Paid', tone: 'success' },
  // validation
  VALIDATED: { label: 'Validated', tone: 'success' },
  PARTLY_VALIDATED: { label: 'Partly validated', tone: 'warning' },
  NOT_VALIDATED: { label: 'Not validated', tone: 'danger' },
  // decisions and outcomes
  SCALE: { label: 'Scale', tone: 'success' },
  EXTEND: { label: 'Extend the pilot', tone: 'warning' },
  STOP: { label: 'Stop', tone: 'danger' },
  SCALED: { label: 'Scaled', tone: 'success' },
  EXTENDED: { label: 'Pilot extended', tone: 'warning' },
  STOPPED: { label: 'Stopped', tone: 'danger' },
  // risk levels
  LOW: { label: 'Low', tone: 'success' },
  MEDIUM: { label: 'Medium', tone: 'warning' },
  HIGH: { label: 'High', tone: 'danger' },
}

export function statusLabel(status: string): string {
  return STATUS[status]?.label ?? status.replace(/_/g, ' ').toLowerCase()
}
