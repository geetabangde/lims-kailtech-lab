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
  const clean = String(name || "").trim();
  const hello = clean && clean !== "-" ? `Hello ${clean}` : "Hello";
  const text = `${hello}, thank you for reaching out to Kailtech Test & Research Centre regarding your enquiry.`;
  return `https://wa.me/91${digits}?text=${encodeURIComponent(text)}`;
};

// ── Redesign 2026-11-25 ──────────────────────────────────────────────────────────────
// Expected date of finalization choices on the Add Enquiry form
export const FINALIZATION_OPTIONS = [
  { value: "immediate", label: "Immediate", days: 0 },
  { value: "week", label: "Within a week", days: 7 },
  { value: "15days", label: "Within 15 days", days: 15 },
  { value: "other", label: "Other (pick a date)", days: null },
];

// Weekly off days that do not count towards the quotation TAT (0 = Sunday ... 6 = Saturday).
// Change here if the lab's working week changes. No holiday table exists yet.
export const WEEKLY_OFF_DAYS = [0];
export const QUOTE_TAT_HOURS = 24; // enquiry must be converted to a quotation within this many working hours

// Lab holidays (YYYY-MM-DD) loaded with the enquiry list; they do not count towards the TAT
let HOLIDAYS = new Set();
export const setHolidays = (list) => {
  HOLIDAYS = new Set((list || []).map((d) => String(d).slice(0, 10)));
};
const isoLocal = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Working hours between two dates, skipping weekly-off days and lab holidays.
export function workingHoursBetween(start, end = new Date()) {
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || e <= s) return 0;
  let ms = 0;
  let cursor = new Date(s);
  while (cursor < e) {
    const nextMidnight = new Date(cursor);
    nextMidnight.setHours(24, 0, 0, 0);
    const stop = nextMidnight < e ? nextMidnight : e;
    if (!WEEKLY_OFF_DAYS.includes(cursor.getDay()) && !HOLIDAYS.has(isoLocal(cursor))) ms += stop - cursor;
    cursor = stop;
  }
  return ms / 3600000;
}

// The list sends dates as dd/mm/yyyy; an empty date comes back as year 0000 / -0001
const parseListDate = (v) => {
  const m = String(v || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m || Number(m[3]) < 2000) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
};

// Row tone for the list:
//   "lost"    maroon        - regretted / order lost
//   "overdue" dark red-brown - expected closing date passed and the order is not closed
//   "late"    red           - quotation not generated within 24 working hours of the enquiry
//   ""        no colour     - on time
export function enquiryTone(row) {
  const status = String(row.status);
  if (status === "91" || row.loss_reason) return "lost";
  if ((status === "0" || status === "1") && !Number(row.closed)) {
    const due = parseListDate(row.expecteddateforfinalization);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (due && due < today) return "overdue";
  }
  if (status === "0" && workingHoursBetween(row.added_on) > QUOTE_TAT_HOURS) return "late";
  return "";
}
