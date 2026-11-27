import { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import { toast } from "sonner";
import { getQuotationUploads, uploadQuotationVersion } from "./lifecycleApi";
import { JWT_HOST_API } from "configs/auth.config";
import ModalShell, { btnGhost, btnPrimary, fieldCls } from "./ModalShell";

// Uploaded PDFs live under public/uploads on the server and are served at <host>/public/uploads/... (like the certificate PDFs)
export const uploadedQuotationUrl = (path) => (path ? `${JWT_HOST_API.replace(/\/api\/?$/, "")}/public/${path}` : null);
const poDocUrl = uploadedQuotationUrl;

// Shown on the quotation view pages ONLY when the quotation was created with "Upload quotation (PDF)":
// the current PDF, the older versions, and a button to upload a new version (older ones are kept).
export default function UploadedQuotationPanel({ type, id, quotationNo, canEdit }) {
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [no, setNo] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getQuotationUploads({ quotation_type: type, quotation_id: id });
      setRows(res.data?.data || []);
    } catch {
      setRows([]);
    }
  }, [type, id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!rows || rows.length === 0) return null;
  const current = rows.find((r) => Number(r.is_current) === 1) || rows[0];

  const save = async () => {
    if (!file) return toast.error("Please choose the new PDF");
    if (!/\.pdf$/i.test(file.name)) return toast.error("Only a PDF file can be uploaded");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("quotation_type", type);
      fd.append("quotation_id", id);
      fd.append("quotation_file", file);
      if (no.trim()) fd.append("quotationno", no.trim());
      if (note.trim()) fd.append("note", note.trim());
      const res = await uploadQuotationVersion(fd);
      toast.success(res.data?.message || "New version saved");
      setOpen(false);
      setFile(null);
      setNo("");
      setNote("");
      await load();
      if (res.data?.quotationno && res.data.quotationno !== quotationNo) window.location.reload();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not save the new version");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="no-print mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-900/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-dark-50">Uploaded quotation (PDF)</p>
          <p className="text-xs text-gray-500">
            This quotation was uploaded as a ready PDF. Version {current.version} is the one sent to the customer.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={poDocUrl(current.file_path)}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Open current PDF
          </a>
          {canEdit && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-md border border-blue-600 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              Upload new version
            </button>
          )}
        </div>
      </div>
      {rows.length > 1 && (
        <ul className="mt-3 space-y-1 text-xs text-gray-600 dark:text-dark-200">
          {rows.map((r) => (
            <li key={r.id}>
              <b>v{r.version}</b> {Number(r.is_current) === 1 ? "(current)" : ""} - {r.quotation_no} -{" "}
              {r.uploaded_on ? dayjs(r.uploaded_on).format("DD-MM-YYYY hh:mm A") : ""}
              {r.by_name ? ` by ${r.by_name}` : ""} -{" "}
              <a href={poDocUrl(r.file_path)} target="_blank" rel="noreferrer" className="font-semibold text-blue-600 hover:underline">
                {r.original_name || "Open"}
              </a>
              {r.note ? ` (${r.note})` : ""}
            </li>
          ))}
        </ul>
      )}
      <ModalShell
        show={open}
        onClose={() => !busy && setOpen(false)}
        title="Upload new version"
        subtitle={`Quotation ${quotationNo || ""} - the older files stay in the history`}
        footer={
          <>
            <button type="button" className={btnGhost} onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </button>
            <button type="button" className={btnPrimary} onClick={save} disabled={busy}>
              {busy ? "Saving..." : "Save new version"}
            </button>
          </>
        }
      >
        <div>
          <label className="mb-1 block text-sm font-medium">
            New PDF <span className="text-red-500">*</span>
          </label>
          <input type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className={fieldCls} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Quotation number (change only if the number was revised, e.g. /01)</label>
          <input className={fieldCls} value={no} onChange={(e) => setNo(e.target.value)} placeholder={quotationNo || ""} maxLength={100} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Note (optional)</label>
          <textarea className={fieldCls} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </ModalShell>
    </div>
  );
}
UploadedQuotationPanel.propTypes = {
  type: PropTypes.string.isRequired,
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  quotationNo: PropTypes.string,
  canEdit: PropTypes.bool,
};
