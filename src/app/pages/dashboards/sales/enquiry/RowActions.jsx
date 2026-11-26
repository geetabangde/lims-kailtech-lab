// Import Dependencies
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { Link, useNavigate } from "react-router-dom";
import axios from "utils/axios";
import { toast } from "sonner";

// Local Imports
import AddFollowUpModal from "./AddFollowUpModal";
import ActionTakenModal from "./ActionTakenModal";
import OrderReceivedModal from "./OrderReceivedModal";
import CalMarkConvertedModal from "../calibration-quotations/MarkConvertedModal";
import TestMarkConvertedModal from "../testing-quotations/MarkConvertedModal";
import { TechVerifyModal, RegretEnquiryModal } from "./DenialModals";
import ForwardEnquiryModal from "./ForwardEnquiryModal";
import LostEnquiryModal from "./LostEnquiryModal";
import { LAB_STATUS_MANUAL, effectiveStatus } from "./enquiryOptions";
import QuotationDispatchModal from "../shared/QuotationDispatchModal";

// ----------------------------------------------------------------------

export function RowActions({ row, table, open, onClose, anchorRect, inline = false }) {
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const { id, status, vertical } = row.original;
  const enquiryStatus = Number(status || 0);
  const enquiryVertical = Number(vertical || 0);
  const isLost = effectiveStatus(row.original) === "Lost"; // marked Lost: no more commercial actions
  const permissions = JSON.parse(localStorage.getItem("userPermissions") || "[]");

  const hasViewPerm = permissions.includes(91);
  const hasEditPerm = permissions.includes(93) || hasViewPerm;
  
  // Permission logic based on vertical
  const hasCalibrationConvertPerm = permissions.includes(94) && enquiryVertical === 1;
  const hasTestingConvertPerm = permissions.includes(141) && [2, 3].includes(enquiryVertical);
  const hasConvertPerm = hasCalibrationConvertPerm || hasTestingConvertPerm;

  // Add Follow-Up should be hidden if already closed/regretted via follow-ups
  // Based on PHP: if($closed == 0) where closed is count of status 91 followups
  const isFollowUpClosed = Number(row.original.closed_followups || 0) > 0;
  const hasFollowUpPerm = permissions.includes(91) && !isFollowUpClosed;

  // ── Regret Logic ──────────────────────────────────────────────────────────────
  // The Regret popup (reason + remark, logged for management) lives in DenialModals.jsx
  const [regretOpen, setRegretOpen] = useState(false);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  // Change the lab status by hand (the server records the date and writes the history)
  const changeStatus = async (s) => {
    setStatusBusy(true);
    try {
      await axios.post("/enquiry-lifecycle/set-status", { enquiry_id: id, lab_status: s });
      toast.success(`Status changed to ${s}`);
      table.options.meta?.refetch?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not change the status");
    } finally {
      setStatusBusy(false);
    }
  };
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [orderRecvOpen, setOrderRecvOpen] = useState(false); // order received straight on the enquiry (no quotation yet)

  // close the menu on outside click / Escape
  useEffect(() => {
    if (!open || inline) return undefined;
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && !e.target.closest?.("[data-enquiry-menu-btn]")) {
        onClose?.();
      }
    };
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, inline]);

  // ── View / Order Received: both need the quotation created from this enquiry ──
  const [orderInfo, setOrderInfo] = useState(null);
  const [orderOpen, setOrderOpen] = useState(false);
  const findQuotation = async (quiet = false) => {
    const res = await axios.get("/enquiry-lifecycle/enquiry-quotation", { params: { enquiry_id: id } });
    if (!res.data?.found) {
      if (!quiet) toast.error(res.data?.message || "No quotation found for this enquiry");
      return null;
    }
    return res.data;
  };
  const handleViewQuotation = async () => {
    try {
      const d = await findQuotation();
      if (!d) return;
      onClose?.();
      navigate(`/dashboards/sales/${d.quotation_type === "calibration" ? "calibration" : "testing"}-quotations/view/${d.quotation_id}`);
    } catch {
      toast.error("Could not load the quotation of this enquiry");
    }
  };
  // Edit the quotation made from this enquiry (same permission as the quotation lists: calibration 95, testing 94)
  const canEditQuotation = permissions.includes(95) || permissions.includes(94);
  const handleEditQuotation = async () => {
    try {
      const d = await findQuotation();
      if (!d) return;
      const type = d.quotation_type === "calibration" ? "calibration" : "testing";
      if (!permissions.includes(type === "calibration" ? 95 : 94)) {
        toast.error("You do not have permission to edit this quotation");
        return;
      }
      onClose?.();
      navigate(`/dashboards/sales/${type}-quotations/edit/${d.quotation_id}`);
    } catch {
      toast.error("Could not load the quotation of this enquiry");
    }
  };
  const handleOrderReceived = async () => {
    try {
      const d = await findQuotation(true);
      if (!d) {
        // no quotation yet: record the order on the enquiry itself
        setOrderRecvOpen(true);
        onClose?.();
        return;
      }
      setOrderInfo(d);
      setOrderOpen(true);
      onClose?.();
    } catch {
      toast.error("Could not load the quotation of this enquiry");
    }
  };

  // ── Send the quotation created from this enquiry (e-mail / log dispatch) ──
  const [sendInfo, setSendInfo] = useState(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const handleSendQuotation = async () => {
    setSendLoading(true);
    try {
      const res = await axios.get("/enquiry-lifecycle/enquiry-quotation", { params: { enquiry_id: id } });
      const d = res.data;
      if (!d?.found) {
        toast.error(d?.message || "No quotation found for this enquiry");
      } else if (!d.ready) {
        toast.error(`Quotation ${d.quotationno} has no items yet. Complete it before sending.`);
      } else {
        setSendInfo(d);
        setSendOpen(true);
      }
    } catch {
      toast.error("Could not load the quotation of this enquiry");
    } finally {
      setSendLoading(false);
    }
  };

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

  const left = anchorRect ? Math.max(8, Math.min(anchorRect.left, window.innerWidth - 240)) : 8;
  const top = anchorRect ? Math.min(anchorRect.bottom + 4, Math.max(8, window.innerHeight - 420)) : 8;

  // inline = the actions expand inside the Status cell (row grows) instead of floating as a popup
  const wrap = (el) => (inline ? el : createPortal(el, document.body));

  return (
    <>
      {open &&
        wrap(
      <div
        ref={menuRef}
        style={inline ? undefined : { position: "fixed", left, top, zIndex: 1100, maxHeight: "80vh", overflowY: "auto" }}
        className={
          inline
            ? "mt-1.5 flex w-full min-w-[150px] flex-col items-stretch gap-1.5 [&>*]:!w-full"
            : "flex min-w-[200px] flex-col items-stretch gap-1.5 rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-600 dark:bg-gray-800 [&>*]:!w-full"
        }
      >

        {enquiryStatus === 0 && !isLost && (
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

            {/* Order Received (management request 2026-11-25): the customer placed the order, with or without a quotation */}
            {hasEditPerm && !row.original.order_received && (
              <button
                onClick={() => {
                  setOrderRecvOpen(true);
                  onClose?.();
                }}
                className="inline-flex items-center justify-center rounded-md bg-teal-600 px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-teal-700 min-w-[110px] shadow-sm"
              >
                Order Received
              </button>
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

            {/* Forward To (pending enquiry only): reassigns the enquiry to another person */}
            {hasEditPerm && (
              <button
                onClick={() => {
                  setForwardOpen(true);
                  onClose?.();
                }}
                className="inline-flex items-center justify-center rounded-md bg-cyan-600 px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-cyan-700 min-w-[110px] shadow-sm"
              >
                Forward To
              </button>
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
          </>
        )}

        {enquiryStatus === 1 && hasViewPerm && !isLost && (
          <>
          <button
            onClick={handleViewQuotation}
            className="inline-flex items-center justify-center rounded-md bg-sky-600 px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-sky-700 min-w-[110px] shadow-sm"
          >
            View Quotation
          </button>
          {canEditQuotation && !Number(row.original.closed) && !row.original.order_received && (
            <button
              onClick={handleEditQuotation}
              className="inline-flex items-center justify-center rounded-md bg-amber-500 px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-amber-600 min-w-[110px] shadow-sm"
            >
              Edit Quotation
            </button>
          )}
          <button
            onClick={handleOrderReceived}
            className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-emerald-700 min-w-[110px] shadow-sm"
          >
            Order Received
          </button>
          <button
            onClick={handleSendQuotation}
            disabled={sendLoading}
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-indigo-700 min-w-[110px] shadow-sm disabled:opacity-60"
            title="E-mail the quotation created from this enquiry (or log how it was dispatched)"
          >
            {sendLoading ? "Loading..." : "Send Quotation"}
          </button>
          <Link
            to={`/dashboards/sales/enquiry/follow-up/${id}`}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-blue-700 min-w-[95px] shadow-sm"
          >
            Track Followup
          </Link>
          </>
        )}

        {/* Lab status: choose by hand (date + history are recorded) or mark as Lost with a reason */}
        {isLost && (
          <>
            <span className="inline-flex items-center justify-center rounded-md bg-rose-100 px-3 py-1.5 text-[10px] font-bold text-rose-700 min-w-[110px] shadow-sm">
              Marked Lost{row.original.loss_reason ? `: ${row.original.loss_reason}` : ""}
            </span>
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
        {!isLost && hasEditPerm && (enquiryStatus === 0 || enquiryStatus === 1) && (
          <>
            <button
              onClick={() => setStatusOpen((v) => !v)}
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-indigo-700 min-w-[110px] shadow-sm"
            >
              {statusOpen ? "Hide Status Options" : "Change Status"}
            </button>
            {statusOpen &&
              LAB_STATUS_MANUAL.map((s) => (
                <button
                  key={s}
                  disabled={statusBusy}
                  onClick={() => changeStatus(s)}
                  className="inline-flex items-center justify-center rounded-md border border-indigo-300 bg-white px-3 py-1.5 text-[10px] font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-60 min-w-[110px] shadow-sm"
                >
                  {s}
                </button>
              ))}
            <button
              onClick={() => {
                setLostOpen(true);
                onClose?.();
              }}
              className="inline-flex items-center justify-center rounded-md bg-rose-700 px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-rose-800 min-w-[110px] shadow-sm"
            >
              Lost
            </button>
          </>
        )}

        {/* Details of the Action Taken - available at every stage (moved from the Add Enquiry form) */}
        {hasEditPerm && (
          <button
            onClick={() => {
              setActionOpen(true);
              onClose?.();
            }}
            className="inline-flex items-center justify-center rounded-md bg-slate-600 px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-slate-700 min-w-[110px] shadow-sm"
          >
            Details of Action Taken
          </button>
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
      </div>,
        )}

      {/* All pop-up boxes are mounted on document.body: inside the table cell the other cells painted over them */}
      {createPortal(
        <>
      <OrderReceivedModal
        show={orderRecvOpen}
        enquiry={row.original}
        onClose={() => setOrderRecvOpen(false)}
        onDone={() => table.options.meta?.refetch?.()}
      />
      <ActionTakenModal
        show={actionOpen}
        enquiry={row.original}
        onClose={() => setActionOpen(false)}
        onDone={() => table.options.meta?.refetch?.()}
      />
      {orderInfo && orderInfo.quotation_type === "calibration" && (
        <CalMarkConvertedModal
          show={orderOpen}
          id={orderInfo.quotation_id}
          onClose={() => setOrderOpen(false)}
          onSuccess={() => table.options.meta?.refetch?.()}
        />
      )}
      {orderInfo && orderInfo.quotation_type !== "calibration" && (
        <TestMarkConvertedModal
          show={orderOpen}
          id={orderInfo.quotation_id}
          onClose={() => setOrderOpen(false)}
          onSuccess={() => table.options.meta?.refetch?.()}
        />
      )}

      {sendInfo && (
        <QuotationDispatchModal
          show={sendOpen}
          id={sendInfo.quotation_id}
          type={sendInfo.quotation_type}
          onClose={() => setSendOpen(false)}
          defaultEmail={sendInfo.email}
          quotationNo={sendInfo.quotationno}
          customerName={sendInfo.customername}
        />
      )}
      <LostEnquiryModal
        show={lostOpen}
        enquiry={row.original}
        onClose={() => setLostOpen(false)}
        onDone={() => table.options.meta?.refetch?.()}
      />
      <ForwardEnquiryModal
        show={forwardOpen}
        enquiry={row.original}
        onClose={() => setForwardOpen(false)}
        onDone={() => table.options.meta?.refetch?.()}
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
        </>,
        document.body,
      )}
    </>
  );
}

RowActions.propTypes = {
  row: PropTypes.object,
  table: PropTypes.object,
  open: PropTypes.bool,
  onClose: PropTypes.func,
  anchorRect: PropTypes.object,
  inline: PropTypes.bool,
};
