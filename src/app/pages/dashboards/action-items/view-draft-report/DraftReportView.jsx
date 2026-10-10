// DraftReportView.jsx — Standalone Page
// Route : view-draft-report/:id
// Prints: ExportReportWithLH.jsx → exporttestingreport.php (with letter head)
//         ExportReportWoLH.jsx   → exporttestingreportwolh.php (without letter head)

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import PropTypes from "prop-types";
import axios from "utils/axios";
import { toast } from "sonner";
import clsx from "clsx";
import { Page } from "components/shared/Page";

// ── PDF Export ─────────────────────────────────────────────────────────────
// PHP: exporttestingreport.php   → Print Report With Letter Head
// PHP: exporttestingreportwolh.php → Print Report Without Letter Head
import { ExportWithLHButton } from "./ExportReportWithLH";
import { ExportWoLHButton } from "./ExportReportWoLH";

// ── Helpers ────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr)
      .toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .replace(/\//g, ".");
  } catch {
    return dateStr;
  }
}

function resultColorClass(rowOrResult, specification, rmin, rmax, rmininclude, rmaxinclude) {
  const row =
    typeof rowOrResult === "object" && rowOrResult !== null
      ? rowOrResult
      : {
        result: rowOrResult,
        specification,
        rmin,
        rmax,
        rmininclude,
        rmaxinclude,
      };

  if (!row) return "";

  // 1. Direct Backend Compliance Style if provided (PHP: $sflag)
  const sflag = row.compliance_style || row.sflag;
  if (typeof sflag === "string" && sflag.trim()) {
    if (sflag.includes("#008d4c") || sflag.includes("green")) {
      return "bg-[#008d4c] text-white text-center";
    }
    if (sflag.includes("#ff0000") || sflag.includes("red")) {
      return "bg-[#ff0000] text-white text-center";
    }
  }

  // 2. Formula string check (PHP: if (!($isstr === 0)))
  const formula = String(row.formula || row.formu || "").trim().toUpperCase();
  if (formula.startsWith("STR")) {
    return "";
  }

  // 3. Non-numeric results shouldn't be evaluated against min/max
  const resultRaw =
    row.result !== undefined && row.result !== null ? String(row.result).trim() : "";
  if (!resultRaw) return "";
  const val = parseFloat(resultRaw);
  if (isNaN(val)) return "";

  // 4. Permissible numeric bounds (PHP: pvaluemin / pvaluemax)
  const rminRaw = row.rmin ?? row.pvaluemin ?? row.pvalue_min;
  const rmaxRaw = row.rmax ?? row.pvaluemax ?? row.pvalue_max;
  const rminIncRaw = row.rmininclude ?? row.pvaluemininclude ?? row.pvalue_min_include;
  const rmaxIncRaw = row.rmaxinclude ?? row.pvaluemaxinclude ?? row.pvalue_max_include;

  const hasExplicitMin =
    rminRaw !== undefined &&
    rminRaw !== null &&
    String(rminRaw).trim() !== "" &&
    !isNaN(parseFloat(rminRaw));
  const hasExplicitMax =
    rmaxRaw !== undefined &&
    rmaxRaw !== null &&
    String(rmaxRaw).trim() !== "" &&
    !isNaN(parseFloat(rmaxRaw));

  if (hasExplicitMin || hasExplicitMax) {
    const min = hasExplicitMin ? parseFloat(rminRaw) : -1000;
    const max = hasExplicitMax ? parseFloat(rmaxRaw) : 1000;
    const incMin = parseInt(rminIncRaw) === 1;
    const incMax = parseInt(rmaxIncRaw) === 1;

    let isPass = false;
    if (incMin && incMax) {
      isPass = (val === min || val > min) && (val === max || val < max);
    } else if (incMin && !incMax) {
      isPass = (val === min || val > min) && val < max;
    } else if (!incMin && incMax) {
      isPass = val > min && (val === max || val < max);
    } else {
      isPass = val > min && val < max;
    }

    return isPass
      ? "bg-[#008d4c] text-white text-center"
      : "bg-[#ff0000] text-white text-center";
  }

  // 5. Fallback: Parse specification string (e.g. "Max.0 30", "Min.51.0", "10 to 20")
  if (row.specification) {
    const specStr = String(row.specification).trim();

    // Check for degrees and minutes format (e.g., "Max.0 30" or "Max. 0 30" -> max 30)
    const degMinMatch = specStr.match(/^max\.?\s*(\d+)\s+(\d+)/i);
    if (degMinMatch) {
      const deg = parseFloat(degMinMatch[1]);
      const minAngle = parseFloat(degMinMatch[2]);
      const maxLimit = deg === 0 ? minAngle : deg * 60 + minAngle;
      return val <= maxLimit
        ? "bg-[#008d4c] text-white text-center"
        : "bg-[#ff0000] text-white text-center";
    }

    // Check for combined "Min X Max Y" format
    const minMaxMatch = specStr.match(/min\.?\s*([\d.]+).*?max\.?\s*([\d.]+)/i);
    if (minMaxMatch) {
      const minVal = parseFloat(minMaxMatch[1]);
      const maxVal = parseFloat(minMaxMatch[2]);
      return val >= minVal && val <= maxVal
        ? "bg-[#008d4c] text-white text-center"
        : "bg-[#ff0000] text-white text-center";
    }

    const maxMatch = specStr.match(/^max\.?\s*([\d.]+)/i);
    if (maxMatch) {
      return val <= parseFloat(maxMatch[1])
        ? "bg-[#008d4c] text-white text-center"
        : "bg-[#ff0000] text-white text-center";
    }

    const minMatch = specStr.match(/^min\.?\s*([\d.]+)/i);
    if (minMatch) {
      return val >= parseFloat(minMatch[1])
        ? "bg-[#008d4c] text-white text-center"
        : "bg-[#ff0000] text-white text-center";
    }

    const rangeMatch = specStr.match(/([\d.]+)\s*(?:to|-)\s*([\d.]+)/i);
    if (rangeMatch) {
      const lo = parseFloat(rangeMatch[1]);
      const hi = parseFloat(rangeMatch[2]);
      return val >= lo && val <= hi
        ? "bg-[#008d4c] text-white text-center"
        : "bg-[#ff0000] text-white text-center";
    }
  }

  return "";
}

// ── Request Re-test Button ─────────────────────────────────────────────────
function ReTestButton({ testEventId, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const handleRequest = useCallback(async () => {
    setLoading(true);
    try {
      await axios.get(`/actionitem/request-reset/${testEventId}`);
      toast.success("Re-test requested successfully ✅");
      onSuccess?.();
    } catch (err) {
      toast.error(
        err?.response?.data?.message ?? "Failed to request re-test ❌",
      );
    } finally {
      setLoading(false);
    }
  }, [testEventId, onSuccess]);
  return (
    <button
      onClick={handleRequest}
      disabled={loading}
      className={clsx(
        "rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700",
        loading && "cursor-not-allowed opacity-60",
      )}
    >
      {loading ? "..." : "Request Re-test"}
    </button>
  );
}
ReTestButton.propTypes = {
  testEventId: PropTypes.any,
  onSuccess: PropTypes.func,
};

// ── Submit HOD Section ──────────────────────────────────────────────────────
function HodSubmitSection({ tid, partial, allottedItems, disposable, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [hodremark, setHodremark] = useState("");

  const activeItems = (allottedItems ?? []).filter((item) => (item.qleft ?? 0) > 0);
  const [itemInputs, setItemInputs] = useState(() =>
    activeItems.map(() => ({ remnant: "", remark: "" }))
  );

  const setItemField = (idx, field, val) =>
    setItemInputs((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));

  const handleSubmit = useCallback(async () => {
    for (let i = 0; i < activeItems.length; i++) {
      const remnantVal = itemInputs[i]?.remnant;
      if (remnantVal === "" || remnantVal === null || remnantVal === undefined) {
        toast.error(`Please enter Remnant Quantity for row ${i + 1}.`);
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        aid: tid,
        hodremark,
        qid: activeItems.map((item) => item.qid ?? item.id),
        remnant: itemInputs.map((r) => r.remnant ?? ""),
        remark: itemInputs.map((r) => r.remark ?? ""),
        itemdepartment: activeItems.map((item) => item.department_id ?? item.department),
      };
      await axios.post(`/actionitem/submit-hod-request?aid=${tid}`, payload);
      toast.success(`Submitted for ${partial ? "Partial " : ""}HOD Review ✅`);
      onSuccess?.();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Submission failed ❌");
    } finally {
      setLoading(false);
    }
  }, [tid, partial, hodremark, itemInputs, activeItems, onSuccess]);

  return (
    <div className="mt-6 w-full rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-dark-800">
      <textarea
        value={hodremark}
        onChange={(e) => setHodremark(e.target.value)}
        placeholder="Add Remark"
        rows={3}
        className="mb-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-dark-700 dark:text-gray-200 dark:focus:ring-blue-900"
      />

      <div
        className={clsx(
          "mb-4 rounded-lg px-4 py-2 text-left text-sm font-semibold",
          disposable === 2
            ? "bg-red-50 text-red-600 dark:bg-red-900/20"
            : "bg-green-50 text-green-700 dark:bg-green-900/20"
        )}
      >
        {disposable === 2
          ? "This Item Is To Be Return — Not To Be Disposed"
          : "This Item Is To Be Disposed"}
      </div>

      {activeItems.length > 0 && (
        <div className="mb-4 overflow-x-auto rounded-lg border border-gray-200 text-left dark:border-gray-700">
          <table className="w-full text-xs">
            <thead className="bg-gray-100 dark:bg-dark-700">
              <tr>
                {["ID", "Quantity", "Allotted", "Left", "Department", "Remnant", "Remark"].map(
                  (h) => (
                    <th
                      key={h}
                      className="border-b border-gray-200 px-3 py-2 text-center font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {activeItems.map((item, i) => (
                <tr
                  key={item.id ?? i}
                  className="border-b border-gray-100 last:border-0 dark:border-gray-700"
                >
                  <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">
                    {item.id ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">
                    {item.quantity_name ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">
                    {item.alloted ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">
                    {item.qleft ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">
                    {item.department_name ?? "—"}
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      min={0}
                      max={item.qleft}
                      value={itemInputs[i]?.remnant ?? ""}
                      onChange={(e) => setItemField(i, "remnant", e.target.value)}
                      placeholder="Remnant qty"
                      className="w-24 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-dark-700 dark:text-gray-200"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <textarea
                      rows={2}
                      value={itemInputs[i]?.remark ?? ""}
                      onChange={(e) => setItemField(i, "remark", e.target.value)}
                      placeholder="Remark for remnant"
                      className="w-36 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-dark-700 dark:text-gray-200"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-dark-800">
              <tr>
                {["ID", "Quantity", "Allotted", "Left", "Department", "Remnant", "Remark"].map(
                  (h) => (
                    <th
                      key={h}
                      className="border-t border-gray-200 px-3 py-2 text-center font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className={clsx(
          "w-full rounded-lg bg-green-600 py-3 text-sm font-semibold text-white shadow transition hover:bg-green-700",
          loading && "cursor-not-allowed opacity-60"
        )}
      >
        {loading
          ? "Submitting..."
          : `Submit For ${partial ? "Partial " : ""}HOD Review`}
      </button>
    </div>
  );
}
HodSubmitSection.propTypes = {
  tid: PropTypes.any,
  partial: PropTypes.bool,
  allottedItems: PropTypes.array,
  disposable: PropTypes.number,
  onSuccess: PropTypes.func,
};

// ── Info Row ──────────────────────────────────────────────────────────────
function InfoRow({ label, value }) {
  return (
    <tr className="border-b border-gray-200 dark:border-gray-700">
      <td className="border-r border-gray-200 p-2 text-xs font-semibold whitespace-nowrap text-gray-600 dark:border-gray-700 dark:text-gray-400">
        {label}
      </td>
      <td className="p-2 text-xs text-gray-800 dark:text-gray-200">
        {value ?? "—"}
      </td>
    </tr>
  );
}
InfoRow.propTypes = { label: PropTypes.string, value: PropTypes.any };

// ── Main Page ─────────────────────────────────────────────────────────────
export default function DraftReportView() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hodId = searchParams.get("hod_id") ?? "";

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReport = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ tid: id });
      if (hodId) params.append("hod_id", hodId);
      const res = await axios.get(`/actionitem/view-draft-report?${params}`);
      setReport(res.data?.data ?? res.data ?? null);
    } catch (err) {
      setError(err?.response?.data?.message ?? "Failed to load report.");
    } finally {
      setLoading(false);
    }
  }, [id, hodId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  if (loading)
    return (
      <Page title="Draft Report">
        <div className="flex h-[60vh] items-center justify-center gap-3 text-gray-500">
          <svg
            className="h-5 w-5 animate-spin text-blue-600"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 000 8v4a8 8 0 01-8-8z"
            />
          </svg>
          Loading Report...
        </div>
      </Page>
    );

  if (error)
    return (
      <Page title="Draft Report">
        <div className="flex h-60 flex-col items-center justify-center gap-4 rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-500">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200"
          >
            ← Go Back
          </button>
        </div>
      </Page>
    );

  if (!report) return null;

  // ── Destructure ───────────────────────────────────────────────────────
  const {
    trf_product = {},
    nabl,
    size,
    grade,
    batchNo,
    report_status,
    dates = {},
    customer = {},
    received_items = [],
    results = [],
    hod_remark,
    witness,
    witness_detail,
    signatories = [],
    allotted_items = [],
    counts = {},
    permissions = [],
  } = report;

  const {
    lrn,
    brn: reference_no,
    ulr,
    condition,
    sealed,
    reportdate: report_date,
  } = trf_product;
  const { start_date, end_date } = dates;
  const {
    left: left_count = 0,
    done: done_count = 0,
    deleted: delete_count = 0,
    total_params: param_count = 0,
    left_my_department: left_my_department_count = 0,
  } = counts;

  // ── Derived flags (matching PHP logic exactly) ─────────────────────────
  const showCustomerBlock = Number(report_status) > 6;
  const sessionPermissions = (localStorage.getItem("userPermissions") || "")
    .split(",")
    .map(p => p.trim())
    .filter(Boolean);

  const hasPermission = (p) =>
    permissions.includes(p) ||
    permissions.includes(Number(p)) ||
    sessionPermissions.includes(String(p));

  const canRequestRetest = hasPermission(180) || hasPermission(181);

  // PHP: if(in_array(180,$perm)||in_array(181,$perm)) if($reportstatus<9 && !empty($leftmydepartment)) → show Actions <th>
  const showActionsColumn =
    canRequestRetest && report_status < 9 && left_my_department_count > 0;

  // PHP: every row gets the button when permissions + reportstatus < 9
  // Falling back to true if no strict ownership flags are present in the row
  const shouldShowRetestBtn = (row) =>
    showActionsColumn && (
      row.is_my_department === true ||
      row.my_department === 1 ||
      row.can_retest === true ||
      (report.available_actions && report.available_actions.some(a => (a.id ?? a) == row.id)) ||
      (!row.is_my_department && !row.can_retest) // Fallback for APIs with no ownership flags
    );

  const showPartialHod =
    left_my_department_count > 0 &&
    (left_count > 0 || param_count > done_count + delete_count) &&
    done_count > 0;

  const showFullHod =
    left_my_department_count > 0 &&
    !(left_count > 0 || param_count > done_count + delete_count);

  const quantitiesStr = received_items.length
    ? received_items
      .map((q) => {
        if (!q.unit) return String(q.received ?? "");
        if (q.unit === "NA") return "NA";
        if (String(q.unit).startsWith(String(q.received))) return q.unit;
        return `${q.received} ${q.unit}`.trim();
      })
      .join(", ")
    : null;

  const conditionMap = { 1: "Good", 2: "Fair", 3: "Poor" };
  const sealedMap = { 0: "Unsealed", 1: "Sealed", 2: "Packed", 3: "NA" };

  const remarkLines = [];
  if (hod_remark) remarkLines.push(hod_remark);
  if ((witness === "1" || witness === 1) && witness_detail)
    remarkLines.push(`The test was witnessed by ${witness_detail}`);

  // NABL Search logic for BDL/ADL Remarks
  const hasBDL = results.some(r => r.nabl_bdl);
  const hasADL = results.some(r => r.nabl_adl);
  const hasSpecs = Number(typeof trf_product !== "undefined" ? trf_product?.specification_flag : null) === 2 ? false : ((typeof trf_product !== "undefined" && Number(trf_product?.specification_flag) === 1) || results.some((r) => r.specification && r.specification !== "-" && r.specification !== "—"));
  const hasSplitSpecs = hasSpecs && results.some((r) => r.specification && String(r.specification).includes("|"));
  if (hasBDL && !hasSplitSpecs) remarkLines.push("BDL : Below Detection Limit");
  if (hasADL) remarkLines.push("ADL : Above Detection Limit");

  return (
    <Page title={`Draft Report — ${lrn ?? id}`}>
      <div className="transition-content px-[var(--margin-x)] pb-8">
        {/* ── Page Header ───────────────────────────────────────── */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex items-center justify-center rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-dark-400 dark:hover:text-gray-200"
              title="Go Back"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <h1 className="text-base font-semibold text-gray-800 dark:text-gray-100">
              Final Report
            </h1>
          </div>

          {/*
            PHP: href="exporttestingreport.php?hakuna=tid&what=hid"   → With Letter Head
            PHP: href="exporttestingreportwolh.php?hakuna=tid&what=hid" → Without Letter Head
            React: @react-pdf/renderer generates & downloads PDF client-side
          */}
          <div className="no-print flex items-center gap-2">
            <ExportWithLHButton data={report} />
            <ExportWoLHButton data={report} />
          </div>
        </div>

        {/* ── Report Card ───────────────────────────────────────── */}
        <div className="dark:bg-dark-800 rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700">
          <div className="px-6 py-6">
            {/* NABL logo + heading */}
            <div className="mb-2 flex flex-col items-center gap-1">
              {/* NABL / QAI Logo */}
              {(nabl && nabl !== "0" && nabl !== 0) && (
                <img
                  src={
                    (typeof nabl === "object" ? nabl?.logo : null) ||
                    (Number(nabl) === 3 ? "/images/qai.jpeg" : "/images/nabltest.png")
                  }
                  alt="Accreditation Logo"
                  className="h-16 w-auto object-contain"
                />
              )}
              <h1 className="text-xl font-bold tracking-wide text-gray-900 underline dark:text-gray-100">
                TEST REPORT
              </h1>
            </div>

            {/* ULR + Ref No */}
            <div className="mb-4 flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
              <span>{nabl && nabl !== "0" && nabl !== 0 && ulr ? `ULR: ${ulr}` : ""}</span>
              <span>{reference_no ?? ""}</span>
            </div>

            {/* ── Customer Info (status > 6) ──────────────────── */}
            {showCustomerBlock && (
              <div className="mb-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs">
                  <tbody>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <td
                        className="w-2/5 border-r border-gray-200 p-3 align-top dark:border-gray-700"
                        rowSpan={7}
                      >
                        <p className="mb-1 font-semibold text-gray-700 dark:text-gray-300">
                          Name and Address of Customer
                        </p>
                        <p className="text-gray-800 dark:text-gray-200">
                          {customer.name}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400">
                          {customer.address}
                        </p>
                        {customer.contact_person && (
                          <p className="mt-1 text-gray-700 dark:text-gray-300">
                            Contact Person: {customer.contact_person}
                          </p>
                        )}
                      </td>
                      <td className="w-1/4 border-r border-gray-200 p-2 font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                        Laboratory Reference Number (LRN)
                      </td>
                      <td className="p-2 text-gray-800 dark:text-gray-200">
                        {lrn}
                      </td>
                    </tr>
                    <InfoRow
                      label="Date of Receipt"
                      value={formatDate(trf_product.added_on)}
                    />
                    <InfoRow
                      label="Condition, When Received"
                      value={conditionMap[condition] ?? condition}
                    />
                    <InfoRow
                      label="Packing, When Received"
                      value={sealedMap[sealed] ?? sealed}
                    />
                    <InfoRow
                      label="Quantity Received (Approx.)"
                      value={quantitiesStr}
                    />
                    <InfoRow
                      label="Date of Start Of Test"
                      value={formatDate(start_date)}
                    />
                    <InfoRow
                      label="Date of Completion"
                      value={formatDate(end_date)}
                    />
                  </tbody>
                  <tbody>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <td className="border-r border-gray-200 p-2 text-gray-700 dark:border-gray-700 dark:text-gray-300">
                        Sample Identification: {size}
                      </td>
                      <td className="border-r border-gray-200 p-2 font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                        Date of Reporting
                      </td>
                      <td className="p-2 text-gray-800 dark:text-gray-200">
                        {formatDate(report_date)}
                      </td>
                    </tr>
                    <tr>
                      <td
                        colSpan={3}
                        className="p-2 text-gray-700 dark:text-gray-300"
                      >
                        Sample Particulars: &nbsp; Grade: {grade} &nbsp;{" "}
                        {typeof batchNo === "string" && batchNo.includes("<br/>")
                          ? batchNo.split("<br/>").map((part, i) => (
                            <span key={i}>
                              {i > 0 && <br />}
                              {part}
                            </span>
                          ))
                          : batchNo}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* ── TEST RESULTS ──────────────────────────────────── */}
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-bold text-gray-800 dark:text-gray-100">
                TEST RESULTS
              </h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead className="dark:bg-dark-700 bg-gray-100">
                    {hasSpecs && hasSplitSpecs ? (
                      <>
                        <tr>
                          {[
                            "S.NO",
                            "PARAMETER",
                            "UNIT",
                            "RESULTS",
                            "TEST METHOD",
                          ].map((h) => (
                            <th
                              key={h}
                              rowSpan={2}
                              className="border-b border-gray-200 px-3 py-2 text-center font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300"
                            >
                              {h}
                            </th>
                          ))}
                          <th
                            colSpan={2}
                            className="border-b border-gray-200 px-3 py-2 text-center font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300"
                          >
                            Requirement
                          </th>
                          {showActionsColumn && (
                            <th
                              rowSpan={2}
                              className="no-print border-b border-gray-200 px-3 py-2 text-center font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300"
                            >
                              Actions
                            </th>
                          )}
                        </tr>
                        <tr>
                          <th className="border-b border-gray-200 px-3 py-2 text-center font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300">
                            Acceptable Limit
                          </th>
                          <th className="border-b border-gray-200 px-3 py-2 text-center font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300">
                            Permissible Limit
                          </th>
                        </tr>
                      </>
                    ) : (
                      <tr>
                        {[
                          "S.NO",
                          "PARAMETER",
                          "UNIT",
                          "RESULTS",
                          "TEST METHOD",
                        ].map((h) => (
                          <th
                            key={h}
                            className="border-b border-gray-200 px-3 py-2 text-center font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300"
                          >
                            {h}
                          </th>
                        ))}
                        {hasSpecs && (
                          <th className="border-b border-gray-200 px-3 py-2 text-center font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300">
                            SPECIFICATIONS
                          </th>
                        )}
                        {showActionsColumn && (
                          <th className="no-print border-b border-gray-200 px-3 py-2 text-center font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300">
                            Actions
                          </th>
                        )}
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {results.length === 0 ? (
                      <tr>
                        <td
                          colSpan={hasSpecs ? (hasSplitSpecs ? 8 : 7) : 6}
                          className="py-8 text-center text-xs text-gray-400"
                        >
                          No test results found.
                        </td>
                      </tr>
                    ) : (
                      results.map((row, idx) => {
                        const resCls = resultColorClass(row);

                        // Result text with NABL prefix
                        let displayResult = row.result ?? "—";

                        if (row.decimal !== undefined && row.decimal !== null && row.result !== null && row.result !== undefined) {
                          const numVal = Number(row.result);
                          if (!isNaN(numVal)) {
                            displayResult = numVal.toFixed(Number(row.decimal));
                          }
                        }

                        if (row.nabl_bdl) displayResult = `BDL< ${row.minnabl}`;
                        else if (row.nabl_adl) displayResult = `ADL> ${row.maxnabl}`;
                        const showBtn = shouldShowRetestBtn(row);
                        return (
                          <tr
                            key={row.id ?? idx}
                            className="border-b border-gray-100 last:border-0 dark:border-gray-700"
                          >
                            <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-2 text-gray-800 dark:text-gray-200">
                              {row.parameter}
                            </td>
                            <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">
                              {row.unit}
                            </td>
                            <td
                              className={clsx(
                                "px-3 py-2",
                                resCls ||
                                "text-center text-gray-700 dark:text-gray-300",
                              )}
                            >
                              {displayResult}
                            </td>
                            <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">
                              {row.method}
                            </td>
                            {hasSpecs && (
                              hasSplitSpecs ? (
                                <>
                                  <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">
                                    {row.specification && String(row.specification).includes("|")
                                      ? String(row.specification).split("|")[0].trim() || "—"
                                      : (row.specification ?? "—")}
                                  </td>
                                  <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">
                                    {row.specification && String(row.specification).includes("|")
                                      ? String(row.specification).split("|")[1].trim() || "—"
                                      : "—"}
                                  </td>
                                </>
                              ) : (
                                <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">
                                  {row.specification ?? "—"}
                                </td>
                              )
                            )}
                            {showActionsColumn && (
                              <td className="no-print px-3 py-2 text-center">
                                {showBtn && (
                                  <ReTestButton
                                    testEventId={row.id}
                                    onSuccess={fetchReport}
                                  />
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {hasSplitSpecs && (
                <div className="mt-2 text-xs font-bold text-gray-800 dark:text-gray-200">
                  Abbreviation : BDL – Below detection limit
                </div>
              )}
            </div>

            {/* ── Remarks ────────────────────────────────────────── */}
            {remarkLines.length > 0 && (
              <div className="dark:bg-dark-700 mb-4 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-700 dark:text-gray-300">
                <strong>Remark:</strong>{" "}
                {remarkLines.map((line, i) => (
                  <span key={i}>
                    {i > 0 && <br />}
                    {line}
                  </span>
                ))}
              </div>
            )}

            {/* ── End of Report ──────────────────────────────────── */}
            <div className="mb-6 text-center text-xs font-semibold text-gray-700 dark:text-gray-300">
              **End of Report**
            </div>

            {/* ── Signatories ─────────────────────────────────────── */}
            {signatories.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-6">
                {signatories.map((signer, i) => {
                  const signerName =
                    signer.name ||
                    `${signer.firstname ?? ""} ${signer.lastname ?? ""}`.trim();
                  const signerRole =
                    signer.authorize_for || signer.authorizefor || "";
                  return (
                    <div key={i} className="min-w-[180px]">
                      {signer.signed && signer.signature_image ? (
                        <img
                          src={signer.signature_image}
                          alt={`Signed by ${signerName}`}
                          className="h-16 object-contain"
                        />
                      ) : (
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          <p>{signerName}</p>
                          <p className="font-normal text-gray-500">
                            {signerRole}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── HOD Submit Actions ──────────────────────────────── */}
            <div className="flex items-center justify-center gap-4 pt-2">
              {showPartialHod && (
                <div className="flex w-full flex-col items-center gap-2 text-center">
                  <p className="text-xs text-gray-500">
                    {left_count} Tests Pending completion &nbsp;|&nbsp;{" "}
                    {param_count - (done_count + delete_count + left_count)}{" "}
                    Tests Pending Assignment
                  </p>
                  <HodSubmitSection
                    tid={id}
                    partial
                    allottedItems={allotted_items}
                    disposable={Number(trf_product?.disposable)}
                    onSuccess={() => navigate(-1)}
                  />
                </div>
              )}
              {showFullHod && !showPartialHod && (
                <HodSubmitSection
                  tid={id}
                  partial={false}
                  allottedItems={allotted_items}
                  disposable={Number(trf_product?.disposable)}
                  onSuccess={() => navigate(-1)}
                />
              )}
              {!showFullHod &&
                !showPartialHod &&
                left_my_department_count === 0 && (
                  <p className="text-xs text-gray-400">Nothing To Submit</p>
                )}
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}