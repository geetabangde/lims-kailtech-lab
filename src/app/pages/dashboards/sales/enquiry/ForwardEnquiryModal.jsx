import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "utils/axios";
import { toast } from "sonner";
import ModalShell, { fieldCls, btnGhost, btnPrimary } from "../shared/ModalShell";

// Forward an enquiry to another person (updates "Assigned BD / Staff").
// The list of people comes from the server (/enquiry-lifecycle/forward-options) so new people are added in one place.
export default function ForwardEnquiryModal({ show, enquiry, onClose, onDone }) {
  const [people, setPeople] = useState([]);
  const [to, setTo] = useState("");
  const [remark, setRemark] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!show) return;
    setTo("");
    setRemark("");
    axios
      .get("/enquiry-lifecycle/forward-options")
      .then((res) => setPeople(res.data?.data || []))
      .catch(() => toast.error("Could not load the list of people"));
  }, [show]);

  const submit = async () => {
    if (!to) return toast.error("Please select who to forward to");
    setBusy(true);
    try {
      const res = await axios.post("/enquiry-lifecycle/forward", {
        enquiry_id: enquiry.id,
        forward_to: Number(to),
        remark: remark.trim(),
      });
      toast.success(res.data?.message || "Enquiry forwarded");
      onDone?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to forward enquiry");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      show={show}
      onClose={onClose}
      title="Forward Enquiry"
      subtitle={enquiry ? `Enquiry #${enquiry.id} - ${enquiry.name || ""}` : ""}
      footer={
        <>
          <button type="button" className={btnGhost} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={btnPrimary} onClick={submit} disabled={busy}>
            {busy ? "Forwarding..." : "Forward"}
          </button>
        </>
      }
    >
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Currently assigned to: <b>{enquiry?.assigntoname || "-"}</b>
      </p>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Forward To <span className="text-red-500">*</span>
        </label>
        <select className={fieldCls} value={to} onChange={(e) => setTo(e.target.value)}>
          <option value="">Select person...</option>
          {people
            .filter((p) => String(p.id) !== String(enquiry?.assignto))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Remark (optional)</label>
        <textarea
          className={fieldCls}
          rows={2}
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="Anything the person should know"
        />
      </div>
    </ModalShell>
  );
}
ForwardEnquiryModal.propTypes = {
  show: PropTypes.bool,
  enquiry: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onDone: PropTypes.func,
};
