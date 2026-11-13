// MIS - 22-column sample flow view (STAGED 2026-11-13, plan "MIS NEW functionality planning.txt" 12-11-2026).
// Server: GET /mis/tracker22 and GET /mis/gate-pending (MisController, scoped on the server). Read-only: nothing here changes any record.
// THE 22 COLUMNS BELOW ARE THE CLIENT'S FIRST REQUIREMENT: same names, same order. Do not add / remove / reorder them.
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import axios from "utils/axios";
import { toast } from "sonner";
import { Page } from "components/shared/Page";
import * as XLSX from "xlsx";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// DD-MMM-YYYY everywhere (client rule). Accepts "YYYY-MM-DD" or "YYYY-MM-DD hh:mm:ss"; blank / zero dates show "-".
const fmtDate = (v) => {
  if (!v || String(v).startsWith("0000")) return "-";
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${MONTHS[Number(m[2]) - 1]}-${m[1]}` : String(v);
};
const isoDate = (d) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};
const daysAgo = (n) => isoDate(new Date(Date.now() - n * 86400000));

// ---- progressive colouring: done = soft green, stuck / overdue = red, not reached = grey ----
const TONE = {
  done: "bg-emerald-50 dark:bg-emerald-900/20",
  stuck: "bg-red-100 dark:bg-red-900/30",
  wait: "bg-amber-50 dark:bg-amber-900/20",
  none: "bg-gray-50 text-gray-400 dark:bg-dark-800",
};

// Ordered milestones used for the colour logic: first not-done milestone is "current".
const MILESTONES = [
  { key: "transferred", done: (r) => !!r.transfer_date },
  { key: "allocated", done: (r) => !!(r.allocation_date || r.allocated_to) },
  { key: "results", done: (r) => !!r.results_date },
  { key: "reviewed", done: (r) => r.reviewed_status === "Reviewed" },
  { key: "authorised", done: (r) => !!r.authorised_date },
  { key: "ulr", done: (r) => !!r.authorised_date },
  { key: "invoice", done: (r) => !!r.invoice_no || r.invoice_visible === 0 },
  { key: "email", done: (r) => r.email_status === "Sent" || r.email_status === "Test only" },
  { key: "docket", done: (r) => !!(r.dispatch_date || r.docket) },
];
function toneOf(r, key) {
  const idx = MILESTONES.findIndex((m) => m.key === key);
  if (idx < 0) return "";
  if (MILESTONES[idx].done(r)) return TONE.done;
  const firstOpen = MILESTONES.findIndex((m) => !m.done(r));
  if (idx === firstOpen) return Number(r.overdue_days_22) > 0 || r.testing_status === "OVERDUE" ? TONE.stuck : TONE.wait;
  return TONE.none;
}

const rowKey = (r) => `${r.type}|${r.lrn}|${r.department}|${r.ref_id}`;

function Badge({ children, cls = "bg-slate-100 text-slate-700" }) {
  return <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${cls}`}>{children}</span>;
}

function Expander({ open, onClick, title }) {
  return (
    <button type="button" onClick={onClick} title={title} className="ml-1 w-5 h-5 rounded border border-gray-300 text-[12px] leading-none font-bold text-blue-700 hover:bg-blue-50">
      {open ? "-" : "+"}
    </button>
  );
}

const STEP_DOT = { done: "bg-emerald-500", current: "bg-red-500", pending: "bg-gray-300", unlinked: "bg-gray-200" };

function ChainDetail({ r }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-gray-700 mb-1">Chain of custody <span className="font-normal text-gray-500">({r.custody_note})</span></div>
      <div className="flex flex-wrap items-stretch gap-1">
        {(r.custody_chain || []).map((s, i) => (
          <Fragment key={s.key}>
            {i > 0 && <span className="self-center text-gray-400">&rarr;</span>}
            <div className={`rounded-lg border px-2 py-1 text-[11px] min-w-[110px] ${s.state === "done" ? "border-emerald-300 bg-emerald-50" : s.state === "current" ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50 text-gray-400"}`}>
              <div className="flex items-center gap-1 font-semibold"><span className={`w-2 h-2 rounded-full ${STEP_DOT[s.state] || STEP_DOT.pending}`} />{s.label}</div>
              <div>{s.holder || (s.state === "unlinked" ? "not linked" : "-")}</div>
              <div className="text-[10px]">{s.at ? fmtDate(s.at) : s.state === "current" ? "waiting" : ""}</div>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function TrailDetail({ r }) {
  const t = r.allotment_trail || [];
  return (
    <div>
      <div className="text-[11px] font-semibold text-gray-700 mb-1">Allotment / re-allotment trail</div>
      {t.length === 0 ? <div className="text-[11px] text-gray-500">No allotment recorded yet.</div> : (
        <table className="text-[11px] border border-gray-200">
          <thead><tr className="bg-gray-100"><th className="px-2 py-1 text-left">Allotted to</th><th className="px-2 py-1 text-left">Allotted by</th><th className="px-2 py-1 text-left">On</th><th className="px-2 py-1 text-left">Remark</th><th className="px-2 py-1 text-left">State</th></tr></thead>
          <tbody>
            {t.map((a, i) => (
              <tr key={i} className={a.state === "current" ? "bg-emerald-50" : a.state === "removed" ? "text-gray-400 line-through" : ""}>
                <td className="px-2 py-1">{a.person || "-"}</td><td className="px-2 py-1">{a.allotted_by || "-"}</td>
                <td className="px-2 py-1 whitespace-nowrap">{fmtDate(a.on)}{a.on && String(a.on).length > 10 ? ` ${String(a.on).slice(11, 16)}` : ""}</td>
                <td className="px-2 py-1">{a.remark || "-"}</td><td className="px-2 py-1">{a.state}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {r.allotment_trail_note && <div className="text-[10px] text-gray-500 mt-1">{r.allotment_trail_note}</div>}
    </div>
  );
}

function resendHref(r) {
  const x = r.resend;
  if (!x || !r.authorised_date) return null;
  if (x.kind === "calibration") {
    // opens the EXISTING dispatch list in a new tab; the list page should read ?search= (small change in Phase 4)
    return `/dashboards/calibration-process/inward-entry-lab?caliblocation=${encodeURIComponent(x.caliblocation)}&calibacc=${encodeURIComponent(x.calibacc)}&search=${encodeURIComponent(x.inward)}`;
  }
  // testing: simply open the existing Signed Reports page in a new tab, searched by the booking / inward number (the approver handles it there)
  return `/dashboards/action-items/signed-reports?search=${encodeURIComponent(r.inward_no || r.lrn || "")}`;
}

// ---- THE 22 COLUMNS (do not change order / names) ----
// value(r) is used for the per-column search box, sorting and Excel export.
const COLUMNS = (ctx) => [
  { key: "sno", label: "S.No.", w: 56, value: (r) => ctx.groupNo[r.customer] ?? "", render: (r) => <b>{ctx.groupNo[r.customer]}</b>, sort: (r) => ctx.groupNo[r.customer] },
  { key: "booking_date", label: "Booking Date", w: 104, value: (r) => fmtDate(r.booking_date), render: (r) => <span className="whitespace-nowrap">{fmtDate(r.booking_date)}</span>, sort: (r) => r.booking_date || "" },
  { key: "inward_no", label: "Inward Entry No.", w: 120, value: (r) => r.inward_no, render: (r) => <span className="font-mono text-blue-700">{r.inward_no}</span> },
  { key: "customer", label: "Customer", w: 190, value: (r) => r.customer, render: (r) => <span className="block max-w-[190px] truncate" title={r.customer}>{r.customer}</span> },
  { key: "lrn", label: "LRN", w: 130, value: (r) => r.lrn, render: (r) => (r.lrn ? <span className="font-mono font-semibold">{r.lrn}</span> : <Badge cls="bg-red-100 text-red-700">PENDING LRN</Badge>) },
  { key: "package", label: "Package", w: 190, value: (r) => r.package, render: (r) => <span className="block max-w-[190px] truncate" title={r.package}>{r.package}</span> },
  {
    key: "transferred", label: "Transferred", w: 170, tone: "transferred",
    value: (r) => `${r.transferred_to || ""} ${fmtDate(r.transfer_date)}`,
    render: (r, tk) => (
      <span className="inline-flex items-center">
        <span className="leading-tight"><span className="block font-medium">{r.transferred_to || "-"}</span><span className="block text-[10px] text-gray-500">{r.transfer_date ? fmtDate(r.transfer_date) : ""}</span></span>
        <Expander open={ctx.open[tk] === "chain"} onClick={() => ctx.toggle(tk, "chain")} title="Chain of custody" />
      </span>
    ),
  },
  { key: "department", label: "Department", w: 120, value: (r) => r.department, render: (r) => <Badge cls="bg-indigo-50 text-indigo-700">{r.department}</Badge> },
  {
    key: "priority", label: "Priority", w: 90,
    value: (r) => (r.priority === "Urgent" ? "Urgent" : "Normal") + (r.priority_days != null ? ` ${r.priority_days}d` : ""),
    render: (r) => (r.priority === "Urgent" ? <b className="text-red-600">Urgent{r.priority_days != null ? ` (${r.priority_days}d)` : ""}</b> : <span>Normal{r.priority_days != null ? ` (${r.priority_days}d)` : ""}</span>),
  },
  {
    key: "report_due", label: "Report Due", w: 120, value: (r) => fmtDate(r.report_due_22), sort: (r) => r.report_due_22 || "",
    render: (r) => <span className="whitespace-nowrap" title={`Source: ${r.report_due_source}`}>{fmtDate(r.report_due_22)}{r.report_due_source !== "package TAT" ? <span className="block text-[9px] text-blue-700">{r.report_due_source}</span> : null}</span>,
  },
  {
    key: "overdue", label: "Overdue Days", w: 110, sort: (r) => Number(r.overdue_days_22) || 0,
    value: (r) => (Number(r.overdue_days_22) > 0 ? `+${r.overdue_days_22} Days` : r.report_delivered ? "Delivered" : r.testing_status === "OVERDUE" ? "Testing late" : "On Track"),
    render: (r) => {
      if (Number(r.overdue_days_22) > 0) return <b className="text-red-700">+{r.overdue_days_22} Days</b>;
      if (r.report_delivered) return <span className="text-gray-500">Delivered</span>;
      // never say "On Track" while testing itself is overdue
      if (r.testing_status === "OVERDUE") return <b className="text-red-700">Testing late</b>;
      return <span className="text-emerald-700 font-semibold">On Track</span>;
    },
  },
  {
    key: "allocated", label: "Allocated", w: 170, tone: "allocated",
    value: (r) => `${r.allocated_to || ""} ${fmtDate(r.allocation_date)}`,
    render: (r, tk) => (
      <span className="inline-flex items-center">
        <span className="leading-tight"><span className="block font-medium">{r.allocated_to || "-"}</span><span className="block text-[10px] text-gray-500">{r.allocation_date ? fmtDate(r.allocation_date) : ""}</span></span>
        <Expander open={ctx.open[tk] === "trail"} onClick={() => ctx.toggle(tk, "trail")} title="Allotment / re-allotment trail" />
      </span>
    ),
  },
  {
    key: "with_since", label: "With / Since", w: 190, value: (r) => `${r.holder_name || r.holder_role || ""} ${fmtDate(r.holder_since)}`,
    render: (r) => (
      <span className="leading-tight block">
        <span className="font-medium">{r.holder_name || r.holder_role || "-"}</span>
        {r.holder_since ? <span className="block text-[10px] text-gray-500">since {fmtDate(r.holder_since)}</span> : null}
      </span>
    ),
  },
  { key: "results", label: "Results", w: 100, tone: "results", value: (r) => r.results_status, render: (r) => <span>{r.results_status}{r.results_date ? <span className="block text-[10px] text-gray-500">{fmtDate(r.results_date)}</span> : null}</span> },
  { key: "reviewed", label: "Reviewed", w: 110, tone: "reviewed", value: (r) => r.reviewed_status, render: (r) => <span>{r.reviewed_status}{r.reviewed_on ? <span className="block text-[10px] text-gray-500">{fmtDate(r.reviewed_on)}</span> : null}</span> },
  { key: "authorised", label: "Authorised", w: 110, tone: "authorised", value: (r) => r.authorised_status, render: (r) => <span>{r.authorised_status}{r.authorised_date ? <span className="block text-[10px] text-gray-500">{fmtDate(r.authorised_date)}</span> : null}</span> },
  {
    key: "ulr", label: "ULR / Finalisation", w: 150, tone: "ulr", value: (r) => `${r.ulr_no || ""} ${fmtDate(r.authorised_date)}`,
    render: (r) => (r.authorised_date ? <span className="leading-tight block"><span className="font-mono text-[11px]">{r.ulr_no || r.nabl || "-"}</span><span className="block text-[10px] text-gray-500">{fmtDate(r.authorised_date)}</span></span> : <span className="text-gray-400">-</span>),
  },
  {
    key: "invoice", label: "Invoice", w: 150, tone: "invoice", headTitle: "Payment status (Paid / Part paid / Balance due) is derived from the invoice balance - to be confirmed with Accounts for the final decision.", hide: !ctx.seeInvoice,
    value: (r) => `${r.invoice_no || ""} ${r.invoice_payment || ""}`,
    render: (r) => (r.invoice_no ? (
      <span className="leading-tight block">
        <span className="font-mono text-[11px]">{r.invoice_no}</span>
        <span className="block text-[10px]">{r.invoice_amount != null ? `Rs ${Number(r.invoice_amount).toLocaleString("en-IN")}` : ""} <span title="Payment status is derived from the invoice balance - to be confirmed with Accounts for the final decision."><Badge cls={r.invoice_payment === "Paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>{r.invoice_payment}*</Badge></span></span>
      </span>
    ) : <span className="text-gray-400">-</span>),
  },
  {
    key: "email", label: "Email", w: 120, tone: "email", value: (r) => r.email_status,
    render: (r) => {
      const href = resendHref(r);
      return (
        <span className="leading-tight block">
          <span>{r.email_status}{r.email_mode === "test" ? " (test)" : ""}</span>
          {r.email_date ? <span className="block text-[10px] text-gray-500">{fmtDate(r.email_date)}</span> : null}
          {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="block text-[10px] text-blue-700 underline">Resend &#8599;</a> : null}
        </span>
      );
    },
  },
  { key: "whatsapp", label: "Whatsapp", w: 100, value: (r) => r.whatsapp_status, render: (r) => <span className={r.whatsapp_status === "Not enabled" ? "text-gray-400 text-[11px]" : ""}>{r.whatsapp_status}</span> },
  { key: "docket", label: "Despatch Docket", w: 130, tone: "docket", value: (r) => r.docket || "", render: (r) => <span className="block max-w-[130px] truncate" title={r.docket || ""}>{r.docket || (r.dispatch_date ? fmtDate(r.dispatch_date) : "-")}</span> },
  { key: "feedback", label: "Feedback", w: 100, value: (r) => r.feedback_status, render: (r) => <span className="text-gray-400 text-[11px]">{r.feedback_status}</span> },
];

function GateTab({ canSee }) {
  const [from, setFrom] = useState(isoDate(new Date()));
  const [to, setTo] = useState(isoDate(new Date()));
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/mis/gate-pending", { params: { from, to } });
      setD(res.data?.data || null);
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not load the gate backlog.");
    } finally { setLoading(false); }
  }, [from, to]);
  useEffect(() => { if (canSee) load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!canSee) return <div className="p-4 text-sm text-gray-600">The gate backlog is available to management and the reporting team only.</div>;
  const colour = { green: "bg-emerald-100 text-emerald-800", amber: "bg-amber-100 text-amber-800", red: "bg-red-100 text-red-800" };
  const createHref = (g) => (g.purpose_id === 2
    ? `/dashboards/calibration-process/inward-entry-lab?caliblocation=Lab&calibacc=Nabl&gate=${g.id}&customer=${encodeURIComponent(g.customer)}&material=${encodeURIComponent(g.material)}`
    : `/dashboards/testing/trfs-starts-jobs/create?gate=${g.id}&customer=${encodeURIComponent(g.customer)}&material=${encodeURIComponent(g.material)}`);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2 text-xs">
        <label>From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="block border rounded-lg p-1.5" /></label>
        <label>To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="block border rounded-lg p-1.5" /></label>
        <button type="button" onClick={load} disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold">{loading ? "Loading..." : "Filter"}</button>
        {d && <span className="text-gray-600">Pending LRN: <b>{d.summary.total}</b> &middot; <Badge cls={colour.green}>&lt; 24 hrs {d.summary.green}</Badge> <Badge cls={colour.amber}>1-3 days {d.summary.amber}</Badge> <Badge cls={colour.red}>&gt; 3 days {d.summary.red}</Badge></span>}
      </div>
      <div className="text-[11px] text-gray-500">{d?.note}</div>
      <div className="overflow-auto border rounded-lg max-h-[65vh]">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-100 sticky top-0"><tr>{["Gate ID", "Arrival", "Custodian", "Customer / Sender", "Material", "Qty", "Purpose", "Aging", "Action"].map((h) => <th key={h} className="px-2 py-1.5 text-left whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>
            {(d?.rows || []).map((g) => (
              <tr key={g.id} className="border-t">
                <td className="px-2 py-1 font-mono">{g.id}</td><td className="px-2 py-1 whitespace-nowrap">{fmtDate(g.arrival)}</td><td className="px-2 py-1">{g.custodian || "-"}</td>
                <td className="px-2 py-1">{g.customer}</td><td className="px-2 py-1">{g.material}</td><td className="px-2 py-1">{g.quantity}</td><td className="px-2 py-1">{g.purpose}</td>
                <td className="px-2 py-1"><Badge cls={colour[g.colour]}>{g.age_days === 0 ? `${g.age_hours} hrs` : `${g.age_days} days`}</Badge></td>
                <td className="px-2 py-1"><a href={createHref(g)} target="_blank" rel="noopener noreferrer" className="px-2 py-1 rounded bg-blue-600 text-white text-[11px] font-semibold whitespace-nowrap">Create TRF / Assign LRN &#8599;</a></td>
              </tr>
            ))}
            {d && d.rows.length === 0 && <tr><td colSpan={9} className="p-4 text-center text-gray-500">No unbooked gate arrivals in this range.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const PAGE_SIZE = 100;

export default function Mis22({ onClassic }) {
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(isoDate(new Date()));
  const [type, setType] = useState("all");
  const [department, setDepartment] = useState("");
  const [chemist, setChemist] = useState("");
  const [customer, setCustomer] = useState("");
  const [stage, setStage] = useState("");
  const [cat, setCat] = useState("all"); // all | urgent | gt3 | ontrack
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [colFilters, setColFilters] = useState({});
  const [sort, setSort] = useState({ key: "booking_date", dir: "asc" });
  const [open, setOpen] = useState({});
  const [page, setPage] = useState(0);
  const [tab, setTab] = useState("table");
  const [gateCount, setGateCount] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/mis/tracker22", { params: { from, to, type } });
      setData(res.data?.data || null);
      setPage(0);
      setOpen({});
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not load the MIS.");
    } finally { setLoading(false); }
  }, [from, to, type]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tier = data?.user_scope?.tier;
  const canSeeGate = tier === "management" || tier === "reporting";
  useEffect(() => {
    if (!canSeeGate) return;
    axios.get("/mis/gate-pending").then((r) => setGateCount(r.data?.data?.summary || null)).catch(() => {});
  }, [canSeeGate]);

  const allRows = useMemo(() => data?.rows || [], [data]);
  const departments = useMemo(() => [...new Set(allRows.map((r) => r.department))].sort(), [allRows]);
  const chemists = useMemo(() => [...new Set(allRows.map((r) => r.allocated_to).filter(Boolean))].sort(), [allRows]);
  const stages = useMemo(() => [...new Set(allRows.map((r) => r.stage))].sort(), [allRows]);

  // S.No: same customer = same number (client note "row number common for common customer"), numbered by first appearance
  const groupNo = useMemo(() => {
    const m = {};
    let n = 0;
    allRows.forEach((r) => { if (!(r.customer in m)) m[r.customer] = ++n; });
    return m;
  }, [allRows]);

  const toggle = (k, what) => setOpen((o) => ({ ...o, [k]: o[k] === what ? null : what }));
  const seeInvoice = !!data?.user_scope?.see_invoice;
  const cols = useMemo(() => COLUMNS({ groupNo, open, toggle, seeInvoice }).filter((c) => !c.hide), [groupNo, open, seeInvoice]);

  const rows = useMemo(() => {
    let list = allRows.filter((r) => {
      if (department && r.department !== department) return false;
      if (chemist && r.allocated_to !== chemist) return false;
      if (customer && !String(r.customer || "").toLowerCase().includes(customer.toLowerCase())) return false;
      if (stage && r.stage !== stage) return false;
      if (cat === "urgent" && r.priority !== "Urgent") return false;
      if (cat === "gt3" && !(Number(r.overdue_days_22) > 3)) return false;
      if (cat === "ontrack" && (Number(r.overdue_days_22) > 0 || r.testing_status === "OVERDUE")) return false;
      return true;
    });
    const active = Object.entries(colFilters).filter(([, v]) => v);
    if (active.length) {
      list = list.filter((r) => active.every(([k, v]) => {
        const c = cols.find((x) => x.key === k);
        return c && String(c.value(r) ?? "").toLowerCase().includes(v.toLowerCase());
      }));
    }
    const sc = cols.find((c) => c.key === sort.key);
    if (sc) {
      const val = sc.sort || sc.value;
      const dirn = sort.dir === "asc" ? 1 : -1;
      list = [...list].sort((a, b) => {
        const x = val(a), y = val(b);
        if (typeof x === "number" && typeof y === "number") return (x - y) * dirn;
        return String(x ?? "").localeCompare(String(y ?? ""), undefined, { numeric: true }) * dirn;
      });
    }
    return list;
  }, [allRows, department, chemist, customer, stage, cat, colFilters, sort, cols]);

  const clearAll = () => { setDepartment(""); setChemist(""); setCustomer(""); setStage(""); setCat("all"); setColFilters({}); setSort({ key: "booking_date", dir: "asc" }); };
  const paged = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  const exportExcel = () => {
    const aoa = [cols.map((c) => c.label), ...rows.map((r) => cols.map((c) => c.value(r)))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MIS");
    XLSX.writeFile(wb, `MIS_22col_${from}_to_${to}.xlsx`);
  };

  const scope = data?.user_scope;
  const tierBadge = { management: "bg-purple-100 text-purple-800", reporting: "bg-sky-100 text-sky-800", hod: "bg-blue-100 text-blue-800", self: "bg-slate-100 text-slate-700" };
  const tierLabel = { management: "Executive Company-Wide View", reporting: "Reporting & Dispatch View (all labs)", hod: `Department View: ${scope?.department_name || ""}`, self: "My allotted samples" };

  return (
    <Page title="MIS - Sample Flow (22 columns)">
      <div className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Sample Flow Tracker</h2>
              {tier && <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${tierBadge[tier]}`}>{tierLabel[tier]} ({scope.user_name})</span>}
            </div>
            <p className="text-xs text-gray-500">As on {fmtDate(data?.as_on)} &middot; one row per LRN per department &middot; sorted by Booking Date (oldest first) &middot; read-only</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setTab("table")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${tab === "table" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300"}`}>Sample Tracker</button>
            {canSeeGate && (
              <button type="button" onClick={() => setTab("gate")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${tab === "gate" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300"}`}>Unbooked at Gate{gateCount ? ` (${gateCount.total})` : ""}</button>
            )}
            {onClassic && <button type="button" onClick={onClassic} className="px-3 py-1.5 rounded-lg text-xs font-semibold border bg-white text-gray-700 border-gray-300">Classic view</button>}
          </div>
        </div>

        {canSeeGate && gateCount && (
          <button type="button" onClick={() => setTab("gate")} className="w-full text-left rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 hover:bg-amber-100">
            <span className="text-xs font-bold text-amber-900">Pending LRN Generation (today)</span>
            <span className="ml-2 text-lg font-bold text-amber-900">{gateCount.total}</span>
            <span className="ml-3 text-[11px] text-amber-800">&lt;24 hrs {gateCount.green} &middot; 1-3 days {gateCount.amber} &middot; &gt;3 days {gateCount.red} &middot; click to open, choose any date range there</span>
          </button>
        )}

        {tab === "gate" ? <GateTab canSee={canSeeGate} /> : (
          <>
            <div className="flex flex-wrap items-end gap-2 text-xs">
              <label>From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="block border rounded-lg p-1.5" /></label>
              <label>To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="block border rounded-lg p-1.5" /></label>
              <label>Type<select value={type} onChange={(e) => setType(e.target.value)} className="block border rounded-lg p-1.5"><option value="all">All</option><option value="testing">Testing</option><option value="calibration">Calibration</option></select></label>
              <label>Lab / Department<select value={department} onChange={(e) => setDepartment(e.target.value)} className="block border rounded-lg p-1.5"><option value="">All</option>{departments.map((d) => <option key={d}>{d}</option>)}</select></label>
              <label>Chemist / Engineer<select value={chemist} onChange={(e) => setChemist(e.target.value)} className="block border rounded-lg p-1.5"><option value="">All</option>{chemists.map((d) => <option key={d}>{d}</option>)}</select></label>
              <label>Customer<input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer name" className="block border rounded-lg p-1.5" /></label>
              <label>Stage<select value={stage} onChange={(e) => setStage(e.target.value)} className="block border rounded-lg p-1.5"><option value="">All</option>{stages.map((d) => <option key={d}>{d}</option>)}</select></label>
              <div className="flex gap-1">
                {[["all", "All"], ["urgent", "Urgent"], ["gt3", "Overdue > 3 days"], ["ontrack", "On track"]].map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setCat(k)} className={`px-2.5 py-1.5 rounded-full border font-semibold ${cat === k ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300"}`}>{l}</button>
                ))}
              </div>
              <button type="button" onClick={load} disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold">{loading ? "Loading..." : "Filter"}</button>
              <button type="button" onClick={() => { clearAll(); }} className="px-3 py-2 rounded-lg border font-semibold">Clear All</button>
              <button type="button" onClick={exportExcel} disabled={!rows.length} className="px-3 py-2 rounded-lg bg-emerald-600 text-white font-semibold disabled:opacity-50">Export Excel (.xlsx)</button>
              <span className="text-gray-600">{rows.length} of {allRows.length} rows</span>
            </div>
            {data?.truncated && <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">Showing the first 2000 rows only - narrow the dates to see the rest.</div>}
            {seeInvoice && <div className="text-[11px] text-gray-500">* Invoice payment status is derived from the invoice balance and is to be confirmed with Accounts for the final decision.</div>}
            <div className="flex flex-wrap gap-3 text-[11px] text-gray-600">
              <span><span className="inline-block w-3 h-3 align-middle rounded bg-emerald-100 border" /> completed</span>
              <span><span className="inline-block w-3 h-3 align-middle rounded bg-red-200 border" /> stuck / overdue</span>
              <span><span className="inline-block w-3 h-3 align-middle rounded bg-amber-100 border" /> current step (on time)</span>
              <span><span className="inline-block w-3 h-3 align-middle rounded bg-gray-100 border" /> not reached yet</span>
            </div>

            <div className="overflow-auto border rounded-lg max-h-[70vh]">
              <table className="text-xs border-collapse" style={{ minWidth: cols.reduce((a, c) => a + c.w, 0) }}>
                <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-dark-700">
                  <tr>
                    {cols.map((c) => (
                      <th key={c.key} title={c.headTitle} style={{ minWidth: c.w }} onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key && s.dir === "asc" ? "desc" : "asc" }))} className="px-2 py-1.5 text-left font-semibold whitespace-nowrap cursor-pointer border-b select-none">
                        {c.label}{sort.key === c.key ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {cols.map((c) => (
                      <th key={c.key} className="px-1 py-1 border-b bg-gray-50 dark:bg-dark-800">
                        <span className="relative block">
                          <input value={colFilters[c.key] || ""} onChange={(e) => setColFilters((f) => ({ ...f, [c.key]: e.target.value }))} placeholder="search" className="w-full border rounded px-1.5 py-0.5 text-[11px] font-normal pr-5" />
                          {colFilters[c.key] ? <button type="button" onClick={() => setColFilters((f) => ({ ...f, [c.key]: "" }))} className="absolute right-1 top-0.5 text-gray-500 hover:text-red-600 text-[11px]" title="Clear">x</button> : null}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((r) => {
                    const tk = rowKey(r);
                    const band = groupNo[r.customer] % 2 ? "" : "bg-slate-50/60 dark:bg-dark-900/30";
                    return (
                      <Fragment key={tk}>
                        <tr className={`border-b ${band}`}>
                          {cols.map((c) => (
                            <td key={c.key} className={`px-2 py-1 align-top ${c.tone ? toneOf(r, c.tone) : ""}`}>{c.render(r, tk)}</td>
                          ))}
                        </tr>
                        {open[tk] && (
                          <tr className="border-b bg-white dark:bg-dark-800">
                            <td colSpan={cols.length} className="px-4 py-2">{open[tk] === "chain" ? <ChainDetail r={r} /> : <TrailDetail r={r} />}</td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                  {!loading && rows.length === 0 && <tr><td colSpan={cols.length} className="p-6 text-center text-gray-500">No samples match.</td></tr>}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className="flex items-center gap-2 text-xs">
                <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="px-2 py-1 border rounded disabled:opacity-40">Prev</button>
                <span>Page {page + 1} of {pages}</span>
                <button type="button" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} className="px-2 py-1 border rounded disabled:opacity-40">Next</button>
              </div>
            )}
          </>
        )}
      </div>
    </Page>
  );
}
