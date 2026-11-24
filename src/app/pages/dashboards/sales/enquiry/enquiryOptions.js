// Shared option lists for the Enquiry lifecycle fields (added 2026-11-24). Edit here only.
const toOpts = (arr) => arr.map((v) => ({ value: v, label: v }));

export const LEAD_SOURCES = toOpts([
  "Website / Online Form",
  "Outbound - Direct Outreach / Self-Approached (We Approached)",
  "Inbound - Direct Call / Email",
  "Existing Customer / Repeat Client",
  "Customer Referral / Recommendation",
  "Tender / GeM Portal",
  "Exhibition / Industrial Expo",
  "Other",
]);

export const AREAS = toOpts([
  "Indore", "Pithampur", "Dewas", "Sanwer Road", "Bhopal", "Ujjain", "Gwalior", "Mandideep",
  "Dhar", "Khargone", "Nagda", "Singrauli", "Ratlam", "Shahdol", "Dhule", "Makshi",
  "Mandsaur", "Manawar", "Thandla", "Raseda", "Ghatabillod", "Outstation", "Other",
]);

export const PAYMENT_STATUSES = toOpts(["Not received", "Advance received", "Full received"]);
export const SAMPLE_ARRIVED = toOpts(["No", "Yes"]);
export const TECH_STATUSES = toOpts([
  "Not Required",
  "Under Technical Verification",
  "Technical Feasibility Confirmed",
  "Technical Regret / Out of Scope",
]);

// Quick filter pills on the list (match on lead_source text)
export const SOURCE_PILLS = [
  { key: "", label: "All Enquiries" },
  { key: "Website", label: "Website Leads" },
  { key: "Direct Outreach", label: "Direct Outreach" },
  { key: "Repeat", label: "Repeat Clients" },
];

export const TECH_BADGE = {
  "Under Technical Verification": "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  "Technical Feasibility Confirmed": "bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400",
  "Technical Regret / Out of Scope": "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
};

// Structured denial / loss reasons (2026-11-24) - feed the management Rejection Log
export const LOSS_REASONS = [
  "Price High",
  "Scope Not Available",
  "Turnaround Time",
  "Competitor Selected",
  "Other",
];
export const TECH_REJECT_REASONS = [
  "Outside Lab Scope / Accreditation",
  "Range / CMC Not Available",
  "Master / Reference Not Available",
  "Test Method Not Available",
  "Capacity / Turnaround Not Possible",
  "Other",
];

export const whatsappLink = (mobile, name) => {
  const digits = String(mobile || "").replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) return null;
  const text = `Hello ${name || ""}, thank you for reaching out to Kailtech Test & Research Centre regarding your enquiry.`;
  return `https://wa.me/91${digits}?text=${encodeURIComponent(text)}`;
};
