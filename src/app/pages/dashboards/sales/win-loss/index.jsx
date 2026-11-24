import { useState, useEffect, useCallback } from "react";
import dayjs from "dayjs";
import clsx from "clsx";
import { toast } from "sonner";
import axios from "utils/axios";
import { Page } from "components/shared/Page";
import { poDocUrl } from "../shared/PoDetailsModal";

// Management view: enquiry -> quotation -> won / lost funnel, monthly table, loss reasons and the PO register (2026-11-24).
const inr = (v) => `₹${Math.round(Number(v) || 0).toLocaleString("en-IN")}`;
const fyStart = () => {
  const n = dayjs();
  return dayjs(`${n.month() >= 3 ? n.year() : n.year() - 1}-04-01`).format("YYYY-MM-DD");
};

export default function WinLoss() {
  const [from, setFrom] = useState(fyStart());
  const [to, setTo] = useState(dayjs().format("YYYY-MM-DD"));
  const [data, setData] = useState(null);
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [a, p] = await Promise.all([
        axios.get("/enquiry-lifecycle/analytics", { params: { from, to } }),
        axios.get("/enquiry-lifecycle/po-register", { params: { from, to } }),
      ]);
      setData(a.data);
      setPos(p.data?.data || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const t = data?.totals;
  const enq = data?.enquiries;
  const monthly = data?.monthly || [];
  const maxQ = Math.max(1, t?.count || 0, Number(enq?.total) || 0);

  const exportCsv = () => {
    const head = ["Month", "Quotations", "Quoted value", "Won", "Won value", "Lost", "Lost value", "Pending", "Win rate % (of decided)"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = monthly.map((m) =>
      [m.month, m.quotations, Math.round(m.quoted_value), m.won, Math.round(m.won_value), m.lost, Math.round(m.lost_value), m.pending, m.win_rate ?? ""].map(esc).join(","),
    );
    const blob = new Blob([[head.map(esc).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `win_loss_${dayjs().format("DDMMYYYY")}.csv`;
    a.click();
  };

  const inputCls =
    "h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100";
  const card = "rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-dark-500 dark:bg-dark-800";
  const th = "px-3 py-2.5";

  const bar = (label, value, color, sub) => (
    <div className="mb-2">
      <div className="mb-0.5 flex justify-between text-xs text-gray-600 dark:text-dark-200">
        <span className="font-semibold">{label}</span>
        <span>{sub}</span>
      </div>
      <div className="h-3 w-full rounded bg-gray-100 dark:bg-dark-600">
        <div className={clsx("h-3 rounded", color)} style={{ width: `${Math.min(100, (value / maxQ) * 100)}%` }} />
      </div>
    </div>
  );

  return (
    <Page title="Win / Loss Analytics">
      <div className="transition-content px-[var(--margin-x)] pb-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 pt-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-dark-50">Win / Loss Analytics</h1>
            <p className="text-xs text-gray-500">Enquiries to quotations to orders. Quotations marked converted or CRF punched count as won.</p>
          </div>
          <button onClick={exportCsv} disabled={!monthly.length} className="h-9 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50">
            Export monthly CSV
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold text-gray-500">From
            <input type="date" className={clsx(inputCls, "mt-1 block")} value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="text-xs font-semibold text-gray-500">To
            <input type="date" className={clsx(inputCls, "mt-1 block")} value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button type="button" onClick={() => { setFrom(fyStart()); setTo(dayjs().format("YYYY-MM-DD")); }} className="h-9 rounded-lg border border-red-300 bg-red-50 px-4 text-sm font-semibold text-red-700 hover:bg-red-100">
            Clear Filters
          </button>
        </div>

        {loading && !data ? (
          <p className="py-10 text-center text-gray-500">Loading...</p>
        ) : !data ? null : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              <div className={card}><p className="text-[11px] font-semibold uppercase text-gray-500">Enquiries</p><p className="mt-1 text-lg font-bold">{enq?.total ?? 0}</p><p className="text-[11px] text-gray-500">{enq?.pending ?? 0} pending · {enq?.quoted ?? 0} quoted · {enq?.regretted ?? 0} regretted</p></div>
              <div className={card}><p className="text-[11px] font-semibold uppercase text-gray-500">Quotations</p><p className="mt-1 text-lg font-bold text-blue-600">{t.count}</p><p className="text-[11px] text-gray-500">{inr(t.value)}</p></div>
              <div className={card}><p className="text-[11px] font-semibold uppercase text-gray-500">Won</p><p className="mt-1 text-lg font-bold text-emerald-600">{t.won}</p><p className="text-[11px] text-gray-500">{inr(t.won_value)}</p></div>
              <div className={card}><p className="text-[11px] font-semibold uppercase text-gray-500">Lost</p><p className="mt-1 text-lg font-bold text-rose-600">{t.lost}</p><p className="text-[11px] text-gray-500">{inr(t.lost_value)}</p></div>
              <div className={card}><p className="text-[11px] font-semibold uppercase text-gray-500">Still open</p><p className="mt-1 text-lg font-bold text-amber-600">{t.pending}</p><p className="text-[11px] text-gray-500">{inr(t.pending_value)}</p></div>
              <div className={card}><p className="text-[11px] font-semibold uppercase text-gray-500">Conversion</p><p className="mt-1 text-lg font-bold">{data.conversion_rate ?? "-"}%</p><p className="text-[11px] text-gray-500">won / all quotations · win rate {data.win_rate ?? "-"}% of decided</p></div>
            </div>

            <div className={clsx(card, "mb-4")}>
              <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-dark-100">Funnel</p>
              {bar("Enquiries", Number(enq?.total) || 0, "bg-gray-500", `${enq?.total ?? 0}`)}
              {bar("Quotations", t.count, "bg-blue-500", `${t.count}`)}
              {bar("Won", t.won, "bg-emerald-500", `${t.won} (${inr(t.won_value)})`)}
              {bar("Lost", t.lost, "bg-rose-500", `${t.lost} (${inr(t.lost_value)})`)}
              <p className="mt-2 text-[11px] text-gray-500">Calibration: {data.quotations.calibration.count} quotations, {data.quotations.calibration.won} won · Testing: {data.quotations.testing.count} quotations, {data.quotations.testing.won} won</p>
              {t.lost === 0 && <p className="mt-1 text-[11px] text-amber-600">No quotation has been marked Lost in this period, so open quotations may include ones that were actually lost. Use the Lost Quotation button to record them.</p>}
            </div>

            <div className="mb-4 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-dark-500 dark:bg-dark-800">
              <p className="px-3 pt-3 text-sm font-semibold text-gray-700 dark:text-dark-100">Monthly</p>
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-200 text-xs font-semibold uppercase text-gray-800 dark:bg-dark-800 dark:text-dark-100">
                  <tr>{["Month", "Quotations", "Quoted value", "Won", "Won value", "Lost", "Lost value", "Open", "Win rate"].map((h) => <th key={h} className={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {monthly.length === 0 ? (
                    <tr><td colSpan={9} className="py-6 text-center text-gray-500">No quotations in this period.</td></tr>
                  ) : monthly.map((m) => (
                    <tr key={m.month} className="border-t border-gray-100 dark:border-dark-600">
                      <td className="px-3 py-2 font-medium">{dayjs(`${m.month}-01`).format("MMM YYYY")}</td>
                      <td className="px-3 py-2">{m.quotations}</td>
                      <td className="px-3 py-2">{inr(m.quoted_value)}</td>
                      <td className="px-3 py-2 text-emerald-600">{m.won}</td>
                      <td className="px-3 py-2">{inr(m.won_value)}</td>
                      <td className="px-3 py-2 text-rose-600">{m.lost}</td>
                      <td className="px-3 py-2">{inr(m.lost_value)}</td>
                      <td className="px-3 py-2">{m.pending}</td>
                      <td className="px-3 py-2">{m.win_rate == null ? "-" : `${m.win_rate}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mb-4 grid gap-4 lg:grid-cols-2">
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-dark-500 dark:bg-dark-800">
                <p className="px-3 pt-3 text-sm font-semibold text-gray-700 dark:text-dark-100">Why we lost / were denied (from the Rejection Log)</p>
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-200 text-xs font-semibold uppercase text-gray-800 dark:bg-dark-800 dark:text-dark-100">
                    <tr>{["Type", "Reason", "Count"].map((h) => <th key={h} className={th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {data.loss_reasons.length === 0 ? (
                      <tr><td colSpan={3} className="py-6 text-center text-gray-500">No structured reasons recorded yet in this period.</td></tr>
                    ) : data.loss_reasons.map((r, i) => (
                      <tr key={i} className="border-t border-gray-100 dark:border-dark-600">
                        <td className="px-3 py-2">{r.event_type}</td>
                        <td className="px-3 py-2 font-medium">{r.reason}</td>
                        <td className="px-3 py-2">{r.c}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-dark-500 dark:bg-dark-800">
                <p className="px-3 pt-3 text-sm font-semibold text-gray-700 dark:text-dark-100">PO register</p>
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-200 text-xs font-semibold uppercase text-gray-800 dark:bg-dark-800 dark:text-dark-100">
                    <tr>{["Quotation", "Customer", "PO No.", "PO date", "PO value", "Document"].map((h) => <th key={h} className={th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {pos.length === 0 ? (
                      <tr><td colSpan={6} className="py-6 text-center text-gray-500">No PO details saved in this period.</td></tr>
                    ) : pos.map((p) => (
                      <tr key={`${p.quotation_type}-${p.id}`} className="border-t border-gray-100 dark:border-dark-600">
                        <td className="whitespace-nowrap px-3 py-2">{p.quotationno}</td>
                        <td className="px-3 py-2">{p.customername}</td>
                        <td className="px-3 py-2 font-medium">{p.po_number || "-"}</td>
                        <td className="whitespace-nowrap px-3 py-2">{p.po_date ? dayjs(p.po_date).format("DD-MM-YYYY") : "-"}</td>
                        <td className="px-3 py-2">{p.po_value ? inr(p.po_value) : "-"}</td>
                        <td className="px-3 py-2">{p.document_path ? <a href={poDocUrl(p.document_path)} target="_blank" rel="noreferrer" className="font-semibold text-blue-600 hover:underline">Open</a> : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Page>
  );
}
