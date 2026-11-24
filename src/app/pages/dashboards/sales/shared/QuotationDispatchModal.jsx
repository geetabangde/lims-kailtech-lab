import { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import { toast } from "sonner";
import ModalShell, { fieldCls, btnGhost, btnPrimary } from "./ModalShell";
import { saveDispatch, getDispatches } from "./lifecycleApi";

const CHANNELS = ["Email", "WhatsApp", "Hand", "Courier", "Other"];

// Logs HOW and WHEN a quotation was dispatched, and shows the dispatch history of that quotation.
// type: "calibration" | "testing"
export default function QuotationDispatchModal({ show, id, type, onClose }) {
  const [channel, setChannel] = useState("Email");
  const [recipient, setRecipient] = useState("");
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
      setRecipient("");
      setDocket("");
      setRemark("");
      load();
    }
  }, [show, load]);

  const submit = async () => {
    if (!channel) return toast.error("Please select the channel");
    if ((channel === "Courier" || channel === "Hand") && !recipient.trim() && !docket.trim()) {
      return toast.error("Enter the received-by / docket details");
    }
    setBusy(true);
    try {
      await saveDispatch({
        quotation_id: id,
        quotation_type: type,
        channel,
        recipient,
        docket_no: docket,
        remark,
      });
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
      title="Log Quotation Dispatch"
      subtitle={`Quotation #${id}`}
      footer={
        <>
          <button type="button" className={btnGhost} onClick={onClose} disabled={busy}>
            Close
          </button>
          <button type="button" className={btnPrimary} onClick={submit} disabled={busy}>
            {busy ? "Saving..." : "Log Dispatch"}
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

      {history.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">Dispatch history</p>
          <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
            {history.map((h) => (
              <li key={h.id} className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                <span className="font-semibold">{h.channel}</span> · {dayjs(h.sent_on).format("DD-MM-YYYY hh:mm A")} ·{" "}
                {h.by_name || "-"}
                {h.recipient ? ` · ${h.recipient}` : ""}
                {h.docket_no ? ` · Docket ${h.docket_no}` : ""}
                {h.remark ? ` · ${h.remark}` : ""}
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
};
