import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "utils/axios";
import { toast } from "sonner";
import ModalShell, { fieldCls, btnGhost, btnDanger } from "../shared/ModalShell";
import { LOSS_REASONS } from "./enquiryOptions";

// Mark an enquiry as Lost: a reason and a remark are mandatory (they go to the management Rejection Log)
export default function LostEnquiryModal({ show, enquiry, onClose, onDone }) {
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
      await axios.post("/enquiry-lifecycle/set-status", {
        enquiry_id: enquiry.id,
        lab_status: "Lost",
        reason_category: category,
        remark: remark.trim(),
      });
      toast.success("Enquiry marked as Lost");
      onDone?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not mark the enquiry as Lost");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      show={show}
      onClose={onClose}
      title="Mark Enquiry as Lost"
      subtitle={enquiry ? `Enquiry #${enquiry.id} - ${enquiry.name || ""}` : ""}
      footer={
        <>
          <button type="button" className={btnGhost} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={btnDanger} onClick={submit} disabled={busy}>
            {busy ? "Saving..." : "Mark as Lost"}
          </button>
        </>
      }
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Why was it lost? <span className="text-red-500">*</span>
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
          placeholder="Details: which competitor, price asked, what the customer said..."
        />
      </div>
    </ModalShell>
  );
}
LostEnquiryModal.propTypes = {
  show: PropTypes.bool,
  enquiry: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onDone: PropTypes.func,
};
