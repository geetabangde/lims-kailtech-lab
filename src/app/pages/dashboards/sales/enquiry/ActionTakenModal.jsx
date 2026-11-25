import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "utils/axios";
import { toast } from "sonner";
import ModalShell, { fieldCls, btnGhost, btnPrimary } from "../shared/ModalShell";

// "Details of Action Taken" - moved here from the Add Enquiry form (2026-11-25)
export default function ActionTakenModal({ show, enquiry, onClose, onDone }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (show) setText(enquiry?.action && enquiry.action !== "null" ? String(enquiry.action) : "");
  }, [show, enquiry]);

  const save = async () => {
    if (!text.trim()) {
      toast.error("Please enter the action taken");
      return;
    }
    setBusy(true);
    try {
      await axios.post("/enquiry-lifecycle/action-taken", { enquiry_id: enquiry.id, action: text });
      toast.success("Action taken saved");
      onDone?.();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not save the action taken");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      show={show}
      onClose={onClose}
      title="Details of the Action Taken"
      subtitle={enquiry?.name}
      footer={
        <>
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={btnPrimary} onClick={save} disabled={busy}>
            {busy ? "Saving..." : "Save"}
          </button>
        </>
      }
    >
      <textarea
        rows={4}
        className={fieldCls}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What action was taken on this enquiry?"
      />
    </ModalShell>
  );
}

ActionTakenModal.propTypes = {
  show: PropTypes.bool,
  enquiry: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onDone: PropTypes.func,
};
