// "Mark as Sent (offline)" button + window for any list row (reports handed over by hand / courier outside the LIMS; logged, MIS shows them as sent).
//   <MarkSentButton kind="testing" trfId={row.original.trf} preselectIds={[row.original.id]} />
//   <MarkSentButton kind="calibration" inwardId={row.original.id} />
// Renders nothing for people outside the allowed list (see utils/dispatchAccess.js canMarkSentOffline); the server enforces the same rule.
import { useState } from "react";
import PropTypes from "prop-types";
import MarkSentModal from "app/pages/dashboards/calibration-process/inward-entry-lab/MarkSentModal";
import { canMarkSentOffline } from "utils/dispatchAccess";

export function MarkSentButton({ kind, inwardId, trfId, preselectIds, className }) {
  const [open, setOpen] = useState(false);
  if (!canMarkSentOffline() || (kind === "testing" ? !trfId : !inwardId)) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className || "rounded-md border border-emerald-400 !bg-emerald-200 px-2 py-1 text-center text-[10.5px] whitespace-nowrap font-bold !text-black shadow hover:!bg-emerald-300"}
      >
        Mark as Sent (offline)
      </button>
      <MarkSentModal isOpen={open} onClose={() => setOpen(false)} kind={kind} inwardId={inwardId} trfId={trfId} preselectIds={preselectIds} />
    </>
  );
}

MarkSentButton.propTypes = {
  kind: PropTypes.oneOf(["testing", "calibration"]).isRequired,
  inwardId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  trfId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  preselectIds: PropTypes.array,
  className: PropTypes.string,
};
