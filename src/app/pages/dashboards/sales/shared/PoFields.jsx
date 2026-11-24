import PropTypes from "prop-types";
import { savePo } from "./lifecycleApi";

// PO capture shown inside the existing "Mark Converted" popups (all fields optional so conversion is never blocked).
export const emptyPo = { po_number: "", po_date: "", po_value: "", file: null };

export function hasPo(po) {
  return Boolean(po.po_number.trim() || po.po_date || po.po_value || po.file);
}

export async function persistPo(po, quotationId, type) {
  if (!hasPo(po)) return;
  const fd = new FormData();
  fd.append("quotation_id", quotationId);
  fd.append("quotation_type", type);
  fd.append("po_number", po.po_number);
  if (po.po_date) fd.append("po_date", po.po_date);
  if (po.po_value) fd.append("po_value", po.po_value);
  if (po.file) fd.append("document", po.file);
  await savePo(fd);
}

const cls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200";

export default function PoFields({ po, setPo }) {
  const set = (k, v) => setPo((p) => ({ ...p, [k]: v }));
  return (
    <div className="space-y-3 rounded-lg border border-dashed border-gray-300 p-3 dark:border-gray-600">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Purchase Order (optional)</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">PO Number</label>
          <input className={cls} value={po.po_number} onChange={(e) => set("po_number", e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">PO Date</label>
          <input type="date" className={cls} value={po.po_date} onChange={(e) => set("po_date", e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">PO Value</label>
          <input type="number" className={cls} value={po.po_value} onChange={(e) => set("po_value", e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">PO Document</label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            className="block w-full text-xs text-gray-600"
            onChange={(e) => set("file", e.target.files?.[0] || null)}
          />
        </div>
      </div>
    </div>
  );
}
PoFields.propTypes = {
  po: PropTypes.object.isRequired,
  setPo: PropTypes.func.isRequired,
};
