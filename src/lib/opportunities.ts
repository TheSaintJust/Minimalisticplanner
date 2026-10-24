export type Opportunity = {
  id: string;
  canonical_name: string;
  organizer: string | null;
  description: string | null;
  primary_category: string;
  opportunity_type: string | null;
  official_url: string | null;
  country: string | null;
  delivery_mode: string | null;
  eligibility: Record<string, unknown> | null;
  funding: Record<string, unknown> | null;
  topics: string[] | null;
  lifecycle_status: string;
  verification_status: string;
  last_verified_at: string | null;
};

export const categoryLabels: Record<string, string> = {
  application: "Applications",
  scholarship_fellowship: "Scholarships & fellowships",
  writing: "Writing opportunities",
  call_for_papers: "Calls for papers",
  jobs_internships: "Jobs & internships",
  special_focus: "Special focus",
};

export function categoryLabel(category: string) {
  return categoryLabels[category] ?? category.replaceAll("_", " ");
}
