import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import ModalShell, { btnGhost } from "./ModalShell";
import axios from "utils/axios";
import { JWT_HOST_API } from "configs/auth.config";

// Shows the Purchase Order(s) saved for a won quotation, with a link to the uploaded document.
export const poDocUrl = (path) => (path ? `${JWT_HOST_API.replace(/\/api\/?$/, "")}/storage/${path}` : null);

export default function PoDetailsModal({ show, id, type, onClose }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    if (!show) return;
    setRows(null);
    axios
      .get("/enquiry-lifecycle/po-list", { params: { quotation_id: id, quotation_type: type } })
      .then((res) => setRows(res.data?.data || []))
      .catch(() => setRows([]));
  }, [show, id, type]);

  return (
    <ModalShell
      show={show}
      onClose={onClose}
      title="Purchase Order Details"
      subtitle={`Quotation #${id}`}
      footer={
        <button type="button" className={btnGhost} onClick={onClose}>
          Close
        </button>
      }
    >
      {rows === null && <p className="text-sm text-gray-500">Loading...</p>}
      {rows && rows.length === 0 && (
        <p className="text-sm text-gray-500">No PO details were saved for this quotation.</p>
      )}
      {rows &&
        rows.map((r) => (
          <div key={r.id} className="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700 dark:text-gray-200">
            <p className="font-semibold">PO No: {r.po_number || "-"}</p>
            <p className="text-xs text-gray-500">
              Date: {r.po_date ? dayjs(r.po_date).format("DD-MM-YYYY") : "-"} · Value:{" "}
              {r.po_value ? `₹${Number(r.po_value).toLocaleString("en-IN")}` : "-"} · Saved{" "}
              {dayjs(r.added_on).format("DD-MM-YYYY hh:mm A")}
            </p>
            {r.document_path ? (
              <a
                href={poDocUrl(r.document_path)}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-xs font-semibold text-blue-600 hover:underline"
              >
                Open PO document
              </a>
            ) : (
              <p className="mt-1 text-xs text-gray-400">No document uploaded</p>
            )}
          </div>
        ))}
    </ModalShell>
  );
}
PoDetailsModal.propTypes = {
  show: PropTypes.bool,
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  type: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};
