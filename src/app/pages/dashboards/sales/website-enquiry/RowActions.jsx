// Import Dependencies
import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import axios from "utils/axios";
import { toast } from "sonner";

// Local Imports
import { ConfirmModal } from "components/shared/ConfirmModal";

export function RowActions({ row, table }) {
  const { id, status } = row.original;
  const enquiryStatus = Number(status || 0);

  // ── Close Logic (Regret) ───────────────────────────────────────────────────
  const [regretOpen, setRegretOpen] = useState(false);
  const [regretLoading, setRegretLoading] = useState(false);
  const [regretSuccess, setRegretSuccess] = useState(false);

  const handleRegret = useCallback(async () => {
    setRegretLoading(true);
    try {
      await axios.post(`/sales/close-enquiry/${id}`);
      setRegretSuccess(true);
      toast.success("Enquiry marked as Closed");
      setTimeout(() => {
        setRegretOpen(false);
        table.options.meta?.refetch?.();
      }, 800);
    } catch {
      toast.error("Failed to close enquiry");
    } finally {
      setRegretLoading(false);
    }
  }, [id, table]);

  return (
    <>
      <div className="flex flex-col gap-1 py-1">
        {enquiryStatus === 0 ? (
          <>
            {/* Convert To enquiry */}
            <Link
              to={`/dashboards/sales/website-enquiry/edit/${id}`}
              className="inline-flex w-32 items-center justify-center rounded bg-green-600 py-1 text-xs font-medium text-white shadow-sm transition hover:bg-green-700"
            >
              Add to Enquiry Register
            </Link>

            {/* Close Enquiry */}
            <button
              onClick={() => {
                setRegretOpen(true);
                setRegretSuccess(false);
              }}
              className="inline-flex w-32 items-center justify-center rounded bg-red-700 py-1 text-xs font-medium text-white shadow-sm transition hover:bg-red-800"
            >
              Close Enquiry
            </button>
          </>
        ) : (
          <div className="flex justify-center py-1">
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-dark-700 dark:text-dark-300">
              {enquiryStatus === 1 ? "Converted" : "Closed"}
            </span>
          </div>
        )}
      </div>

      <ConfirmModal
        show={regretOpen}
        onClose={() => setRegretOpen(false)}
        messages={{
          pending: {
            description: "Are you sure you want to close this website enquiry?",
            actionText: "Ok"
          },
          success: {
            title: "Enquiry Closed",
            actionText: "Done"
          },
        }}
        onOk={handleRegret}
        confirmLoading={regretLoading}
        state={regretSuccess ? "success" : "pending"}
      />
    </>
  );
}

RowActions.propTypes = {
  row: PropTypes.object,
  table: PropTypes.object,
};
