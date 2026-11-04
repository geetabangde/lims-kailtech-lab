// MIS Phase 1 - Sample Flow Tracker (read-only) + TAT Master. Server: MisController (management only).
import { Fragment, useEffect, useMemo, useState } from "react";
import axios from "utils/axios";
import { toast } from "sonner";
import { Page } from "components/shared/Page";
import * as XLSX from "xlsx";

const MANAGEMENT_IDS = [31, 113, 65, 37, 32, 90, 97, 41, 34, 33, 110, 136];

const STATUS_CLASS = {
  OVERDUE: "bg-red-100 text-red-800",
  "Due soon": "bg-amber-100 text-amber-800",
  "On track": "bg-emerald-100 text-emerald-800",
  Done: "bg-gray-100 text-gray-600",
  "No due date": "bg-slate-100 text-slate-500",
};

const isoDate = (d) => d.toISOString().slice(0, 10);

function Chip({ value }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${STATUS_CLASS[value] || "bg-slate-100 text-slate-600"}`}>
      {value}
    </span>
  );
}

function Card({ label, value, tone, active, onClick }) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      title={`Click to filter tracker by ${label}`}
      className={`rounded-xl border p-3 cursor-pointer select-none transition-all duration-150 transform hover:-translate-y-0.5 hover:shadow-md ${
        active
          ? "ring-2 ring-blue-600 border-blue-600 bg-blue-50 dark:bg-blue-900/40"
          : tone === "red"
          ? "border-red-200 bg-red-50 hover:bg-red-100/80"
          : tone === "amber"
          ? "border-amber-200 bg-amber-50 hover:bg-amber-100/80"
          : "border-gray-200 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
      }`}
    >
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
        <span className="truncate">{label}</span>
        {active && (
          <span className="inline-flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" title="Active Filter" />
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{value ?? "-"}</div>
    </div>
  );
}

const LC_CARDS = [
  { no: 3, label: "Sample Booked" },
  { no: 4, label: "Allotted to Dept" },
  { no: 5, label: "Under Testing" },
  { no: 6, label: "Under HOD / QA" },
  { no: 9, label: "Ready for Dispatch" },
  { no: 11, label: "Billing" },
];

// Card health: green = nothing overdue, amber = up to 10% overdue, red = more than 10% overdue or anything more than 3 days late.
function lcHealth(total, overdue, anyGt3) {
  if (!overdue) return "green";
  if (anyGt3 || overdue / Math.max(total, 1) > 0.1) return "red";
  return "amber";
}

const LC_TONE = {
  green: { box: "border-emerald-300 bg-emerald-50", strip: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  amber: { box: "border-amber-300 bg-amber-50", strip: "bg-amber-100 text-amber-900 border-amber-300" },
  red: { box: "border-red-300 bg-red-50", strip: "bg-red-100 text-red-800 border-red-300" },
};

function LifecycleCard({ card, stat, health, active, overdueActive, onMain, onOverdue }) {
  const tone = LC_TONE[health] || LC_TONE.green;
  const hasOverdue = card.no !== 3 && stat.overdue > 0;
  return (
    <div className="flex flex-col">
      <div
        onClick={onMain}
        role="button"
        tabIndex={0}
        title={`Show all samples at: ${card.label}`}
        className={`rounded-t-xl border p-3 cursor-pointer select-none transition-all duration-150 hover:shadow-md ${tone.box} ${active && !overdueActive ? "ring-2 ring-blue-600" : ""}`}
      >
        <div className="text-[11px] uppercase tracking-wide text-gray-600 truncate">{card.label}</div>
        <div className="flex items-end justify-between mt-0.5">
          <span className="text-2xl font-bold text-gray-900">{stat.total}</span>
          {stat.urgent > 0 && (
            <span className="text-[10px] font-bold text-red-700 bg-red-100 rounded-full px-1.5 py-0.5" title="Urgent samples at this stage">{stat.urgent} urgent</span>
          )}
        </div>
      </div>
      <div
        onClick={hasOverdue ? onOverdue : undefined}
        role={hasOverdue ? "button" : undefined}
        title={hasOverdue ? `Show only overdue samples at: ${card.label}` : undefined}
        className={`rounded-b-xl border border-t-0 px-3 py-1 text-[11px] font-semibold select-none ${hasOverdue ? `${tone.strip} cursor-pointer hover:brightness-95` : "bg-gray-50 text-gray-400 border-gray-200"} ${overdueActive ? "ring-2 ring-blue-600" : ""}`}
      >
        {card.no === 3 ? "all booked" : hasOverdue ? `${stat.overdue} overdue` : "0 overdue"}
      </div>
    </div>
  );
}

function SortIcon({ active, direction }) {
  return (
    <span className={`inline-flex items-center ml-1 ${active ? "text-blue-600" : "text-gray-400"}`}>
      {active ? (
        direction === "asc" ? (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        )
      ) : (
        <svg className="w-3 h-3 opacity-40 hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )}
    </span>
  );
}

const TRACKER_COLUMNS = [
  { key: "lrn", label: "LRN", minWidth: "130px", stickyLeft: 0, render: (r) => <span className="font-mono font-semibold">{r.lrn}</span> },
  { key: "stage", label: "Stage", minWidth: "140px", stickyLeft: 130, render: (r) => <span className="font-semibold whitespace-nowrap">{r.stage}</span> },
  { key: "lifecycle_label", label: "Lifecycle", minWidth: "170px", render: (r) => <span className="whitespace-nowrap">{r.lifecycle_label}</span> },
  { key: "holder", label: "With / since", minWidth: "210px", render: (r) => (
    <span className="block leading-tight">
      <span className="font-medium">{r.holder_name || r.holder_role || "-"}</span>
      {r.holder_name && r.holder_role ? <span className="text-gray-500"> ({r.holder_role})</span> : null}
      {r.holder_since ? <span className="block text-[10px] text-gray-500">since {r.holder_since}</span> : null}
    </span>
  ) },
  { key: "overdue_days", label: "Overdue (days)", minWidth: "110px", render: (r) => (
    Number(r.overdue_days) > 0
      ? <b className={Number(r.overdue_days) > 3 ? "text-red-700" : "text-amber-700"}>{r.overdue_days}</b>
      : <span className="text-gray-400">-</span>
  ) },
  { key: "days_since_booking", label: "Days", minWidth: "80px", render: (r) => r.days_since_booking },
  { key: "testing_status", label: "Testing", minWidth: "110px", render: (r) => <Chip value={r.testing_status} /> },
  { key: "report_status", label: "Report", minWidth: "110px", render: (r) => <Chip value={r.report_status} /> },
  { key: "type", label: "Type", minWidth: "85px", render: (r) => r.type },
  { key: "category", label: "Category", minWidth: "130px", render: (r) => <span className="whitespace-nowrap">{r.category}</span> },
  { key: "booking_date", label: "Booking", minWidth: "105px", render: (r) => <span className="whitespace-nowrap">{r.booking_date?.slice(0, 10)}</span> },
  { key: "package", label: "Package", minWidth: "180px", render: (r) => <span className="max-w-[200px] truncate block" title={r.package}>{r.package}</span> },
  { key: "nabl", label: "NABL (ULR) / SLR", minWidth: "130px", render: (r) => (
    <span className="whitespace-nowrap">{r.nabl || "-"}{r.ulr_no ? <span className="block text-[10px] font-mono text-gray-500">{r.ulr_no}</span> : null}</span>
  ) },
  { key: "customer", label: "Customer", minWidth: "180px", render: (r) => <span className="max-w-[180px] truncate block" title={r.customer}>{r.customer}</span> },
  { key: "po_no", label: "PO", minWidth: "120px", render: (r) => r.po_no },
  { key: "department", label: "Department", minWidth: "130px", render: (r) => r.department },
  { key: "priority", label: "Priority", minWidth: "85px", render: (r) => r.priority === "Urgent" ? <b className="text-red-600">Urgent</b> : "Normal" },
  { key: "test_due_date", label: "Test due", minWidth: "105px", render: (r) => (
    <span className="whitespace-nowrap">{r.test_due_date || "-"}{Number(r.default_tat) === 1 ? <span className="ml-1 text-[9px] font-semibold text-slate-600 bg-slate-100 border border-slate-300 rounded px-1" title="Package not in TAT Master: 10-day default used">default TAT</span> : null}</span>
  ) },
  { key: "report_due_date", label: "Report due", minWidth: "105px", render: (r) => <span className="whitespace-nowrap">{r.report_due_date}</span> },
  { key: "transfer_date", label: "Transferred", minWidth: "105px", render: (r) => <span className="whitespace-nowrap">{r.transfer_date || "-"}</span> },
  { key: "allocated_to", label: "Allocated to", minWidth: "120px", render: (r) => r.allocated_to },
  { key: "allocation_date", label: "Allocated on", minWidth: "105px", render: (r) => <span className="whitespace-nowrap">{r.allocation_date || "-"}</span> },
  { key: "results_date", label: "Results", minWidth: "105px", render: (r) => <span className="whitespace-nowrap">{r.results_date || "-"}</span> },
  { key: "authorised_date", label: "Authorised", minWidth: "105px", render: (r) => <span className="whitespace-nowrap">{r.authorised_date || "-"}</span> },
  { key: "dispatch_date", label: "Dispatched", minWidth: "105px", render: (r) => <span className="whitespace-nowrap">{r.dispatch_date || "-"}</span> },
  { key: "docket", label: "Docket / mode", minWidth: "120px", render: (r) => r.docket },
  { key: "sent_via", label: "Sent via", minWidth: "150px", render: (r) => <span className="whitespace-nowrap">{r.sent_via || "-"}</span> },
  { key: "emailed_date", label: "Emailed", minWidth: "105px", render: (r) => <span className="whitespace-nowrap">{r.emailed_date || "-"}</span> },
  { key: "invoice_no", label: "Invoice", minWidth: "110px", render: (r) => <span className="whitespace-nowrap">{r.invoice_no}</span> },
];

export default function MisSampleFlow() {
  const isManagement =
    MANAGEMENT_IDS.includes(Number(localStorage.getItem("userId"))) ||
    ["admin", "4"].includes(localStorage.getItem("userRole"));

  const today = new Date();
  const myId = Number(localStorage.getItem("userId"));
  const [tab, setTab] = useState("tracker");
  const [from, setFrom] = useState(isoDate(new Date(today.getTime() - 60 * 86400000)));
  const [to, setTo] = useState(isoDate(today));
  const [type, setType] = useState("all");
  const [department, setDepartment] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activeKpi, setActiveKpi] = useState(null);
  const [activeTopCard, setActiveTopCard] = useState(null); // 'testing', 'calibration', 'bis_dues', 'general_dues'
  const handleTopCardClick = (key) => {
    setActiveTopCard((prev) => (prev === key ? null : key));
    setTimeout(() => document.getElementById("mis-table")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const [lcStage, setLcStage] = useState(null); // lifecycle card number (4,5,6,9,11)
  const [showAllDepts, setShowAllDepts] = useState(false); // false = one row per sample (matches the card count)
  const [lcStatus, setLcStatus] = useState(""); // "", Done, Pending, Overdue
  const [gt3Only, setGt3Only] = useState(false);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [myOnly, setMyOnly] = useState(false);
  const [catFilter, setCatFilter] = useState(""); // PROVISIONAL category: BIS (IS standard) / General / Calibration
  const [q, setQ] = useState("");
  const [colFilters, setColFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [userScope, setUserScope] = useState(null);

  const [tat, setTat] = useState({ table_ready: true, data: [], allowance_days: 1 });
  const [acks, setAcks] = useState(null);
  const [mailLog, setMailLog] = useState(null);
  const [mailFilters, setMailFilters] = useState({ from: isoDate(new Date(today.getTime() - 30 * 86400000)), to: isoDate(today), status: "", mode: "", q: "" });
  const [openMail, setOpenMail] = useState(null);
  const [ackDays, setAckDays] = useState(7);
  const [tatDraft, setTatDraft] = useState({ package_key: "", department: "*", dept_days: "", kailtech_tat: "" });

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/mis/tracker", { params: { from, to, type, q: q || undefined } });
      if (res.data?.status) {
        setData(res.data.data);
        if (res.data.data?.user_scope) {
          const scope = res.data.data.user_scope;
          setUserScope(scope);
          if (!scope.is_management && scope.allowed_departments?.length > 0 && !department) {
            setDepartment(scope.allowed_departments[0]);
          }
        }
      } else toast.error(res.data?.message || "Could not load the MIS.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load the MIS.");
    } finally {
      setLoading(false);
    }
  };

  const loadTat = async () => {
    try {
      const res = await axios.get("/mis/tat-master");
      if (res.data?.status) setTat(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load the TAT Master.");
    }
  };

  const loadMailLog = async (f = mailFilters) => {
    try {
      const res = await axios.get("/mis/email-log", { params: { from: f.from, to: f.to, status: f.status || undefined, mode: f.mode || undefined, q: f.q || undefined } });
      if (res.data?.status) setMailLog(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load the email log.");
    }
  };

  const loadAcks = async (days = ackDays) => {
    try {
      const res = await axios.get("/mis/acks", { params: { days } });
      if (res.data?.status) setAcks(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load the confirmations.");
    }
  };

  useEffect(() => {
    if (isManagement) {
      load();
      loadTat();
      loadAcks();
      loadMailLog();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        if (prev.direction === "asc") return { key, direction: "desc" };
        return { key: null, direction: "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  // Same rule as the backend lifecycle cards: one row per LRN, at its least advanced (not closed) stage;
  // among departments at that stage prefer an overdue one so the red strip matches the table.
  const countedRows = useMemo(() => {
    const byLrn = new Map();
    (data?.rows || []).forEach((x) => {
      const k = String(x.lrn);
      if (!byLrn.has(k)) byLrn.set(k, []);
      byLrn.get(k).push(x);
    });
    const set = new Set();
    byLrn.forEach((list) => {
      let min = null;
      list.forEach((x) => {
        const n = Number(x.lifecycle_no);
        if (n !== 12 && (min === null || n < min)) min = n;
      });
      const pool = min === null ? list : list.filter((x) => Number(x.lifecycle_no) === min);
      set.add(pool.find((x) => x.lifecycle_status === "Overdue") || pool[0]);
    });
    return set;
  }, [data]);
  const allDeptCount = useMemo(() => {
    if (!lcStage) return 0;
    const all = data?.rows || [];
    return lcStage === 3 ? all.length : all.filter((x) => Number(x.lifecycle_no) === lcStage).length;
  }, [data, lcStage]);

  const rows = useMemo(() => {
    let r = data?.rows || [];
    if (department) r = r.filter((x) => x.department === department);
    if (stageFilter) r = r.filter((x) => x.stage === stageFilter);
    if (statusFilter) r = r.filter((x) => x.testing_status === statusFilter || x.report_status === statusFilter);

    // Apply active Top Card filter (Testing, Calibration, BIS Dues, General Dues)
    if (activeTopCard) {
      switch (activeTopCard) {
        case "testing":
          r = r.filter((x) => x.type === "Testing" || x.type !== "Calibration");
          break;
        case "calibration":
          r = r.filter((x) => x.type === "Calibration");
          break;
        case "bis_dues":
          r = r.filter((x) => {
            const isBis = String(x.category || "").toLowerCase().includes("bis") || String(x.package || "").toLowerCase().includes("is");
            const isDue = x.report_status === "OVERDUE" || x.testing_status === "OVERDUE" || x.lifecycle_status === "Overdue";
            return isBis && isDue;
          });
          break;
        case "general_dues":
          r = r.filter((x) => {
            const isBis = String(x.category || "").toLowerCase().includes("bis") || String(x.package || "").toLowerCase().includes("is");
            const isDue = x.report_status === "OVERDUE" || x.testing_status === "OVERDUE" || x.lifecycle_status === "Overdue";
            return !isBis && isDue;
          });
          break;
        default:
          break;
      }
    }

    // Apply active KPI card filter
    if (activeKpi) {
      switch (activeKpi) {
        case "samples_booked":
          break;
        case "open_samples":
          r = r.filter((x) => !x.dispatch_date && !x.emailed_date);
          break;
        case "in_testing":
          r = r.filter((x) => x.stage === "Testing" || (!x.results_date && x.stage !== "Not transferred" && x.stage !== "Awaiting allocation"));
          break;
        case "awaiting_authorisation":
          r = r.filter((x) => x.stage === "Awaiting authorisation" || (x.results_date && !x.authorised_date));
          break;
        case "ready_to_dispatch":
          r = r.filter((x) => x.stage === "Ready to dispatch");
          break;
        case "reports_overdue":
          r = r.filter((x) => x.report_status === "OVERDUE");
          break;
        case "reports_due_soon":
          r = r.filter((x) => x.report_status === "Due soon");
          break;
        case "bill_pending":
          r = r.filter((x) => (x.dispatch_date || x.emailed_date) && !x.invoice_no);
          break;
        case "not_transferred":
          r = r.filter((x) => x.stage === "Not transferred");
          break;
        case "awaiting_allocation":
          r = r.filter((x) => x.stage === "Awaiting allocation");
          break;
        case "dept_in_testing":
          r = r.filter((x) => x.stage === "Testing");
          break;
        case "testing_overdue":
          r = r.filter((x) => x.testing_status === "OVERDUE");
          break;
        case "testing_due_soon":
          r = r.filter((x) => x.testing_status === "Due soon");
          break;
        case "results_submitted":
          r = r.filter((x) => x.results_date || x.stage === "Results submitted");
          break;
        case "urgent_open":
          r = r.filter((x) => x.priority === "Urgent" && !x.results_date);
          break;
        case "tat_conflicts":
          r = r.filter((x) => Number(x.tat_conflict) === 1);
          break;
        default:
          break;
      }
    }

    // Lifecycle card / status / quick filters
    if (lcStage) {
      // Cards count SAMPLES (one per LRN, at its least advanced department), so by default the table shows exactly
      // those rows. "Done" looks at later stages, and the toggle shows every department row of the stage.
      if (!showAllDepts && lcStatus !== "Done") r = r.filter((x) => countedRows.has(x) && (lcStage === 3 || Number(x.lifecycle_no) === lcStage));
      else if (lcStage !== 3) r = r.filter((x) => Number(x.lifecycle_no) === lcStage);
    }
    if (lcStatus) {
      r = r.filter((x) => {
        const no = Number(x.lifecycle_no);
        if (lcStatus === "Done") return lcStage && lcStage !== 3 ? no > lcStage : no === 12;
        if (lcStatus === "Pending") return no !== 12 && x.lifecycle_status === "Pending";
        return x.lifecycle_status === "Overdue";
      });
    }
    if (gt3Only) r = r.filter((x) => Number(x.overdue_gt3) === 1);
    if (urgentOnly) r = r.filter((x) => x.priority === "Urgent");
    if (myOnly) r = r.filter((x) => Number(x.allocated_to_id) === myId);
    if (catFilter) r = r.filter((x) => x.category === catFilter);

    // Apply per-column text filters
    Object.entries(colFilters).forEach(([colKey, val]) => {
      if (!val || !val.trim()) return;
      const searchVal = val.trim().toLowerCase();
      r = r.filter((row) => {
        const cellVal = String(row[colKey] ?? "").toLowerCase();
        return cellVal.includes(searchVal);
      });
    });

    // Apply sorting
    if (sortConfig.key) {
      const { key, direction } = sortConfig;
      r = [...r].sort((a, b) => {
        let valA = a[key] ?? "";
        let valB = b[key] ?? "";
        if (typeof valA === "number" || typeof valB === "number" || key === "days_since_booking") {
          const numA = Number(valA) || 0;
          const numB = Number(valB) || 0;
          return direction === "asc" ? numA - numB : numB - numA;
        }
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
        if (valA < valB) return direction === "asc" ? -1 : 1;
        if (valA > valB) return direction === "asc" ? 1 : -1;
        return 0;
      });
    } else if (lcStage || lcStatus || gt3Only) {
      // default order for lifecycle views: urgent + overdue first, then most days overdue
      r = [...r].sort((a, b) => {
        const ua = a.priority === "Urgent" && a.lifecycle_status === "Overdue" ? 1 : 0;
        const ub = b.priority === "Urgent" && b.lifecycle_status === "Overdue" ? 1 : 0;
        return ub - ua || (Number(b.overdue_days) || 0) - (Number(a.overdue_days) || 0);
      });
    }

    return r;
  }, [data, department, stageFilter, statusFilter, activeKpi, colFilters, sortConfig, lcStage, lcStatus, showAllDepts, countedRows, gt3Only, urgentOnly, myOnly, catFilter, myId]);

  const departments = useMemo(() => [...new Set((data?.rows || []).map((x) => x.department))].sort(), [data]);
  const lcGt3 = useMemo(() => {
    const m = {};
    (data?.rows || []).forEach((x) => { if (Number(x.overdue_gt3) === 1) m[Number(x.lifecycle_no)] = true; });
    return m;
  }, [data]);
  const deptLc = useMemo(() => {
    const m = {};
    (data?.rows || []).forEach((x) => {
      const d = (m[x.department] = m[x.department] || { review: 0, gt3: 0 });
      if (Number(x.lifecycle_no) === 6) d.review += 1;
      if (Number(x.overdue_gt3) === 1) d.gt3 += 1;
    });
    return m;
  }, [data]);

  const myCount = useMemo(
    () => (data?.rows || []).filter((x) => Number(x.allocated_to_id) === myId && Number(x.lifecycle_no) !== 12).length,
    [data, myId]
  );

  const pickLifecycle = (no, status) => {
    setActiveKpi(null);
    setShowAllDepts(false);
    if (lcStage === no && lcStatus === status) {
      setLcStage(null);
      setLcStatus("");
      return;
    }
    setLcStage(no);
    setLcStatus(status);
    setTimeout(() => document.getElementById("mis-table")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const stages = ["Allotted to Dept", "Awaiting allocation", "Under testing", "Under HOD / QA", "Ready to dispatch", "Bill pending", "Closed"];
  const categoryList = useMemo(() => {
    const set = new Set();
    (data?.rows || []).forEach((r) => { if (r.category) set.add(r.category); });
    return Array.from(set).sort();
  }, [data?.rows]);

  const exportCsv = () => {
    if (!rows.length) return;
    const cols = TRACKER_COLUMNS.map((c) => c.key);
    const headers = TRACKER_COLUMNS.map((c) => c.label);
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = "\uFEFF" + [headers.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `MIS_sample_flow_${isoDate(new Date())}.csv`;
    a.click();
  };

  const exportExcel = () => {
    if (!rows.length) return;
    const exportData = rows.map((r) => {
      const rowObj = {};
      TRACKER_COLUMNS.forEach((col) => {
        rowObj[col.label] = r[col.key] ?? "";
      });
      return rowObj;
    });
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "MIS Sample Flow");
    XLSX.writeFile(workbook, `MIS_sample_flow_${isoDate(new Date())}.xlsx`);
  };

  const saveTat = async () => {
    if (!tatDraft.package_key.trim()) {
      toast.error("Enter the package / instrument name exactly as it appears in the tracker.");
      return;
    }
    try {
      const res = await axios.post("/mis/tat-master", { rows: [tatDraft] });
      if (res.data?.status) {
        toast.success("TAT Master saved.");
        setTatDraft({ package_key: "", department: "*", dept_days: "", kailtech_tat: "" });
        loadTat();
      } else toast.error(res.data?.message || "Could not save.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save.");
    }
  };

  if (!isManagement) {
    return (
      <Page title="MIS - Sample Flow">
        <div className="p-6 text-sm text-gray-600">The MIS is available to management only.</div>
      </Page>
    );
  }

  const s = data?.summary;

  return (
    <Page title="MIS - Sample Flow">
      <div className="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Sample Flow Tracker</h2>
              {userScope && (
                userScope.is_management ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-200 shadow-xs">
                    🏢 Executive Company-Wide View (Top Management)
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200 shadow-xs">
                    🔒 Department View: {userScope.department_name} ({userScope.user_name})
                  </span>
                )
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              As on {data?.as_on || "-"} · one row per LRN per department · read-only (nothing here changes any record)
            </p>
          </div>
          <div className="flex gap-2">
            {["tracker", ...(userScope?.is_management !== false ? ["tat"] : []), "mail"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${tab === t ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300"}`}
              >
                {t === "tracker" ? "Tracker & Dashboard" : t === "acks" ? (userScope && !userScope.is_management ? `${userScope.department_name} Confirmations` : "Allotment confirmations") : t === "mail" ? "Email log" : "TAT Master"}
              </button>
            ))}
          </div>
        </div>

        {tab === "tracker" && (
          <>
            <div className="flex flex-wrap items-end gap-2 text-xs">
              <label>From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="block border rounded-lg p-1.5" /></label>
              <label>To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="block border rounded-lg p-1.5" /></label>
              <label>Type
                <select value={type} onChange={(e) => setType(e.target.value)} className="block border rounded-lg p-1.5">
                  <option value="all">All</option><option value="testing">Testing</option><option value="calibration">Calibration</option>
                </select>
              </label>
              <label>Search LRN / customer / PO<input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} className="block border rounded-lg p-1.5" /></label>
              <button type="button" onClick={load} disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold">{loading ? "Loading..." : "Load"}</button>
              <button type="button" onClick={exportCsv} disabled={!rows.length} className="px-3 py-2 rounded-lg border font-semibold hover:bg-gray-50 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                Export CSV
              </button>
              <button type="button" onClick={exportExcel} disabled={!rows.length} className="px-3 py-2 rounded-lg border font-semibold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                Export Excel (.xlsx)
              </button>
            </div>

            {data?.truncated && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">Showing the latest 2000 rows only - narrow the dates to see the rest.</div>
            )}
            {data && !data.tat_master_loaded && (
              <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-2">
                TAT Master is empty, so a default of {data.default_tat_days || 10} days from booking is used for due dates (until the final TAT list is supplied). Fill the TAT Master tab to use the quoted Kailtech TAT.
              </div>
            )}

            {s && (
              <>
                {/* Top KPI Header: Sample Types & Standard Due Split (Clickable) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                  <div
                    onClick={() => handleTopCardClick("testing")}
                    role="button"
                    tabIndex={0}
                    title="Click to filter table by Testing Samples"
                    className={`rounded-xl border p-2.5 flex items-center justify-between cursor-pointer select-none transition-all hover:shadow-md ${
                      activeTopCard === "testing"
                        ? "border-blue-600 bg-blue-100 dark:bg-blue-900/60 ring-2 ring-blue-600"
                        : "border-blue-200 bg-blue-50/70 dark:bg-blue-950/30 hover:border-blue-400"
                    }`}
                  >
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">🔬 Testing Samples</div>
                      <div className="text-xl font-extrabold text-blue-950 dark:text-blue-100">{s.split_counts?.testing ?? 0}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-colors ${
                      activeTopCard === "testing" ? "bg-blue-600 text-white" : "bg-blue-200/80 text-blue-900"
                    }`}>
                      {activeTopCard === "testing" ? "Filtered ✓" : "Total Booked"}
                    </span>
                  </div>

                  <div
                    onClick={() => handleTopCardClick("calibration")}
                    role="button"
                    tabIndex={0}
                    title="Click to filter table by Calibration Samples"
                    className={`rounded-xl border p-2.5 flex items-center justify-between cursor-pointer select-none transition-all hover:shadow-md ${
                      activeTopCard === "calibration"
                        ? "border-indigo-600 bg-indigo-100 dark:bg-indigo-900/60 ring-2 ring-indigo-600"
                        : "border-indigo-200 bg-indigo-50/70 dark:bg-indigo-950/30 hover:border-indigo-400"
                    }`}
                  >
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">📐 Calibration Samples</div>
                      <div className="text-xl font-extrabold text-indigo-950 dark:text-indigo-100">{s.split_counts?.calibration ?? 0}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-colors ${
                      activeTopCard === "calibration" ? "bg-indigo-600 text-white" : "bg-indigo-200/80 text-indigo-900"
                    }`}>
                      {activeTopCard === "calibration" ? "Filtered ✓" : "Total Booked"}
                    </span>
                  </div>

                  <div
                    onClick={() => handleTopCardClick("bis_dues")}
                    role="button"
                    tabIndex={0}
                    title="Click to filter table by Overdue BIS / IS Standard Samples"
                    className={`rounded-xl border p-2.5 flex items-center justify-between cursor-pointer select-none transition-all hover:shadow-md ${
                      activeTopCard === "bis_dues"
                        ? "border-red-600 bg-red-100 dark:bg-red-900/60 ring-2 ring-red-600"
                        : "border-red-200 bg-red-50/70 dark:bg-red-950/30 hover:border-red-400"
                    }`}
                  >
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-300">📜 BIS / IS Standard Dues</div>
                      <div className="text-xl font-extrabold text-red-950 dark:text-red-100">{s.split_counts?.bis_dues ?? 0}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-colors ${
                      activeTopCard === "bis_dues" ? "bg-red-600 text-white" : "bg-red-200/80 text-red-900"
                    }`}>
                      {activeTopCard === "bis_dues" ? "Filtered ✓" : "Overdue"}
                    </span>
                  </div>

                  <div
                    onClick={() => handleTopCardClick("general_dues")}
                    role="button"
                    tabIndex={0}
                    title="Click to filter table by Overdue General Standard Samples"
                    className={`rounded-xl border p-2.5 flex items-center justify-between cursor-pointer select-none transition-all hover:shadow-md ${
                      activeTopCard === "general_dues"
                        ? "border-amber-600 bg-amber-100 dark:bg-amber-900/60 ring-2 ring-amber-600"
                        : "border-amber-200 bg-amber-50/70 dark:bg-amber-950/30 hover:border-amber-400"
                    }`}
                  >
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">📋 General Standard Dues</div>
                      <div className="text-xl font-extrabold text-amber-950 dark:text-amber-100">{s.split_counts?.general_dues ?? 0}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-colors ${
                      activeTopCard === "general_dues" ? "bg-amber-600 text-white" : "bg-amber-200/80 text-amber-900"
                    }`}>
                      {activeTopCard === "general_dues" ? "Filtered ✓" : "Overdue"}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] uppercase tracking-wide font-semibold text-gray-500">Sample lifecycle - click a card to see its samples, click the strip below it to see only the overdue ones</div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                  {LC_CARDS.map((c) => {
                    const stat = s.lifecycle?.[c.no] || { total: 0, overdue: 0, urgent: 0 };
                    return (
                      <LifecycleCard
                        key={c.no}
                        card={c}
                        stat={stat}
                        health={lcHealth(stat.total, stat.overdue, !!lcGt3[c.no])}
                        active={lcStage === c.no}
                        overdueActive={lcStage === c.no && lcStatus === "Overdue"}
                        onMain={() => pickLifecycle(c.no, "")}
                        onOverdue={() => pickLifecycle(c.no, "Overdue")}
                      />
                    );
                  })}
                </div>
                <div className="text-[11px] text-gray-600 bg-gray-50 border rounded-lg p-2">
                  Cards count samples (LRN) at their least advanced department; the table shows one row per department. Overdue = past the TAT due date (testing) or more than 1 day waiting at a later step.
                  Colour: green = nothing overdue, amber = up to 10% overdue, red = more than 10% overdue or anything more than 3 days late. Numbers differ from the earlier screen because empty dates
                  (0000-00-00) are no longer counted as completed steps. &quot;default TAT&quot; = the 10-day fallback is used because the package is not in the TAT Master. Provisional: the BIS category (packages &quot;as per IS ####&quot;), the gate-entry tile and OES shown under Chemical will follow the client&apos;s final rules.
                </div>
                <div className="text-[11px] uppercase tracking-wide font-semibold text-gray-500">Overview</div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                  <Card label="Samples booked (LRN)" value={s.samples_booked} active={activeKpi === "samples_booked"} onClick={() => setActiveKpi(prev => prev === "samples_booked" ? null : "samples_booked")} />
                  <Card label="Open (report not sent)" value={s.open_samples} active={activeKpi === "open_samples"} onClick={() => setActiveKpi(prev => prev === "open_samples" ? null : "open_samples")} />
                  <Card label="Reports OVERDUE" value={s.reports_overdue} tone={s.reports_overdue ? "red" : undefined} active={activeKpi === "reports_overdue"} onClick={() => setActiveKpi(prev => prev === "reports_overdue" ? null : "reports_overdue")} />
                  <Card label="Reports due today/tomorrow" value={s.reports_due_soon} tone={s.reports_due_soon ? "amber" : undefined} active={activeKpi === "reports_due_soon"} onClick={() => setActiveKpi(prev => prev === "reports_due_soon" ? null : "reports_due_soon")} />
                  <Card label="Bill pending" value={s.bill_pending} active={activeKpi === "bill_pending"} onClick={() => setActiveKpi(prev => prev === "bill_pending" ? null : "bill_pending")} />
                  <Card label="Urgent open" value={s.urgent_open} active={activeKpi === "urgent_open"} onClick={() => setActiveKpi(prev => prev === "urgent_open" ? null : "urgent_open")} />
                  <Card label="TAT conflicts" value={s.tat_conflicts} active={activeKpi === "tat_conflicts"} onClick={() => setActiveKpi(prev => prev === "tat_conflicts" ? null : "tat_conflicts")} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs">
                    <div className="text-[11px] uppercase tracking-wide text-gray-500">Dispatch transmission (info)</div>
                    <div className="mt-0.5"><b className="text-lg">{s.transmission?.sent ?? 0}</b> samples sent - {s.transmission?.email ?? 0} by email, {s.transmission?.courier ?? 0} with courier docket</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Pending hard-copy tracking starts once the Hard Copy Required flag is added.</div>
                  </div>
                  {s.gate && (
                    <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">Gate entries still open, last 30 days (info only)</div>
                      <div className="mt-0.5"><b className="text-lg">{s.gate.open_total}</b> open - {s.gate.age_0_1} today/yesterday, {s.gate.age_2_3} for 2-3 days, {s.gate.age_4_plus} for 4+ days</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">Not a judgement: gate entries are not linked to bookings and are rarely closed, so older ones are mostly not real backlog.</div>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500"><tr>
                      {["Department", "Awaiting allocation", "Under testing", "OVERDUE", "Testing on-time %", "In review / sign-off", "Overdue > 3 days"].map((h) => <th key={h} className="p-2 text-left">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {(s.by_department || []).map((d) => (
                        <tr key={d.department} className="border-t">
                          <td className="p-2 font-semibold cursor-pointer text-blue-700" onClick={() => setDepartment(d.department === department ? "" : d.department)}>{d.department}</td>
                          <td className="p-2">{d.awaiting_allocation}</td><td className="p-2">{d.in_testing}</td>
                          <td className="p-2 text-red-700 font-semibold">{d.overdue}</td>
                          <td className="p-2">{d.done_total ? `${Math.round((d.done_on_time / d.done_total) * 100)}%` : "-"}</td>
                          <td className="p-2">{deptLc[d.department]?.review ?? 0}</td>
                          <td className="p-2 text-red-700 font-semibold">{deptLc[d.department]?.gt3 ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {userScope && !userScope.is_management ? (
                <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1 text-blue-900 font-medium">
                  <span className="text-[11px] text-blue-600 uppercase font-semibold">Department:</span>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="bg-transparent font-semibold focus:outline-none"
                    disabled={userScope.allowed_departments?.length <= 1}
                  >
                    {userScope.allowed_departments?.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <select value={department} onChange={(e) => setDepartment(e.target.value)} className="border rounded-lg p-1.5">
                  <option value="">All departments</option>{departments.map((d) => <option key={d}>{d}</option>)}
                </select>
              )}
              <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="border rounded-lg p-1.5">
                <option value="">All stages</option>{stages.map((d) => <option key={d}>{d}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded-lg p-1.5">
                <option value="">All statuses</option>{["OVERDUE", "Due soon", "On track", "Done", "No due date"].map((d) => <option key={d}>{d}</option>)}
              </select>
              <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="border rounded-lg p-1.5" title="Category / Specific Purpose">
                <option value="">All categories</option>
                {categoryList.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={lcStatus} onChange={(e) => setLcStatus(e.target.value)} className="border rounded-lg p-1.5" title="Done / Pending / Overdue for the selected lifecycle card (or for all samples)">
                <option value="">Lifecycle: all</option>
                {["Done", "Pending", "Overdue"].map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <button type="button" onClick={() => setGt3Only((v) => !v)} className={`px-2.5 py-1 rounded-full border font-semibold ${gt3Only ? "bg-red-600 text-white border-red-600" : "bg-white text-red-700 border-red-300 hover:bg-red-50"}`}>Overdue &gt; 3 days</button>
              <button type="button" onClick={() => setUrgentOnly((v) => !v)} className={`px-2.5 py-1 rounded-full border font-semibold ${urgentOnly ? "bg-red-600 text-white border-red-600" : "bg-white text-red-700 border-red-300 hover:bg-red-50"}`}>Urgent only</button>
              <button type="button" onClick={() => setMyOnly((v) => !v)} className={`px-2.5 py-1 rounded-full border font-semibold ${myOnly ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-700 border-blue-300 hover:bg-blue-50"}`} title="Open items allotted to you">&#128276; My items ({myCount})</button>
              <span className="self-center font-semibold text-gray-600">{rows.length} rows</span>
              {lcStage && (
                <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-900 text-xs px-2.5 py-1 rounded-full font-semibold">
                  <span>Showing: <b>{LC_CARDS.find((c) => c.no === lcStage)?.label}{lcStatus ? ` - ${lcStatus}` : ""}</b>{!showAllDepts && lcStatus !== "Done" ? ` - ${rows.length} samples` : ` - ${rows.length} department rows`}</span>
                  {lcStatus !== "Done" && (
                    <button type="button" onClick={() => setShowAllDepts((v) => !v)} className="underline hover:text-blue-700" title="Cards count one row per sample; this shows every department row">
                      {showAllDepts ? "Show one row per sample" : `Show all departments (${allDeptCount} rows)`}
                    </button>
                  )}
                  <button type="button" onClick={() => { setLcStage(null); setLcStatus(""); setShowAllDepts(false); }} className="ml-1 hover:text-red-600 font-bold" title="Clear lifecycle filter">x</button>
                </span>
              )}
              {activeTopCard && (
                <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-900 dark:bg-blue-900/60 dark:text-blue-200 text-xs px-2.5 py-1 rounded-full font-semibold shadow-xs">
                  <span>Top Filter: <b>{activeTopCard === "testing" ? "Testing Samples" : activeTopCard === "calibration" ? "Calibration Samples" : activeTopCard === "bis_dues" ? "BIS / IS Standard Dues" : "General Standard Dues"}</b></span>
                  <button
                    type="button"
                    onClick={() => setActiveTopCard(null)}
                    className="ml-1 hover:text-red-600 font-bold"
                    title="Clear filter"
                  >
                    ✕
                  </button>
                </span>
              )}
              {activeKpi && (
                <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-900 dark:bg-blue-900/60 dark:text-blue-200 text-xs px-2.5 py-1 rounded-full font-semibold shadow-xs">
                  <span>KPI Filter: <b>{activeKpi.replace(/_/g, " ")}</b></span>
                  <button
                    type="button"
                    onClick={() => setActiveKpi(null)}
                    className="ml-1 hover:text-red-600 font-bold"
                    title="Clear KPI filter"
                  >
                    ✕
                  </button>
                </span>
              )}
              {(Object.values(colFilters).some(Boolean) || sortConfig.key) && (
                <button
                  type="button"
                  onClick={() => { setColFilters({}); setSortConfig({ key: null, direction: "asc" }); setActiveTopCard(null); }}
                  className="ml-2 px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md border border-red-200 transition-colors"
                >
                  Reset Sort & Column Filters
                </button>
              )}
            </div>

            <div id="mis-table" className="overflow-auto border rounded-xl max-h-[65vh]">
              <table className="min-w-[1500px] w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 sticky top-0 z-10 shadow-sm">
                  <tr>
                    {TRACKER_COLUMNS.map((col) => {
                      const isSorted = sortConfig.key === col.key;
                      return (
                        <th
                          key={col.key}
                          className={`p-2 text-left whitespace-nowrap align-top border-b border-gray-200 dark:border-gray-600 ${col.stickyLeft !== undefined ? "bg-gray-50 dark:bg-gray-700" : ""}`}
                          style={{ minWidth: col.minWidth || "110px", ...(col.stickyLeft !== undefined ? { position: "sticky", left: col.stickyLeft, zIndex: 20 } : {}) }}
                        >
                          <div
                            onClick={() => handleSort(col.key)}
                            className="flex items-center justify-between gap-1 cursor-pointer select-none hover:text-blue-600"
                            title={`Sort by ${col.label}`}
                          >
                            <span className="font-semibold text-[11px] uppercase tracking-wider">{col.label}</span>
                            <SortIcon active={isSorted} direction={sortConfig.direction} />
                          </div>
                          <div className="mt-1">
                            <input
                              type="text"
                              placeholder="Search..."
                              value={colFilters[col.key] || ""}
                              onChange={(e) => setColFilters((prev) => ({ ...prev, [col.key]: e.target.value }))}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 text-[11px] font-normal text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={`${r.type}-${r.lrn}-${r.department}-${i}`} className="border-t hover:bg-blue-50/40">
                      {TRACKER_COLUMNS.map((col) => (
                        <td
                          key={col.key}
                          className={`p-2 ${col.stickyLeft !== undefined ? "bg-white dark:bg-gray-800 border-r border-gray-200" : ""}`}
                          style={col.stickyLeft !== undefined ? { position: "sticky", left: col.stickyLeft, zIndex: 5 } : undefined}
                        >
                          {col.render ? col.render(r) : r[col.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {!rows.length && !loading && (
                    <tr>
                      <td colSpan={TRACKER_COLUMNS.length} className="p-6 text-center text-gray-500">
                        No rows for these filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "acks" && (
          <div className="space-y-3">
            <p className="text-xs text-gray-600">
              Testing phase. People allotted a TRF / inward are asked to confirm they received it. &quot;Not received&quot; answers are disputes to resolve; &quot;No response&quot; lists allotments nobody has answered yet.
            </p>
            <div className="flex items-center gap-2 text-xs">
              <label>Last
                <select value={ackDays} onChange={(e) => { setAckDays(Number(e.target.value)); loadAcks(Number(e.target.value)); }} className="ml-1 border rounded-lg p-1.5">
                  {[2, 7, 14, 30].map((d) => <option key={d} value={d}>{d} days</option>)}
                </select>
              </label>
              <button type="button" onClick={() => loadAcks()} className="px-3 py-1.5 rounded-lg border font-semibold">Refresh</button>
            </div>
            {acks && !acks.table_ready && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">The confirmation tables have not been created on the server yet.</div>
            )}
            {acks?.data?.summary && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <Card label="Confirmed" value={acks.data.summary.confirmed} />
                <Card label="Will confirm later" value={acks.data.summary.later} tone={acks.data.summary.later ? "amber" : undefined} />
                <Card label="Not received (dispute)" value={acks.data.summary.not_received} tone={acks.data.summary.not_received ? "red" : undefined} />
                <Card label="No response" value={acks.data.summary.no_response} tone={acks.data.summary.no_response ? "amber" : undefined} />
                <Card label="No response, past a day" value={acks.data.summary.no_response_overdue} tone={acks.data.summary.no_response_overdue ? "red" : undefined} />
              </div>
            )}
            <h4 className="text-sm font-bold">Answers</h4>
            <div className="overflow-auto border rounded-xl max-h-[40vh]">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500 sticky top-0"><tr>
                  {["Person", "Type", "Ref", "Customer", "Items", "Allotted", "Answer", "Note", "Answered at", "Times"].map((h) => <th key={h} className="p-2 text-left whitespace-nowrap">{h}</th>)}
                </tr></thead>
                <tbody>
                  {(acks?.data?.answers || []).map((r, i) => (
                    <tr key={i} className={`border-t ${r.status === "not_received" ? "bg-red-50" : ""}`}>
                      <td className="p-2">{r.person}</td><td className="p-2">{r.kind}</td><td className="p-2">{r.kind === "testing" ? `TRF #${r.ref_id}` : `Inward #${r.ref_id}`}</td>
                      <td className="p-2">{r.customer}</td><td className="p-2">{r.items}</td><td className="p-2 whitespace-nowrap">{(r.allotted_on || "").slice(0, 16)}</td>
                      <td className="p-2 font-semibold">{r.status === "not_received" ? "NOT RECEIVED" : r.status === "later" ? `Later (remind ${(r.remind_at || "").slice(0, 16)})` : "Confirmed"}</td>
                      <td className="p-2">{r.note}</td><td className="p-2 whitespace-nowrap">{(r.responded_on || "").slice(0, 16)}</td><td className="p-2">{r.responses}</td>
                    </tr>
                  ))}
                  {!(acks?.data?.answers || []).length && <tr><td colSpan={10} className="p-4 text-center text-gray-500">No answers yet.</td></tr>}
                </tbody>
              </table>
            </div>
            <h4 className="text-sm font-bold">No response yet</h4>
            <div className="overflow-auto border rounded-xl max-h-[40vh]">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500 sticky top-0"><tr>
                  {["Person", "Type", "Ref", "Customer", "Items", "Allotted", "Waiting"].map((h) => <th key={h} className="p-2 text-left whitespace-nowrap">{h}</th>)}
                </tr></thead>
                <tbody>
                  {(acks?.data?.no_response || []).map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{r.person}</td><td className="p-2">{r.kind}</td><td className="p-2">{r.kind === "testing" ? `TRF #${r.ref_id}` : `Inward #${r.ref_id}`}</td>
                      <td className="p-2">{r.customer}</td><td className="p-2">{r.items}</td><td className="p-2 whitespace-nowrap">{(r.allotted_on || "").slice(0, 16)}</td>
                      <td className="p-2">{r.overdue ? <span className="text-red-700 font-semibold">More than a day</span> : "Today"}</td>
                    </tr>
                  ))}
                  {!(acks?.data?.no_response || []).length && <tr><td colSpan={7} className="p-4 text-center text-gray-500">Nothing waiting.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "mail" && (
          <div className="space-y-3">
            <p className="text-xs text-gray-600">Every report / invoice email sent from the LIMS: who sent it, to whom, what was attached and the result. Click a row for the full detail.</p>
            <div className="flex flex-wrap items-end gap-2 text-xs">
              <label>From<input type="date" value={mailFilters.from} onChange={(e) => setMailFilters({ ...mailFilters, from: e.target.value })} className="block border rounded-lg p-1.5" /></label>
              <label>To<input type="date" value={mailFilters.to} onChange={(e) => setMailFilters({ ...mailFilters, to: e.target.value })} className="block border rounded-lg p-1.5" /></label>
              <label>Status
                <select value={mailFilters.status} onChange={(e) => setMailFilters({ ...mailFilters, status: e.target.value })} className="block border rounded-lg p-1.5">
                  <option value="">All</option><option value="success">Sent</option><option value="test_delivered">Test delivered</option><option value="failed">Failed</option><option value="cancelled">Cancelled</option><option value="queued_hold">Queued</option>
                </select>
              </label>
              <label>Mode
                <select value={mailFilters.mode} onChange={(e) => setMailFilters({ ...mailFilters, mode: e.target.value })} className="block border rounded-lg p-1.5">
                  <option value="">All</option><option value="live">Live</option><option value="test">Test</option>
                </select>
              </label>
              <label>Search<input value={mailFilters.q} onChange={(e) => setMailFilters({ ...mailFilters, q: e.target.value })} onKeyDown={(e) => e.key === "Enter" && loadMailLog()} placeholder="customer / email / PO / subject" className="block border rounded-lg p-1.5 w-56" /></label>
              <button type="button" onClick={() => loadMailLog()} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold">Load</button>
            </div>
            {mailLog?.summary && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <Card label="Emails" value={mailLog.summary.total} />
                <Card label="Sent to customers" value={mailLog.summary.sent_live} />
                <Card label="Test emails" value={mailLog.summary.test} />
                <Card label="Failed" value={mailLog.summary.failed} tone={mailLog.summary.failed ? "red" : undefined} />
                <Card label="Cancelled" value={mailLog.summary.cancelled} />
              </div>
            )}
            <div className="overflow-auto border rounded-xl max-h-[65vh]">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500 sticky top-0"><tr>
                  {["When", "Sent by", "Type", "Reference", "Customer", "To", "Docs", "Invoice", "Mode", "Status"].map((h) => <th key={h} className="p-2 text-left whitespace-nowrap">{h}</th>)}
                </tr></thead>
                <tbody>
                  {(mailLog?.rows || []).map((r) => (
                    <Fragment key={r.id}>
                      <tr onClick={() => setOpenMail(openMail === r.id ? null : r.id)} className={`border-t cursor-pointer hover:bg-blue-50/40 ${r.status === "failed" ? "bg-red-50" : ""}`}>
                        <td className="p-2 whitespace-nowrap">{(r.sent_at || "").slice(0, 16)}</td>
                        <td className="p-2">{r.sent_by}<div className="text-[10px] text-gray-500">{r.sent_by_role}</div></td>
                        <td className="p-2">{r.type}</td><td className="p-2 whitespace-nowrap">{r.ref}</td><td className="p-2 max-w-[200px] truncate" title={r.customer}>{r.customer}</td>
                        <td className="p-2 max-w-[220px] truncate" title={(r.to || []).join(", ")}>{(r.to || []).join(", ")}</td>
                        <td className="p-2">{r.documents}</td><td className="p-2">{r.invoice_no || "-"}</td>
                        <td className="p-2">{r.mode === "test" ? <span className="text-amber-700 font-semibold">TEST</span> : "LIVE"}</td>
                        <td className="p-2 font-semibold">{r.status}</td>
                      </tr>
                      {openMail === r.id && (
                        <tr key={`${r.id}-d`} className="bg-gray-50">
                          <td colSpan={10} className="p-3 space-y-1">
                            <div><b>Subject:</b> {r.subject}</div>
                            <div><b>To:</b> {(r.to || []).join(", ") || "-"} &nbsp; <b>CC:</b> {(r.cc || []).join(", ") || "-"} &nbsp; <b>BCC:</b> {(r.bcc || []).join(", ") || "-"}</div>
                            <div><b>P.O. / reference:</b> {r.po || "-"} &nbsp; <b>Total size:</b> {(r.size_bytes / 1048576).toFixed(2)} MB (sent as one ZIP) &nbsp; <b>IP:</b> {r.ip || "-"}</div>
                            <div><b>Declaration:</b> {r.declaration || "-"}</div>
                            {r.declaration_text && <div className="text-gray-600">{r.declaration_text}</div>}
                            {r.error && <div className="text-red-700"><b>Error:</b> {r.error}</div>}
                            {r.feedback && <div><b>Tester feedback:</b> {r.feedback}</div>}
                            <table className="w-full mt-2 border">
                              <thead className="bg-white text-gray-500"><tr><th className="p-1 text-left">Certificate / report</th><th className="p-1 text-left">Instrument / product</th><th className="p-1 text-left">Serial / ID</th><th className="p-1 text-left">File</th><th className="p-1 text-left">Size</th></tr></thead>
                              <tbody>{(r.items || []).map((it, i) => (
                                <tr key={i} className="border-t"><td className="p-1">{it.no}</td><td className="p-1">{it.name}</td><td className="p-1">{it.serial}</td><td className="p-1">{it.file}</td><td className="p-1">{(it.bytes / 1024).toFixed(0)} KB</td></tr>
                              ))}</tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  {!(mailLog?.rows || []).length && <tr><td colSpan={10} className="p-6 text-center text-gray-500">No emails for these filters.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "tat" && (
          <div className="space-y-3">
            <p className="text-xs text-gray-600">
              Kailtech TAT = report lead time quoted to the customer (use Department = <b>*</b>). Dept days = internal testing days for one department.
              Package name must match the tracker exactly. Report Due = Booking + Kailtech TAT; packages not listed here use a default of 10 days.
            </p>
            {!tat.table_ready ? (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">The TAT Master table has not been created on the server yet.</div>
            ) : (
              <>
                <div className="flex flex-wrap items-end gap-2 text-xs">
                  <label>Package / instrument<input value={tatDraft.package_key} onChange={(e) => setTatDraft({ ...tatDraft, package_key: e.target.value })} className="block border rounded-lg p-1.5 w-64" /></label>
                  <label>Department (* = Kailtech TAT)<input value={tatDraft.department} onChange={(e) => setTatDraft({ ...tatDraft, department: e.target.value })} className="block border rounded-lg p-1.5 w-48" /></label>
                  <label>Dept days<input type="number" min="0" value={tatDraft.dept_days} onChange={(e) => setTatDraft({ ...tatDraft, dept_days: e.target.value })} className="block border rounded-lg p-1.5 w-24" /></label>
                  <label>Kailtech TAT<input type="number" min="0" value={tatDraft.kailtech_tat} onChange={(e) => setTatDraft({ ...tatDraft, kailtech_tat: e.target.value })} className="block border rounded-lg p-1.5 w-24" /></label>
                  <button type="button" onClick={saveTat} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold">Save</button>
                </div>
                <table className="w-full text-xs border rounded-xl">
                  <thead className="bg-gray-50 text-gray-500"><tr><th className="p-2 text-left">Package</th><th className="p-2 text-left">Department</th><th className="p-2 text-left">Dept days</th><th className="p-2 text-left">Kailtech TAT</th></tr></thead>
                  <tbody>
                    {tat.data.map((t) => (
                      <tr key={t.id} className="border-t cursor-pointer" onClick={() => setTatDraft({ package_key: t.package_key, department: t.department, dept_days: t.dept_days ?? "", kailtech_tat: t.kailtech_tat ?? "" })}>
                        <td className="p-2">{t.package_key}</td><td className="p-2">{t.department}</td><td className="p-2">{t.dept_days}</td><td className="p-2">{t.kailtech_tat}</td>
                      </tr>
                    ))}
                    {!tat.data.length && <tr><td colSpan={4} className="p-4 text-center text-gray-500">No TAT rows yet.</td></tr>}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}
      </div>
    </Page>
  );
}
