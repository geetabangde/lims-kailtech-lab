// Enquiry Management Configuration & Color Mappings
// Aligned with the Excel Tracker (Aug26 - Nov26) in Kailtech Web Theme

export const SERVICES = [
  "Calibration",
  "Biomedical Calibration",
  "Testing",
  "Env"
];

export const TYPES = ["New", "Existing", "Repeat"];

export const AREAS = [
  "Indore",
  "Pithampur",
  "Dewas",
  "Bhopal",
  "Ujjain",
  "Dhar",
  "Khargone",
  "Nagda",
  "Singrauli",
  "Ratlam",
  "Shahdol",
  "Dhule",
  "Makshi",
  "Mandsaur",
  "Manawar",
  "Thandla",
  "Raseda",
  "Ghatabillod",
  "Other"
];

export const STATUSES = [
  "Contacted",
  "Quotation Sent",
  "Negotiation",
  "Order received",
  "Lost",
  "No Action",
  "Shiffted-Testing under process",
  "facility Not Available",
  "Forwarded",
  "Transfer to other"
];

export const PAYMENT_STATUSES = ["Not received", "Received"];

export const REPORTED_OPTIONS = ["No", "Yes"];

// Soft modern status row tints + crisp badges
export const STATUS_STYLES = {
  "Order received": {
    badge: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    row: "bg-emerald-50/70 hover:bg-emerald-100/70 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30",
    chip: "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    dot: "bg-emerald-500"
  },
  "Quotation Sent": {
    badge: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
    row: "bg-amber-50/60 hover:bg-amber-100/60 dark:bg-amber-950/20 dark:hover:bg-amber-900/30",
    chip: "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    dot: "bg-amber-500"
  },
  "Negotiation": {
    badge: "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800",
    row: "bg-orange-50/60 hover:bg-orange-100/60 dark:bg-orange-950/20 dark:hover:bg-orange-900/30",
    chip: "border-orange-500 bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300",
    dot: "bg-orange-500"
  },
  "Lost": {
    badge: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
    row: "bg-rose-50/60 hover:bg-rose-100/60 dark:bg-rose-950/20 dark:hover:bg-rose-900/30",
    chip: "border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
    dot: "bg-rose-500"
  },
  "Contacted": {
    badge: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800",
    row: "bg-white hover:bg-gray-50/80 dark:bg-dark-700 dark:hover:bg-dark-600",
    chip: "border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
    dot: "bg-sky-500"
  },
  "No Action": {
    badge: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
    row: "bg-white hover:bg-gray-50/80 dark:bg-dark-700 dark:hover:bg-dark-600",
    chip: "border-gray-400 bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    dot: "bg-gray-400"
  },
  "Shiffted-Testing under process": {
    badge: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
    row: "bg-purple-50/40 hover:bg-purple-100/40 dark:bg-purple-950/20 dark:hover:bg-purple-900/30",
    chip: "border-purple-500 bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300",
    dot: "bg-purple-500"
  },
  "facility Not Available": {
    badge: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    row: "bg-slate-50/60 hover:bg-slate-100/60 dark:bg-slate-900/30",
    chip: "border-slate-400 bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    dot: "bg-slate-400"
  },
  "Forwarded": {
    badge: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    row: "bg-slate-50/60 hover:bg-slate-100/60 dark:bg-slate-900/30",
    chip: "border-slate-400 bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    dot: "bg-slate-400"
  },
  "Transfer to other": {
    badge: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    row: "bg-slate-50/60 hover:bg-slate-100/60 dark:bg-slate-900/30",
    chip: "border-slate-400 bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    dot: "bg-slate-400"
  }
};

export const fmtDate = (v) => {
  if (!v || String(v).startsWith("0000")) return "-";
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : String(v);
};

export const isoDate = (d) => {
  if (!d) return "";
  const dateObj = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return "";
  const z = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};

export const formatCurrency = (val) => {
  const num = Number(val || 0);
  if (num === 0) return "-";
  return "₹ " + num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};
