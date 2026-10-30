// MIS Phase 1 - Sample Flow Tracker (read-only) + TAT Master. Server: MisController (management only).
import { useEffect, useMemo, useState } from "react";
import axios from "utils/axios";
import { toast } from "sonner";
import { Page } from "components/shared/Page";

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
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const [tat, setTat] = useState({ table_ready: true, data: [], allowance_days: 1 });
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

  useEffect(() => {
    if (isManagement) {
      load();
      loadTat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(() => {
    let r = data?.rows || [];
    if (department) r = r.filter((x) => x.department === department);
    if (stageFilter) r = r.filter((x) => x.stage === stageFilter);
    if (statusFilter) r = r.filter((x) => x.testing_status === statusFilter || x.report_status === statusFilter);
    return r;
  }, [data, department, stageFilter, statusFilter]);

  const departments = useMemo(() => [...new Set((data?.rows || []).map((x) => x.department))].sort(), [data]);
  const stages = ["Not transferred", "Awaiting allocation", "Testing", "Results submitted", "Ready to dispatch", "Bill pending", "Closed"];

  const exportCsv = () => {
    const cols = ["type", "lrn", "booking_date", "package", "customer", "po_no", "department", "priority", "test_due_date", "report_due_date", "transfer_date", "allocated_to", "allocation_date", "results_date", "authorised_date", "dispatch_date", "docket", "emailed_date", "invoice_no", "invoice_date", "stage", "days_since_booking", "testing_status", "report_status"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = "﻿" + [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `MIS_sample_flow_${isoDate(new Date())}.csv`;
    a.click();
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
            {["tracker", "tat"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${tab === t ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300"}`}
              >
                {t === "tracker" ? "Tracker & Dashboard" : "TAT Master"}
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
              <button type="button" onClick={exportCsv} disabled={!rows.length} className="px-4 py-2 rounded-lg border font-semibold">Export CSV</button>
            </div>

            {data?.truncated && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">Showing the latest 2000 rows only - narrow the dates to see the rest.</div>
            )}
            {data && !data.tat_master_loaded && (
              <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-2">
                TAT Master is empty, so Report Due = latest department due date + 1 day. Fill the TAT Master tab to use the quoted Kailtech TAT.
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

            <div className="flex flex-wrap gap-2 text-xs">
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className="border rounded-lg p-1.5">
                <option value="">All departments</option>{departments.map((d) => <option key={d}>{d}</option>)}
              </select>
              <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="border rounded-lg p-1.5">
                <option value="">All stages</option>{stages.map((d) => <option key={d}>{d}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded-lg p-1.5">
                <option value="">All statuses</option>{["OVERDUE", "Due soon", "On track", "Done", "No due date"].map((d) => <option key={d}>{d}</option>)}
              </select>
              <span className="self-center text-gray-500">{rows.length} rows</span>
            </div>

            <div className="overflow-auto border rounded-xl max-h-[65vh]">
              <table className="min-w-[1500px] w-full text-xs">
                <thead className="bg-gray-50 text-gray-500 sticky top-0"><tr>
                  {["Type", "LRN", "Booking", "Package", "Customer", "PO", "Department", "Priority", "Test due", "Report due", "Transferred", "Allocated to", "Allocated on", "Results", "Authorised", "Dispatched", "Docket / mode", "Emailed", "Invoice", "Stage", "Days", "Testing", "Report"].map((h) => <th key={h} className="p-2 text-left whitespace-nowrap">{h}</th>)}
                </tr></thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={`${r.type}-${r.lrn}-${r.department}-${i}`} className="border-t hover:bg-blue-50/40">
                      <td className="p-2">{r.type}</td><td className="p-2 font-mono font-semibold">{r.lrn}</td>
                      <td className="p-2 whitespace-nowrap">{r.booking_date?.slice(0, 10)}</td>
                      <td className="p-2 max-w-[200px] truncate" title={r.package}>{r.package}</td>
                      <td className="p-2 max-w-[180px] truncate" title={r.customer}>{r.customer}</td>
                      <td className="p-2">{r.po_no}</td><td className="p-2">{r.department}</td>
                      <td className="p-2">{r.priority === "Urgent" ? <b className="text-red-600">Urgent</b> : "Normal"}</td>
                      <td className="p-2 whitespace-nowrap">{r.test_due_date}</td><td className="p-2 whitespace-nowrap">{r.report_due_date}</td>
                      <td className="p-2 whitespace-nowrap">{r.transfer_date}</td><td className="p-2">{r.allocated_to}</td>
                      <td className="p-2 whitespace-nowrap">{r.allocation_date}</td><td className="p-2 whitespace-nowrap">{r.results_date}</td>
                      <td className="p-2 whitespace-nowrap">{r.authorised_date}</td><td className="p-2 whitespace-nowrap">{r.dispatch_date}</td>
                      <td className="p-2">{r.docket}</td><td className="p-2 whitespace-nowrap">{r.emailed_date}</td>
                      <td className="p-2 whitespace-nowrap">{r.invoice_no}</td>
                      <td className="p-2 whitespace-nowrap font-semibold">{r.stage}</td><td className="p-2">{r.days_since_booking}</td>
                      <td className="p-2"><Chip value={r.testing_status} /></td><td className="p-2"><Chip value={r.report_status} /></td>
                    </tr>
                  ))}
                  {!rows.length && !loading && (
                    <tr><td colSpan={23} className="p-6 text-center text-gray-500">No rows for these filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "tat" && (
          <div className="space-y-3">
            <p className="text-xs text-gray-600">
              Kailtech TAT = report lead time quoted to the customer (use Department = <b>*</b>). Dept days = internal testing days for one department.
              Package name must match the tracker exactly. Report Due = Booking + Kailtech TAT, otherwise latest department due + {tat.allowance_days} day.
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
