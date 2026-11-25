// MIS - Sample Flow Tracker (STAGED 2026-11-13).
// Simplified 8-column main table + non-tabular Detail View modal + Classic Top Cards + Email Log & TAT Master tabs.
// Server: GET /mis/tracker22 and GET /mis/gate-pending (MisController, server-side scoped).
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import axios from "utils/axios";
import { toast } from "sonner";
import { Page } from "components/shared/Page";
import * as XLSX from "xlsx";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import SendBatchDispatchModal from "../calibration-process/inward-entry-lab/SendBatchDispatchModal";
import MarkSentModal from "../calibration-process/inward-entry-lab/MarkSentModal";
import { canSendDispatchEmail, canSendTestingDispatchEmail, canMarkSentOffline } from "utils/dispatchAccess";

// DD-MM-YYYY format everywhere (client rule). Accepts "YYYY-MM-DD" or "YYYY-MM-DD hh:mm:ss"; blank / zero dates show "-".
const fmtDate = (v) => {
  if (!v || String(v).startsWith("0000")) return "-";
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : String(v);
};

const isoDate = (d) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};

// Email dispatch details inside the Detail modal (same fields as the Email Log tab: who sent, subject, To / CC / BCC, P.O., size, IP, declaration, attachments).
function EmailLogDetail({ logs, pending }) {
  const list = Array.isArray(logs) ? logs : [];
  const join = (a) => (Array.isArray(a) && a.length ? a.join(", ") : "-");
  return (
    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-dark-700">
      <div className="text-xs font-bold uppercase tracking-wide text-gray-600 mb-2">Email details</div>
      {list.length === 0 ? (
        pending ? (
          <div className="text-xs rounded-lg border border-amber-300 bg-amber-50 text-amber-900 px-3 py-2 font-medium">Email pending &ndash; report is ready, no email has been sent for this sample yet.</div>
        ) : (
          <div className="text-xs text-gray-500 italic">No email has been sent for this sample yet.</div>
        )
      ) : (
        <div className="space-y-3">
          {list.map((m, idx) => (
            <details key={m.id} open={idx === 0} className={`group rounded-lg border p-3 text-xs space-y-1 bg-white dark:bg-dark-800 ${m.status === "failed" ? "border-red-300" : "border-gray-200 dark:border-dark-700"}`}>
              <summary className="flex flex-wrap items-center gap-2 text-gray-700 dark:text-gray-200 cursor-pointer select-none">
                {/* 18-Nov-2026: visible triangle (points right when closed, down when open) + hint, so users know the row opens and closes */}
                <span aria-hidden="true" className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#18457c]/10 text-[10px] text-[#18457c] transition-transform duration-150 group-open:rotate-90">&#9654;</span>
                <span className="font-semibold">{idx === 0 ? "Latest: " : "Earlier: "}{m.sent_at ? `${fmtDate(m.sent_at)} ${String(m.sent_at).slice(11, 16)}` : "-"}</span>
                <span>{m.sent_by}{m.sent_by_role ? <span className="text-gray-500"> ({m.sent_by_role})</span> : null}</span>
                <Badge cls={m.mode === "test" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}>{m.mode === "test" ? "TEST" : "LIVE"}</Badge>
                <Badge cls={m.status === "failed" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700"}>{m.status}</Badge>
                <span className="ml-auto text-[10px] font-medium text-gray-500 group-open:hidden">Click to open</span>
                <span className="ml-auto hidden text-[10px] font-medium text-gray-500 group-open:inline">Click to close</span>
              </summary>
              <div><b>Subject:</b> {m.subject || "-"}</div>
              <div><b>To:</b> {join(m.to)} &nbsp; <b>CC:</b> {join(m.cc)} &nbsp; <b>BCC:</b> {join(m.bcc)}</div>
              <div>
                <b>P.O. / reference:</b> {m.po || "-"} &nbsp; <b>Total size:</b> {(Number(m.size_bytes || 0) / 1048576).toFixed(2)} MB
                {m.parts > 1 ? ` (part ${m.part} of ${m.parts})` : " (sent as one ZIP)"} &nbsp; <b>IP:</b> {m.ip || "-"}
              </div>
              <div><b>Declaration:</b> {m.declaration || "-"}</div>
              {m.declaration_text ? <div className="text-gray-600 dark:text-gray-400">{m.declaration_text}</div> : null}
              {m.error ? <div className="text-red-700"><b>Error:</b> {m.error}</div> : null}
              {Array.isArray(m.items) && m.items.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full mt-1 border border-gray-200 dark:border-dark-700">
                    <thead className="text-gray-500">
                      <tr>
                        <th className="p-1 text-left">Certificate / report</th>
                        <th className="p-1 text-left">Instrument / product</th>
                        <th className="p-1 text-left">Serial / ID</th>
                        <th className="p-1 text-left">File</th>
                        <th className="p-1 text-left">Size</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.items.map((it, i) => (
                        <tr key={i} className="border-t border-gray-200 dark:border-dark-700">
                          <td className="p-1">{it.no}</td>
                          <td className="p-1">{it.name}</td>
                          <td className="p-1">{it.serial || "-"}</td>
                          <td className="p-1 break-all">{it.file}</td>
                          <td className="p-1 whitespace-nowrap">{(Number(it.bytes || 0) / 1024).toFixed(0)} KB</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

function Badge({ children, cls = "bg-slate-100 text-slate-700" }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap inline-flex items-center gap-1 ${cls}`}>
      {children}
    </span>
  );
}

function resendHref(r) {
  const x = r.resend;
  if (!x || !r.authorised_date) return null;
  if (x.kind === "calibration") {
    return `/dashboards/calibration-process/inward-entry-lab?caliblocation=${encodeURIComponent(x.caliblocation)}&calibacc=${encodeURIComponent(x.calibacc)}&search=${encodeURIComponent(x.inward)}`;
  }
  return `/dashboards/action-items/signed-reports?search=${encodeURIComponent(r.inward_no || r.lrn || "")}`;
}

function TrailDetail({ r }) {
  const t = r.allotment_trail || [];
  return (
    <div>
      {t.length === 0 ? (
        <div className="text-xs text-gray-500 italic">No allotment recorded yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-dark-700">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300">
                <th className="px-3 py-1.5 text-left font-semibold">Allotted To</th>
                <th className="px-3 py-1.5 text-left font-semibold">Allotted By</th>
                <th className="px-3 py-1.5 text-left font-semibold">Date & Time</th>
                <th className="px-3 py-1.5 text-left font-semibold">Remark</th>
                <th className="px-3 py-1.5 text-left font-semibold">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-dark-700">
              {t.map((a, i) => (
                <tr key={i} className={a.state === "current" ? "bg-emerald-50/70 font-medium" : a.state === "removed" ? "text-gray-400 line-through" : ""}>
                  <td className="px-3 py-1.5">{a.person || "-"}</td>
                  <td className="px-3 py-1.5">{a.allotted_by || "-"}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap">{fmtDate(a.on)}{a.on && String(a.on).length > 10 ? ` ${String(a.on).slice(11, 16)}` : ""}</td>
                  <td className="px-3 py-1.5">{a.remark || "-"}</td>
                  <td className="px-3 py-1.5">
                    <Badge cls={a.state === "current" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}>
                      {a.state}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {r.allotment_trail_note && <div className="text-[10px] text-gray-500 mt-1 italic">{r.allotment_trail_note}</div>}
    </div>
  );
}

// ---- NON-TABULAR ROW DETAIL MODAL ----
const CHIP_TONES = {
  red: "border-red-300 bg-red-50 text-red-800",
  amber: "border-amber-300 bg-amber-50 text-amber-900",
  green: "border-emerald-300 bg-emerald-50 text-emerald-800",
  blue: "border-blue-300 bg-blue-50 text-blue-900",
  slate: "border-gray-300 bg-gray-50 text-gray-800",
};

function Chip({ label, value, note, tone = "slate" }) {
  return (
    <div className={`rounded-lg border px-3 py-1.5 min-w-[120px] ${CHIP_TONES[tone] || CHIP_TONES.slate}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-[13px] font-bold leading-tight">{value}</div>
      {note ? <div className="text-[10px] opacity-75 leading-tight">{note}</div> : null}
    </div>
  );
}

// label above value: label 12px mid-grey, value 14px dark. `empty` shows a soft placeholder instead of a bare dash.
function Field({ label, children, empty, className = "" }) {
  return (
    <div className={className}>
      <span className="block text-xs text-gray-600 dark:text-gray-400 font-medium mb-0.5">{label}</span>
      {empty ? <span className="text-[13px] text-gray-400 italic">{empty}</span> : <span className="text-sm text-gray-900 dark:text-gray-100 font-medium">{children}</span>}
    </div>
  );
}

const SECTION_ACCENT = {
  blue: "border-l-[#18457c]",
  amber: "border-l-amber-500",
  green: "border-l-emerald-500",
  violet: "border-l-violet-500",
  slate: "border-l-slate-400",
};

function Section({ id, title, accent = "blue", children }) {
  return (
    <section id={id} className={`rounded-xl border border-gray-200 dark:border-dark-700 border-l-4 ${SECTION_ACCENT[accent] || SECTION_ACCENT.blue} bg-white dark:bg-dark-900/40 shadow-sm p-4 scroll-mt-16`}>
      <h3 className="text-[13px] font-bold uppercase tracking-wide text-[#18457c] dark:text-blue-300 mb-3">{title}</h3>
      {children}
    </section>
  );
}

// "Dispatch desk (no dispatch / email record yet)" -> main "Dispatch desk" + small note
function splitNote(text) {
  const m = String(text || "").match(/^(.*?)\s*\((.*)\)\s*$/);
  return m && m[1] ? { main: m[1], note: m[2] } : { main: text || "-", note: "" };
}

// ---- TAT CLOCKS (optional extra TATs per package; lab standard always first) ----
const CLOCK_TONE = {
  OVERDUE: "bg-red-50 text-red-700 border-red-200",
  "Done late": "bg-red-50 text-red-700 border-red-200",
  "Due soon": "bg-amber-50 text-amber-800 border-amber-200",
  "On track": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Done on time": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Not started": "bg-slate-50 text-slate-600 border-slate-200",
  Paused: "bg-blue-50 text-blue-700 border-blue-200",
};

function HoldControls({ r, onChanged }) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState("all");
  const [stage, setStage] = useState("lab_standard");
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);
  const holds = Array.isArray(r.holds) ? r.holds : [];
  const openHolds = holds.filter((h) => h.open);
  const clocks = Array.isArray(r.tat_clocks) && r.tat_clocks.length ? r.tat_clocks : [{ key: "lab_standard", label: "Lab standard" }];
  const label = (k) => clocks.find((c) => c.key === k)?.label || k;
  if (!holds.length && !r.can_hold) return null;

  const done = () => { if (onChanged) onChanged(r); };
  const start = async () => {
    if (why.trim().length < 3) { toast.error("Enter a reason (at least 3 characters)."); return; }
    setBusy(true);
    try {
      await axios.post("/mis/hold", { lrn: r.lrn, scope, stage_key: scope === "one" ? stage : undefined, reason: why.trim() });
      toast.success("Sample paused.");
      setOpen(false); setWhy(""); done();
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not pause.");
    } finally { setBusy(false); }
  };
  const resume = async (id) => {
    setBusy(true);
    try {
      await axios.post("/mis/hold/resume", { id });
      toast.success("Sample resumed.");
      done();
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not resume.");
    } finally { setBusy(false); }
  };

  return (
    <div className="mt-3 pt-3 border-t border-dashed space-y-2 text-xs">
      {openHolds.map((h) => (
        <div key={h.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-900 px-3 py-2">
          <span className="font-bold">ON HOLD</span>
          <span>{h.scope === "all" ? "all clocks" : label(h.stage_key)} · since {fmtDate(h.started_on)} · by {h.started_by} · reason: {h.reason}</span>
          {r.can_hold ? <button type="button" disabled={busy} onClick={() => resume(h.id)} className="ml-auto px-3 py-1 rounded-lg bg-[#18457c] text-white font-semibold">Resume</button> : null}
        </div>
      ))}
      {r.can_hold && !open ? <button type="button" onClick={() => setOpen(true)} className="px-3 py-1.5 rounded-lg border font-semibold">Pause / hold…</button> : null}
      {r.can_hold && open ? (
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-1"><input type="radio" checked={scope === "all"} onChange={() => setScope("all")} /> Hold ALL clocks of this sample</label>
            <label className="flex items-center gap-1"><input type="radio" checked={scope === "one"} onChange={() => setScope("one")} /> Hold THIS clock only</label>
            {scope === "one" ? (
              <select value={stage} onChange={(e) => setStage(e.target.value)} className="border rounded-lg p-1">
                {clocks.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            ) : null}
          </div>
          <input value={why} onChange={(e) => setWhy(e.target.value)} maxLength={500} placeholder="Reason (required) - e.g. customer asked to hold" className="border rounded-lg p-1.5 w-full" />
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={start} className="px-4 py-1.5 rounded-lg bg-[#18457c] text-white font-semibold">{busy ? "Saving..." : "Pause"}</button>
            <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-lg border">Cancel</button>
          </div>
        </div>
      ) : null}
      {holds.some((h) => !h.open) ? (
        <details>
          <summary className="cursor-pointer text-gray-500">Earlier holds ({holds.filter((h) => !h.open).length})</summary>
          <ul className="mt-1 space-y-0.5 text-gray-600">
            {holds.filter((h) => !h.open).map((h) => (
              <li key={h.id}>{fmtDate(h.started_on)} to {fmtDate(h.ended_on)} · {h.scope === "all" ? "all clocks" : label(h.stage_key)} · {h.reason} · by {h.started_by}{h.ended_by ? `, resumed by ${h.ended_by}` : ""}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function TatClocks({ r, onChanged }) {
  const clocks = Array.isArray(r.tat_clocks) ? r.tat_clocks : [];
  return (
    <div>
      {!clocks.length ? (
        <p className="text-xs text-gray-500">No extra TATs are set for this package, so only the lab standard applies (see Timeline above). Management can add optional TATs in the TAT Master tab.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-gray-500 text-left">
              <tr><th className="py-1 pr-3">Clock</th><th className="pr-3">TAT (days)</th><th className="pr-3">Started on</th><th className="pr-3">Due on</th><th className="pr-3">Done on</th><th className="pr-3">Days used</th><th>Status</th></tr>
            </thead>
            <tbody>
              {clocks.map((c) => (
                <tr key={c.key} className="border-t">
                  <td className="py-1.5 pr-3 font-semibold">{c.label}</td>
                  <td className="pr-3">{c.tat_days ?? "-"}</td>
                  <td className="pr-3">{fmtDate(c.started_on)}</td>
                  <td className="pr-3">{fmtDate(c.due_on)}</td>
                  <td className="pr-3">{fmtDate(c.done_on)}</td>
                  <td className="pr-3">{c.days_used ?? "-"}{Number(c.paused_days) > 0 ? <span className="text-[10px] text-blue-600"> (+{c.paused_days}d on hold)</span> : null}</td>
                  <td>
                    <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold ${CLOCK_TONE[c.status] || CLOCK_TONE["Not started"]}`}>{c.status}</span>
                    {Number(c.days_late) > 0 ? <span className="ml-1 text-[10px] text-red-600">{c.days_late}d {c.status === "OVERDUE" ? "over" : "late"}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-gray-500 mt-2">Calendar days. Department clock starts at transfer; Billing and Dispatch clocks start at authorisation. Days on hold are added to the due date.</p>
        </div>
      )}
      <HoldControls r={r} onChanged={onChanged} />
    </div>
  );
}

const MODAL_NAV = [
  { id: "md-sample", label: "Sample" },
  { id: "md-timeline", label: "Timeline" },
  { id: "md-tat", label: "TAT" },
  { id: "md-review", label: "Review" },
  { id: "md-email", label: "Email" },
  { id: "md-docs", label: "Reports & Billing" },
  { id: "md-history", label: "History" },
];

// 18-Nov-2026: links to the report / invoice (open in a NEW tab, the MIS stays where it is), one-click Resend, and "Mark as sent (offline)" with its log.
function DetailActions({ r, seeInvoice, onChanged }) {
  const isCal = r.type === "Calibration";
  const rs = r.resend || {};
  const [docs, setDocs] = useState(null);
  const [showResend, setShowResend] = useState(false);
  const [showMark, setShowMark] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const ready = !!r.authorised_date;

  useEffect(() => {
    if (isCal || !r.pid || !ready) return undefined;
    let live = true;
    axios.get("/mis/doc-links", { params: { pid: r.pid } })
      .then((x) => { if (live) setDocs(x.data?.data || {}); })
      .catch(() => { if (live) setDocs({}); });
    return () => { live = false; };
  }, [isCal, r.pid, ready]);

  const canSend = canSendDispatchEmail() || (!isCal && canSendTestingDispatchEmail());
  const canMark = canMarkSentOffline();
  const certHref = isCal && r.item_id && rs.inward
    ? `/dashboards/calibration-process/inward-entry-lab/view-certificate/${rs.inward}/${r.item_id}?caliblocation=${encodeURIComponent(rs.caliblocation || "Lab")}&calibacc=${encodeURIComponent(rs.calibacc || "Nabl")}`
    : null;
  const invHref = seeInvoice && r.invoice_id
    ? (isCal ? `/dashboards/accounts/calibration-invoice-list/view/${r.invoice_id}` : `/dashboards/accounts/testing-invoices/view/${r.invoice_id}`)
    : null;
  const linkCls = "inline-flex items-center gap-1 rounded-lg border border-[#18457c] bg-white px-3 py-1.5 text-xs font-bold text-[#18457c] hover:bg-blue-50";
  const btnCls = "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm";
  const m = r.manual_sent;

  const cancelMark = async () => {
    if (cancelReason.trim().length < 3) { toast.error("Please give a reason for cancelling."); return; }
    try {
      const res = await axios.post("/dispatch/manual/cancel", { id: m.id, reason: cancelReason.trim() });
      toast.success(res.data?.message || "Cancelled.");
      setCancelOpen(false); setCancelReason("");
      if (onChanged) onChanged();
    } catch (e) {
      toast.error(e?.message || (typeof e === "string" ? e : "Could not cancel."));
    }
  };

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Documents</span>
        {certHref ? <a href={certHref} target="_blank" rel="noopener noreferrer" className={linkCls}>View certificate &#8599;</a> : null}
        {!isCal && docs?.report_lh_url ? <a href={docs.report_lh_url} target="_blank" rel="noopener noreferrer" className={linkCls}>View report (letterhead) &#8599;</a> : null}
        {!isCal && docs?.report_url ? <a href={docs.report_url} target="_blank" rel="noopener noreferrer" className={linkCls}>View report &#8599;</a> : null}
        {!isCal && !ready ? <span className="text-xs italic text-gray-500">Report not issued yet</span> : null}
        {!isCal && ready && !docs ? <span className="text-xs italic text-gray-500">Checking the report file...</span> : null}
        {!isCal && ready && docs && !docs.report_url && !docs.report_lh_url ? <span className="text-xs italic text-gray-500">Report file not found</span> : null}
        {invHref ? <a href={invHref} target="_blank" rel="noopener noreferrer" className={linkCls}>View invoice {r.invoice_no ? `(${r.invoice_no})` : ""} &#8599;</a> : (seeInvoice ? <span className="text-xs italic text-gray-500">No invoice linked</span> : null)}
      </div>

      {(canSend || canMark) && ready && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Actions</span>
          {canSend && <button type="button" onClick={() => setShowResend(true)} className={`${btnCls} border border-blue-400 bg-blue-200 text-black hover:bg-blue-300`}>Resend e-mail</button>}
          {canMark && <button type="button" onClick={() => setShowMark(true)} className={`${btnCls} border border-emerald-400 bg-emerald-200 text-black hover:bg-emerald-300`}>Mark as sent (offline)</button>}
        </div>
      )}

      {m && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900">
          <div className="font-bold uppercase tracking-wide">Sent offline</div>
          <div className="mt-1"><b>{m.mode}</b> on <b>{fmtDate(m.on)}</b>{m.detail ? <> &middot; {m.detail}</> : null}</div>
          {m.remark ? <div className="mt-0.5">Remark: {m.remark}</div> : null}
          <div className="mt-0.5 text-emerald-800">Marked by <b>{m.by || `User #${m.by_id}`}</b> on {fmtDate(m.at)} {String(m.at || "").slice(11, 16)}</div>
          {(canMark || Number(localStorage.getItem("userId")) === Number(m.by_id)) && (
            cancelOpen ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Reason for cancelling" className="min-w-[200px] flex-1 rounded border p-1" />
                <button type="button" onClick={cancelMark} className="rounded bg-red-600 px-3 py-1 font-bold text-white">Cancel the mark</button>
                <button type="button" onClick={() => setCancelOpen(false)} className="rounded border px-2 py-1">Keep it</button>
              </div>
            ) : (
              <button type="button" onClick={() => setCancelOpen(true)} className="mt-1 text-red-700 underline">Cancel this mark</button>
            )
          )}
        </div>
      )}

      {showResend && (
        <SendBatchDispatchModal
          isOpen
          onClose={() => setShowResend(false)}
          inwardId={isCal ? Number(rs.inward) : undefined}
          trfId={!isCal ? Number(rs.trf) : undefined}
          onSuccess={() => { setShowResend(false); if (onChanged) onChanged(); }}
        />
      )}
      {showMark && (
        <MarkSentModal
          isOpen
          onClose={() => setShowMark(false)}
          kind={isCal ? "calibration" : "testing"}
          inwardId={isCal ? Number(rs.inward) : undefined}
          trfId={!isCal ? Number(rs.trf) : undefined}
          onDone={() => { if (onChanged) onChanged(); }}
        />
      )}
    </div>
  );
}

// 18-Nov-2026: "Reports & Billing" - every report of the sample's TRF / inward and every bill linked to them, each with its own link (new tab).
function DocsSection({ r, seeInvoice }) {
  const isCal = r.type === "Calibration";
  const rs = r.resend || {};
  const parent = isCal ? rs.inward : rs.trf;
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!parent) { setData({ reports: [], invoices: [] }); return undefined; }
    let live = true;
    axios.get("/mis/docs", { params: { kind: isCal ? "calibration" : "testing", id: parent } })
      .then((x) => { if (live) setData(x.data?.data || { reports: [], invoices: [] }); })
      .catch(() => { if (live) setData({ reports: [], invoices: [], failed: true }); });
    return () => { live = false; };
  }, [isCal, parent]);

  const linkCls = "inline-flex items-center rounded border border-[#18457c] bg-white px-2 py-0.5 text-[11px] font-bold text-[#18457c] hover:bg-blue-50";
  const certHref = (id) => `/dashboards/calibration-process/inward-entry-lab/view-certificate/${rs.inward}/${id}?caliblocation=${encodeURIComponent(rs.caliblocation || "Lab")}&calibacc=${encodeURIComponent(rs.calibacc || "Nabl")}`;
  const invHref = (id) => (isCal ? `/dashboards/accounts/calibration-invoice-list/view/${id}` : `/dashboards/accounts/testing-invoices/view/${id}`);
  const isMine = (x) => (isCal ? Number(x.id) === Number(r.item_id) : Number(x.id) === Number(r.pid));

  return (
    <Section id="md-docs" title="Reports & Billing" accent="emerald">
      {!data && <div className="text-xs text-gray-500 italic">Loading reports and bills...</div>}
      {data?.failed && <div className="text-xs text-red-700">Could not load the report list.</div>}
      {data && !data.failed && (
        <div className="space-y-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">Reports of this {isCal ? "inward" : "TRF"} ({data.reports.length})</div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-xs">
                <thead className="bg-gray-100 text-left"><tr>
                  <th className="px-2 py-1.5">LRN</th><th className="px-2 py-1.5">{isCal ? "Instrument" : "Sample / product"}</th><th className="px-2 py-1.5">BRN</th>{!isCal && <th className="px-2 py-1.5">ULR</th>}<th className="px-2 py-1.5">Status</th><th className="px-2 py-1.5">Open (new tab)</th>
                </tr></thead>
                <tbody>
                  {data.reports.length === 0 && <tr><td colSpan={6} className="px-2 py-3 text-center text-gray-500">No reports found.</td></tr>}
                  {data.reports.map((x) => (
                    <tr key={x.id} className={`border-t ${isMine(x) ? "bg-emerald-50" : ""}`}>
                      <td className="px-2 py-1.5 font-mono font-semibold">{x.lrn}{isMine(x) ? <span className="ml-1 rounded bg-emerald-200 px-1 text-[9px] font-bold text-emerald-900">THIS ROW</span> : null}</td>
                      <td className="px-2 py-1.5">{x.name}</td>
                      <td className="px-2 py-1.5 font-mono">{x.brn || "-"}</td>
                      {!isCal && <td className="px-2 py-1.5 font-mono">{x.ulr || "-"}</td>}
                      <td className="px-2 py-1.5">{x.final ? <span className="rounded bg-emerald-100 px-1.5 font-bold text-emerald-800">{isCal ? "Authorised" : "Final"}</span> : <span className="rounded bg-amber-100 px-1.5 font-bold text-amber-800">Not final yet</span>}</td>
                      <td className="px-2 py-1.5">
                        <div className="flex flex-wrap gap-1">
                          {isCal && rs.inward ? <a href={certHref(x.id)} target="_blank" rel="noopener noreferrer" className={linkCls}>Certificate &#8599;</a> : null}
                          {!isCal && x.report_lh_url ? <a href={x.report_lh_url} target="_blank" rel="noopener noreferrer" className={linkCls}>Report (letterhead) &#8599;</a> : null}
                          {!isCal && x.report_url ? <a href={x.report_url} target="_blank" rel="noopener noreferrer" className={linkCls}>Report &#8599;</a> : null}
                          {!isCal && !x.report_url && !x.report_lh_url ? <span className="italic text-gray-500">{x.final ? "file not found" : "not issued"}</span> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {seeInvoice ? (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">Bills linked to these reports ({data.invoices.length})</div>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 text-left"><tr><th className="px-2 py-1.5">Invoice no.</th><th className="px-2 py-1.5">Date</th><th className="px-2 py-1.5">Amount</th><th className="px-2 py-1.5">Payment</th><th className="px-2 py-1.5">Open (new tab)</th></tr></thead>
                  <tbody>
                    {data.invoices.length === 0 && <tr><td colSpan={5} className="px-2 py-3 text-center text-gray-500">No bill linked yet.</td></tr>}
                    {data.invoices.map((b) => (
                      <tr key={b.id} className={`border-t ${r.invoice_no && r.invoice_no === b.no ? "bg-emerald-50" : ""}`}>
                        <td className="px-2 py-1.5 font-mono font-semibold">{b.no}</td>
                        <td className="px-2 py-1.5">{fmtDate(b.date)}</td>
                        <td className="px-2 py-1.5">{`Rs ${Number(b.amount || 0).toLocaleString("en-IN")}`}</td>
                        <td className="px-2 py-1.5"><Badge cls={b.payment === "Paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>{b.payment}*</Badge></td>
                        <td className="px-2 py-1.5"><a href={invHref(b.id)} target="_blank" rel="noopener noreferrer" className={linkCls}>Open invoice &#8599;</a></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-[11px] text-gray-500 mt-1 italic">* Payment status is derived from invoice balance and is to be confirmed with Accounts for final decisions.</div>
            </div>
          ) : (
            <div className="text-xs italic text-gray-500">Billing details are visible to management and reporting users only.</div>
          )}
        </div>
      )}
    </Section>
  );
}

function DetailModal({ r, onClose, seeInvoice, isTopLevel, canCustomer, onChanged }) {
  if (!r) return null;
  const isCal = r.type === "Calibration";
  const canSeeConfidential = (canCustomer ?? isTopLevel) || isCal;
  const isOverdue = Number(r.overdue_days_22) > 0 || r.testing_status === "OVERDUE";
  const href = resendHref(r);
  const goTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const holder = r.holder_name || r.holder_role || "-";
  const holderParts = splitNote(holder);
  const statusParts = splitNote(r.current_status || r.transferred_to || r.stage || "-");
  const emailTone = (r.email_status === "Sent" || r.email_status === "Manual") ? "green" : r.email_status === "Pending" ? "amber" : r.email_status === "Test only" ? "blue" : "slate";
  const invChip = !seeInvoice ? null : r.invoice_no
    ? { value: r.invoice_payment || "Raised", note: r.invoice_no, tone: r.invoice_payment === "Paid" ? "green" : "amber" }
    : { value: "Not raised", note: "", tone: "slate" };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-5 backdrop-blur-sm animate-fade-in">
      <div className="max-w-5xl w-full bg-slate-50 dark:bg-dark-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-700 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#18457c] text-white px-6 py-4 flex items-center justify-between shadow-lg z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center font-bold text-white text-xs shrink-0">MIS</div>
            <div className="min-w-0">
              <div className="text-lg font-bold flex flex-wrap items-center gap-2">
                Sample Details: {r.lrn || (canSeeConfidential ? r.brn : null) || (canSeeConfidential ? `Inward ${r.inward_no}` : "")}
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-white/20 text-white">{r.stage || r.department}</span>
              </div>
              {canSeeConfidential ? (
                <div className="text-sm text-blue-100 truncate">{r.customer}</div>
              ) : (
                <div className="text-sm text-blue-200/60 italic">Customer confidential under ISO/IEC 17025</div>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors text-xl font-bold shrink-0" title="Close">
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto text-xs text-gray-700 dark:text-gray-300">
          {/* Sticky summary chips + jump menu */}
          <div className="sticky top-0 z-10 bg-white/95 dark:bg-dark-800/95 backdrop-blur border-b border-gray-200 dark:border-dark-700 px-5 sm:px-6 pt-3 pb-2 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Chip label="Stage" value={r.stage || "-"} tone="blue" />
              <Chip
                label="Report"
                value={Number(r.overdue_days_22) > 0 ? `+${r.overdue_days_22} days overdue` : r.report_delivered ? "Delivered" : isOverdue ? "Overdue" : "On track"}
                note={r.report_due_22 ? `due ${fmtDate(r.report_due_22)}` : ""}
                tone={Number(r.overdue_days_22) > 0 || (isOverdue && !r.report_delivered) ? "red" : r.report_delivered ? "slate" : "green"}
              />
              <Chip label="With" value={holderParts.main} note={r.holder_since ? `since ${fmtDate(r.holder_since)}` : ""} tone="slate" />
              {isTopLevel && <Chip label="Email" value={r.email_status || "-"} note={r.email_date ? fmtDate(r.email_date) : ""} tone={emailTone} />}
              {invChip ? <Chip label="Invoice" value={invChip.value} note={invChip.note} tone={invChip.tone} /> : null}
              {r.priority === "Urgent" ? <Chip label="Priority" value="Urgent" tone="red" /> : null}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MODAL_NAV.filter((n) => !(["md-email", "md-docs"].includes(n.id) && !isTopLevel)).map((n) => (
                <button key={n.id} type="button" onClick={() => goTo(n.id)} className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 hover:bg-[#18457c] hover:text-white transition-colors">
                  {n.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            {/* Sample & Job Information */}
            <Section id="md-sample" title="Sample & Job Information">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-3">
                <Field label="LRN"><span className="font-mono font-bold text-[15px]">{r.lrn || "-"}</span></Field>
                <Field label="BRN (Booking Ref No)"><span className="font-mono text-blue-700 dark:text-blue-400">{canSeeConfidential ? (brnOf(r) || "-") : "-"}</span></Field>
                <Field label="Inward Entry No."><span className="font-mono">{canSeeConfidential ? (r.inward_no || "-") : "-"}</span></Field>
                <Field label="Department"><Badge cls="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 font-semibold">{r.department || "-"}</Badge></Field>
                <Field label="Priority">
                  <span className={r.priority === "Urgent" ? "text-red-600 font-bold" : ""}>{r.priority}{r.priority_days != null ? ` (${r.priority_days}d)` : ""}</span>
                </Field>
                <Field label="Customer" className="col-span-2 md:col-span-5"><span className="font-semibold">{canSeeConfidential ? (r.customer || "-") : <span className="italic text-gray-400 font-normal">Confidential under ISO/IEC 17025</span>}</span></Field>
                <Field label="Package / Instrument / Material" className="col-span-2 md:col-span-5">{r.package || "-"}</Field>
                <Field label="BD Person Name" className="col-span-2 md:col-span-2"><span className="font-bold text-[#18457c] dark:text-blue-300">{r.bd_person || "-"}</span></Field>
                <Field label="Current Status" className="col-span-2 md:col-span-3">
                  <span className="font-bold">{statusParts.main}</span>
                  {r.transfer_date ? <span className="ml-1.5 text-xs font-normal text-gray-500">({fmtDate(r.transfer_date)})</span> : null}
                  {statusParts.note ? <span className="block text-[11px] font-normal text-gray-500">{statusParts.note}</span> : null}
                </Field>
              </div>
            </Section>

            {/* Timeline & Due Dates */}
            <Section id="md-timeline" title="Timeline & Due Dates" accent="amber">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">
                <Field label="Booking Date">{fmtDate(r.booking_date)}</Field>
                <Field label="Report Due Date">
                  <span className="font-semibold">{fmtDate(r.report_due_22)}</span>
                  {r.report_due_source ? <span className="block text-[11px] font-normal text-blue-600 dark:text-blue-400">{r.report_due_source}</span> : null}
                </Field>
                <Field label="Overdue Status">
                  {Number(r.overdue_days_22) > 0 ? (
                    <Badge cls="bg-red-100 text-red-800 font-bold">+{r.overdue_days_22} Days Overdue</Badge>
                  ) : r.report_delivered ? (
                    <Badge cls="bg-slate-100 text-slate-700 font-semibold">Delivered</Badge>
                  ) : isOverdue ? (
                    <Badge cls="bg-red-100 text-red-800 font-bold">OVERDUE</Badge>
                  ) : (
                    <Badge cls="bg-emerald-100 text-emerald-800 font-semibold">On track</Badge>
                  )}
                </Field>
                <Field label="With / Since (Current Holder)">
                  <span className="font-semibold">{holderParts.main}</span>
                  {holderParts.note ? <span className="block text-[11px] font-normal text-gray-500">{holderParts.note}</span> : null}
                  {r.holder_since ? <span className="block text-[11px] font-normal text-gray-500">since {fmtDate(r.holder_since)}</span> : null}
                </Field>
                <Field label="Testing Due Date">{fmtDate(r.test_due_date)}</Field>
                <Field label="Testing Status">
                  <Badge cls={r.testing_status === "OVERDUE" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}>{r.testing_status || "On track"}</Badge>
                </Field>
              </div>
            </Section>

            {/* Execution, Review & Authorisation */}
            <Section id="md-tat" title="TAT Records" accent="amber">
              <TatClocks r={r} onChanged={onChanged} />
            </Section>

            <Section id="md-review" title="Execution, Review & Authorisation" accent="green">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3">
                <Field label="Allocated Chemist / Engineer" empty={r.allocated_to ? null : "Not allotted"}>
                  <span className="font-semibold">{r.allocated_to}</span>
                  {r.allocation_date ? <span className="block text-[11px] font-normal text-gray-500">{fmtDate(r.allocation_date)}</span> : null}
                </Field>
                <Field label="Results Entered" empty={r.results_date ? null : "Not yet"}>{fmtDate(r.results_date)}</Field>
                <Field label="Reviewed By (HOD)" empty={r.reviewed_by || r.reviewed_status ? null : "Not yet"}>
                  {r.reviewed_by || r.reviewed_status}
                  {r.reviewed_date ? <span className="block text-[11px] font-normal text-gray-500">{fmtDate(r.reviewed_date)}</span> : null}
                </Field>
                <Field label="Authorised By (Signatory)" empty={r.authorised_by || r.authorised_status ? null : "Not yet"}>
                  {r.authorised_by || r.authorised_status}
                  {r.authorised_date ? <span className="block text-[11px] font-normal text-gray-500">{fmtDate(r.authorised_date)}</span> : null}
                </Field>
                <Field label="ULR No." empty={r.ulr_no ? null : "Not issued"} className="col-span-2 md:col-span-4">
                  <span className="font-mono">{r.ulr_no}</span>
                </Field>
              </div>
            </Section>

            {/* Commercial, Email & Dispatch (Top-level management only - ISO/IEC 17025 confidentiality) */}
            {isTopLevel && (
              <Section id="md-email" title="Commercial, Email & Dispatch" accent="violet">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3">
                  {seeInvoice && (
                    <>
                      <Field label="Invoice No." empty={r.invoice_no ? null : "Not raised yet"}><span className="font-mono font-bold">{r.invoice_no}</span></Field>
                      <Field label="Invoice Amount & Payment" empty={r.invoice_amount != null ? null : "-"}>
                        <span className="font-semibold">{`Rs ${Number(r.invoice_amount || 0).toLocaleString("en-IN")}`}</span>
                        {r.invoice_payment ? (
                          <span className="ml-1.5"><Badge cls={r.invoice_payment === "Paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>{r.invoice_payment}*</Badge></span>
                        ) : null}
                      </Field>
                    </>
                  )}
                  <Field label="Email Status">
                    <Badge cls={emailTone === "green" ? "bg-emerald-100 text-emerald-800" : emailTone === "amber" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}>{r.email_status || "-"}</Badge>
                    {r.email_date ? <span className="block text-[11px] font-normal text-gray-500">{fmtDate(r.email_date)}</span> : null}
                    {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="block text-[11px] text-blue-700 underline mt-0.5">Resend &#8599;</a> : null}
                  </Field>
                  <Field label="WhatsApp Notification" empty={r.whatsapp_status ? null : "-"}>{r.whatsapp_status}</Field>
                  <Field label="Despatch Docket" empty={r.docket ? null : "No docket"}>
                    <span className="font-mono">{r.docket}</span>
                    {r.dispatch_date ? <span className="block text-[11px] font-normal text-gray-500">{fmtDate(r.dispatch_date)}</span> : null}
                  </Field>
                  <Field label="Customer Feedback" empty={r.feedback_status && r.feedback_status !== "Not collected" ? null : "Not collected"}>{r.feedback_status}</Field>
                </div>
                {seeInvoice && (
                  <div className="text-[11px] text-gray-500 mt-2 italic">
                    * Payment status is derived from invoice balance and is to be confirmed with Accounts for final decisions.
                  </div>
                )}
                <EmailLogDetail logs={r.email_logs} pending={r.email_status === "Pending"} />
                <DetailActions r={r} seeInvoice={seeInvoice} onChanged={onChanged} />
              </Section>
            )}

            {/* Reports & Billing (Top-level management only - ISO/IEC 17025 confidentiality) */}
            {isTopLevel && <DocsSection r={r} seeInvoice={seeInvoice} />}

            <Section id="md-history" title="Allotment & Re-allotment History" accent="slate">
              <TrailDetail r={r} />
            </Section>

            {/* Chain of Custody section removed 2026-11-16 (lab: keep History only); ChainDetail removed */}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-gray-200 dark:border-dark-700 px-6 py-3.5 bg-white dark:bg-dark-900 flex justify-end">
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg bg-[#18457c] text-white hover:bg-[#133763] font-semibold text-xs shadow-sm transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- UNBOOKED AT GATE TAB ----
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

  const colour = { green: "bg-emerald-100 text-emerald-800", amber: "bg-amber-100 text-amber-800", red: "bg-red-100 text-red-800", booked: "bg-sky-100 text-sky-800" };
  const createHref = (g) => (g.purpose_id === 2
    ? `/dashboards/calibration-process/inward-entry-lab?caliblocation=Lab&calibacc=Nabl&gate=${g.id}&customer=${encodeURIComponent(g.customer)}&material=${encodeURIComponent(g.material)}`
    : `/dashboards/testing/trfs-starts-jobs/create?gate=${g.id}&customer=${encodeURIComponent(g.customer)}&material=${encodeURIComponent(g.material)}`);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2 text-xs">
        <label>From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="block border rounded-lg p-1.5" /></label>
        <label>To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="block border rounded-lg p-1.5" /></label>
        <button type="button" onClick={load} disabled={loading} className="px-4 py-2 rounded-lg bg-[#18457c] text-white font-semibold">{loading ? "Loading..." : "Filter"}</button>
        {d && <span className="text-gray-600">Pending LRN: <b>{d.summary.total}</b> &middot; <Badge cls={colour.green}>&lt; 24 hrs {d.summary.green}</Badge> <Badge cls={colour.amber}>1-3 days {d.summary.amber}</Badge> <Badge cls={colour.red}>&gt; 3 days {d.summary.red}</Badge> &middot; <Badge cls={colour.booked}>Already booked (LRN found) {d.summary.booked || 0}</Badge></span>}
      </div>
      <div className="text-[11px] text-gray-500">{d?.note}</div>
      <div className="overflow-auto border rounded-lg max-h-[65vh]">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-100 sticky top-0"><tr>{["Gate ID", "Arrival", "Custodian", "Customer / Sender", "Material", "Qty", "Purpose", "Aging", "Action"].map((h) => <th key={h} className="px-2 py-1.5 text-left whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>
            {(d?.rows || []).map((g) => (
              <tr key={g.id} className="border-t">
                <td className="px-2 py-1 font-mono">{g.id}</td><td className="px-2 py-1 whitespace-nowrap">{fmtDate(g.arrival)}{(String(g.arrival || "").match(/[ T](\d{2}:\d{2})/) || [])[1] ? <span className="block text-[10px] text-gray-500">{String(g.arrival).match(/[ T](\d{2}:\d{2})/)[1]}</span> : null}</td><td className="px-2 py-1">{g.custodian || "-"}</td>
                <td className="px-2 py-1">{g.customer}</td><td className="px-2 py-1">{g.material}</td><td className="px-2 py-1">{g.quantity}</td><td className="px-2 py-1">{g.purpose}</td>
                <td className="px-2 py-1">{g.booked ? <Badge cls={colour.booked}>Booked</Badge> : <Badge cls={colour[g.colour]}>{g.age_days === 0 ? `${g.age_hours} hrs` : `${g.age_days} days`}</Badge>}</td>
                <td className="px-2 py-1">{g.booked
                  ? <span className="font-mono text-[11px] text-sky-900" title="LRN found for the same customer, booked within 14 days of this arrival">LRN: {g.lrn}</span>
                  : <a href={createHref(g)} target="_blank" rel="noopener noreferrer" className="px-2 py-1 rounded bg-[#18457c] text-white text-[11px] font-semibold whitespace-nowrap">Create TRF / Assign LRN &#8599;</a>}</td>
              </tr>
            ))}
            {d && d.rows.length === 0 && <tr><td colSpan={9} className="p-4 text-center text-gray-500">No unbooked gate arrivals in this range.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- EMAIL LOG TAB ----
function EmailLogTab() {
  const [filters, setFilters] = useState({
    from: isoDate(new Date(Date.now() - 30 * 86400000)),
    to: isoDate(new Date()),
    status: "",
    mode: "",
    q: "",
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openMail, setOpenMail] = useState(null);
  const [mailCard, setMailCard] = useState(""); // "" = all, else live | test | failed | cancelled (same buckets as the summary cards)

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/mis/email-log", { params: filters });
      setData(res.data?.data || null);
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not load email log.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const mailBucket = (r) => (r.status === "failed" ? "failed" : r.status === "cancelled" ? "cancelled" : r.mode === "test" ? "test" : "live");
  const shownMail = (data?.rows || []).filter((r) => !mailCard || mailBucket(r) === mailCard);
  const pickCard = (k) => setMailCard((prev) => (prev === k ? "" : k));

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-600">Every report / invoice email sent from the LIMS: who sent it, to whom, what was attached and the result. Click a row for the full detail.</p>
      <div className="flex flex-wrap items-end gap-2 text-xs">
        <label>From<input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className="block border rounded-lg p-1.5" /></label>
        <label>To<input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className="block border rounded-lg p-1.5" /></label>
        <label>Status
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="block border rounded-lg p-1.5">
            <option value="">All</option><option value="success">Sent</option><option value="test_delivered">Test delivered</option><option value="failed">Failed</option><option value="cancelled">Cancelled</option><option value="queued_hold">Queued</option>
          </select>
        </label>
        <label>Mode
          <select value={filters.mode} onChange={(e) => setFilters({ ...filters, mode: e.target.value })} className="block border rounded-lg p-1.5">
            <option value="">All</option><option value="live">Live</option><option value="test">Test</option>
          </select>
        </label>
        <label>Search<input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="customer / email / PO / subject" className="block border rounded-lg p-1.5 w-56" /></label>
        <button type="button" onClick={load} disabled={loading} className="px-4 py-2 rounded-lg bg-[#18457c] text-white font-semibold">{loading ? "Filtering..." : "Filter"}</button>
      </div>
      {data?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <button type="button" onClick={() => setMailCard("")} title="Show all emails" className={`text-left rounded-xl border p-3 border-gray-200 bg-white dark:bg-dark-800 cursor-pointer hover:shadow-sm ${mailCard === "" ? "ring-2 ring-[#18457c]" : ""}`}>
            <div className="text-[11px] uppercase tracking-wide text-gray-500">Emails</div>
            <div className="text-2xl font-bold mt-0.5">{data.summary.total}</div>
          </button>
          <button type="button" onClick={() => pickCard("live")} title="Show only emails sent to customers" className={`text-left rounded-xl border p-3 border-emerald-200 bg-emerald-50 cursor-pointer hover:shadow-sm ${mailCard === "live" ? "ring-2 ring-emerald-600" : ""}`}>
            <div className="text-[11px] uppercase tracking-wide text-emerald-800">Sent to customers</div>
            <div className="text-2xl font-bold text-emerald-900 mt-0.5">{data.summary.sent_live}</div>
          </button>
          <button type="button" onClick={() => pickCard("test")} title="Show only test emails" className={`text-left rounded-xl border p-3 border-blue-200 bg-blue-50 cursor-pointer hover:shadow-sm ${mailCard === "test" ? "ring-2 ring-blue-600" : ""}`}>
            <div className="text-[11px] uppercase tracking-wide text-blue-800">Test emails</div>
            <div className="text-2xl font-bold text-blue-900 mt-0.5">{data.summary.test}</div>
          </button>
          <button type="button" onClick={() => pickCard("failed")} title="Show only failed emails" className={`text-left rounded-xl border p-3 border-red-200 bg-red-50 cursor-pointer hover:shadow-sm ${mailCard === "failed" ? "ring-2 ring-red-600" : ""}`}>
            <div className="text-[11px] uppercase tracking-wide text-red-800">Failed</div>
            <div className="text-2xl font-bold text-red-900 mt-0.5">{data.summary.failed}</div>
          </button>
          <button type="button" onClick={() => pickCard("cancelled")} title="Show only cancelled emails" className={`text-left rounded-xl border p-3 border-gray-200 bg-gray-50 cursor-pointer hover:shadow-sm ${mailCard === "cancelled" ? "ring-2 ring-gray-600" : ""}`}>
            <div className="text-[11px] uppercase tracking-wide text-gray-600">Cancelled</div>
            <div className="text-2xl font-bold text-gray-800 mt-0.5">{data.summary.cancelled}</div>
          </button>
        </div>
      )}
      <div className="overflow-auto border rounded-xl max-h-[65vh]">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-500 sticky top-0"><tr>
            {["When", "Sent by", "Type", "Reference", "Customer", "To", "Docs", "Invoice", "Mode", "Status"].map((h) => <th key={h} className="p-2 text-left whitespace-nowrap">{h}</th>)}
          </tr></thead>
          <tbody>
            {shownMail.map((r) => (
              <Fragment key={r.id}>
                <tr onClick={() => setOpenMail(openMail === r.id ? null : r.id)} className={`border-t cursor-pointer hover:bg-blue-50/40 ${r.status === "failed" ? "bg-red-50" : ""}`}>
                  <td className="p-2 whitespace-nowrap">{fmtDate(r.sent_at)}</td>
                  <td className="p-2">{r.sent_by}<div className="text-[10px] text-gray-500">{r.sent_by_role}</div></td>
                  <td className="p-2">{r.type}{r.kind === "Draft" && <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">DRAFT</span>}</td><td className="p-2 whitespace-nowrap">{r.ref}</td><td className="p-2 max-w-[200px] truncate" title={r.customer}>{r.customer}</td>
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
                      <div><b>P.O. / reference:</b> {r.po || "-"} &nbsp; {r.kind !== "Draft" && <><b>Total size:</b> {(r.size_bytes / 1048576).toFixed(2)} MB (sent as one ZIP) &nbsp; <b>IP:</b> {r.ip || "-"}</>}{r.kind === "Draft" && <><b>Documents:</b> {r.documents} (sent as one ZIP)</>}</div>
                      <div><b>Declaration:</b> {r.kind === "Draft" ? "Sender confirmed the DRAFT certificates were verified and accepted responsibility for sending" : (r.declaration || "-")}</div>
                      {r.declaration_text && <div className="text-gray-600">{r.declaration_text}</div>}
                      {r.error && <div className="text-red-700"><b>Error:</b> {r.error}</div>}
                      {r.feedback && <div><b>Tester feedback:</b> {r.feedback}</div>}
                      <table className="w-full mt-2 border">
                        <thead className="bg-white text-gray-500"><tr><th className="p-1 text-left">{r.kind === "Draft" ? "LRN" : "Certificate / report"}</th><th className="p-1 text-left">Instrument / product</th><th className="p-1 text-left">Serial / ID</th><th className="p-1 text-left">File</th><th className="p-1 text-left">Size</th></tr></thead>
                        <tbody>{(r.items || []).map((it, i) => (
                          <tr key={i} className="border-t"><td className="p-1">{it.no}</td><td className="p-1">{it.name}</td><td className="p-1">{it.serial}</td><td className="p-1">{it.file || "-"}</td><td className="p-1">{it.bytes ? `${(it.bytes / 1024).toFixed(0)} KB` : "-"}</td></tr>
                        ))}</tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {!shownMail.length && <tr><td colSpan={10} className="p-6 text-center text-gray-500">No emails match the selected filters.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- OPTIONAL EXTRA TATs PER PACKAGE (add / delete rows) ----
const EXTRA_STAGES = [
  { v: "dept:calibration", l: "Calibration department (transfer to results)" },
  { v: "dept:building materials", l: "Building Materials department (allocation to results)" },
  { v: "dept:chemical", l: "Chemical department (allocation to results)" },
  { v: "dept:microbiology", l: "Microbiology department (allocation to results)" },
  { v: "dept:electronics & electricals", l: "Electronics & Electricals department (allocation to results)" },
  { v: "dept:plywood", l: "Plywood department (allocation to results)" },
  { v: "dept:mechanical", l: "Mechanical department (allocation to results)" },
  { v: "billing", l: "Billing (authorisation to invoice)" },
  { v: "dispatch", l: "Dispatch (authorisation to dispatch / email)" },
];

function ExtraTats({ packages }) {
  const [pk, setPk] = useState("");
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState("");

  const load = async () => {
    if (!pk.trim()) { toast.error("Type the package name first."); return; }
    setBusy(true);
    try {
      const res = await axios.get("/mis/package-tats", { params: { package_key: pk.trim() } });
      if (res.data?.table_ready === false) { toast.error("The package TAT table is not created on the server yet."); return; }
      setRows((res.data?.data || []).map((x) => ({ stage_key: x.stage_key, tat_days: String(x.tat_days) })));
      setLoaded(pk.trim());
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not load.");
    } finally { setBusy(false); }
  };

  const save = async () => {
    setBusy(true);
    try {
      await axios.post("/mis/package-tats", { package_key: loaded, rows });
      toast.success(rows.length ? "Additional TATs saved." : "Extra TATs cleared - lab standard only.");
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not save.");
    } finally { setBusy(false); }
  };

  const used = new Set(rows.map((x) => x.stage_key));
  const addRow = () => {
    const next = EXTRA_STAGES.find((x) => !used.has(x.v));
    if (next) setRows([...rows, { stage_key: next.v, tat_days: "" }]);
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-dark-700 p-3 space-y-2 text-xs bg-white dark:bg-dark-900/40 text-gray-800 dark:text-dark-100">
      <div className="font-bold text-[#18457c]">Additional TATs (optional)</div>
      <p className="text-gray-600">Leave empty to use the lab standard only. Rows added here are tracked as separate clocks in the Sample Details TAT section (calendar days). Works for calibration and testing samples; a department row applies only to samples of that department.</p>
      <div className="flex flex-wrap items-end gap-2">
        <label>Package / instrument (exact name)
          <input list="extra-tat-packages" value={pk} onChange={(e) => { setPk(e.target.value); setLoaded(""); }} className="block border rounded-lg p-1.5 w-72" />
          <datalist id="extra-tat-packages">{packages.map((n) => <option key={n} value={n} />)}</datalist>
        </label>
        <button type="button" onClick={load} disabled={busy} className="px-3 py-2 rounded-lg border font-semibold">Load</button>
      </div>
      {loaded ? (
        <div className="space-y-2">
          <div className="text-gray-500">Package: <b>{loaded}</b></div>
          {rows.map((x, i) => (
            <div key={i} className="flex items-center gap-2">
              <select value={x.stage_key} onChange={(e) => setRows(rows.map((y, j) => (j === i ? { ...y, stage_key: e.target.value } : y)))} className="border rounded-lg p-1.5 w-80">
                {EXTRA_STAGES.filter((o) => o.v === x.stage_key || !used.has(o.v)).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
              <input type="number" min="0" max="365" placeholder="days" value={x.tat_days} onChange={(e) => setRows(rows.map((y, j) => (j === i ? { ...y, tat_days: e.target.value } : y)))} className="border rounded-lg p-1.5 w-20" />
              <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="px-2 py-1 rounded-lg border text-red-600 font-semibold">Delete</button>
            </div>
          ))}
          <div className="flex gap-2">
            <button type="button" onClick={addRow} disabled={used.size >= EXTRA_STAGES.length} className="px-3 py-1.5 rounded-lg border font-semibold">+ Add row</button>
            <button type="button" onClick={save} disabled={busy} className="px-4 py-1.5 rounded-lg bg-[#18457c] text-white font-semibold">{busy ? "Saving..." : "Save additional TATs"}</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---- TAT MASTER TAB ----
function TatMasterTab({ canEdit = false, calibPackages = [] }) {
  const [tat, setTat] = useState({ table_ready: true, data: [] });
  const [draft, setDraft] = useState({ package_key: "", department: "*", dept_days: 7, kailtech_tat: 10 });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/mis/tat-master");
      setTat(res.data || { table_ready: false, data: [] });
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not load TAT master.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveTat = async () => {
    if (!draft.package_key) { toast.error("Package name is required."); return; }
    setLoading(true);
    try {
      await axios.post("/mis/tat-master", draft);
      toast.success("TAT saved successfully.");
      setDraft({ package_key: "", department: "*", dept_days: 7, kailtech_tat: 10 });
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not save TAT.");
    } finally {
      setLoading(false);
    }
  };

  return (
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
            <label>Package / instrument<input value={draft.package_key} onChange={(e) => setDraft({ ...draft, package_key: e.target.value })} className="block border rounded-lg p-1.5 w-64" /></label>
            <label>Department (* = Kailtech TAT)<input value={draft.department} onChange={(e) => setDraft({ ...draft, department: e.target.value })} className="block border rounded-lg p-1.5 w-48" /></label>
            <label>Dept days<input type="number" min="0" value={draft.dept_days} onChange={(e) => setDraft({ ...draft, dept_days: e.target.value })} className="block border rounded-lg p-1.5 w-24" /></label>
            <label>Kailtech TAT<input type="number" min="0" value={draft.kailtech_tat} onChange={(e) => setDraft({ ...draft, kailtech_tat: e.target.value })} className="block border rounded-lg p-1.5 w-24" /></label>
            <button type="button" onClick={saveTat} disabled={loading} className="px-4 py-2 rounded-lg bg-[#18457c] text-white font-semibold">{loading ? "Saving..." : "Save"}</button>
          </div>
          <table className="w-full text-xs border rounded-xl">
            <thead className="bg-gray-50 text-gray-500"><tr><th className="p-2 text-left">Package</th><th className="p-2 text-left">Department</th><th className="p-2 text-left">Dept days</th><th className="p-2 text-left">Kailtech TAT</th></tr></thead>
            <tbody>
              {tat.data.map((t) => (
                <tr key={t.id} className="border-t cursor-pointer hover:bg-gray-50" onClick={() => setDraft({ package_key: t.package_key, department: t.department, dept_days: t.dept_days ?? "", kailtech_tat: t.kailtech_tat ?? "" })}>
                  <td className="p-2 font-medium">{t.package_key}</td><td className="p-2">{t.department}</td><td className="p-2">{t.dept_days}</td><td className="p-2">{t.kailtech_tat}</td>
                </tr>
              ))}
              {!tat.data.length && <tr><td colSpan={4} className="p-4 text-center text-gray-500">No TAT rows yet.</td></tr>}
            </tbody>
          </table>
          {canEdit
            ? <ExtraTats packages={calibPackages} />
            : <p className="text-xs text-gray-500">Additional (optional) TATs per package can be set by management only.</p>}
        </>
      )}
    </div>
  );
}

// ---- TOP SUMMARY CARDS (MATCHING CLASSIC MIS) ----
const LC_CARDS = [
  { no: 3, label: "Sample Booked" },
  { no: 4, label: "Allotted to Dept" },
  { no: 5, label: "Under Testing" },
  { no: 6, label: "Under HOD / QA" },
  { no: 9, label: "Ready for Dispatch" },
  { no: 11, label: "Billing" },
];

function lcHealth(total, overdue, anyGt3) {
  if (!overdue) return "green";
  if (anyGt3 || overdue / Math.max(total, 1) > 0.1) return "red";
  return "amber";
}

const LC_TONE = {
  green: { box: "border-emerald-300 bg-emerald-50/70", strip: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  amber: { box: "border-amber-300 bg-amber-50/70", strip: "bg-amber-100 text-amber-900 border-amber-300" },
  red: { box: "border-red-300 bg-red-50/70", strip: "bg-red-100 text-red-800 border-red-300" },
};

const isBisRow = (x) => String(x.category || "").toLowerCase().includes("bis") || String(x.package || "").toLowerCase().includes("is");
const isDueRow = (x) => x.report_status === "OVERDUE" || x.testing_status === "OVERDUE";

const TOP_TILES = [
  { key: "testing", label: "Testing Samples", sub: "Total Booked", cls: "border-blue-200 bg-blue-50/70", on: "border-blue-600 bg-blue-100 ring-2 ring-blue-600", txt: "text-blue-700" },
  { key: "calibration", label: "Calibration Samples", sub: "Total Booked", cls: "border-indigo-200 bg-indigo-50/70", on: "border-indigo-600 bg-indigo-100 ring-2 ring-indigo-600", txt: "text-indigo-700" },
  { key: "bis_dues", label: "BIS / IS Standard Dues", sub: "Overdue", cls: "border-red-200 bg-red-50/70", on: "border-red-600 bg-red-100 ring-2 ring-red-600", txt: "text-red-700" },
  { key: "general_dues", label: "General Standard Dues", sub: "Overdue", cls: "border-amber-200 bg-amber-50/70", on: "border-amber-600 bg-amber-100 ring-2 ring-amber-600", txt: "text-amber-700" },
];

const KPI_CARDS = [
  { key: "samples_booked", label: "Samples booked (LRN)" },
  { key: "open_samples", label: "Open (report not sent)" },
  { key: "reports_overdue", label: "Reports OVERDUE", tone: "red" },
  { key: "reports_due_soon", label: "Reports due today/tomorrow", tone: "amber" },
  { key: "bill_pending", label: "Bill pending", invoice: true },
  { key: "urgent_open", label: "Urgent open" },
  { key: "tat_conflicts", label: "TAT conflicts" },
];

const COUNTED_KPIS = ["samples_booked", "open_samples", "reports_overdue", "reports_due_soon", "bill_pending"];

// `counted` = one row per LRN at its least advanced lifecycle stage (lifecycle cards); `firstRows` = the first row per LRN
// (the row the backend summary() uses for Testing/Calibration, dues and Open/Overdue/Bill KPI counts). Both hold row keys (_k).
// 2026-11-16: card numbers and the rows shown after a click now use the same rule as the backend count.
function applyCardFilters(list, f, counted, firstRows) {
  let r = list;
  const one = !f.showAll;
  if (f.topCard) {
    if (one) r = r.filter((x) => firstRows.has(x._k));
    if (f.topCard === "testing") r = r.filter((x) => (x.type || "") !== "Calibration");
    else if (f.topCard === "calibration") r = r.filter((x) => (x.type || "") === "Calibration");
    else if (f.topCard === "bis_dues") r = r.filter((x) => isDueRow(x) && isBisRow(x));
    else if (f.topCard === "general_dues") r = r.filter((x) => isDueRow(x) && !isBisRow(x));
  }
  if (f.kpi) {
    if (one && COUNTED_KPIS.includes(f.kpi)) r = r.filter((x) => firstRows.has(x._k));
    switch (f.kpi) {
      case "open_samples": r = r.filter((x) => !x.dispatch_date && !x.emailed_date); break;
      case "reports_overdue": r = r.filter((x) => !x.dispatch_date && !x.emailed_date && x.report_status === "OVERDUE"); break;
      case "reports_due_soon": r = r.filter((x) => !x.dispatch_date && !x.emailed_date && x.report_status === "Due soon"); break;
      case "bill_pending": r = r.filter((x) => (x.dispatch_date || x.emailed_date) && !x.invoice_no); break;
      case "urgent_open": r = r.filter((x) => x.priority === "Urgent" && !x.results_date); break;
      case "tat_conflicts": r = r.filter((x) => Number(x.tat_conflict) === 1); break;
      default: break;
    }
  }
  if (f.lcStage) {
    if (f.lcStatus === "Overdue") {
      // same rule as the backend card: the sample (LRN) sits at this stage and a row at that stage is Overdue
      if (one) r = r.filter((x) => counted.has(x._k));
      r = r.filter((x) => Number(x.lifecycle_no) === f.lcStage && x.lifecycle_status === "Overdue");
    } else if (f.lcStage === 3) {
      // "Sample Booked" counts every LRN, but no row has lifecycle stage 3 (rows start at Allotted = 4): show one row per LRN
      if (one) r = r.filter((x) => firstRows.has(x._k));
    } else {
      if (one) r = r.filter((x) => counted.has(x._k));
      r = r.filter((x) => Number(x.lifecycle_no) === f.lcStage);
    }
  }
  return r;
}

// ---- FILTER PANEL LOOK (matches Kailtech theme & Sales/Enquiry page) ----
const F_LBL = "block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5";
const F_INP = "h-9 rounded-lg border border-gray-300 bg-white px-3 text-xs text-gray-800 shadow-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100 dark:bg-dark-900 dark:border-dark-600 dark:text-dark-100";
// 18-Nov-2026: wraps a filter field and shows a small x that clears ONLY that field (Clear All still clears everything)
function FClr({ show, onClear, right = "right-6", children }) {
  return (
    <span className="relative block">
      {children}
      {show && (
        <button type="button" onClick={onClear} title="Clear this filter" aria-label="Clear this filter"
          className={`absolute ${right} top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full text-sm font-bold leading-none text-gray-500 hover:text-red-600 hover:bg-red-50`}>
          &times;
        </button>
      )}
    </span>
  );
}
function FGroup({ title, children }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-900/60 p-2.5 shadow-sm">
      <div className="text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2 pb-1 border-b border-gray-100 dark:border-dark-700">{title}</div>
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">{children}</div>
    </div>
  );
}

// ---- MASTER SEARCH + FLOW FILTERS (client side, on the rows already loaded) ----
// 18-Nov-2026: a real BRN looks like KTRC/2609R007307. Testing TRFs have no BRN (the server puts the TRF id there) and the inward no. is not a BRN -> show "-" instead of a number.
const brnOf = (r) => {
  const b = String(r?.brn ?? "").trim();
  return b && !/^\d+$/.test(b) ? b : "";
};

const searchText = (r) => {
  const parts = [
    r.inward_no, r.lrn, r.brn, r.ref_id, r.customer, r.package, r.department, r.allocated_to, r.bd_person, r.ulr_no, r.invoice_no, r.docket,
    r.holder_name, r.holder_role, r.stage, r.current_status, r.type, r.nabl, r.priority, r.email_status, r.whatsapp_status, fmtDate(r.booking_date),
  ];
  (Array.isArray(r.email_logs) ? r.email_logs : []).forEach((m) => {
    parts.push(m.subject, m.po, m.sent_by, (m.to || []).join(" "), (m.cc || []).join(" "), (m.bcc || []).join(" "));
    (m.items || []).forEach((it) => parts.push(it.no, it.name, it.serial, it.file));
  });
  return parts.filter((x) => x !== null && x !== undefined && x !== "").join(" ").toLowerCase();
};

const FLOW_OPTIONS = [
  { id: "awaiting", label: "Awaiting allocation", test: (r) => r.stage === "Allotted to Dept" || r.stage === "Awaiting allocation" },
  { id: "testing", label: "Under testing", test: (r) => r.stage === "Under testing" },
  { id: "test_ready", label: "Test ready (results entered)", test: (r) => !!r.results_date },
  { id: "under_review", label: "Under review (HOD / QA)", test: (r) => r.reviewed_status === "Pending Review" },
  { id: "review_done", label: "Review done", test: (r) => r.reviewed_status === "Reviewed" },
  { id: "authorised", label: "Authorised", test: (r) => !!r.authorised_date },
  { id: "report_ready", label: "Report ready (not yet sent)", test: (r) => !!r.authorised_date && !r.report_delivered },
  { id: "report_sent", label: "Report sent / delivered", test: (r) => !!r.report_delivered },
  { id: "closed", label: "Closed", test: (r) => r.stage === "Closed" },
];
const OVERDUE_OPTIONS = [
  { id: "overdue", label: "Overdue (any)", test: (r) => Number(r.overdue_days_22) > 0 },
  { id: "gt3", label: "Overdue > 3 days", test: (r) => Number(r.overdue_days_22) > 3 },
  { id: "testing_overdue", label: "Testing overdue", test: (r) => r.testing_status === "OVERDUE" },
  { id: "ontrack", label: "On track", test: (r) => !(Number(r.overdue_days_22) > 0 || r.testing_status === "OVERDUE") && !r.report_delivered },
  { id: "delivered", label: "Delivered", test: (r) => !!r.report_delivered },
  { id: "tat_overdue", label: "Any TAT clock overdue", test: (r) => Array.isArray(r.tat_clocks) && r.tat_clocks.some((c) => c.status === "OVERDUE") },
  { id: "on_hold", label: "On hold", test: (r) => !!r.on_hold },
];
const EMAIL_OPTIONS = [
  { id: "pending", label: "Email pending", test: (r) => r.email_status === "Pending" },
  { id: "sent", label: "Email sent", test: (r) => r.email_status === "Sent" },
  { id: "test", label: "Test email only", test: (r) => r.email_status === "Test only" },
  { id: "manual", label: "Sent offline (manual)", test: (r) => r.email_status === "Manual" },
  { id: "none", label: "No email yet (not authorised)", test: (r) => !r.email_status || r.email_status === "-" },
];
const WA_SENT = (r) => !!r.whatsapp_status && !["-", "Pending", "Not enabled"].includes(r.whatsapp_status);
const WA_OPTIONS = [
  { id: "sent", label: "WhatsApp sent", test: WA_SENT },
  { id: "pending", label: "WhatsApp pending", test: (r) => r.whatsapp_status === "Pending" },
  { id: "off", label: "WhatsApp not enabled", test: (r) => r.whatsapp_status === "Not enabled" },
];
const INVOICE_OPTIONS = [
  { id: "pending", label: "Invoice pending (not raised)", test: (r) => !r.invoice_no },
  { id: "raised", label: "Invoice raised", test: (r) => !!r.invoice_no },
  { id: "paid", label: "Paid", test: (r) => r.invoice_payment === "Paid" },
  { id: "part", label: "Part paid", test: (r) => r.invoice_payment === "Part paid" },
  { id: "due", label: "Balance due", test: (r) => r.invoice_payment === "Balance due" },
];
const pickOpt = (list, id) => list.find((o) => o.id === id);

// 18-Nov-2026: ONE place that applies every filter. `skip` = name of a filter group to leave out (used to tell the user which filter
// is hiding the rows, e.g. "Email: Email sent" + Master Search "jindal" = 0 rows -> "remove Email sent: 8 rows").
function filterRows(ctx, skip) {
  const { hayRows, counted, firstRows, cols, f } = ctx;
  const on = (k) => skip !== k;
  let list = on("card")
    ? applyCardFilters(hayRows, { topCard: f.topCard, kpi: f.kpi, lcStage: f.lcStage, lcStatus: f.lcStatus, showAll: f.showAll }, counted, firstRows)
    : hayRows;
  list = list.filter((r) => {
    if (on("department") && f.department && r.department !== f.department) return false;
    if (on("chemist") && f.chemist && r.allocated_to !== f.chemist) return false;
    if (on("customer") && f.customer && !String(r.customer || "").toLowerCase().includes(f.customer.toLowerCase())) return false;
    if (on("stage") && f.stage && r.stage !== f.stage) return false;
    if (on("cat")) {
      if (f.cat === "urgent" && r.priority !== "Urgent") return false;
      if (f.cat === "gt3" && !(Number(r.overdue_days_22) > 3)) return false;
      if (f.cat === "ontrack" && (Number(r.overdue_days_22) > 0 || r.testing_status === "OVERDUE")) return false;
    }
    if (on("fPri") && f.fPri && r.priority !== f.fPri) return false;
    if (on("fFlow") && f.fFlow && !pickOpt(FLOW_OPTIONS, f.fFlow)?.test(r)) return false;
    if (on("fOver") && f.fOver && !pickOpt(OVERDUE_OPTIONS, f.fOver)?.test(r)) return false;
    if (on("fEmail") && f.fEmail && !pickOpt(EMAIL_OPTIONS, f.fEmail)?.test(r)) return false;
    if (on("fWa") && f.fWa && !pickOpt(WA_OPTIONS, f.fWa)?.test(r)) return false;
    if (on("fInv") && f.fInv && !pickOpt(INVOICE_OPTIONS, f.fInv)?.test(r)) return false;
    if (on("master") && f.masterTerms.length) {
      const h = r._hay;
      if (!f.masterTerms.every((t) => h.includes(t))) return false;
    }
    return true;
  });
  if (on("col")) {
    const active = Object.entries(f.colFilters).filter(([, v]) => v);
    if (active.length) {
      list = list.filter((r) => active.every(([k, v]) => {
        const c = cols.find((x) => x.key === k);
        return c && String(c.value(r, 0) ?? "").toLowerCase().includes(v.toLowerCase());
      }));
    }
  }
  return list;
}

// ---- MAIN 8 COLUMNS DEFINITION ----
const COLUMNS = (ctx) => [
  {
    key: "sno",
    label: "Sr. No.",
    w: 65,
    value: (_r, idx) => String(idx + 1),
    render: (_r, idx) => <span className="font-semibold text-gray-700">{idx + 1}</span>,
    sort: (_r, idx) => idx + 1,
  },
  {
    key: "booking_date",
    label: "Booking Date",
    w: 110,
    value: (r) => fmtDate(r.booking_date),
    render: (r) => <span className="whitespace-nowrap font-medium text-gray-800">{fmtDate(r.booking_date)}</span>,
    sort: (r) => r.booking_date || "",
  },
  {
    key: "lrn",
    label: "LRN",
    w: 135,
    value: (r) => r.lrn || "",
    render: (r) => (
      r.lrn ? (
        <span className="font-mono font-bold text-gray-900">{r.lrn}</span>
      ) : (
        <Badge cls="bg-red-100 text-red-700">PENDING LRN</Badge>
      )
    ),
    sort: (r) => r.lrn || "",
  },
  {
    key: "brn",
    label: "BRN",
    w: 130,
    value: (r) => brnOf(r),
    render: (r) => {
      const isCal = r.type === "Calibration";
      const canSee = (ctx.canCustomer ?? ctx.isTopLevel) || isCal;
      return <span className="font-mono text-blue-700 font-semibold">{canSee ? (brnOf(r) || "-") : "-"}</span>;
    },
    sort: (r) => brnOf(r),
  },
  {
    key: "inward_no",
    label: "Inward No.",
    w: 110,
    value: (r) => r.inward_no || "",
    render: (r) => {
      const isCal = r.type === "Calibration";
      const canSee = (ctx.canCustomer ?? ctx.isTopLevel) || isCal;
      return <span className="font-mono font-semibold text-gray-900">{canSee ? (r.inward_no || "-") : "-"}</span>;
    },
    sort: (r) => r.inward_no || "",
  },
  {
    key: "customer",
    label: "Customer",
    w: 220,
    value: (r) => r.customer || "",
    render: (r) => {
      const isCal = r.type === "Calibration";
      const canSee = (ctx.canCustomer ?? ctx.isTopLevel) || isCal;
      return canSee ? (
        <span className="block max-w-[220px] truncate font-medium text-gray-800" title={r.customer}>{r.customer}</span>
      ) : (
        <span className="italic text-gray-400 text-xs">Confidential (17025)</span>
      );
    },
    sort: (r) => r.customer || "",
  },
  {
    key: "with_since",
    label: "With / Since",
    w: 190,
    value: (r) => `${r.holder_name || r.holder_role || ""} ${fmtDate(r.holder_since)}`,
    render: (r) => (
      <div className="leading-tight">
        <span className="font-semibold text-gray-900 block">{r.holder_name || r.holder_role || "-"}</span>
        {r.holder_since ? <span className="block text-[10px] text-gray-500">since {fmtDate(r.holder_since)}</span> : null}
      </div>
    ),
    sort: (r) => r.holder_since || "",
  },
  {
    key: "overdue",
    label: "Overdue / Due Date",
    w: 150,
    value: (r) => `${fmtDate(r.report_due_22)} ${Number(r.overdue_days_22) > 0 ? `+${r.overdue_days_22} Days` : r.report_delivered ? "Delivered" : "On track"}`,
    render: (r) => {
      const isOverdue = Number(r.overdue_days_22) > 0 || r.testing_status === "OVERDUE";
      return (
        <div className="leading-tight whitespace-nowrap">
          <div className="text-[11px] font-medium text-gray-700">{fmtDate(r.report_due_22)}</div>
          <div className="mt-0.5">
            {Number(r.overdue_days_22) > 0 ? (
              <Badge cls="bg-red-100 text-red-800 font-bold">+{r.overdue_days_22} Days Overdue</Badge>
            ) : r.report_delivered ? (
              <Badge cls="bg-slate-100 text-slate-700 font-semibold">Delivered</Badge>
            ) : isOverdue ? (
              <Badge cls="bg-red-100 text-red-800 font-bold">OVERDUE</Badge>
            ) : (
              <Badge cls="bg-emerald-100 text-emerald-800 font-semibold">On track</Badge>
            )}
          </div>
        </div>
      );
    },
    sort: (r) => Number(r.overdue_days_22) || (r.report_due_22 || ""),
  },
  {
    key: "action",
    label: "Action",
    w: 90,
    value: () => "Detail",
    render: (r) => (
      <button
        type="button"
        onClick={() => ctx.openDetail(r)}
        className="px-3 py-1 rounded bg-[#18457c] text-white hover:bg-[#133763] text-[11px] font-semibold shadow-sm transition-colors whitespace-nowrap flex items-center gap-1"
        title="View full sample details"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
        Detail
      </button>
    ),
  },
];

// ---- MAIN MIS COMPONENT ----
export default function Mis22() {
  const [from, setFrom] = useState(() => isoDate(new Date(Date.now() - 30 * 86400000)));
  const [to, setTo] = useState(() => isoDate(new Date()));
  const [type, setType] = useState("all");
  const [limit, setLimit] = useState(10000); // DEFAULT = all records (backend maximum 10000); changed 2026-11-16 from 100 - user can pick 10 / 25 / 50 / 100 / 500 ...
  const [department, setDepartment] = useState("");
  const [chemist, setChemist] = useState("");
  const [customer, setCustomer] = useState("");
  const [stage, setStage] = useState("");
  const [cat, setCat] = useState("all");

  const [topCard, setTopCard] = useState(null);
  const [kpi, setKpi] = useState(null);
  const [lcStage, setLcStage] = useState(null);
  const [lcStatus, setLcStatus] = useState("");
  const [showAll, setShowAll] = useState(false);

  const [master, setMaster] = useState("");
  const [fFlow, setFFlow] = useState("");
  const [fOver, setFOver] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fWa, setFWa] = useState("");
  const [fInv, setFInv] = useState("");
  const [fPri, setFPri] = useState("");

  const [colFilters, setColFilters] = useState({});
  const [sort, setSort] = useState({ key: "booking_date", dir: "asc" });

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("table");
  const [gateCount, setGateCount] = useState(null);
  const [detailRow, setDetailRow] = useState(null);
  const [reopen, setReopen] = useState(null);
  const [mobileShow, setMobileShow] = useState(60); // phone card list: show 60 samples, then "Show more"

  const load = useCallback(async (limOverride, range, typeOverride) => {
    const lim = typeof limOverride === "number" ? limOverride : limit;
    setLoading(true);
    try {
      const res = await axios.get("/mis/tracker22", { params: { from: range?.from || from, to: range?.to || to, type: typeOverride || type, limit: lim }, timeout: 180000 });
      const d = res.data?.data || null;
      setData(d);
      // Auto-lock type to calibration if scope is calibration only
      const allowed = d?.user_scope?.allowed_departments;
      if (allowed && allowed.length === 1 && allowed[0].toLowerCase() === "calibration") {
        setType("calibration");
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not load the MIS.");
    } finally { setLoading(false); }
  }, [from, to, type, limit]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tier = data?.user_scope?.tier;
  // Role-based MIS (2026-11-25): the server sends user_scope.features when the MIS permissions are active; without it the old rules apply unchanged.
  const feat = data?.user_scope?.features;
  const canSeeGate = feat ? !!feat.gate : (tier === "management" || tier === "reporting");
  const userId = Number(localStorage.getItem("userId") || data?.user_scope?.user_id || 0);
  const isTopLevel = feat
    ? !!(feat.docs || feat.email)
    : ([31, 41, 160, 113, 65].includes(userId) || tier === "management" || tier === "reporting" || !!data?.user_scope?.is_management);
  const canCustomer = feat ? !!feat.customer : undefined; // real customer name / BRN of testing samples (calibration rows stay visible as before)
  useEffect(() => {
    if (!canSeeGate) return;
    axios.get("/mis/gate-pending").then((r) => setGateCount(r.data?.data?.summary || null)).catch(() => {});
  }, [canSeeGate]);

  const allRows = useMemo(() => {
    const seen = {};
    return (data?.rows || []).map((r) => {
      const base = `${r.type}|${r.lrn}|${r.department}|${r.ref_id}`;
      seen[base] = (seen[base] || 0) + 1;
      return { ...r, _k: seen[base] > 1 ? `${base}#${seen[base]}` : base };
    });
  }, [data]);

  const departments = useMemo(() => [...new Set(allRows.map((r) => r.department).filter(Boolean))].sort(), [allRows]);
  const chemists = useMemo(() => [...new Set(allRows.map((r) => r.allocated_to).filter(Boolean))].sort(), [allRows]);
  const stages = useMemo(() => [...new Set(allRows.map((r) => r.stage).filter(Boolean))].sort(), [allRows]);

  const seeInvoice = !!data?.user_scope?.see_invoice;
  useEffect(() => {
    if (!reopen) return;
    const m = allRows.find((x) => x.lrn === reopen.lrn && x.type === reopen.type);
    if (m) setDetailRow(m);
    setReopen(null);
  }, [allRows]); // eslint-disable-line react-hooks/exhaustive-deps

  const cols = useMemo(() => COLUMNS({ openDetail: (r) => setDetailRow(r), seeInvoice, isTopLevel, canCustomer }), [seeInvoice, isTopLevel, canCustomer]);

  // One row per LRN for Classic card filter rules
  const counted = useMemo(() => {
    const byLrn = new Map();
    allRows.forEach((x) => {
      const k = String(x.lrn);
      if (!byLrn.has(k)) byLrn.set(k, []);
      byLrn.get(k).push(x);
    });
    const set = new Set();
    byLrn.forEach((l) => {
      let min = null;
      l.forEach((x) => { const n = Number(x.lifecycle_no); if (n !== 12 && (min === null || n < min)) min = n; });
      const pool = min === null ? l : l.filter((x) => Number(x.lifecycle_no) === min);
      set.add((pool.find((x) => x.lifecycle_status === "Overdue") || pool[0])._k);
    });
    return set;
  }, [allRows]);

  // First row per LRN (rows arrive in the backend's order) - what the backend summary counts for the tiles and KPI cards
  const firstRows = useMemo(() => {
    const seenLrn = new Set();
    const set = new Set();
    allRows.forEach((x) => {
      const k = String(x.lrn);
      if (!seenLrn.has(k)) { seenLrn.add(k); set.add(x._k); }
    });
    return set;
  }, [allRows]);

  const lcGt3 = useMemo(() => {
    const m = {};
    allRows.forEach((x) => { if (Number(x.overdue_gt3) === 1) m[Number(x.lifecycle_no)] = true; });
    return m;
  }, [allRows]);

  const masterTerms = useMemo(() => master.toLowerCase().split(/\s+/).filter(Boolean), [master]);
  const hayRows = useMemo(() => (masterTerms.length ? allRows.map((r) => ({ ...r, _hay: searchText(r) })) : allRows), [allRows, masterTerms.length]);

  const filterCtx = useMemo(() => ({
    hayRows, counted, firstRows, cols,
    f: { topCard, kpi, lcStage, lcStatus, showAll, department, chemist, customer, stage, cat, fPri, fFlow, fOver, fEmail, fWa, fInv, masterTerms, colFilters },
  }), [hayRows, counted, firstRows, cols, topCard, kpi, lcStage, lcStatus, showAll, department, chemist, customer, stage, cat, fPri, fFlow, fOver, fEmail, fWa, fInv, masterTerms, colFilters]);

  const rows = useMemo(() => {
    let list = filterRows(filterCtx, null);

    const sc = cols.find((c) => c.key === sort.key);
    if (sc) {
      const val = sc.sort || sc.value;
      const dirn = sort.dir === "asc" ? 1 : -1;
      list = [...list].sort((a, b) => {
        const x = val(a, 0), y = val(b, 0);
        if (typeof x === "number" && typeof y === "number") return (x - y) * dirn;
        return String(x ?? "").localeCompare(String(y ?? ""), undefined, { numeric: true }) * dirn;
      });
    }
    return list;
  }, [filterCtx, sort, cols]);

  const clearCards = () => { setTopCard(null); setKpi(null); setLcStage(null); setLcStatus(""); setShowAll(false); };
  const clearAll = () => { setDepartment(""); setChemist(""); setCustomer(""); setStage(""); setCat("all"); setMaster(""); setFFlow(""); setFOver(""); setFEmail(""); setFWa(""); setFInv(""); setFPri(""); setColFilters({}); setSort({ key: "booking_date", dir: "asc" }); clearCards(); };
  const cardsFilterOn0 = !!(topCard || kpi || lcStage || lcStatus);
  const cardLabel0 = topCard ? TOP_TILES.find((x) => x.key === topCard)?.label : kpi ? KPI_CARDS.find((x) => x.key === kpi)?.label : lcStage ? `${LC_CARDS.find((c) => c.no === lcStage)?.label}${lcStatus ? ` - ${lcStatus}` : ""}` : "";
  const activeFilters = [
    master && { k: "master", label: `Search: ${master}`, clear: () => setMaster("") },
    cardsFilterOn0 && { k: "card", label: `Card: ${cardLabel0}`, clear: clearCards },
    department && { k: "department", label: `Lab: ${department}`, clear: () => setDepartment("") },
    chemist && { k: "chemist", label: `Chemist: ${chemist}`, clear: () => setChemist("") },
    customer && { k: "customer", label: `Customer: ${customer}`, clear: () => setCustomer("") },
    stage && { k: "stage", label: `Stage: ${stage}`, clear: () => setStage("") },
    cat !== "all" && { k: "cat", label: `Quick view: ${cat}`, clear: () => setCat("all") },
    fFlow && { k: "fFlow", label: `Flow: ${pickOpt(FLOW_OPTIONS, fFlow)?.label || fFlow}`, clear: () => setFFlow("") },
    fOver && { k: "fOver", label: `Overdue: ${pickOpt(OVERDUE_OPTIONS, fOver)?.label || fOver}`, clear: () => setFOver("") },
    fEmail && { k: "fEmail", label: `Email: ${pickOpt(EMAIL_OPTIONS, fEmail)?.label || fEmail}`, clear: () => setFEmail("") },
    fWa && { k: "fWa", label: `WhatsApp: ${pickOpt(WA_OPTIONS, fWa)?.label || fWa}`, clear: () => setFWa("") },
    fInv && { k: "fInv", label: `Invoice: ${pickOpt(INVOICE_OPTIONS, fInv)?.label || fInv}`, clear: () => setFInv("") },
    fPri && { k: "fPri", label: `Priority: ${fPri}`, clear: () => setFPri("") },
    ...Object.entries(colFilters).filter(([, v]) => v).map(([ck, v]) => ({ k: "col:" + ck, label: `Column ${cols.find((c) => c.key === ck)?.label || ck}: ${v}`, clear: () => setColFilters((p) => ({ ...p, [ck]: "" })) })),
  ].filter(Boolean);
  // when nothing matches: how many rows would show if ONE filter were removed (computed only for 0 rows)
  const zeroHints = rows.length === 0 && allRows.length > 0 && activeFilters.length > 0
    ? activeFilters.map((a) => {
        const skip = a.k.startsWith("col:") ? "col" : a.k;
        return { ...a, n: filterRows(filterCtx, skip).length };
      }).filter((h) => h.n > 0).sort((a, b) => b.n - a.n).slice(0, 6)
    : [];
  const scrollToTable = () => setTimeout(() => document.getElementById("mis-table")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);

  const pickTop = (k) => { setKpi(null); setLcStage(null); setLcStatus(""); setShowAll(false); setTopCard((p) => (p === k ? null : k)); scrollToTable(); };
  const pickKpi = (k) => { setTopCard(null); setLcStage(null); setLcStatus(""); setShowAll(false); setKpi((p) => (p === k ? null : k)); scrollToTable(); };
  const pickLc = (no, status) => {
    setKpi(null); setTopCard(null); setShowAll(false);
    if (lcStage === no && lcStatus === status) { setLcStage(null); setLcStatus(""); return; }
    setLcStage(no); setLcStatus(status); scrollToTable();
  };

  const summ = data?.summary || {};
  const cardsFilterOn = !!(topCard || kpi || lcStage || lcStatus);
  const cardLabel = topCard ? TOP_TILES.find((t) => t.key === topCard)?.label : kpi ? KPI_CARDS.find((k) => k.key === kpi)?.label : lcStage ? `${LC_CARDS.find((c) => c.no === lcStage)?.label}${lcStatus ? ` - ${lcStatus}` : ""}` : "";

  const exportExcel = () => {
    const headers = ["Sr. No.", "Booking Date", "LRN", "BRN", "Inward No.", "Customer", "Department", "Package", "Priority", "BD Person", "Current Status", "With / Since", "Report Due Date", "Overdue Days", "Allocated To", "Results Date", "Reviewed By", "Authorised By", "ULR No.", "Additional TAT status"];
    const aoa = [
      headers,
      ...rows.map((r, i) => [
        i + 1,
        fmtDate(r.booking_date),
        r.lrn || "",
        brnOf(r),
        r.inward_no || "",
        r.customer || "",
        r.department || "",
        r.package || "",
        r.priority || "",
        r.bd_person || "-",
        r.current_status || r.transferred_to || r.stage || "-",
        `${r.holder_name || r.holder_role || "-"} ${r.holder_since ? "since " + fmtDate(r.holder_since) : ""}`,
        fmtDate(r.report_due_22),
        Number(r.overdue_days_22) > 0 ? `+${r.overdue_days_22} Days` : r.report_delivered ? "Delivered" : "On track",
        r.allocated_to || "-",
        fmtDate(r.results_date),
        r.reviewed_by || "-",
        r.authorised_by || "-",
        r.ulr_no || "-",
        Array.isArray(r.tat_clocks) && r.tat_clocks.length ? r.tat_clocks.map((c) => `${c.label}: ${c.status}`).join("; ") : "-",
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MIS");
    XLSX.writeFile(wb, `MIS_Tracker_${from}_to_${to}.xlsx`);
  };

  const scope = data?.user_scope;
  const isCalibOnly = scope?.allowed_departments?.length === 1 && scope.allowed_departments[0].toLowerCase() === "calibration";

  const tierBadge = {
    management: "bg-purple-100 text-purple-800",
    reporting: "bg-sky-100 text-sky-800",
    hod: "bg-blue-100 text-blue-800",
    self: "bg-slate-100 text-slate-800",
  };

  return (
    <Page title="MIS - Sample Flow Tracker">
      <div className="space-y-4">
        {/* Top Header & Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              Sample Flow Tracker
              {scope && (
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${tierBadge[scope.tier] || "bg-gray-100 text-gray-700"}`}>
                  {scope.tier === "management" ? "Management View (All Labs)" :
                   scope.tier === "reporting" ? (String(scope.department_name || "").includes("Business Development") ? `Business Development View (${scope.user_name || "All Labs"})` : `Reporting & Dispatch View (${scope.user_name || "All Labs"})`) :
                   scope.tier === "hod" ? `Department View: ${scope.department_name} (${scope.user_name || ""})` :
                   `Staff View: ${scope.user_name || "My Samples"}`}
                </span>
              )}
            </h1>
            <div className="text-xs text-gray-500 mt-0.5">
              As on {fmtDate(isoDate(new Date()))} &middot; sorted by Booking Date &middot; read-only
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("table")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tab === "table" ? "bg-[#18457c] text-white shadow-sm" : "bg-white text-gray-700 border hover:bg-gray-50"
              }`}
            >
              Sample Tracker
            </button>
            {canSeeGate && (
              <button
                type="button"
                onClick={() => setTab("gate")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tab === "gate" ? "bg-[#18457c] text-white shadow-sm" : "bg-white text-gray-700 border hover:bg-gray-50"
                }`}
              >
                Unbooked at Gate {gateCount ? `(${gateCount.total})` : ""}
              </button>
            )}
            <button
              type="button"
              onClick={() => setTab("mail")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tab === "mail" ? "bg-[#18457c] text-white shadow-sm" : "bg-white text-gray-700 border hover:bg-gray-50"
              }`}
            >
              Email Log
            </button>
            <button
              type="button"
              onClick={() => setTab("tat")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tab === "tat" ? "bg-[#18457c] text-white shadow-sm" : "bg-white text-gray-700 border hover:bg-gray-50"
              }`}
            >
              TAT Master
            </button>
          </div>
        </div>

        {/* Tab 1: Unbooked Gate */}
        {tab === "gate" && <GateTab canSee={canSeeGate} />}

        {/* Tab 2: Email Log */}
        {tab === "mail" && <EmailLogTab />}

        {/* Tab 3: TAT Master */}
        {tab === "tat" && <TatMasterTab canEdit={feat ? !!feat.tatEdit : tier === "management"} calibPackages={[...new Set(allRows.filter((x) => (x.type || "") === "Calibration").map((x) => x.package).filter(Boolean))].sort()} />}

        {/* Tab 4: Sample Tracker Main Table */}
        {tab === "table" && (
          <>
            {/* TOP CARDS (from Classic MIS) - placed right after header and before filter controls */}
            <div className="space-y-2.5">
              {/* 4 Summary Tiles */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {TOP_TILES.map((t) => {
                  const val = summ.split_counts?.[t.key] ?? 0;
                  const on = topCard === t.key;
                  return (
                    <div
                      key={t.key}
                      onClick={() => pickTop(t.key)}
                      role="button"
                      tabIndex={0}
                      title={`Click to filter table by ${t.label}`}
                      className={`rounded-xl border p-2.5 flex items-center justify-between cursor-pointer select-none transition-all hover:shadow-md ${on ? t.on : t.cls}`}
                    >
                      <div>
                        <div className={`text-[10px] font-bold uppercase tracking-wider ${t.txt}`}>{t.label}</div>
                        <div className="text-xl font-extrabold text-gray-900 mt-0.5">{val}</div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-colors ${on ? "bg-white text-gray-900 shadow-sm" : "bg-white/80 text-gray-700"}`}>
                        {on ? "Filtered âœ“" : t.sub}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* 6 Lifecycle Cards */}
              <div>
                <div className="text-[11px] uppercase tracking-wide font-semibold text-gray-500 mb-1">
                  Sample Lifecycle &middot; click a card to filter, click the overdue strip to see only overdue
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                  {LC_CARDS.map((c) => {
                    if (c.no === 11 && !seeInvoice) return null;
                    const stat = summ.lifecycle?.[c.no] || { total: 0, overdue: 0, urgent: 0 };
                    const h = lcHealth(stat.total, stat.overdue, lcGt3[c.no]);
                    const tone = LC_TONE[h];
                    const activeBox = lcStage === c.no && !lcStatus;
                    const activeOverdue = lcStage === c.no && lcStatus === "Overdue";
                    return (
                      <div
                        key={c.no}
                        className={`rounded-xl border overflow-hidden transition-all duration-150 hover:shadow-md ${activeBox ? "ring-2 ring-blue-600 border-blue-600" : tone.box}`}
                      >
                        <div
                          onClick={() => pickLc(c.no, "")}
                          role="button"
                          tabIndex={0}
                          title={`Click to show all ${c.label} samples`}
                          className="p-2.5 cursor-pointer select-none"
                        >
                          <div className="text-[10px] uppercase tracking-wide font-semibold text-gray-600 truncate">{c.label}</div>
                          <div className="flex items-baseline justify-between mt-0.5">
                            <span className="text-2xl font-bold text-gray-900">{stat.total}</span>
                            {stat.urgent > 0 && <span className="text-[10px] font-bold text-red-700 bg-red-100 rounded-full px-1.5 py-0.5">{stat.urgent} urgent</span>}
                          </div>
                        </div>
                        <div
                          onClick={() => pickLc(c.no, "Overdue")}
                          role="button"
                          tabIndex={0}
                          title={`Click to filter overdue only for ${c.label}`}
                          className={`px-2.5 py-1 text-[11px] font-semibold border-t flex items-center justify-between cursor-pointer select-none ${activeOverdue ? "ring-2 ring-red-600 bg-red-200 text-red-900" : tone.strip}`}
                        >
                          <span>{c.no === 3 ? "all booked" : `${stat.overdue} overdue`}</span>
                          {activeOverdue && <span className="text-[9px] uppercase font-bold">Filtered</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Overview Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {KPI_CARDS.map((k) => {
                  if (k.invoice && !seeInvoice) return null;
                  const val = summ[k.key] ?? "-";
                  const on = kpi === k.key;
                  return (
                    <div
                      key={k.key}
                      onClick={() => pickKpi(k.key)}
                      role="button"
                      tabIndex={0}
                      title={`Click to filter table by ${k.label}`}
                      className={`rounded-xl border p-2 cursor-pointer select-none transition-all hover:shadow-sm ${
                        on
                          ? "ring-2 ring-blue-600 border-blue-600 bg-blue-50"
                          : k.tone === "red"
                          ? "border-red-200 bg-red-50 hover:bg-red-100/70"
                          : k.tone === "amber"
                          ? "border-amber-200 bg-amber-50 hover:bg-amber-100/70"
                          : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <div className="text-[10px] uppercase tracking-wide text-gray-500 truncate">{k.label}</div>
                      <div className="text-lg font-bold text-gray-900 mt-0.5">{val}</div>
                    </div>
                  );
                })}
              </div>

              {/* Active Card Filter Chip */}
              {cardsFilterOn && (
                <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900">
                  <span className="font-semibold">Filtered by:</span>
                  <Badge cls="bg-blue-600 text-white font-bold">{cardLabel}</Badge>
                  <span>({rows.length} rows match)</span>
                  <button type="button" onClick={clearCards} className="ml-auto px-2 py-0.5 rounded border border-blue-300 font-semibold text-blue-800 hover:bg-blue-100">
                    Clear Card Filter
                  </button>
                </div>
              )}
            </div>

            {/* 18-Nov-2026: full-screen loader - blocks every click while the tracker loads (stops mis-clicks on cards / headers / buttons) */}
            {loading && (
              <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-[2px] select-none cursor-wait" role="alert" aria-busy="true">
                <svg className="h-12 w-12 animate-spin text-white" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-90" fill="#18457c" stroke="white" strokeWidth="0.5" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                <div className="text-lg font-bold text-white drop-shadow">Loading Sample Flow Tracker...</div>
                <div className="text-sm text-white/90 drop-shadow">Please wait while records are fetched and organized</div>
              </div>
            )}

            {/* FILTER PANEL (matches Kailtech theme & Sales/Enquiry page) */}
            <div className="rounded-xl border border-gray-200 dark:border-dark-700 bg-gray-50/80 dark:bg-dark-800 p-4 space-y-3 shadow-sm">
              {/* MASTER SEARCH: any detail (inward no, LRN, BRN, customer, instrument / package, chemist, ULR, invoice, docket, e-mail address / subject / certificate no.) */}
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex-1 min-w-[260px]">
                  <span className={F_LBL}>Master Search <span className="normal-case font-medium text-gray-500 dark:text-gray-400">(any detail - several words: all must match)</span></span>
                  <span className="relative block">
                    <MagnifyingGlassIcon className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      value={master}
                      onChange={(e) => setMaster(e.target.value)}
                      placeholder="Inward no, LRN, BRN, customer, package / instrument, chemist, ULR, invoice, docket, e-mail, certificate no..."
                      className="h-9 w-full rounded-lg border border-gray-300 bg-white pl-8 pr-8 text-xs text-gray-800 shadow-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:bg-dark-900 dark:border-dark-600 dark:text-dark-100 placeholder:text-gray-400"
                    />
                    {master && (
                      <button type="button" onClick={() => setMaster("")} title="Clear this filter" aria-label="Clear this filter" className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full text-sm font-bold leading-none text-gray-500 hover:text-red-600 hover:bg-red-50">&times;</button>
                    )}
                  </span>
                </label>
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 -mt-1">Master Search and the filters below work on the rows loaded for the From / To dates and Rows value.</div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                <FGroup title="Date & Scope">
                  <label>
                    <span className={F_LBL}>From</span>
                    <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={F_INP} />
                  </label>
                  <label>
                    <span className={F_LBL}>To</span>
                    <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={F_INP} />
                  </label>
                  <label>
                    <span className={F_LBL}>Type</span>
                    <FClr show={!isCalibOnly && type !== "all"} onClear={() => { setType("all"); load(undefined, undefined, "all"); }}>
                      <select value={type} onChange={(e) => { setType(e.target.value); load(undefined, undefined, e.target.value); }} disabled={isCalibOnly} className={`${F_INP} font-medium`}>
                        {!isCalibOnly && <option value="all">All</option>}
                        {!isCalibOnly && <option value="testing">Testing</option>}
                        <option value="calibration">Calibration</option>
                      </select>
                    </FClr>
                  </label>
                  <label>
                    <span className={F_LBL}>Rows</span>
                    <select
                      value={limit}
                      onChange={(e) => {
                        const lim = Number(e.target.value);
                        setLimit(lim);
                        load(lim);
                      }}
                      className={`${F_INP} font-bold text-[#18457c]`}
                    >
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                      <option value="500">500</option>
                      <option value="1000">1000</option>
                      <option value="5000">5000</option>
                      <option value="10000">All records (Default)</option>
                    </select>
                  </label>
                </FGroup>

                <FGroup title="Lab, People & Stage">
                  <label>
                    <span className={F_LBL}>Lab / Department</span>
                    <FClr show={!!department && departments.length > 1} onClear={() => setDepartment("")}>
                      <select value={department} onChange={(e) => setDepartment(e.target.value)} disabled={departments.length <= 1} className={`${F_INP} font-medium`}>
                        <option value="">All departments</option>
                        {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </FClr>
                  </label>
                  <label>
                    <span className={F_LBL}>Chemist / Engineer</span>
                    <FClr show={!!chemist} onClear={() => setChemist("")}>
                      <select value={chemist} onChange={(e) => setChemist(e.target.value)} className={F_INP}>
                        <option value="">All engineers/chemists</option>
                        {chemists.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </FClr>
                  </label>
                  {isTopLevel && (
                    <label>
                      <span className={F_LBL}>Customer</span>
                      <FClr show={!!customer} onClear={() => setCustomer("")} right="right-1.5">
                        <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer name" className={`${F_INP} w-44 pr-7`} />
                      </FClr>
                    </label>
                  )}
                  <label>
                    <span className={F_LBL}>Stage</span>
                    <FClr show={!!stage} onClear={() => setStage("")}>
                      <select value={stage} onChange={(e) => setStage(e.target.value)} className={F_INP}>
                        <option value="">All stages</option>
                        {stages.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </FClr>
                  </label>
                </FGroup>
              </div>

              <FGroup title="Flow & Status">
                {[
                  { label: "Flow status", v: fFlow, set: setFFlow, opts: FLOW_OPTIONS, all: "All flow statuses" },
                  { label: "Overdue / On track", v: fOver, set: setFOver, opts: OVERDUE_OPTIONS, all: "All" },
                  { label: "Email", v: fEmail, set: setFEmail, opts: EMAIL_OPTIONS, all: "All e-mail statuses" },
                  { label: "WhatsApp", v: fWa, set: setFWa, opts: WA_OPTIONS, all: "All WhatsApp statuses" },
                  ...(seeInvoice ? [{ label: "Invoice", v: fInv, set: setFInv, opts: INVOICE_OPTIONS, all: "All invoice statuses" }] : []),
                ].map((f) => (
                  <label key={f.label}>
                    <span className={F_LBL}>{f.label}</span>
                    <FClr show={!!f.v} onClear={() => f.set("")}>
                      <select value={f.v} onChange={(e) => f.set(e.target.value)} className={`${F_INP} ${f.v ? "border-[#18457c] ring-1 ring-[#18457c]/30 font-semibold" : ""}`}>
                        <option value="">{f.all}</option>
                        {f.opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                      </select>
                    </FClr>
                  </label>
                ))}
                <label>
                  <span className={F_LBL}>Priority</span>
                  <FClr show={!!fPri} onClear={() => setFPri("")}>
                    <select value={fPri} onChange={(e) => setFPri(e.target.value)} className={`${F_INP} ${fPri ? "border-[#18457c] ring-1 ring-[#18457c]/30 font-semibold" : ""}`}>
                      <option value="">All priorities</option>
                      <option value="Urgent">Urgent</option>
                      <option value="Normal">Normal</option>
                    </select>
                  </FClr>
                </label>
              </FGroup>

              {/* Actions + quick view */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => load()}
                  disabled={loading}
                  title="Reload the rows for the From / To dates (all other filters apply instantly)"
                  className="h-10 px-6 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                  {loading ? "Loading..." : "Filter"}
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="h-10 px-5 rounded-lg border border-gray-300 dark:border-dark-500 bg-white dark:bg-dark-700 text-sm font-semibold text-gray-700 dark:text-dark-100 hover:bg-gray-50 dark:hover:bg-dark-600 shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  Clear All
                </button>
                <button
                  type="button"
                  onClick={exportExcel}
                  disabled={!rows.length}
                  className="h-10 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  Export Excel (.xlsx)
                </button>
                <span className="mx-1 h-5 border-l border-gray-300 dark:border-dark-600" />
                <span className="text-xs text-gray-700 dark:text-gray-300 font-bold uppercase tracking-wide">Quick View:</span>
                {[
                  { id: "all", label: "All" },
                  { id: "urgent", label: "Urgent" },
                  { id: "gt3", label: "Overdue > 3 days" },
                  { id: "ontrack", label: "On track" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setCat(p.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                      cat === p.id ? "bg-primary-600 border-primary-600 text-white shadow-sm" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-dark-700 dark:border-dark-600 dark:text-dark-100"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
                <span
                  className={`sm:ml-auto w-full sm:w-auto justify-center sm:justify-start flex items-baseline gap-2 rounded-xl border-2 px-4 py-1.5 shadow-md transition-colors ${rows.length !== allRows.length ? "border-amber-500 bg-amber-50 text-amber-900" : "border-primary-600 bg-white text-primary-600"}`}
                  title={rows.length !== allRows.length ? "Filters are active: showing only the matching rows" : "All loaded rows are shown"}
                >
                  <span className="text-3xl font-extrabold leading-none tabular-nums">{rows.length}</span>
                  <span className="text-sm font-bold">of {allRows.length} rows{rows.length !== allRows.length ? " (filtered)" : ""}</span>
                </span>
              </div>
            </div>

            {/* 18-Nov-2026: every active filter in ONE visible place (incl. the card filter, which used to hide above the panel) */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs">
                <span className="font-bold text-amber-900 uppercase tracking-wide">Active filters ({activeFilters.length}):</span>
                {activeFilters.map((a) => (
                  <span key={a.k} className="inline-flex items-center gap-1 rounded-full border border-amber-400 bg-white pl-3 pr-1 py-0.5 font-semibold text-amber-900">
                    {a.label}
                    <button type="button" onClick={a.clear} title="Remove this filter" aria-label={`Remove ${a.label}`} className="h-5 w-5 rounded-full text-sm font-bold leading-none text-amber-800 hover:bg-red-100 hover:text-red-700">&times;</button>
                  </span>
                ))}
                <button type="button" onClick={clearAll} className="ml-auto rounded-lg border border-amber-400 bg-white px-3 py-1 font-bold text-amber-900 hover:bg-amber-100">Clear all filters</button>
              </div>
            )}

            {/* Truncated notice */}
            {data?.truncated && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center justify-between">
                <span>Showing first {limit} rows only &mdash; choose a larger Rows value (500, 1000, 5000) or narrow date range to view all.</span>
              </div>
            )}

            {/* SIMPLIFIED MAIN TABLE (8 COLUMNS ONLY, NO EXPANDER ROWS) */}
            {/* 18-Nov-2026: phones (< 768 px) get one card per sample instead of a 1240 px wide table; the table stays for tablets / desktop */}
            <div className="md:hidden space-y-2" id="mis-cards">
              {rows.slice(0, mobileShow).map((r, idx) => {
                const colBy = (k) => cols.find((c) => c.key === k);
                return (
                  <div key={r._k || idx} className="rounded-xl border border-gray-300 bg-white p-3 text-xs text-gray-900 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[13px]">{colBy("lrn")?.render(r, idx)}</div>
                        <div className="mt-0.5 font-semibold text-gray-900">{r.customer}</div>
                      </div>
                      <div className="shrink-0">{colBy("action")?.render(r, idx)}</div>
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
                      {cols.filter((c) => !["sno", "lrn", "customer", "action"].includes(c.key)).map((c) => (
                        <div key={c.key} className={c.key === "with_since" ? "col-span-2" : ""}>
                          <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{c.label}</dt>
                          <dd className="mt-0.5 text-gray-900">{c.render(r, idx)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                );
              })}
              {rows.length > mobileShow && (
                <button type="button" onClick={() => setMobileShow((n) => n + 60)} className="h-11 w-full rounded-xl border border-[#18457c] bg-white text-sm font-bold text-[#18457c] hover:bg-blue-50">
                  Show more ({rows.length - mobileShow} more samples)
                </button>
              )}
              {!loading && rows.length === 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
                  <div className="font-semibold">No samples match the selected filters.</div>
                  {zeroHints.length > 0 && (
                    <div className="mt-3 flex flex-col gap-2 text-xs">
                      {zeroHints.map((h) => (
                        <button key={h.k} type="button" onClick={h.clear} className="rounded-full border border-[#18457c] bg-white px-3 py-1.5 font-bold text-[#18457c] hover:bg-blue-50">
                          Remove &quot;{h.label}&quot; &rarr; {h.n} row{h.n > 1 ? "s" : ""}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div id="mis-table" className="hidden md:block overflow-auto border border-gray-300 dark:border-dark-700 rounded-xl max-h-[70vh] shadow-sm bg-white dark:bg-dark-800">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-gray-200 dark:bg-dark-800 shadow-sm">
                  {/* Column Header Titles with Sort click */}
                  <tr className="bg-gray-200 dark:bg-dark-800 border-b border-gray-300 dark:border-dark-700">
                    {cols.map((c) => (
                      <th
                        key={c.key}
                        style={{ minWidth: c.w }}
                        onClick={() => {
                          if (c.key === "action") return;
                          setSort((s) => ({ key: c.key, dir: s.key === c.key && s.dir === "asc" ? "desc" : "asc" }));
                        }}
                        className={`px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-800 dark:text-dark-100 whitespace-nowrap border-b border-gray-300 dark:border-dark-700 select-none ${c.key !== "action" ? "cursor-pointer hover:bg-gray-300/70" : ""}`}
                      >
                        <div className="flex items-center gap-1">
                          <span>{c.label}</span>
                          {sort.key === c.key && (
                            <span className="text-primary-600 font-bold">{sort.dir === "asc" ? " \u25B2" : " \u25BC"}</span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                  {/* Column Search Filters */}
                  <tr className="bg-gray-100/90 dark:bg-dark-800/90 border-b border-gray-300 dark:border-dark-700 backdrop-blur-sm">
                    {cols.map((c) => (
                      <th key={c.key} className="px-2 py-1.5 border-b border-t border-gray-300 dark:border-dark-700 bg-gray-50 dark:bg-dark-800/50">
                        {c.key !== "action" ? (
                          <div className="relative">
                            <input
                              value={colFilters[c.key] || ""}
                              onChange={(e) => setColFilters((f) => ({ ...f, [c.key]: e.target.value }))}
                              placeholder="Search..."
                              className="w-full h-8 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-normal normal-case pr-6 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 placeholder:text-gray-400 dark:bg-dark-900 dark:border-dark-600 dark:text-dark-100"
                            />
                            {colFilters[c.key] ? (
                              <button
                                type="button"
                                onClick={() => setColFilters((f) => ({ ...f, [c.key]: "" }))}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600 font-bold leading-none text-sm"
                              >
                                &times;
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-dark-700">
                  {rows.map((r, idx) => (
                    <tr
                      key={r._k || idx}
                      className="hover:bg-blue-50/50 dark:hover:bg-dark-900/40 transition-colors"
                    >
                      {cols.map((c) => (
                        <td key={c.key} className="px-3 py-2.5 align-middle">
                          {c.render(r, idx)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {!loading && rows.length === 0 && (
                    <tr>
                      <td colSpan={cols.length} className="p-8 text-center text-gray-600">
                        <div className="font-semibold">No samples match the selected filters.</div>
                        {zeroHints.length > 0 && (
                          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
                            <span>The rows are hidden by a combination of filters. Remove one to see them:</span>
                            {zeroHints.map((h) => (
                              <button key={h.k} type="button" onClick={h.clear} className="rounded-full border border-[#18457c] bg-white px-3 py-1 font-bold text-[#18457c] hover:bg-blue-50">
                                Remove &quot;{h.label}&quot; &rarr; {h.n} row{h.n > 1 ? "s" : ""}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* DETAIL MODAL (WHEN A ROW IS SELECTED) */}
            {detailRow && (
              <DetailModal
                r={detailRow}
                onClose={() => setDetailRow(null)}
                seeInvoice={seeInvoice}
                isTopLevel={isTopLevel}
                canCustomer={canCustomer}
                onChanged={(row) => { setReopen({ lrn: row.lrn, type: row.type }); load(); }}
              />
            )}
          </>
        )}
      </div>
    </Page>
  );
}
