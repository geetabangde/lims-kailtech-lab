import { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import { toast } from "sonner";
import axios from "utils/axios";
import ModalShell, { fieldCls, btnGhost, btnPrimary } from "./ModalShell";
import { saveDispatch, getDispatches } from "./lifecycleApi";

const CHANNELS = ["Email", "WhatsApp", "Hand", "Courier", "Other"];

const defaultMessage = (customerName, quotationNo) =>
  `Dear ${customerName || "Sir/Madam"},\n\nGreetings from Kailtech.\n\nPlease find attached our quotation ${quotationNo || ""} as discussed. ` +
  `Kindly review it and let us know if you need any clarification.\n\nWe look forward to your confirmation.\n\nRegards,\nKailtech Test & Research Centre`;

// Sends the quotation by e-mail (real send) or records how/when it was dispatched (WhatsApp / Hand / Courier / Other),
// and shows the dispatch history. type: "calibration" | "testing"
export default function QuotationDispatchModal({ show, id, type, onClose, defaultEmail, quotationNo, customerName }) {
  const [channel, setChannel] = useState("Email");
  const [sendNow, setSendNow] = useState(true);
  const [recipient, setRecipient] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState([]);
  const [confirmSend, setConfirmSend] = useState(false);
  const [docket, setDocket] = useState("");
  const [remark, setRemark] = useState("");
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getDispatches({ quotation_id: id, quotation_type: type });
      setHistory(res.data?.data || []);
    } catch {
      setHistory([]);
    }
  }, [id, type]);

  useEffect(() => {
    if (show) {
      setChannel("Email");
      setSendNow(true);
      setRecipient(defaultEmail && defaultEmail !== "-" ? String(defaultEmail) : "");
      setCc("");
      setSubject(`Quotation ${quotationNo || ""} - Kailtech`.replace("  ", " "));
      setMessage(defaultMessage(customerName, quotationNo));
      setFiles([]);
      setConfirmSend(false);
      setDocket("");
      setRemark("");
      load();
    }
  }, [show, load, defaultEmail, quotationNo, customerName]);

  const emailMode = channel === "Email" && sendNow;

  const submit = async () => {
    if (emailMode) {
      if (!recipient.trim()) return toast.error("Enter the recipient e-mail");
      if (!message.trim()) return toast.error("Message cannot be empty");
      if (!confirmSend) return toast.error("Please tick the confirmation to send the e-mail");
      setBusy(true);
      try {
        const fd = new FormData();
        fd.append("quotation_id", id);
        fd.append("quotation_type", type);
        fd.append("to", recipient);
        fd.append("cc", cc);
        fd.append("subject", subject);
        fd.append("message", message);
        files.forEach((f) => fd.append("attachments[]", f));
        const res = await axios.post("/enquiry-lifecycle/dispatch-email", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success(res.data?.message || "Email sent");
        setFiles([]);
        setConfirmSend(false);
        load();
      } catch (e) {
        toast.error(e?.response?.data?.message || "Email could not be sent");
        load();
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!channel) return toast.error("Please select the channel");
    if ((channel === "Courier" || channel === "Hand") && !recipient.trim() && !docket.trim()) {
      return toast.error("Enter the received-by / docket details");
    }
    setBusy(true);
    try {
      await saveDispatch({ quotation_id: id, quotation_type: type, channel, recipient, docket_no: docket, remark });
      toast.success("Dispatch logged");
      setRecipient("");
      setDocket("");
      setRemark("");
      load();
    } catch {
      toast.error("Failed to log dispatch");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      show={show}
      onClose={onClose}
      title="Send / Log Quotation Dispatch"
      subtitle={`Quotation ${quotationNo || "#" + id}`}
      footer={
        <>
          <button type="button" className={btnGhost} onClick={onClose} disabled={busy}>
            Close
          </button>
          <button type="button" className={btnPrimary} onClick={submit} disabled={busy}>
            {busy ? "Please wait..." : emailMode ? "Send Email Now" : "Log Dispatch"}
          </button>
        </>
      }
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Sent through <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChannel(c)}
              className={
                "rounded-full border px-3 py-1 text-xs font-semibold " +
                (channel === c
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200")
              }
            >
              {c === "Hand" ? "Hand delivery" : c}
            </button>
          ))}
        </div>
      </div>

      {channel === "Email" && (
        <div className="flex gap-4 text-sm text-gray-700 dark:text-gray-300">
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={sendNow} onChange={() => setSendNow(true)} /> Send e-mail from here
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={!sendNow} onChange={() => setSendNow(false)} /> Only record (already sent)
          </label>
        </div>
      )}

      {emailMode ? (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">To <span className="text-red-500">*</span></label>
            <input className={fieldCls} value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="client@company.com (separate several with commas)" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">CC</label>
            <input className={fieldCls} value={cc} onChange={(e) => setCc(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
            <input className={fieldCls} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Message <span className="text-red-500">*</span></label>
            <textarea className={fieldCls} rows={7} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Attach quotation PDF (max 3 files, 10 MB each)
            </label>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              className="block w-full text-xs text-gray-600"
              onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 3))}
            />
            <p className="mt-1 text-xs text-gray-500">
              Open the quotation (View), save it as PDF, then attach it here. A copy of every e-mail also goes to the internal audit mailbox.
            </p>
          </div>
          <label className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            <input type="checkbox" checked={confirmSend} onChange={(e) => setConfirmSend(e.target.checked)} className="mt-0.5" />
            <span>I confirm this e-mail will be sent to the client immediately.</span>
          </label>
        </>
      ) : (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {channel === "Email" ? "Sent to (email)" : channel === "WhatsApp" ? "Sent to (mobile)" : "Received by / person"}
            </label>
            <input className={fieldCls} value={recipient} onChange={(e) => setRecipient(e.target.value)} />
          </div>
          {(channel === "Courier" || channel === "Hand") && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Docket / reference no.</label>
              <input className={fieldCls} value={docket} onChange={(e) => setDocket(e.target.value)} />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Remark</label>
            <textarea className={fieldCls} rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} />
          </div>
          <p className="text-xs text-gray-500">The date and time are recorded automatically.</p>
        </>
      )}

      {history.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">Dispatch history</p>
          <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
            {history.map((h) => (
              <li key={h.id} className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                <span className="font-semibold">{h.channel}</span>
                {h.email_status && (
                  <span
                    className={
                      "ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase " +
                      (h.email_status === "sent"
                        ? "bg-emerald-100 text-emerald-700"
                        : h.email_status === "failed"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-200 text-gray-600")
                    }
                  >
                    {h.email_status}
                  </span>
                )}{" "}
                · {dayjs(h.sent_on).format("DD-MM-YYYY hh:mm A")} · {h.by_name || "-"}
                {h.recipient ? ` · ${h.recipient}` : ""}
                {h.subject ? ` · "${h.subject}"` : ""}
                {h.attachments ? ` · Attached: ${h.attachments}` : ""}
                {h.docket_no ? ` · Docket ${h.docket_no}` : ""}
                {h.remark ? ` · ${h.remark}` : ""}
                {h.error_details ? ` · Error: ${h.error_details}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </ModalShell>
  );
}
QuotationDispatchModal.propTypes = {
  show: PropTypes.bool,
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  type: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  defaultEmail: PropTypes.string,
  quotationNo: PropTypes.string,
  customerName: PropTypes.string,
};
