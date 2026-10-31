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

function Card({ label, value, tone }) {
  return (
    <div className={`rounded-xl border p-3 ${tone === "red" ? "border-red-200 bg-red-50" : tone === "amber" ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700"}`}>
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value ?? "-"}</div>
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
  { key: "stage", label: "Stage", minWidth: "140px", render: (r) => <span className="font-semibold whitespace-nowrap">{r.stage}</span> },
  { key: "days_since_booking", label: "Days", minWidth: "80px", render: (r) => r.days_since_booking },
  { key: "testing_status", label: "Testing", minWidth: "110px", render: (r) => <Chip value={r.testing_status} /> },
  { key: "report_status", label: "Report", minWidth: "110px", render: (r) => <Chip value={r.report_status} /> },
  { key: "type", label: "Type", minWidth: "85px", render: (r) => r.type },
  { key: "lrn", label: "LRN", minWidth: "130px", render: (r) => <span className="font-mono font-semibold">{r.lrn}</span> },
  { key: "booking_date", label: "Booking", minWidth: "105px", render: (r) => <span className="whitespace-nowrap">{r.booking_date?.slice(0, 10)}</span> },
  { key: "package", label: "Package", minWidth: "180px", render: (r) => <span className="max-w-[200px] truncate block" title={r.package}>{r.package}</span> },
  { key: "customer", label: "Customer", minWidth: "180px", render: (r) => <span className="max-w-[180px] truncate block" title={r.customer}>{r.customer}</span> },
  { key: "po_no", label: "PO", minWidth: "120px", render: (r) => r.po_no },
  { key: "department", label: "Department", minWidth: "130px", render: (r) => r.department },
  { key: "priority", label: "Priority", minWidth: "85px", render: (r) => r.priority === "Urgent" ? <b className="text-red-600">Urgent</b> : "Normal" },
  { key: "test_due_date", label: "Test due", minWidth: "105px", render: (r) => <span className="whitespace-nowrap">{r.test_due_date}</span> },
  { key: "report_due_date", label: "Report due", minWidth: "105px", render: (r) => <span className="whitespace-nowrap">{r.report_due_date}</span> },
  { key: "transfer_date", label: "Transferred", minWidth: "105px", render: (r) => <span className="whitespace-nowrap">{r.transfer_date}</span> },
  { key: "allocated_to", label: "Allocated to", minWidth: "120px", render: (r) => r.allocated_to },
  { key: "allocation_date", label: "Allocated on", minWidth: "105px", render: (r) => <span className="whitespace-nowrap">{r.allocation_date}</span> },
  { key: "results_date", label: "Results", minWidth: "105px", render: (r) => <span className="whitespace-nowrap">{r.results_date}</span> },
  { key: "authorised_date", label: "Authorised", minWidth: "105px", render: (r) => <span className="whitespace-nowrap">{r.authorised_date}</span> },
  { key: "dispatch_date", label: "Dispatched", minWidth: "105px", render: (r) => <span className="whitespace-nowrap">{r.dispatch_date}</span> },
  { key: "docket", label: "Docket / mode", minWidth: "120px", render: (r) => r.docket },
  { key: "emailed_date", label: "Emailed", minWidth: "105px", render: (r) => <span className="whitespace-nowrap">{r.emailed_date}</span> },
  { key: "invoice_no", label: "Invoice", minWidth: "110px", render: (r) => <span className="whitespace-nowrap">{r.invoice_no}</span> },
];

export default function MisSampleFlow() {
  const isManagement =
    MANAGEMENT_IDS.includes(Number(localStorage.getItem("userId"))) ||
    ["admin", "4"].includes(localStorage.getItem("userRole"));

  const today = new Date();
  const [tab, setTab] = useState("tracker");
  const [from, setFrom] = useState(isoDate(new Date(today.getTime() - 60 * 86400000)));
  const [to, setTo] = useState(isoDate(today));
  const [type, setType] = useState("all");
  const [department, setDepartment] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [q, setQ] = useState("");
  const [colFilters, setColFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

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
      if (res.data?.status) setData(res.data.data);
      else toast.error(res.data?.message || "Could not load the MIS.");
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

  const rows = useMemo(() => {
    let r = data?.rows || [];
    if (department) r = r.filter((x) => x.department === department);
    if (stageFilter) r = r.filter((x) => x.stage === stageFilter);
    if (statusFilter) r = r.filter((x) => x.testing_status === statusFilter || x.report_status === statusFilter);

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
    }

    return r;
  }, [data, department, stageFilter, statusFilter, colFilters, sortConfig]);

  const departments = useMemo(() => [...new Set((data?.rows || []).map((x) => x.department))].sort(), [data]);
  const stages = ["Not transferred", "Awaiting allocation", "Testing", "Results submitted", "Ready to dispatch", "Bill pending", "Closed"];

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
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Sample Flow Tracker</h2>
            <p className="text-xs text-gray-500">
              As on {data?.as_on || "-"} · one row per LRN per department · read-only (nothing here changes any record)
            </p>
          </div>
          <div className="flex gap-2">
            {["tracker", "acks", "mail", "tat"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${tab === t ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300"}`}
              >
                {t === "tracker" ? "Tracker & Dashboard" : t === "acks" ? "Allotment confirmations" : t === "mail" ? "Email log" : "TAT Master"}
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
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                  <Card label="Samples booked (LRN)" value={s.samples_booked} />
                  <Card label="Open (report not sent)" value={s.open_samples} />
                  <Card label="In testing" value={s.in_testing} />
                  <Card label="Awaiting authorisation" value={s.awaiting_authorisation} />
                  <Card label="Ready to dispatch" value={s.ready_to_dispatch} />
                  <Card label="Reports OVERDUE" value={s.reports_overdue} tone={s.reports_overdue ? "red" : undefined} />
                  <Card label="Reports due today/tomorrow" value={s.reports_due_soon} tone={s.reports_due_soon ? "amber" : undefined} />
                  <Card label="Bill pending" value={s.bill_pending} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                  <Card label="Not transferred" value={s.not_transferred} />
                  <Card label="Awaiting allocation" value={s.awaiting_allocation} />
                  <Card label="Dept rows in testing" value={s.dept_in_testing} />
                  <Card label="Testing OVERDUE" value={s.testing_overdue} tone={s.testing_overdue ? "red" : undefined} />
                  <Card label="Testing due soon" value={s.testing_due_soon} tone={s.testing_due_soon ? "amber" : undefined} />
                  <Card label="Results submitted" value={s.results_submitted} />
                  <Card label="Urgent open" value={s.urgent_open} />
                  <Card label="TAT conflicts" value={s.tat_conflicts} />
                </div>

                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500"><tr>
                      {["Department", "Awaiting allocation", "In testing", "OVERDUE", "Due soon", "Results submitted", "Testing on-time %"].map((h) => <th key={h} className="p-2 text-left">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {(s.by_department || []).map((d) => (
                        <tr key={d.department} className="border-t">
                          <td className="p-2 font-semibold cursor-pointer text-blue-700" onClick={() => setDepartment(d.department === department ? "" : d.department)}>{d.department}</td>
                          <td className="p-2">{d.awaiting_allocation}</td><td className="p-2">{d.in_testing}</td>
                          <td className="p-2 text-red-700 font-semibold">{d.overdue}</td><td className="p-2">{d.due_soon}</td>
                          <td className="p-2">{d.results_submitted}</td>
                          <td className="p-2">{d.done_total ? `${Math.round((d.done_on_time / d.done_total) * 100)}%` : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className="border rounded-lg p-1.5">
                <option value="">All departments</option>{departments.map((d) => <option key={d}>{d}</option>)}
              </select>
              <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="border rounded-lg p-1.5">
                <option value="">All stages</option>{stages.map((d) => <option key={d}>{d}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded-lg p-1.5">
                <option value="">All statuses</option>{["OVERDUE", "Due soon", "On track", "Done", "No due date"].map((d) => <option key={d}>{d}</option>)}
              </select>
              <span className="self-center font-semibold text-gray-600">{rows.length} rows</span>
              {(Object.values(colFilters).some(Boolean) || sortConfig.key) && (
                <button
                  type="button"
                  onClick={() => { setColFilters({}); setSortConfig({ key: null, direction: "asc" }); }}
                  className="ml-2 px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md border border-red-200 transition-colors"
                >
                  Reset Sort & Column Filters
                </button>
              )}
            </div>

            <div className="overflow-auto border rounded-xl max-h-[65vh]">
              <table className="min-w-[1500px] w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 sticky top-0 z-10 shadow-sm">
                  <tr>
                    {TRACKER_COLUMNS.map((col) => {
                      const isSorted = sortConfig.key === col.key;
                      return (
                        <th
                          key={col.key}
                          className="p-2 text-left whitespace-nowrap align-top border-b border-gray-200 dark:border-gray-600"
                          style={{ minWidth: col.minWidth || "110px" }}
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
                        <td key={col.key} className="p-2">
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
