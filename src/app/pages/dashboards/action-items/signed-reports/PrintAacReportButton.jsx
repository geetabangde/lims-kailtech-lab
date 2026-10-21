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
  const tp = report?.trf_product ?? {};
  if (!AAC_PRODUCT_IDS.includes(Number(tp.product))) return null;

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
  );
}

PrintAacReportButton.propTypes = {
  report: PropTypes.object,
  className: PropTypes.string,
};
