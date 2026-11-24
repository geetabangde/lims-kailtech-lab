import { useState, useEffect, useCallback, useMemo } from "react";
import dayjs from "dayjs";
import clsx from "clsx";
import { toast } from "sonner";
import { Page } from "components/shared/Page";
import { getRejectionLog } from "../shared/lifecycleApi";

// Management view: every denied / rejected / lost entry with who, when and WHY (2026-11-24).
const EVENT_STYLE = {
  "Technical Rejected": "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300",
  "Enquiry Regretted": "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  "Enquiry Closed": "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300",
  "Quotation Lost": "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  "Technical Reopened": "bg-gray-200 text-gray-700 dark:bg-gray-500/10 dark:text-gray-300",
  "Technical Approved": "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  "Technical Requested": "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
};
const DENIAL_EVENTS = ["Technical Rejected", "Enquiry Regretted", "Enquiry Closed", "Quotation Lost"];

export default function RejectionLog() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [to, setTo] = useState(dayjs().format("YYYY-MM-DD"));
  const [eventType, setEventType] = useState("");
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getRejectionLog({
        from,
        to,
        search,
        event_type: showAll ? "all" : eventType || undefined,
      });
      setRows(res.data?.data || []);
      setSummary(res.data?.summary || {});
    } catch {
      toast.error("Failed to load the rejection log");
    } finally {
      setLoading(false);
    }
  }, [from, to, search, eventType, showAll]);

  useEffect(() => {
    const t = setTimeout(fetchData, 250);
    return () => clearTimeout(t);
  }, [fetchData]);

  const reasonBreakdown = useMemo(() => {
    const m = {};
    rows.forEach((r) => {
      if (!DENIAL_EVENTS.includes(r.event_type)) return;
      const k = r.reason_category || "Not specified";
      m[k] = (m[k] || 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const clearAll = () => {
    setFrom(dayjs().startOf("month").format("YYYY-MM-DD"));
    setTo(dayjs().format("YYYY-MM-DD"));
    setEventType("");
    setSearch("");
    setShowAll(false);
  };

  const exportCsv = () => {
    const head = ["Date", "Event", "Enquiry", "Quotation", "Customer", "Reason", "Remark", "By"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = rows.map((r) =>
      [
        dayjs(r.created_at).format("DD-MM-YYYY HH:mm"),
        r.event_type,
        r.enquiry_id || "",
        r.quotation_id ? `${r.quotation_type} #${r.quotation_id}` : "",
        r.customer_name,
        r.reason_category,
        r.remark,
        r.by_name,
      ].map(esc).join(","),
    );
    const blob = new Blob([[head.map(esc).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `rejection_log_${dayjs().format("DDMMYYYY")}.csv`;
    a.click();
  };

  const inputCls =
    "h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100";

  return (
    <Page title="Rejection & Denial Log">
      <div className="transition-content px-[var(--margin-x)] pb-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 pt-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-dark-50">Rejection &amp; Denial Log</h1>
            <p className="text-xs text-gray-500">
              Every technically rejected, regretted, closed or lost entry - who, when and why.
            </p>
          </div>
          <button
            onClick={exportCsv}
            disabled={!rows.length}
            className="h-9 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>

        <div className="mb-3 flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold text-gray-500">
            From
            <input type="date" className={clsx(inputCls, "mt-1 block")} value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="text-xs font-semibold text-gray-500">
            To
            <input type="date" className={clsx(inputCls, "mt-1 block")} value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label className="text-xs font-semibold text-gray-500">
            Search
            <input
              className={clsx(inputCls, "mt-1 block w-64")}
              placeholder="Customer, reason, remark..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 pb-2 text-xs font-semibold text-gray-500">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            Include approvals / requests / re-opens
          </label>
          <button
            type="button"
            onClick={clearAll}
            className="h-9 rounded-lg border border-red-300 bg-red-50 px-4 text-sm font-semibold text-red-700 hover:bg-red-100"
          >
            Clear Filters
          </button>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          <button
            onClick={() => setEventType("")}
            className={clsx("rounded-full border px-3 py-1 text-xs font-semibold", !eventType ? "border-primary-600 bg-primary-600 text-white" : "border-gray-300 bg-white text-gray-700 dark:bg-dark-800 dark:text-dark-100")}
          >
            All denials
          </button>
          {DENIAL_EVENTS.map((ev) => (
            <button
              key={ev}
              onClick={() => { setShowAll(false); setEventType(ev); }}
              className={clsx("rounded-full border px-3 py-1 text-xs font-semibold", eventType === ev ? "border-primary-600 bg-primary-600 text-white" : "border-gray-300 bg-white text-gray-700 dark:bg-dark-800 dark:text-dark-100")}
            >
              {ev} ({summary[ev] || 0})
            </button>
          ))}
        </div>

        {reasonBreakdown.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {reasonBreakdown.map(([k, n]) => (
              <span key={k} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100">
                <span className="font-semibold">{k}</span>: {n}
              </span>
            ))}
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-dark-500 dark:bg-dark-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-200 text-xs font-semibold uppercase text-gray-800 dark:bg-dark-800 dark:text-dark-100">
              <tr>
                {["Date & Time", "Event", "Ref", "Customer", "Reason", "Remark", "By"].map((h) => (
                  <th key={h} className="px-3 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-10 text-center text-gray-500">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-gray-500">No entries for this selection.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100 align-top dark:border-dark-600">
                    <td className="whitespace-nowrap px-3 py-2">{dayjs(r.created_at).format("DD-MM-YYYY hh:mm A")}</td>
                    <td className="px-3 py-2">
                      <span className={clsx("rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide", EVENT_STYLE[r.event_type])}>
                        {r.event_type}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs">
                      {r.enquiry_id ? `Enquiry #${r.enquiry_id}` : ""}
                      {r.quotation_id ? `${r.quotation_type === "testing" ? "Testing" : "Calibration"} Quote #${r.quotation_id}` : ""}
                    </td>
                    <td className="min-w-[160px] px-3 py-2">{r.customer_name || "-"}</td>
                    <td className="min-w-[140px] px-3 py-2 font-medium">{r.reason_category || "-"}</td>
                    <td className="min-w-[220px] whitespace-pre-wrap px-3 py-2 text-gray-600 dark:text-dark-200">{r.remark || "-"}</td>
                    <td className="whitespace-nowrap px-3 py-2">{r.by_name || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Page>
  );
}
