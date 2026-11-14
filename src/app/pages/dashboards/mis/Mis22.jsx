// MIS - Sample Flow Tracker (STAGED 2026-11-13).
// Simplified 8-column main table + non-tabular Detail View modal + Classic Top Cards + Email Log & TAT Master tabs.
// Server: GET /mis/tracker22 and GET /mis/gate-pending (MisController, server-side scoped).
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import axios from "utils/axios";
import { toast } from "sonner";
import { Page } from "components/shared/Page";
import * as XLSX from "xlsx";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

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
            <details key={m.id} open={idx === 0} className={`rounded-lg border p-3 text-xs space-y-1 bg-white dark:bg-dark-800 ${m.status === "failed" ? "border-red-300" : "border-gray-200 dark:border-dark-700"}`}>
              <summary className="flex flex-wrap items-center gap-2 text-gray-700 dark:text-gray-200 cursor-pointer select-none">
                <span className="font-semibold">{idx === 0 ? "Latest: " : "Earlier: "}{m.sent_at ? `${fmtDate(m.sent_at)} ${String(m.sent_at).slice(11, 16)}` : "-"}</span>
                <span>{m.sent_by}{m.sent_by_role ? <span className="text-gray-500"> ({m.sent_by_role})</span> : null}</span>
                <Badge cls={m.mode === "test" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}>{m.mode === "test" ? "TEST" : "LIVE"}</Badge>
                <Badge cls={m.status === "failed" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700"}>{m.status}</Badge>
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

const STEP_DOT = {
  done: "bg-emerald-500",
  current: "bg-red-500",
  pending: "bg-gray-300",
  unlinked: "bg-gray-200",
};

function ChainDetail({ r }) {
  return (
    <div>
      <div className="text-[11px] text-gray-500 mb-2">(Derived from recorded timestamps - the system has no single custody log for samples.)</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {(r.custody_chain || []).map((s, i) => (
          <Fragment key={s.key}>
            <div className={`rounded-xl border px-3 py-2 text-xs min-h-[72px] transition-all ${
              s.state === "done"
                ? "border-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/30"
                : s.state === "current"
                ? "border-red-400 bg-red-50 dark:bg-red-950/30 ring-2 ring-red-400 shadow-md"
                : "border-gray-200 bg-gray-50/60 text-gray-400 dark:bg-dark-800"
            }`}>
              <div className="flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wide text-gray-600 dark:text-gray-300">
                <span className="text-gray-400">{i + 1}.</span>
                <span className={`w-2 h-2 rounded-full ${STEP_DOT[s.state] || STEP_DOT.pending}`} />
                {s.label}
              </div>
              <div className="font-semibold text-[13px] text-gray-900 dark:text-gray-100 mt-1">{s.holder || (s.state === "unlinked" ? "Not linked" : "-")}</div>
              <div className="text-[11px] text-gray-500">{s.at ? fmtDate(s.at) : s.state === "current" ? "Waiting" : ""}</div>
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

const MODAL_NAV = [
  { id: "md-sample", label: "Sample" },
  { id: "md-timeline", label: "Timeline" },
  { id: "md-review", label: "Review" },
  { id: "md-email", label: "Email" },
  { id: "md-history", label: "History" },
  { id: "md-custody", label: "Custody" },
];

function DetailModal({ r, onClose, seeInvoice }) {
  if (!r) return null;
  const isOverdue = Number(r.overdue_days_22) > 0 || r.testing_status === "OVERDUE";
  const href = resendHref(r);
  const goTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const holder = r.holder_name || r.holder_role || "-";
  const holderParts = splitNote(holder);
  const statusParts = splitNote(r.current_status || r.transferred_to || r.stage || "-");
  const emailTone = r.email_status === "Sent" ? "green" : r.email_status === "Pending" ? "amber" : r.email_status === "Test only" ? "blue" : "slate";
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
                Sample Details: {r.lrn || r.brn || `Inward ${r.inward_no}`}
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-white/20 text-white">{r.stage || r.department}</span>
              </div>
              <div className="text-sm text-blue-100 truncate">{r.customer}</div>
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
              <Chip label="Email" value={r.email_status || "-"} note={r.email_date ? fmtDate(r.email_date) : ""} tone={emailTone} />
              {invChip ? <Chip label="Invoice" value={invChip.value} note={invChip.note} tone={invChip.tone} /> : null}
              {r.priority === "Urgent" ? <Chip label="Priority" value="Urgent" tone="red" /> : null}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MODAL_NAV.map((n) => (
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
                <Field label="BRN (Booking Ref No)"><span className="font-mono text-blue-700 dark:text-blue-400">{r.brn || r.inward_no || "-"}</span></Field>
                <Field label="Inward Entry No."><span className="font-mono">{r.inward_no || "-"}</span></Field>
                <Field label="Department"><Badge cls="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 font-semibold">{r.department || "-"}</Badge></Field>
                <Field label="Priority">
                  <span className={r.priority === "Urgent" ? "text-red-600 font-bold" : ""}>{r.priority}{r.priority_days != null ? ` (${r.priority_days}d)` : ""}</span>
                </Field>
                <Field label="Customer" className="col-span-2 md:col-span-5"><span className="font-semibold">{r.customer || "-"}</span></Field>
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

            {/* Commercial, Email & Dispatch */}
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
            </Section>

            {/* Allotment History / Trail */}
            <Section id="md-history" title="Allotment & Re-allotment History" accent="slate">
              <TrailDetail r={r} />
            </Section>

            {/* Chain of Custody */}
            <Section id="md-custody" title="Chain of Custody Timeline" accent="slate">
              <ChainDetail r={r} />
            </Section>
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

  const colour = { green: "bg-emerald-100 text-emerald-800", amber: "bg-amber-100 text-amber-800", red: "bg-red-100 text-red-800" };
  const createHref = (g) => (g.purpose_id === 2
    ? `/dashboards/calibration-process/inward-entry-lab?caliblocation=Lab&calibacc=Nabl&gate=${g.id}&customer=${encodeURIComponent(g.customer)}&material=${encodeURIComponent(g.material)}`
    : `/dashboards/testing/trfs-starts-jobs/create?gate=${g.id}&customer=${encodeURIComponent(g.customer)}&material=${encodeURIComponent(g.material)}`);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2 text-xs">
        <label>From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="block border rounded-lg p-1.5" /></label>
        <label>To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="block border rounded-lg p-1.5" /></label>
        <button type="button" onClick={load} disabled={loading} className="px-4 py-2 rounded-lg bg-[#18457c] text-white font-semibold">{loading ? "Loading..." : "Filter"}</button>
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
                <td className="px-2 py-1"><a href={createHref(g)} target="_blank" rel="noopener noreferrer" className="px-2 py-1 rounded bg-[#18457c] text-white text-[11px] font-semibold whitespace-nowrap">Create TRF / Assign LRN &#8599;</a></td>
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
        <button type="button" onClick={load} disabled={loading} className="px-4 py-2 rounded-lg bg-[#18457c] text-white font-semibold">{loading ? "Loading..." : "Load"}</button>
      </div>
      {data?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <div className="rounded-xl border p-3 border-gray-200 bg-white dark:bg-dark-800">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">Emails</div>
            <div className="text-2xl font-bold mt-0.5">{data.summary.total}</div>
          </div>
          <div className="rounded-xl border p-3 border-emerald-200 bg-emerald-50">
            <div className="text-[11px] uppercase tracking-wide text-emerald-800">Sent to customers</div>
            <div className="text-2xl font-bold text-emerald-900 mt-0.5">{data.summary.sent_live}</div>
          </div>
          <div className="rounded-xl border p-3 border-blue-200 bg-blue-50">
            <div className="text-[11px] uppercase tracking-wide text-blue-800">Test emails</div>
            <div className="text-2xl font-bold text-blue-900 mt-0.5">{data.summary.test}</div>
          </div>
          <div className="rounded-xl border p-3 border-red-200 bg-red-50">
            <div className="text-[11px] uppercase tracking-wide text-red-800">Failed</div>
            <div className="text-2xl font-bold text-red-900 mt-0.5">{data.summary.failed}</div>
          </div>
          <div className="rounded-xl border p-3 border-gray-200 bg-gray-50">
            <div className="text-[11px] uppercase tracking-wide text-gray-600">Cancelled</div>
            <div className="text-2xl font-bold text-gray-800 mt-0.5">{data.summary.cancelled}</div>
          </div>
        </div>
      )}
      <div className="overflow-auto border rounded-xl max-h-[65vh]">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-500 sticky top-0"><tr>
            {["When", "Sent by", "Type", "Reference", "Customer", "To", "Docs", "Invoice", "Mode", "Status"].map((h) => <th key={h} className="p-2 text-left whitespace-nowrap">{h}</th>)}
          </tr></thead>
          <tbody>
            {(data?.rows || []).map((r) => (
              <Fragment key={r.id}>
                <tr onClick={() => setOpenMail(openMail === r.id ? null : r.id)} className={`border-t cursor-pointer hover:bg-blue-50/40 ${r.status === "failed" ? "bg-red-50" : ""}`}>
                  <td className="p-2 whitespace-nowrap">{fmtDate(r.sent_at)}</td>
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
                      <div><b>P.O. / reference:</b> {r.po || "-"} &nbsp; <b>Total size:</b> {(r.size_bytes / 1048576).toFixed(2)} MB &nbsp; <b>IP:</b> {r.ip || "-"}</div>
                      {r.error && <div className="text-red-700"><b>Error:</b> {r.error}</div>}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {!(data?.rows || []).length && <tr><td colSpan={10} className="p-6 text-center text-gray-500">No emails match the selected filters.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- TAT MASTER TAB ----
function TatMasterTab() {
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

function applyCardFilters(list, f, counted) {
  let r = list;
  const one = !f.showAll;
  if (f.topCard) {
    if (one) r = r.filter((x) => counted.has(x));
    if (f.topCard === "testing") r = r.filter((x) => (x.type || "") !== "Calibration");
    else if (f.topCard === "calibration") r = r.filter((x) => (x.type || "") === "Calibration");
    else if (f.topCard === "bis_dues") r = r.filter((x) => isDueRow(x) && isBisRow(x));
    else if (f.topCard === "general_dues") r = r.filter((x) => isDueRow(x) && !isBisRow(x));
  }
  if (f.kpi) {
    if (one && COUNTED_KPIS.includes(f.kpi)) r = r.filter((x) => counted.has(x));
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
      r = r.filter((x) => Number(x.lifecycle_no) === f.lcStage && (Number(x.overdue_days_22) > 0 || x.testing_status === "OVERDUE" || x.lifecycle_status === "Overdue"));
    } else {
      if (one) r = r.filter((x) => counted.has(x));
      r = r.filter((x) => Number(x.lifecycle_no) === f.lcStage);
    }
  }
  return r;
}

// ---- FILTER PANEL LOOK (matches the Signed Reports page: light theme-blue panel, dark uppercase headings, h-8 inputs, primary focus ring) ----
const F_LBL = "block text-[11px] font-bold uppercase tracking-wide text-gray-800 dark:text-gray-100 mb-1";
const F_INP = "h-8 rounded-lg border border-gray-300 bg-white px-2 text-xs text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 disabled:bg-gray-100 dark:bg-dark-900 dark:border-dark-600 dark:text-gray-100";
function FGroup({ title, children }) {
  return (
    <div className="rounded-lg border border-[#18457c]/15 bg-white dark:bg-dark-900/60 p-2.5 shadow-sm">
      <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#18457c] dark:text-blue-300 mb-2 pb-1 border-b border-[#18457c]/10">{title}</div>
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">{children}</div>
    </div>
  );
}

// ---- MASTER SEARCH + FLOW FILTERS (client side, on the rows already loaded) ----
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
];
const EMAIL_OPTIONS = [
  { id: "pending", label: "Email pending", test: (r) => r.email_status === "Pending" },
  { id: "sent", label: "Email sent", test: (r) => r.email_status === "Sent" },
  { id: "test", label: "Test email only", test: (r) => r.email_status === "Test only" },
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
    value: (r) => r.brn || r.inward_no || "",
    render: (r) => <span className="font-mono text-blue-700 font-semibold">{r.brn || r.inward_no || "-"}</span>,
    sort: (r) => r.brn || r.inward_no || "",
  },
  {
    key: "inward_no",
    label: "Inward No.",
    w: 110,
    value: (r) => r.inward_no || "",
    render: (r) => <span className="font-mono font-semibold text-gray-900">{r.inward_no || "-"}</span>,
    sort: (r) => r.inward_no || "",
  },
  {
    key: "customer",
    label: "Customer",
    w: 220,
    value: (r) => r.customer || "",
    render: (r) => <span className="block max-w-[220px] truncate font-medium text-gray-800" title={r.customer}>{r.customer}</span>,
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
export default function Mis22({ onClassic }) {
  const [from, setFrom] = useState(() => isoDate(new Date(Date.now() - 30 * 86400000)));
  const [to, setTo] = useState(() => isoDate(new Date()));
  const [type, setType] = useState("all");
  const [limit, setLimit] = useState(100); // DEFAULT 100 per user request
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

  const load = useCallback(async (limOverride, range) => {
    const lim = typeof limOverride === "number" ? limOverride : limit;
    setLoading(true);
    try {
      const res = await axios.get("/mis/tracker22", { params: { from: range?.from || from, to: range?.to || to, type, limit: lim }, timeout: 180000 });
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
  const canSeeGate = tier === "management" || tier === "reporting";
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
  const cols = useMemo(() => COLUMNS({ openDetail: (r) => setDetailRow(r), seeInvoice }), [seeInvoice]);

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
      set.add(pool.find((x) => x.lifecycle_status === "Overdue") || pool[0]);
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

  const rows = useMemo(() => {
    let list = applyCardFilters(hayRows, { topCard, kpi, lcStage, lcStatus, showAll }, counted).filter((r) => {
      if (department && r.department !== department) return false;
      if (chemist && r.allocated_to !== chemist) return false;
      if (customer && !String(r.customer || "").toLowerCase().includes(customer.toLowerCase())) return false;
      if (stage && r.stage !== stage) return false;
      if (cat === "urgent" && r.priority !== "Urgent") return false;
      if (cat === "gt3" && !(Number(r.overdue_days_22) > 3)) return false;
      if (cat === "ontrack" && (Number(r.overdue_days_22) > 0 || r.testing_status === "OVERDUE")) return false;
      if (fPri && r.priority !== fPri) return false;
      if (fFlow && !pickOpt(FLOW_OPTIONS, fFlow)?.test(r)) return false;
      if (fOver && !pickOpt(OVERDUE_OPTIONS, fOver)?.test(r)) return false;
      if (fEmail && !pickOpt(EMAIL_OPTIONS, fEmail)?.test(r)) return false;
      if (fWa && !pickOpt(WA_OPTIONS, fWa)?.test(r)) return false;
      if (fInv && !pickOpt(INVOICE_OPTIONS, fInv)?.test(r)) return false;
      if (masterTerms.length) {
        const h = r._hay;
        if (!masterTerms.every((t) => h.includes(t))) return false;
      }
      return true;
    });

    const active = Object.entries(colFilters).filter(([, v]) => v);
    if (active.length) {
      list = list.filter((r) => active.every(([k, v]) => {
        const c = cols.find((x) => x.key === k);
        return c && String(c.value(r, 0) ?? "").toLowerCase().includes(v.toLowerCase());
      }));
    }

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
  }, [hayRows, department, chemist, customer, stage, cat, colFilters, sort, cols, topCard, kpi, lcStage, lcStatus, showAll, counted, fPri, fFlow, fOver, fEmail, fWa, fInv, masterTerms]);

  const clearCards = () => { setTopCard(null); setKpi(null); setLcStage(null); setLcStatus(""); setShowAll(false); };
  const clearAll = () => { setDepartment(""); setChemist(""); setCustomer(""); setStage(""); setCat("all"); setMaster(""); setFFlow(""); setFOver(""); setFEmail(""); setFWa(""); setFInv(""); setFPri(""); setColFilters({}); setSort({ key: "booking_date", dir: "asc" }); clearCards(); };
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
    const headers = ["Sr. No.", "Booking Date", "LRN", "BRN", "Inward No.", "Customer", "Department", "Package", "Priority", "BD Person", "Current Status", "With / Since", "Report Due Date", "Overdue Days", "Allocated To", "Results Date", "Reviewed By", "Authorised By", "ULR No."];
    const aoa = [
      headers,
      ...rows.map((r, i) => [
        i + 1,
        fmtDate(r.booking_date),
        r.lrn || "",
        r.brn || r.inward_no || "",
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
                   scope.tier === "reporting" ? `Reporting & Dispatch View (${scope.user_name || "All Labs"})` :
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
            {onClassic && (
              <button
                type="button"
                onClick={onClassic}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 transition-all"
                title="Switch back to Classic view"
              >
                Classic View
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Unbooked Gate */}
        {tab === "gate" && <GateTab canSee={canSeeGate} />}

        {/* Tab 2: Email Log */}
        {tab === "mail" && <EmailLogTab />}

        {/* Tab 3: TAT Master */}
        {tab === "tat" && <TatMasterTab />}

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

            {/* FILTER PANEL (same design language as the Signed Reports page) */}
            <div className="rounded-xl border border-[#18457c]/20 bg-[#eef3fa] dark:bg-dark-800 p-3 space-y-3 shadow-sm">
              {/* MASTER SEARCH: any detail (inward no, LRN, BRN, customer, instrument / package, chemist, ULR, invoice, docket, e-mail address / subject / certificate no.) */}
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex-1 min-w-[260px]">
                  <span className={F_LBL}>Master Search <span className="normal-case font-medium text-gray-600">(any detail - several words: all must match)</span></span>
                  <span className="relative block">
                    <MagnifyingGlassIcon className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    <input
                      value={master}
                      onChange={(e) => setMaster(e.target.value)}
                      placeholder="Inward no, LRN, BRN, customer, package / instrument, chemist, ULR, invoice, docket, e-mail, certificate no..."
                      className="h-9 w-full rounded-lg border border-gray-300 bg-white pl-8 pr-3 text-xs text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 dark:bg-dark-900 dark:border-dark-600 dark:text-gray-100"
                    />
                  </span>
                </label>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    const t = isoDate(new Date());
                    const f = isoDate(new Date(Date.now() - 399 * 86400000));
                    setFrom(f); setTo(t); setLimit(10000);
                    load(10000, { from: f, to: t });
                  }}
                  className="h-9 px-3 rounded-lg border border-[#18457c] bg-white text-[#18457c] text-xs font-bold hover:bg-blue-50 shadow-sm"
                  title="Reload the last 13 months with the maximum Rows so the master search can find older samples"
                >
                  Search all dates
                </button>
              </div>
              <div className="text-[11px] text-gray-600 -mt-1">Master Search and the filters below work on the rows loaded for the From / To dates and Rows value; use &quot;Search all dates&quot; to look at the last 13 months.</div>

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
                    <select value={type} onChange={(e) => setType(e.target.value)} disabled={isCalibOnly} className={`${F_INP} font-medium`}>
                      {!isCalibOnly && <option value="all">All</option>}
                      {!isCalibOnly && <option value="testing">Testing</option>}
                      <option value="calibration">Calibration</option>
                    </select>
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
                      <option value="100">100 (Default)</option>
                      <option value="500">500</option>
                      <option value="1000">1000</option>
                      <option value="5000">5000</option>
                      <option value="10000">10000</option>
                    </select>
                  </label>
                </FGroup>

                <FGroup title="Lab, People & Stage">
                  <label>
                    <span className={F_LBL}>Lab / Department</span>
                    <select value={department} onChange={(e) => setDepartment(e.target.value)} disabled={departments.length <= 1} className={`${F_INP} font-medium`}>
                      <option value="">All departments</option>
                      {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className={F_LBL}>Chemist / Engineer</span>
                    <select value={chemist} onChange={(e) => setChemist(e.target.value)} className={F_INP}>
                      <option value="">All engineers/chemists</option>
                      {chemists.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className={F_LBL}>Customer</span>
                    <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer name" className={`${F_INP} w-44`} />
                  </label>
                  <label>
                    <span className={F_LBL}>Stage</span>
                    <select value={stage} onChange={(e) => setStage(e.target.value)} className={F_INP}>
                      <option value="">All stages</option>
                      {stages.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
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
                    <select value={f.v} onChange={(e) => f.set(e.target.value)} className={`${F_INP} ${f.v ? "border-[#18457c] ring-1 ring-[#18457c]/30 font-semibold" : ""}`}>
                      <option value="">{f.all}</option>
                      {f.opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </label>
                ))}
                <label>
                  <span className={F_LBL}>Priority</span>
                  <select value={fPri} onChange={(e) => setFPri(e.target.value)} className={`${F_INP} ${fPri ? "border-[#18457c] ring-1 ring-[#18457c]/30 font-semibold" : ""}`}>
                    <option value="">All priorities</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Normal">Normal</option>
                  </select>
                </label>
              </FGroup>

              {/* Actions + quick view */}
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => load()} disabled={loading} className="h-8 px-4 rounded-lg bg-[#18457c] text-white text-xs font-bold shadow-sm hover:bg-[#133763]">
                  {loading ? "Loading..." : "Filter"}
                </button>
                <button type="button" onClick={clearAll} className="h-8 px-3 rounded-lg border border-gray-300 bg-white text-xs font-bold text-gray-800 hover:bg-gray-50 shadow-sm">
                  Clear All
                </button>
                <button type="button" onClick={exportExcel} disabled={!rows.length} className="h-8 px-3 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-sm hover:bg-emerald-700 flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  Export Excel (.xlsx)
                </button>
                <span className="mx-1 h-5 border-l border-[#18457c]/20" />
                <span className="text-[11px] text-gray-800 font-bold uppercase tracking-wide">Quick View:</span>
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
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                      cat === p.id ? "bg-[#18457c] border-[#18457c] text-white shadow-sm" : "bg-white border-gray-300 text-gray-700 hover:bg-blue-50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
                <span className="ml-auto text-xs font-bold text-[#18457c] bg-white border border-[#18457c]/20 rounded-full px-3 py-1">
                  {rows.length} of {allRows.length} rows displayed
                </span>
              </div>
            </div>

            {/* Truncated notice */}
            {data?.truncated && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center justify-between">
                <span>Showing first {limit} rows only &mdash; choose a larger Rows value (500, 1000, 5000) or narrow date range to view all.</span>
              </div>
            )}

            {/* SIMPLIFIED MAIN TABLE (8 COLUMNS ONLY, NO EXPANDER ROWS) */}
            <div id="mis-table" className="overflow-auto border rounded-xl max-h-[70vh] shadow-sm bg-white dark:bg-dark-800">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-gray-200 dark:bg-dark-800 shadow-sm">
                  {/* Column Header Titles with Sort click */}
                  <tr>
                    {cols.map((c) => (
                      <th
                        key={c.key}
                        style={{ minWidth: c.w }}
                        onClick={() => {
                          if (c.key === "action") return;
                          setSort((s) => ({ key: c.key, dir: s.key === c.key && s.dir === "asc" ? "desc" : "asc" }));
                        }}
                        className={`px-3 py-2 text-left text-[11px] font-semibold uppercase text-gray-800 dark:text-dark-100 whitespace-nowrap border-b border-gray-300 select-none ${c.key !== "action" ? "cursor-pointer hover:bg-gray-300/70" : ""}`}
                      >
                        <div className="flex items-center gap-1">
                          <span>{c.label}</span>
                          {sort.key === c.key && (
                            <span className="text-blue-700 font-bold">{sort.dir === "asc" ? " \u25B2" : " \u25BC"}</span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                  {/* Column Search Filters */}
                  <tr>
                    {cols.map((c) => (
                      <th key={c.key} className="px-2 py-1.5 border-b border-t border-gray-300 bg-gray-50 dark:bg-dark-800/50">
                        {c.key !== "action" ? (
                          <div className="relative">
                            <input
                              value={colFilters[c.key] || ""}
                              onChange={(e) => setColFilters((f) => ({ ...f, [c.key]: e.target.value }))}
                              placeholder="Search..."
                              className="w-full h-7 rounded-lg border border-gray-300 bg-white px-2 py-1 text-[10px] font-normal normal-case pr-5 focus:outline-none focus:ring-1 focus:ring-primary-500/40 dark:bg-dark-900 dark:border-dark-700"
                            />
                            {colFilters[c.key] ? (
                              <button
                                type="button"
                                onClick={() => setColFilters((f) => ({ ...f, [c.key]: "" }))}
                                className="absolute right-1.5 top-1 text-gray-400 hover:text-red-600 font-bold leading-none"
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
                      <td colSpan={cols.length} className="p-8 text-center text-gray-500">
                        No samples match the selected filters.
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
              />
            )}
          </>
        )}
      </div>
    </Page>
  );
}
