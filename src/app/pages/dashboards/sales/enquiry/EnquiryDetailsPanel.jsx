// Import Dependencies
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import axios from "utils/axios";

// Local Imports
import { whatsappLink, effectiveStatus, sinceText, valueText } from "./enquiryOptions";

// ----------------------------------------------------------------------

const dash = (v) => (v === null || v === undefined || v === "" || v === "null" || String(v).startsWith("0000") ? "-" : String(v));
// The list API sends some dates as dd/mm/yyyy (read as day/month/year), others as ISO date-times
const toDay = (v) => {
  if (!v) return null;
  const s = String(v);
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return Number(m[3]) < 2000 ? null : dayjs(`${m[3]}-${m[2]}-${m[1]}`);
  if (s.startsWith("0000") || s.startsWith("-")) return null;
  const d = dayjs(s);
  return d.isValid() ? d : null;
};
const fmtDate = (v) => (toDay(v) ? toDay(v).format("DD-MM-YYYY") : "-");
const fmtDateTime = (v) => (toDay(v) ? toDay(v).format("DD-MM-YYYY hh:mm A") : "-");

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
      <dt className="w-40 shrink-0 text-sm font-bold text-gray-800 dark:text-dark-100">{label}</dt>
      <dd className="min-w-0 flex-1 whitespace-normal text-sm text-gray-600 [overflow-wrap:anywhere] dark:text-dark-300">{children}</dd>
    </div>
  );
}
Field.propTypes = { label: PropTypes.string, children: PropTypes.node };

// Everything that is no longer a column of the list: shown when the Details "+" of a row is opened.
export default function EnquiryDetailsPanel({ row }) {
  const e = row.original;
  const [info, setInfo] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    axios
      .get("/enquiry-lifecycle/enquiry-details", { params: { enquiry_id: e.id } })
      .then((res) => live && setInfo(res.data))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [e.id]);

  const wa = whatsappLink(e.whatsapp_number || e.concernpersonmobile, e.concernpersonname);
  const forwards = info?.forwards || [];
  const history = (info?.history || []).filter((h) => h.event_type !== "Enquiry Forwarded");
  const lastForward = forwards.length ? forwards[forwards.length - 1] : null;

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-3 whitespace-normal break-words p-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <dl className="min-w-0 space-y-2">
        <Field label="Status">
          {effectiveStatus(e)} <span className="text-gray-400">{sinceText(e)}</span>
        </Field>
        <Field label="BD (created by)">{dash(info?.created_by || e.addedbyname)}</Field>
        <Field label="Assigned to">{dash(info?.assigned_to || e.assigntoname)}</Field>
        <Field label="Forwarded to">
          {lastForward ? (
            <span>
              <b>{String(lastForward.reason_category || "").replace(/^Forwarded:\s*/, "")}</b>
              <span className="text-gray-400"> by {dash(lastForward.by_name)} on {fmtDateTime(lastForward.created_at)}</span>
            </span>
          ) : failed ? (
            "-"
          ) : info ? (
            "Not forwarded"
          ) : (
            "Loading..."
          )}
        </Field>
        {forwards.length > 1 && (
          <Field label="All forwards">
            <ul className="list-disc pl-4">
              {forwards.map((f, i) => (
                <li key={i}>
                  {String(f.reason_category || "").replace(/^Forwarded:\s*/, "")} - {dash(f.by_name)}, {fmtDateTime(f.created_at)}
                  {f.remark ? ` (${f.remark})` : ""}
                </li>
              ))}
            </ul>
          </Field>
        )}
        <Field label="Customer">{dash(e.name)}</Field>
        <Field label="Address on the enquiry">{dash(e.address)}</Field>
        <Field label="Contact person">
          {dash(e.concernpersonname)}
          {e.concernpersondesignation ? `, ${e.concernpersondesignation}` : ""}
          {e.concernpersonemail ? ` | ${e.concernpersonemail}` : ""}
          {e.concernpersonmobile ? ` | ${e.concernpersonmobile}` : ""}
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-emerald-700">
              WhatsApp
            </a>
          )}
        </Field>
        <Field label="Lead source">{dash(e.lead_source)}</Field>
        <Field label="Area">{dash(e.area)}</Field>
      </dl>

      <dl className="min-w-0 space-y-2">
        <Field label="Technical verification">
          {dash(e.tech_verification_status)}
          {e.tech_verification_remark ? ` - ${e.tech_verification_remark}` : ""}
        </Field>
        <Field label="Action taken">{dash(e.action)}</Field>
        <Field label="Enquiry value">{valueText(e)}</Field>
        <Field label="Approx quantity">{dash(e.approxqty)}</Field>
        <Field label="Payment status">{dash(e.payment_status)}</Field>
        <Field label="Sample arrived">{dash(e.sample_arrived)}</Field>
        <Field label="Next calling date">{fmtDate(e.nextconactdate)}</Field>
        <Field label="Expected date of Closing order">{fmtDate(e.expecteddateforfinalization)}</Field>
        <Field label="Enquiry received by">{dash(e.enquirybyname)}</Field>
        {e.loss_reason ? <Field label="Reason (lost / regretted)">{dash(e.loss_reason)}</Field> : null}
        {history.length > 0 && (
          <Field label="Status history">
            <ul className="list-disc pl-4">
              {history.map((h, i) => (
                <li key={i}>
                  {h.event_type === "Status Changed" ? String(h.reason_category || "").replace(/^Status:\s*/, "") : h.event_type}
                  {h.event_type === "Enquiry Lost" || h.event_type === "Enquiry Regretted" ? ` - ${dash(h.reason_category)}` : ""}
                  {" - "}
                  {dash(h.by_name)}, {fmtDateTime(h.created_at)}
                  {h.remark ? ` (${h.remark})` : ""}
                </li>
              ))}
            </ul>
          </Field>
        )}
      </dl>
    </div>
  );
}

EnquiryDetailsPanel.propTypes = { row: PropTypes.object.isRequired };
