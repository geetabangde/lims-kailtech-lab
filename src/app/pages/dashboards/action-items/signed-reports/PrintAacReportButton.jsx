// Print button for the AAC block FINAL TEST REPORT (product 195 only).
// The report (6-page layout) is rendered by the backend: GET /approvals/generateReport/:tid?html=1
// (same Blade/data as the signed PDF). Other products render nothing here.
import PropTypes from "prop-types";
import { useState } from "react";
import axios from "utils/axios";
import { toast } from "sonner";

const AAC_PRODUCT_IDS = [195];

export function PrintAacReportButton({ report, className }) {
  const [loading, setLoading] = useState(false);
  const [wordLoading, setWordLoading] = useState(false);
  const tp = report?.trf_product ?? {};
  if (!AAC_PRODUCT_IDS.includes(Number(tp.product))) return null;

  // Word download is for approvers/reviewers only (the server enforces the same rule: user 1 or permission 105/115/278)
  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  const permissions =
    typeof window !== "undefined"
      ? localStorage.getItem("userPermissions")?.split(",").map(Number) || []
      : [];
  const canWord = Boolean(
    userId == 1 || permissions.includes(105) || permissions.includes(115) || permissions.includes(278),
  );

  const handleWord = async () => {
    setWordLoading(true);
    try {
      const res = await axios.get(`/approvals/download-report-word/${tp.id}`, { responseType: "blob", timeout: 90000 });
      const cd = res.headers["content-disposition"] || "";
      const m = /filename="?([^";]+)"?/i.exec(cd);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/msword" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = m ? m[1] : `AAC_Test_Report_${tp.id}.doc`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e?.response?.status === 403 ? "You are not authorised to download the Word report" : "Could not build the Word report");
    } finally {
      setWordLoading(false);
    }
  };

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/approvals/generateReport/${tp.id}`, {
        params: { html: 1 },
        responseType: "text",
        transformResponse: (r) => r,
        timeout: 60000,
      });
      const w = window.open("", "_blank", "width=1000,height=800");
      if (!w) {
        toast.error("Please allow pop-ups to print the report");
        return;
      }
      w.document.write(res.data);
      w.document.close();
      setTimeout(() => w.print(), 700);
    } catch (e) {
      console.error(e);
      toast.error("Could not build the AAC report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className={
          className ??
          "rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-emerald-700 disabled:opacity-60"
        }
      >
        {loading ? "Preparing..." : "Print AAC Report (PDF)"}
      </button>
      {canWord && (
        <button
          onClick={handleWord}
          disabled={wordLoading}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {wordLoading ? "Preparing..." : "Download AAC Report (Word)"}
        </button>
      )}
    </>
  );
}

PrintAacReportButton.propTypes = {
  report: PropTypes.object,
  className: PropTypes.string,
};
