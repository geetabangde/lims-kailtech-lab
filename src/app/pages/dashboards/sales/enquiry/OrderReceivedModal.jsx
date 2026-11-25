import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "utils/axios";
import { toast } from "sonner";
import ModalShell, { fieldCls, btnGhost, btnGreen } from "../shared/ModalShell";
import PoFields, { emptyPo } from "../shared/PoFields";

// "Order Received" straight from the enquiry list (for enquiries that have no quotation yet).
// All fields are optional so the order is never blocked; the PO details are kept with the enquiry.
export default function OrderReceivedModal({ show, enquiry, onClose, onDone }) {
  const [po, setPo] = useState(emptyPo);
  const [remark, setRemark] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (show) {
      setPo(emptyPo);
      setRemark("");
    }
  }, [show]);

  const save = async () => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("enquiry_id", enquiry.id);
      if (po.po_number) fd.append("po_number", po.po_number);
      if (po.po_date) fd.append("po_date", po.po_date);
      if (po.po_value) fd.append("po_value", po.po_value);
      if (po.file) fd.append("document", po.file);
      if (remark.trim()) fd.append("remark", remark.trim());
      await axios.post("/enquiry-lifecycle/order-received", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Order marked as received");
      onDone?.();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not mark the order as received");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      show={show}
      onClose={onClose}
      title="Order Received"
      subtitle={enquiry?.name}
      footer={
        <>
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={btnGreen} onClick={save} disabled={busy}>
            {busy ? "Saving..." : "Mark Order Received"}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600 dark:text-gray-400">
        The customer has placed the order. Add the purchase order details if you have them.
      </p>
      <PoFields po={po} setPo={setPo} />
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Remark (optional)</label>
        <textarea rows={3} className={fieldCls} value={remark} onChange={(e) => setRemark(e.target.value)} />
      </div>
    </ModalShell>
  );
}

OrderReceivedModal.propTypes = {
  show: PropTypes.bool,
  enquiry: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onDone: PropTypes.func,
};
