// Import Dependencies
import { useState, useCallback } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import axios from "utils/axios";
import { toast } from "sonner";

// Local Imports
import { ConfirmModal } from "components/shared/ConfirmModal";
import AddFollowUpModal from "./AddFollowUpModal";
import { TechVerifyModal, RegretEnquiryModal } from "./DenialModals";

// ----------------------------------------------------------------------

const confirmDeleteMessages = {
  pending: {
    description: "Are you sure you want to delete this enquiry? This cannot be undone.",
  },
  success: { title: "Enquiry Deleted" },
};

export function RowActions({ row, table }) {
  const { id, status, vertical } = row.original;
  const enquiryStatus = Number(status || 0);
  const enquiryVertical = Number(vertical || 0);
  const permissions = JSON.parse(localStorage.getItem("userPermissions") || "[]");

  const hasViewPerm = permissions.includes(91);
  const hasEditPerm = permissions.includes(93) || hasViewPerm;
  const hasDeletePerm = permissions.includes(91);
  
  // Permission logic based on vertical
  const hasCalibrationConvertPerm = permissions.includes(94) && enquiryVertical === 1;
  const hasTestingConvertPerm = permissions.includes(141) && [2, 3].includes(enquiryVertical);
  const hasConvertPerm = hasCalibrationConvertPerm || hasTestingConvertPerm;

  // Add Follow-Up should be hidden if already closed/regretted via follow-ups
  // Based on PHP: if($closed == 0) where closed is count of status 91 followups
  const isFollowUpClosed = Number(row.original.closed_followups || 0) > 0;
  const hasFollowUpPerm = permissions.includes(91) && !isFollowUpClosed;

  // ── Delete Logic ──────────────────────────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const handleDelete = useCallback(async () => {
    setDeleteLoading(true);
    try {
      await axios.delete(`/sales/delete-enquiry/${id}`);
      setDeleteSuccess(true);
      toast.success("Enquiry deleted successfully");
      setTimeout(() => {
        setDeleteOpen(false);
        if (table.options.meta?.deleteRow) {
          table.options.meta.deleteRow(row);
        } else {
          table.options.meta?.refetch?.();
        }
      }, 800);
    } catch {
      setDeleteError(true);
      toast.error("Failed to delete enquiry");
    } finally {
      setDeleteLoading(false);
    }
  }, [id, row, table]);

  // ── Regret Logic ──────────────────────────────────────────────────────────────
  // The Regret popup (reason + remark, logged for management) lives in DenialModals.jsx
  const [regretOpen, setRegretOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);

  // ── Technical verification gate (opt-in: only acts when a status has been set) ──
  const techStatus = row.original.tech_verification_status || "";
  // Only Ruby (31), Sushil (41) and Manish (160) may approve / reject / re-open (also enforced on the server)
  const canDecideTech = [31, 41, 160].includes(Number(localStorage.getItem("userId")));
  const isUnderVerification = techStatus === "Under Technical Verification";
  const isTechRejected = techStatus === "Technical Regret / Out of Scope";
  const [techOpen, setTechOpen] = useState(false);
  const [techMode, setTechMode] = useState("decide");
  const openTech = (mode) => {
    setTechMode(mode);
    setTechOpen(true);
  };

  // ── Permissions & Conditions (from PHP) ──────────────────────────────────────
  // PHP: if(in_array(94,$permissions) && $row["vertical"] == 1) ... else ... in_array($row["vertical"],[2,3])

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-1.5 py-1">

        {enquiryStatus === 0 && (
          <>
            {/* Edit Button (btn-warning) */}
            {hasEditPerm && (
              <Link
                to={`/dashboards/sales/enquiry/edit/${id}`}
                className="inline-flex items-center justify-center rounded-md bg-amber-500 px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-amber-600 min-w-[60px] shadow-sm"
              >
                Edit
              </Link>
            )}

            {/* Technical verification gate: only active once someone sets a status; blank = works as before */}
            {hasConvertPerm && isUnderVerification && !canDecideTech && (
              <span
                className="inline-flex items-center justify-center rounded-md bg-purple-100 px-3 py-1.5 text-[10px] font-bold text-purple-700 min-w-[120px] shadow-sm"
                title="Waiting for technical approval (Ruby / Sushil / Manish)"
              >
                Awaiting Tech. Approval
              </span>
            )}
            {hasConvertPerm && isUnderVerification && canDecideTech && (
              <button
                onClick={() => openTech("decide")}
                className="inline-flex items-center justify-center rounded-md bg-purple-600 px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-purple-700 min-w-[120px] shadow-sm"
                title="Technical feasibility must be approved before a quotation can be created"
              >
                Technical Verification
              </button>
            )}
            {hasConvertPerm && isTechRejected && (
              <>
                <span
                  className="inline-flex items-center justify-center rounded-md bg-rose-100 px-3 py-1.5 text-[10px] font-bold text-rose-700 min-w-[110px] shadow-sm"
                  title={row.original.tech_verification_remark || "Technically rejected"}
                >
                  Technically Rejected
                </span>
                {canDecideTech && (
                <button
                  onClick={() => openTech("reopen")}
                  className="inline-flex items-center justify-center rounded-md bg-gray-600 px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-gray-700 min-w-[70px] shadow-sm"
                >
                  Re-open
                </button>
                )}
              </>
            )}
            {hasEditPerm && !isUnderVerification && !isTechRejected && (
              <button
                onClick={() => openTech("request")}
                className="inline-flex items-center justify-center rounded-md border border-purple-400 bg-white px-3 py-1.5 text-[10px] font-bold text-purple-700 transition hover:bg-purple-50 min-w-[110px] shadow-sm"
              >
                Request Tech. Verification
              </button>
            )}

            {/* Convert To Quotation (btn-success) */}
            {hasConvertPerm && !isUnderVerification && !isTechRejected && (
              <Link
                to={`/dashboards/sales/enquiry/create-quotation/${id}`}
                className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-emerald-700 min-w-[120px] shadow-sm"
              >
                Convert To Quotation
              </Link>
            )}

            {/* Add Follow-Up (btn-info) */}
            {hasFollowUpPerm && (
              <button
                onClick={() => setFollowUpOpen(true)}
                className="inline-flex items-center justify-center rounded-md bg-cyan-500 px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-cyan-600 min-w-[90px] shadow-sm"
              >
                Add Follow-Up
              </button>
            )}

            {/* Track Followup (btn-primary) */}
            {hasViewPerm && (
              <Link
                to={`/dashboards/sales/enquiry/follow-up/${id}`}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-blue-700 min-w-[95px] shadow-sm"
              >
                Track Followup
              </Link>
            )}

            {/* Regretted Enquiry (btn-danger) */}
            {hasEditPerm && (
              <button
                onClick={() => setRegretOpen(true)}
                className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-red-700 min-w-[110px] shadow-sm"
              >
                Regretted Enquiry
              </button>
            )}

            {/* Delete (btn-danger) */}
            {hasDeletePerm && (
              <button
                onClick={() => {
                  setDeleteOpen(true);
                  setDeleteError(false);
                  setDeleteSuccess(false);
                }}
                className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-red-700 min-w-[60px] shadow-sm"
              >
                Delete
              </button>
            )}
          </>
        )}

        {enquiryStatus === 91 && (
          <>
            {/* Regretted Enquiry (Disabled) */}
            {hasEditPerm && (
              <button
                disabled
                className="inline-flex items-center justify-center rounded-md bg-red-600/50 px-3 py-1.5 text-[10px] font-bold text-white cursor-not-allowed min-w-[110px] shadow-sm"
              >
                Regretted Enquiry
              </button>
            )}

            {/* Track Followup (btn-primary) */}
            {hasViewPerm && (
              <Link
                to={`/dashboards/sales/enquiry/follow-up/${id}`}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-blue-700 min-w-[95px] shadow-sm"
              >
                Track Followup
              </Link>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        show={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        messages={confirmDeleteMessages}
        onOk={handleDelete}
        confirmLoading={deleteLoading}
        state={deleteError ? "error" : deleteSuccess ? "success" : "pending"}
      />

      <RegretEnquiryModal
        show={regretOpen}
        enquiry={row.original}
        onClose={() => setRegretOpen(false)}
        onDone={() => table.options.meta?.refetch?.()}
      />
      <TechVerifyModal
        show={techOpen}
        mode={techMode}
        enquiry={row.original}
        onClose={() => setTechOpen(false)}
        onDone={() => table.options.meta?.refetch?.()}
      />
      <AddFollowUpModal
        show={followUpOpen}
        id={id}
        title="Follow Ups"
        onClose={() => setFollowUpOpen(false)}
        onSuccess={() => table.options.meta?.refetch?.()}
      />
    </>
  );
}

RowActions.propTypes = {
  row: PropTypes.object,
  table: PropTypes.object,
};
