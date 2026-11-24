// Request an amendment of a signed testing report (approved by management before the amended report can be uploaded).
// POST /testing/amendment/request  (multipart: trfproduct, changesin, reason*, remark, file)
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "utils/axios";
import { toast } from "sonner";
import { Page } from "components/shared/Page";
import { Card } from "components/ui";

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100";

export default function RequestAmendment() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const tid = params.get("tid");

  const [changesin, setChangesIn] = useState("");
  const [reason, setReason] = useState("");
  const [remark, setRemark] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const back = () => navigate("/dashboards/action-items/signed-reports");

  const submit = async () => {
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    try {
      setSaving(true);
      const fd = new FormData();
      fd.append("trfproduct", tid);
      fd.append("changesin", changesin);
      fd.append("reason", reason);
      fd.append("remark", remark);
      if (file) fd.append("file", file);
      const res = await axios.post("/testing/amendment/request", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(res.data?.message || "Amendment request submitted");
      setTimeout(back, 900);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not submit the request");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page title="Request Amendment">
      <div className="transition-content px-[var(--margin-x)] pb-5">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-dark-500">
            <h3 className="text-base font-semibold text-gray-800 dark:text-dark-100">
              Request Amendment of Signed Report (ID {tid})
            </h3>
            <button
              onClick={back}
              className="rounded-lg bg-cyan-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-600"
            >
              &lt;&lt; Back to Signed Reports
            </button>
          </div>
          <div className="space-y-4 px-5 py-5">
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              The request goes to management for approval. Only after it is approved can the amended report be
              uploaded. The original signed report is always kept.
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-200">Changes In</label>
              <input className={inputCls} value={changesin} onChange={(e) => setChangesIn(e.target.value)} placeholder="e.g. customer name, result table, remarks" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-200">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea rows={3} className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-200">Remark</label>
              <textarea rows={2} className={inputCls} value={remark} onChange={(e) => setRemark(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-200">Supporting file (optional)</label>
              <input type="file" className={inputCls} onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
            <div>
              <button
                onClick={submit}
                disabled={saving}
                className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
              >
                {saving ? "Submitting…" : "Submit Request"}
              </button>
            </div>
          </div>
        </Card>
      </div>
    </Page>
  );
}
