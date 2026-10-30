// "Send Reports & Invoice" email dispatch button + window for any list row.
//   <DispatchEmailButton inwardId={row.original.inwardid} />   -> calibration batch (one inward)
//   <DispatchEmailButton trfId={row.original.trf} />           -> testing batch (all final reports of one TRF)
// Renders nothing for people outside the management list (see utils/dispatchAccess.js); the server enforces the same rule.
import { useState } from "react";
import PropTypes from "prop-types";
import SendBatchDispatchModal from "app/pages/dashboards/calibration-process/inward-entry-lab/SendBatchDispatchModal";
import { canSendDispatchEmail, canSendTestingDispatchEmail } from "utils/dispatchAccess";

export function DispatchEmailButton({ inwardId, trfId, className }) {
  const [open, setOpen] = useState(false);
  const allowed = canSendDispatchEmail() || (!inwardId && !!trfId && canSendTestingDispatchEmail());
  if (!allowed || (!inwardId && !trfId)) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className || "rounded-md bg-blue-600 px-2 py-1 text-center text-[10.5px] whitespace-nowrap font-semibold text-white shadow hover:bg-blue-700"}
      >
        📧 Send Reports &amp; Invoice
      </button>
      <SendBatchDispatchModal isOpen={open} onClose={() => setOpen(false)} inwardId={inwardId} trfId={trfId} />
    </>
  );
}

DispatchEmailButton.propTypes = {
  inwardId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  trfId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  className: PropTypes.string,
};
