// Upload the amended report for a signed testing report - only after management approved the amendment request.
// GET /testing/amendment/status/:id   POST /testing/amendment/upload (multipart: trfproduct, request_id, report)
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "utils/axios";
import { toast } from "sonner";
import { Page } from "components/shared/Page";
import { Card } from "components/ui";

export default function UploadAmendedReport() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [state, setState] = useState(null);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const back = () => navigate("/dashboards/action-items/signed-reports");

  const load = async () => {
    try {
      const res = await axios.get(`/testing/amendment/status/${id}`);
      setState(res.data?.data || {});
    } catch {
      setState({ error: true });
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const upload = async () => {
    if (!file) {
      toast.error("Please choose the amended report file");
      return;
    }
    try {
      setSaving(true);
      const fd = new FormData();
      fd.append("trfproduct", id);
      fd.append("request_id", state.approved_request_id);
      fd.append("report", file);
      const res = await axios.post("/testing/amendment/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(res.data?.message || "Amended report uploaded");
      setFile(null);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  const fileUrl = (name) => `${(axios.defaults.baseURL || "").replace(/\/api\/?$/, "")}/uploads/${name}`;

  return (
    <Page title="Upload Amended Report">
      <div className="transition-content px-[var(--margin-x)] pb-5">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-dark-500">
            <h3 className="text-base font-semibold text-gray-800 dark:text-dark-100">
              Upload Amended Report (ID {id})
            </h3>
            <button
              onClick={back}
              className="rounded-lg bg-cyan-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-600"
            >
              &lt;&lt; Back to Signed Reports
            </button>
          </div>
          <div className="space-y-4 px-5 py-5">
            {!state && <p className="text-sm text-gray-500">Loading…</p>}
            {state?.error && <p className="text-sm text-red-600">Could not load the amendment status.</p>}
            {state && !state.error && (
              <>
                {state.approved_request_id ? (
                  <div className="flex w-full items-center gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-dark-500 dark:bg-dark-800">
                    <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" />
                    <button
                      onClick={upload}
                      disabled={saving}
                      className="ml-auto rounded-lg bg-primary-600 px-5 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
                    >
                      {saving ? "Uploading…" : "Upload Amended Report"}
                    </button>
                  </div>
                ) : (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                    {state.pending
                      ? "The amendment request is waiting for management approval."
                      : "No approved amendment request for this report. Use Request Amendment first."}
                  </p>
                )}

                {state.versions?.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-dark-100">Report versions</h4>
                    <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-dark-500">
                      <thead className="bg-gray-50 dark:bg-dark-800">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-600">Version</th>
                          <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-600">Uploaded On</th>
                          <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-600">File</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-dark-500">
                        {state.versions.map((v) => (
                          <tr key={v.version_no}>
                            <td className="px-3 py-2">{v.version_type}</td>
                            <td className="px-3 py-2">{v.added_on}</td>
                            <td className="px-3 py-2">
                              {v.filename ? (
                                <a className="text-primary-600 underline" href={fileUrl(v.filename)} target="_blank" rel="noreferrer">
                                  {v.orgname || v.filename}
                                </a>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      </div>
    </Page>
  );
}
