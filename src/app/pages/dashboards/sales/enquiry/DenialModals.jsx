import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "utils/axios";
import { toast } from "sonner";
import ModalShell, { fieldCls, btnGhost, btnPrimary, btnDanger, btnGreen } from "../shared/ModalShell";
import { techVerify, logDenial } from "../shared/lifecycleApi";
import { LOSS_REASONS, TECH_REJECT_REASONS } from "./enquiryOptions";

// ── Technical verification (request / approve / reject / reopen) ─────────────────────
// mode: "decide" (Approve or Reject), "request", "reopen"
export function TechVerifyModal({ show, mode, enquiry, onClose, onDone }) {
  const [remark, setRemark] = useState("");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (show) {
      setRemark("");
      setCategory("");
    }
  }, [show]);

  const send = async (action) => {
    if ((action === "reject" || action === "reopen") && !remark.trim()) {
      toast.error("Please enter a remark");
      return;
    }
    if (action === "reject" && !category) {
      toast.error("Please select a reason");
      return;
    }
    setBusy(true);
    try {
      await techVerify({ enquiry_id: enquiry.id, action, remark, reason_category: category });
      toast.success(
        action === "approve"
          ? "Technical feasibility approved"
          : action === "reject"
            ? "Rejected and logged"
            : action === "reopen"
              ? "Re-opened for verification"
              : "Sent for technical verification",
      );
      onDone?.();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not update technical verification");
    } finally {
      setBusy(false);
    }
  };

  const title =
    mode === "request"
      ? "Request Technical Verification"
      : mode === "reopen"
        ? "Re-open Technical Verification"
        : "Technical Verification";

  return (
    <ModalShell
      show={show}
      onClose={onClose}
      title={title}
      subtitle={enquiry ? `Enquiry #${enquiry.id} - ${enquiry.name || ""}` : ""}
      footer={
        <>
          <button type="button" className={btnGhost} onClick={onClose} disabled={busy}>
            Close
          </button>
          {mode === "request" && (
            <button type="button" className={btnPrimary} disabled={busy} onClick={() => send("request")}>
              Send for Verification
            </button>
          )}
          {mode === "reopen" && (
            <button type="button" className={btnPrimary} disabled={busy} onClick={() => send("reopen")}>
              Re-open
            </button>
          )}
          {mode === "decide" && (
            <>
              <button type="button" className={btnDanger} disabled={busy} onClick={() => send("reject")}>
                Reject
              </button>
              <button type="button" className={btnGreen} disabled={busy} onClick={() => send("approve")}>
                Approve
              </button>
            </>
          )}
        </>
      }
    >
      {mode === "decide" && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Reason (needed only if rejecting)
          </label>
          <select className={fieldCls} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Select reason...</option>
            {TECH_REJECT_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Remark{" "}
          {(mode === "reopen" || mode === "decide") && (
            <span className="text-gray-400">(mandatory for reject / re-open)</span>
          )}
        </label>
        <textarea
          className={fieldCls}
          rows={3}
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="Scope, CMC range, master availability, test method..."
        />
      </div>
      {mode === "decide" && enquiry?.tech_verification_remark && (
        <p className="rounded-lg bg-gray-50 p-2 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          Earlier note: {enquiry.tech_verification_remark}
        </p>
      )}
    </ModalShell>
  );
}
TechVerifyModal.propTypes = {
  show: PropTypes.bool,
  mode: PropTypes.string,
  enquiry: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onDone: PropTypes.func,
};

// ── Regretted enquiry: structured reason + remark, logged for management ─────────────
export function RegretEnquiryModal({ show, enquiry, onClose, onDone }) {
  const [category, setCategory] = useState("");
  const [remark, setRemark] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (show) {
      setCategory("");
      setRemark("");
    }
  }, [show]);

  const submit = async () => {
    if (!category) return toast.error("Please select the reason");
    if (!remark.trim()) return toast.error("Please enter a remark");
    setBusy(true);
    try {
      // Existing endpoint (unchanged): closes the enquiry. loss_reason is the new optional column.
      await axios.post("/sales/regenrate-enquiry", { id: enquiry.id, status: 91, loss_reason: category });
      await logDenial({ event_type: "Enquiry Regretted", enquiry_id: enquiry.id, reason_category: category, remark });
      toast.success("Enquiry marked as Regretted and logged");
      onDone?.();
      onClose();
    } catch {
      toast.error("Failed to regret enquiry");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      show={show}
      onClose={onClose}
      title="Regret Enquiry"
      subtitle={enquiry ? `Enquiry #${enquiry.id} - ${enquiry.name || ""}` : ""}
      footer={
        <>
          <button type="button" className={btnGhost} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={btnDanger} onClick={submit} disabled={busy}>
            {busy ? "Saving..." : "Regret Enquiry"}
          </button>
        </>
      }
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Reason <span className="text-red-500">*</span>
        </label>
        <select className={fieldCls} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Select reason...</option>
          {LOSS_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Remark <span className="text-red-500">*</span>
        </label>
        <textarea
          className={fieldCls}
          rows={3}
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="Why is this enquiry being regretted?"
        />
      </div>
    </ModalShell>
  );
}
RegretEnquiryModal.propTypes = {
  show: PropTypes.bool,
  enquiry: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onDone: PropTypes.func,
};
