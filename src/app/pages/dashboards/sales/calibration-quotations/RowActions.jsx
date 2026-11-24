// Import Dependencies
import { useState } from "react";
import PropTypes from "prop-types";
import { Link, useNavigate } from "react-router-dom";
import axios from "utils/axios";
import { toast } from "sonner";

// Local Imports
import AddQuoteFollowUpModal from "./AddQuoteFollowUpModal";
import MarkConvertedModal from "./MarkConvertedModal";
import QuotationDispatchModal from "../shared/QuotationDispatchModal";

// ----------------------------------------------------------------------

export function RowActions({ row, table }) {
  const { id, status } = row.original;
  const permissions = JSON.parse(localStorage.getItem("userPermissions") || "[]");

  const hasViewPerm = permissions.includes(93);
  const hasAddPerm = permissions.includes(94);
  const hasEditPerm = permissions.includes(95);
  const hasRevisePerm = permissions.includes(96);

  const [followupOpen, setFollowupOpen] = useState(false);
  const [followupMode, setFollowupMode] = useState("Add");
  const [convertOpen, setConvertOpen] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const navigate = useNavigate();
  const [revising, setRevising] = useState(false);

  const handleRevise = async () => {
    if (!id) {
      toast.error("Quotation ID is missing");
      return;
    }
    try {
      setRevising(true);
      const filteredRevisions = Array.isArray(row.original.revisions)
        ? row.original.revisions.filter(r => r.status === 11)
        : [];

      const latestReviseId = filteredRevisions.length > 0
        ? Math.max(...filteredRevisions.map(r => r.id))
        : id;

      const res = await axios.post(`/sales/revise-quotation/${latestReviseId}`);

      if (res.data.new_quote_id || res.data.status === "true" || res.data.status === true) {
        toast.success(res.data.message || "Quotation revised successfully");
        const newQuoteId = res.data.new_quote_id || res.data.id; // Fallback to id if new_quote_id is missing
        if (newQuoteId) {
          // Navigate to the edit page of the newly created revision
          navigate(`/dashboards/sales/calibration-quotations/edit/${newQuoteId}`, { state: { refetch: true } });
        } else {
          table.options.meta?.refetch?.();
        }
      } else {
        toast.error(res.data.message || "Failed to revise quotation");
      }
    } catch (err) {
      console.error("Revision Error:", err);
      const errorMsg = err.response?.data?.message || err.message || "Something went wrong";
      toast.error(errorMsg);
    } finally {
      setRevising(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-1">
        {/* Status 0: Item Not Added */}
        {status === 0 && hasAddPerm && (
          <Link
            to={`/dashboards/sales/calibration-quotations/add-items/${id}`}
            className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
          >
            Add Quote Item
          </Link>
        )}

        {/* Status 1: Pending */}
        {status === 1 && (
          <>
            {hasEditPerm && (
              <>
                <Link
                  to={`/dashboards/sales/calibration-quotations/edit/${id}`}
                  className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
                >
                  Edit
                </Link>
                <Link
                  to={`/dashboards/sales/calibration-quotations/edit-items/${id}`}
                  className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
                >
                  Edit Quote Item
                </Link>
              </>
            )}
            {hasRevisePerm && (
              <button
                onClick={handleRevise}
                disabled={revising}
                className="rounded bg-cyan-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-cyan-700 disabled:bg-cyan-400"
              >
                {revising ? "Revising..." : "Revise"}
              </button>
            )}
            {hasViewPerm && (
              <>
                <Link
                  to={`/dashboards/sales/calibration-quotations/view/${id}`}
                  className="rounded bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700"
                >
                  View
                </Link>
                {/* Revision History Buttons - New API Format */}
                {row.original.revisions && Array.isArray(row.original.revisions) && (
                  <>
                    {row.original.revisions.map((revisionId, index) => {
                      if (revisionId === id) return null; // Hide current
                      return (
                        <Link
                          key={revisionId}
                          to={`/dashboards/sales/calibration-quotations/view/${revisionId}`}
                          className="rounded bg-purple-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-purple-700"
                        >
                          Revise {index + 1}
                        </Link>
                      );
                    })}
                  </>
                )}
              </>
            )}
            {hasAddPerm && (
              <>
                {(row.original.closed_count === undefined || row.original.closed_count === 0) && (
                  <button
                    onClick={() => {
                      setFollowupMode("Add");
                      setFollowupOpen(true);
                    }}
                    className="rounded bg-blue-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-600"
                  >
                    Add Follow-Up
                  </button>
                )}
                <Link
                  to={`/dashboards/sales/calibration-quotations/followup/${id}`}
                  className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
                >
                  Track Followup
                </Link>
                 <button
                  onClick={() => setConvertOpen(true)}
                  className="rounded bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700"
                >
                  Mark Quote as converted
                </button>
                <button
                  onClick={() => {
                    setFollowupMode("Close");
                    setFollowupOpen(true);
                  }}
                  className="rounded bg-red-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-800"
                >
                  Lost Quotation
                </button>
              </>
            )}
          </>
        )}

        {/* Status 91: Lost */}
        {status === 91 && (
          <>
            <Link
              to={`/dashboards/sales/calibration-quotations/view/${id}`}
              className="rounded bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700"
            >
              View
            </Link>
            <button
              disabled
              className="cursor-not-allowed rounded bg-gray-400 px-2.5 py-1 text-xs font-medium text-white"
            >
              Lost Quotation
            </button>
            <Link
              to={`/dashboards/sales/calibration-quotations/followup/${id}`}
              className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
            >
              Track Followup
            </Link>
          </>
        )}

        {/* Status 3: Marked As Converted */}
        {status === 3 && (
          <>
            <Link
              to={`/dashboards/sales/calibration-quotations/view/${id}`}
              className="rounded bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700"
            >
              View
            </Link>
            <Link
              to={`/dashboards/sales/calibration-quotations/link-crf/${id}`}
              className="rounded bg-green-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-800"
            >
              Link To CRF
            </Link>
            <Link
              to={`/dashboards/sales/calibration-quotations/followup/${id}`}
              className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
            >
              Track Followup
            </Link>
          </>
        )}

        {/* Status 2: CRF Punched */}
        {status === 2 && (
          <>
            {hasViewPerm && (
              <Link
                to={`/dashboards/sales/calibration-quotations/view/${id}`}
                className="rounded bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700"
              >
                View
              </Link>
            )}
            <span className="rounded bg-teal-600 px-2.5 py-1 text-xs font-medium text-white shadow-sm border border-teal-500/20">
              CRF Punched
            </span>
            {hasAddPerm && (
              <Link
                to={`/dashboards/sales/calibration-quotations/followup/${id}`}
                className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
              >
                Track Followup
              </Link>
            )}
          </>
        )}
        {/* Log how/when this quotation was dispatched (Email / WhatsApp / Hand / Courier) */}
        <button
          onClick={() => setDispatchOpen(true)}
          className="rounded bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700"
        >
          Log Dispatch
        </button>
      </div>

      <QuotationDispatchModal
        show={dispatchOpen}
        id={id}
        type="calibration"
        onClose={() => setDispatchOpen(false)}
      />

      <AddQuoteFollowUpModal
        show={followupOpen}
        id={id}
        mode={followupMode}
        title="Follow-Ups"
        onClose={() => setFollowupOpen(false)}
        onSuccess={() => table.options.meta?.refetch?.()}
      />

      <MarkConvertedModal
        show={convertOpen}
        id={id}
        onClose={() => setConvertOpen(false)}
        onSuccess={() => table.options.meta?.refetch?.()}
      />
    </>
  );
}

RowActions.propTypes = {
  row: PropTypes.object.isRequired,
  table: PropTypes.object,
};
