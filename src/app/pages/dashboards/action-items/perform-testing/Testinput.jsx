// Import Dependencies
import { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "utils/axios";
import dayjs from "dayjs";
import { toast } from "sonner";
import clsx from "clsx";
import Select from "react-select";

// Local Imports
import { Page } from "components/shared/Page";
import { Card } from "components/ui";

const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: "42px",
    borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(59, 130, 246, 0.5)" : "none",
    "&:hover": {
      borderColor: "#3b82f6",
    },
  }),
  menu: (base) => ({
    ...base,
    zIndex: 9999,
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
  }),
};


function getMeasurementHistory(pid, elName) {
  try {
    const custom = JSON.parse(localStorage.getItem(`lims_meas_hist_${pid}`) || "[]");
    const defaults = [];
    if (elName && /visual|bend|observation|appearance|cracks|remark/i.test(elName)) {
      defaults.push(
        "No Cracks Observed",
        "Not required",
        "Cracks Observed",
        "Sample Broken",
        "No cracks observed on the outer surface",
        "-"
      );
    }
    return [...custom, ...defaults.filter((d) => !custom.includes(d))];
  } catch {
    return [];
  }
}

function saveMeasurementHistory(pid, val) {
  if (!val || typeof val !== "string" || !val.trim()) return;
  try {
    const key = `lims_meas_hist_${pid}`;
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    const updated = [val.trim(), ...existing.filter((x) => x !== val.trim())].slice(0, 20);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors (e.g. quota exceeded or private browsing mode)
  }
}

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin text-blue-600" viewBox="0 0 24 24">
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
  );
}

function ResultsTable({ results = [], decimal }) {
  const list = Array.isArray(results) ? results : results ? [results] : [];
  if (!list.length)
    return <p className="py-4 text-sm text-gray-400">No results found.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="bg-gray-200 dark:bg-gray-800 border-b border-gray-300">
            {[
              "S.No",
              "Parameter",
              "Unit",
              "Results",
              "Pass/Fail",
              "Test Method",
              "Permissible Value",
            ].map((h) => (
              <th
                key={h}
                className="border-r border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 uppercase last:border-r-0 dark:border-gray-700 dark:text-gray-300"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.map((r, i) => {
            const paramName =
              r.parameter_name ??
              (typeof r.parameter === "object" ? r.parameter?.name : r.parameter) ??
              "—";
            const unitText =
              typeof r.unit === "object"
                ? r.unit?.description || r.unit?.name || "—"
                : r.unit ?? "—";
            const resultVal =
              typeof r.result === "object"
                ? r.result?.display_value ?? r.result?.value ?? "—"
                : (() => {
                    const val = r.result ?? r.avg;
                    if (val === null || val === undefined) return "—";
                    const numVal = Number(val);
                    const dec = r.decimal ?? decimal;
                    if (
                      !isNaN(numVal) &&
                      dec !== undefined &&
                      dec !== null &&
                      dec !== ""
                    ) {
                      return numVal.toFixed(Number(dec));
                    }
                    return val;
                  })();
            const methodName =
              typeof r.method === "object"
                ? r.method?.name ?? "—"
                : r.method ?? "—";
            const spec = r.specification ?? "—";
            const rawStatus = String(r.compliance ?? r.status ?? "").toLowerCase().trim();

            return (
              <tr
                key={i}
                className="border-b border-gray-300 dark:border-gray-700 hover:bg-gray-50 transition-colors"
              >
                <td className="border-r border-gray-300 px-3 py-2 text-gray-500 last:border-r-0 dark:border-gray-700">
                  {r.sno ?? i + 1}
                </td>
                <td className="border-r border-gray-300 px-3 py-2 font-medium text-gray-800 last:border-r-0 dark:border-gray-700 dark:text-gray-200">
                  {paramName}
                </td>
                <td className="border-r border-gray-300 px-3 py-2 text-gray-600 last:border-r-0 dark:border-gray-700 dark:text-gray-400">
                  {unitText}
                </td>
                <td className="border-r border-gray-300 px-3 py-2 font-semibold text-gray-800 last:border-r-0 dark:border-gray-700 dark:text-gray-100">
                  {resultVal}
                </td>
                <td className="border-r border-gray-300 px-3 py-2 text-center last:border-r-0 dark:border-gray-700">
                  {rawStatus === "pass" && (
                    <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      Pass
                    </span>
                  )}
                  {rawStatus === "fail" && (
                    <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-900/30 dark:text-red-400">
                      Fail
                    </span>
                  )}
                  {rawStatus !== "pass" && rawStatus !== "fail" && (
                    <span className="text-xs text-gray-400">
                      {r.status || "—"}
                    </span>
                  )}
                </td>
                <td className="border-r border-gray-300 px-3 py-2 text-gray-600 last:border-r-0 dark:border-gray-700 dark:text-gray-400">
                  {methodName}
                </td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                  {spec}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SET END DATE MODAL
// PHP: modal-setEndDate → submiEndDate() → finalsubmitdata.php?updating&enddate=
// API: POST /actionitem/finalise-test-event { id, enddate: "dd/mm/yyyy" }
// ─────────────────────────────────────────────────────────────────────────────
function SetEndDateModal({ teid, startDate, onClose, onFinalised }) {
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!endDate) {
      toast.error("Please select an end date.");
      return;
    }
    const [y, m, d] = endDate.split("-");
    const formatted = `${d}/${m}/${y}`; // PHP: changedateformatespecito → dd/mm/yyyy
    try {
      setSubmitting(true);
      await axios.post("/actionitem/finalise-test-event", {
        id: teid,
        enddate: formatted,
      });
      toast.success("Test finalised successfully ✅");
      onFinalised?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Finalise failed ❌");
    } finally {
      setSubmitting(false);
    }
  };

  // PHP: datepickerminmaxlimit(this.id, startdate, today)
  // startdate format from API: "11-03-2026 05:00 PM"  (dd-mm-yyyy h:i A)
  const minDate = (() => {
    if (!startDate) return undefined;
    try {
      const datePart = startDate.split(" ")[0]; // e.g. "2022-07-13", "13-07-2022", "13/07/2022"
      const parts = datePart.split(/[-/]/);

      // If the first part is a 4-digit year, it's already YYYY-MM-DD
      if (parts[0]?.length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
      // Otherwise, assume it's DD-MM-YYYY and convert it
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      return undefined;
    } catch {
      return undefined;
    }
  })();
  const maxDate = dayjs().format("YYYY-MM-DD");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <h3 className="dark:text-dark-100 mb-4 text-base font-semibold text-gray-800">
          Set Test End Date
        </h3>
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-gray-500">
            End Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={endDate}
            min={minDate}
            max={maxDate}
            onChange={(e) => setEndDate(e.target.value)}
            onClick={(e) => e.target.showPicker && e.target.showPicker()}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400"
          >
            Close
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={clsx(
              "rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700",
              submitting && "cursor-not-allowed opacity-60",
            )}
          >
            {submitting ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
// IS 2 : 1960 rounding (exact half -> nearest even digit). Used for the live average preview only;
// the saved result is calculated on the server with the same rule.
function roundIs2(value, decimals) {
  const factor = Math.pow(10, decimals);
  const scaled = Math.round(Number((value * factor).toPrecision(12)) * 1e6) / 1e6;
  const floor = Math.floor(scaled);
  const diff = scaled - floor;
  let r;
  if (diff < 0.5 - 1e-9) r = floor;
  else if (diff > 0.5 + 1e-9) r = floor + 1;
  else r = floor % 2 === 0 ? floor : floor + 1;
  return r / factor;
}

export default function TestInput() {
  const { teid } = useParams();
  const navigate = useNavigate();

  const [testData, setTestData] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [retesting, setRetesting] = useState(false);
  const [endDateModal, setEndDateModal] = useState(false);

  // Form state
  const [temperature, setTemperature] = useState("27");
  const [humidity, setHumidity] = useState("30");
  const [remark, setRemark] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [instruments, setInstruments] = useState({});
  const [consumables, setConsumables] = useState({});
  const [measurements, setMeasurements] = useState({});


  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/actionitem/get-test-event/${teid}`);
      const d = res.data?.data ?? res.data ?? null;
      setTestData(d);

      const evt = d?.test_event ?? {};
      setTemperature(String(evt.temperature ?? "27"));
      setHumidity(String(evt.humidity ?? "30"));
      setRemark(evt.remark ?? "");
    } catch (err) {
      console.error("Error loading test event:", err);
      toast.error("Failed to load test data.");
    } finally {
      setLoading(false);
    }
  }, [teid]);

  // ── GET /actionitem/get-test-result/:teid ────────────────────────────────
  // Response: { success, data: { parameter, unit, min, max, avg, result,
  //                              status, method, specification } }
  const fetchResults = useCallback(async () => {
    try {
      const res = await axios.get(`/actionitem/get-test-result/${teid}`);
      const d = res.data?.data ?? res.data ?? null;
      setResults(d ? (Array.isArray(d) ? d : [d]) : []);
    } catch (err) {
      console.error("Error loading results:", err);
    }
  }, [teid]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Derived values ────────────────────────────────────────────────────────
  const evt = testData?.test_event ?? {};
  const prow = testData?.parameter ?? {};
  const status = Number(evt.status ?? 0);

  // Debug: Log status to console
  console.log("Test Event Status:", status, "Raw:", evt.status);

  const trfproduct = evt.trfproduct ?? ""; // PHP: $trfproduct → back button
  const has_documents = Boolean(testData?.has_documents ?? false);
  const lrn = testData?.lrn ?? "";
  const rawCycle = Number(testData?.cycle ?? prow.cycle ?? 1);
  const cycle = isNaN(rawCycle) || rawCycle < 1 ? 1 : rawCycle;
  // AAC format (set on the parameter): 24 values per reading shown as a 3 x 8 sample grid
  const isAac = testData?.format_type === "AAC";

  // parameter_elements[].measurement_id = PHP $pid = $frow['element']
  const paramElements = Array.isArray(testData?.parameter_elements)
    ? testData.parameter_elements
    : [];
  // AAC parameters with ONE measurement (length / width / height, thermal conductivity) use the 3 x 8 sample grid;
  // AAC parameters with several measurements per sample (blocks, cubes, shrinkage) keep the row-per-sample table below, with a Sample label.
  const aacGrid = isAac && paramElements.length === 1;

  // ── FIX: instruments options — Array OR keyed Object ─────────────────────
  // "275": options = [...Array...]     → use as-is
  // "4":   options = {"2":{}, "3":{}} → Object.values() → Array
  const instrList = Array.isArray(testData?.instruments)
    ? testData.instruments.map((instr) => ({
      ...instr,
      options: Array.isArray(instr.options)
        ? instr.options
        : Object.values(instr.options ?? {}), // ✅ always Array now
    }))
    : [];

  const consumList = Array.isArray(testData?.consumables)
    ? testData.consumables
    : [];

  // Pre-select saved instruments from evt.instruments = ",275,4," string
  // PHP: $iinstruments = explode(",", $instruments)
  //      if (in_array($brow['id'], $iinstruments)) echo "selected='selected'"
  useEffect(() => {
    if (!evt.instruments || instrList.length === 0) return;
    const savedIds = String(evt.instruments || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!savedIds.length) return;
    const preSelected = {};
    instrList.forEach((cat) => {
      const match = cat.options.find((opt) =>
        savedIds.includes(String(opt.id)),
      );
      if (match) preSelected[cat.id] = String(match.id);
    });
    if (Object.keys(preSelected).length > 0) setInstruments(preSelected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testData]);

  // Fetch results when status == 24
  useEffect(() => {
    if (status === 24) fetchResults();
  }, [status, fetchResults]);

  const handleMeasurement = (cycleIdx, pid, value) => {
    setMeasurements((prev) => ({
      ...prev,
      [cycleIdx]: { ...(prev[cycleIdx] ?? {}), [pid]: value },
    }));
  };

  // ── POST /actionitem/add-test-data ───────────────────────────────────────
  // FormData fields (confirmed from Postman screenshot):
  //   teid, temperature, humidity, remark, attachment (File)
  //   instruments[0], instruments[1]...
  //   materiallocationid[0], materiallocationid[1]...
  //   quantity[0], quantity[1]...
  //   {measurement_id}[]  e.g. "446[]", "7[]", "15[]"  (per cycle)
  const handleSubmit = async () => {
    // Validate consumables
    for (const con of consumList) {
      const conId = con.id ?? con.mid;
      const selected = consumables[conId];
      if (!selected?.materiallocationid) {
        toast.error(`Please check stock/batch for consumable: ${con.name}`);
        return;
      }
      if (!selected?.quantity) {
        toast.error(`Please enter quantity for consumable: ${con.name}`);
        return;
      }
    }

    if (isAac) {
      for (const el of paramElements) {
        for (let i = 0; i < cycle; i++) {
          const v = String(measurements[i]?.[el.measurement_id] ?? "").trim();
          if (v === "" || isNaN(Number(v))) {
            toast.error(`Enter all ${cycle} values as numbers (Sample-${i + 1} of ${el.name} is empty or invalid)`);
            return;
          }
        }
      }
    }

    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append("teid", teid);
      fd.append("temperature", temperature);
      fd.append("humidity", humidity);
      fd.append("remark", remark);
      if (attachment) fd.append("attachment", attachment);

      // PHP: name="instrument['{$aid}']"  where $aid is instrument category ID
      Object.entries(instruments).forEach(([catId, val]) => {
        if (val) fd.append(`instrument[${catId}]`, val);
      });

      // PHP: name="materiallocationid['{$mid}']" and name="quantity['{$mid}']"
      Object.entries(consumables).forEach(([mid, vals]) => {
        fd.append(`materiallocationid[${mid}]`, vals.materiallocationid ?? "");
        fd.append(`quantity[${mid}]`, vals.quantity ?? "");
      });

      // PHP: name="{$pid}[]" → "$pid = $frow['element']" = measurement_id from API
      paramElements.forEach((el) => {
        const pid = el.measurement_id;
        for (let i = 0; i < cycle; i++) {
          const val = measurements[i]?.[pid] ?? "";
          fd.append(`${pid}[]`, val);
          if (val) saveMeasurementHistory(pid, val);
        }
      });

      await axios.post("/actionitem/add-test-data", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Test data submitted successfully ✅");

      // Refetch data to get updated status and show results on same page
      await fetchData();
      await fetchResults();
    } catch (err) {
      console.error("Submit error:", err);
      toast.error(err?.response?.data?.message ?? err?.response?.data?.error ?? "Submit failed ❌");
    } finally {
      setSubmitting(false);
    }
  };

  // ── POST /actionitem/finalise-test-event ─────────────────────────────────
  // PHP: finalsubmitdata.php — direct (no enddate, has_documents == false)
  const handleFinalise = async () => {
    try {
      setSubmitting(true);
      await axios.post("/actionitem/finalise-test-event", { id: teid });
      toast.success("Test finalised successfully ✅");
      navigate(`/dashboards/action-items/perform-testing/${trfproduct}`);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Finalise failed ❌");
    } finally {
      setSubmitting(false);
    }
  };

  // ── POST /actionitem/request-reset/:teid ─────────────────────────────────
  // PHP: requestretest.php
  const handleRetest = async () => {
    if (!window.confirm("Request a retest for this test?")) return;
    try {
      setRetesting(true);
      await axios.get(`/actionitem/request-reset/${teid}`);
      toast.success("Reload : Re-Test Requested");
      setTimeout(() => {
        window.location.reload();
      }, 1000); // Small delay so the user can read the toast before refresh
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Retest request failed ❌");
    } finally {
      setRetesting(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Page title="Test Input">
        <div className="flex h-[60vh] items-center justify-center gap-3 text-gray-500">
          <Spinner /> Loading...
        </div>
      </Page>
    );
  }
  if (!testData) {
    return (
      <Page title="Test Input">
        <div className="flex h-[60vh] items-center justify-center text-gray-400">
          Nothing Here
        </div>
      </Page>
    );
  }

  return (
    <Page title="Test Input">
      <div className="transition-content w-full px-[var(--margin-x)] pb-10">
        {/* PHP: <a href="performtest.php?hakuna={trfproduct}"> Back To Tests</a> */}
        <div className="mb-5">
          <Link
            to={`/dashboards/action-items/perform-testing/${trfproduct}`}
            className="inline-flex items-center rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
          >
            ← Back To Tests
          </Link>
        </div>

        <Card className="p-6">
          {/* ── LRN ─────────────────────────────────────────────────────── */}
          <div className="mb-4 grid grid-cols-2 items-center gap-4 border-b border-gray-100 pb-4 dark:border-gray-800">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
              LRN
            </label>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {lrn || "—"}
            </span>
          </div>

          {/* ── Temperature ─────────────────────────────────────────────── */}
          {/* PHP: Temperature($prow['mintemp']-$prow['maxtemp'])            */}
          <div className="mb-4 grid grid-cols-2 items-center gap-4">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Temperature
              {(prow.mintemp || prow.maxtemp) && (
                <span className="ml-1 text-xs text-gray-400">
                  ({prow.mintemp}–{prow.maxtemp})
                </span>
              )}
            </label>
            <input
              type="text"
              id="temperature"
              name="temperature"
              autoComplete="on"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              placeholder="Environment Temperature in deg celsius"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>

          {/* ── Humidity ────────────────────────────────────────────────── */}
          {/* PHP: Humidity($prow['minhumidity']% - $prow['maxhumidity']%) */}
          <div className="mb-4 grid grid-cols-2 items-center gap-4">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Humidity
              {(prow.minhumidity || prow.maxhumidity) && (
                <span className="ml-1 text-xs text-gray-400">
                  ({prow.minhumidity}% – {prow.maxhumidity}%)
                </span>
              )}
            </label>
            <input
              type="text"
              id="humidity"
              name="humidity"
              autoComplete="on"
              value={humidity}
              onChange={(e) => setHumidity(e.target.value)}
              placeholder="Environment Humidity in %"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>

          {/* ── Remark ──────────────────────────────────────────────────── */}
          <div className="mb-4 grid grid-cols-2 items-start gap-4">
            <label className="pt-2 text-sm font-medium text-gray-600 dark:text-gray-400">
              Remark
            </label>
            <textarea
              id="remark"
              name="remark"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Theory & Remark"
              rows={3}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>

          {/* ── Upload Attachment ────────────────────────────────────────── */}
          <div className="mb-6 grid grid-cols-2 items-center gap-4">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Upload Attachment
            </label>
            <input
              type="file"
              id="attachment"
              name="attachment"
              onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600"
            />
          </div>

          {/* ── Grade / Size ─────────────────────────────────────────────── */}
          {/* PHP: grades.name + sizes.name                                  */}
          {/* API: grade_name = "E 250 BR", size_name = "Thickness..."       */}
          {(testData?.grade_name || testData?.size_name) && (
            <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800/40">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">
                  Grade
                </p>
                <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">
                  {testData?.grade_name ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">
                  Size
                </p>
                <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">
                  {testData?.size_name ?? "—"}
                </p>
              </div>
            </div>
          )}

          {/* ── Parameter Remark ─────────────────────────────────────────── */}
          {/* PHP: echo $prow['remark'] — API returns "-" as placeholder     */}
          {prow.remark && prow.remark !== "-" && (
            <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300">
              {prow.remark}
            </div>
          )}

          {/* ── Instruments ──────────────────────────────────────────────── */}
          {/* PHP: foreach($allins as $aid) → one select per category        */}
          {/* PHP validates: mastervalidity.enddate > today (backend filters) */}
          {instrList.length > 0 && (
            <div className="mb-6">
              <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Instruments
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                {instrList.map((instr) => {
                  const catId = instr.id; // PHP: $aid
                  const catName = instr.name; // PHP: $iname
                  const options = instr.options; // already normalised to Array
                  return (
                    <div key={catId}>
                      <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                        {catName}
                      </label>
                      <Select
                        value={options.find(opt => String(opt.id) === instruments[catId]) ? { value: instruments[catId], label: `${options.find(opt => String(opt.id) === instruments[catId]).name}(${options.find(opt => String(opt.id) === instruments[catId]).newidno ?? options.find(opt => String(opt.id) === instruments[catId]).idno ?? options.find(opt => String(opt.id) === instruments[catId]).id})` } : null}
                        onChange={(selectedOption) =>
                          setInstruments((prev) => ({
                            ...prev,
                            [catId]: selectedOption ? selectedOption.value : "",
                          }))
                        }
                        options={options.map(opt => ({
                          value: String(opt.id),
                          label: `${opt.name}(${opt.newidno ?? opt.idno ?? opt.id})`
                        }))}
                        placeholder={`Select ${catName}`}
                        isClearable
                        styles={customSelectStyles}
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Consumables ──────────────────────────────────────────────── */}
          {/* PHP: foreach parameterconsumables → batch select + qty input   */}
          {consumList.length > 0 && (
            <div className="mb-6">
              <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Consumables
              </h4>
              <div className="space-y-3">
                {consumList.map((con) => {
                  const conId = con.id ?? con.mid;
                  const batches = Array.isArray(con.batches)
                    ? con.batches
                    : Array.isArray(con.materiallocation)
                      ? con.materiallocation
                      : [];
                  return (
                    <div
                      key={conId}
                      className="grid grid-cols-3 items-center gap-4 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                    >
                      {/* PHP: name."(".$consumable.")". " (in $uname)" */}
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {con.name}({con.consumable_id ?? con.consumable}) (in{" "}
                        {con.unit})
                      </div>
                      {/* PHP: name="materiallocationid['{$mid}']" */}
                      <Select
                        value={batches.find(b => String(b.id) === consumables[conId]?.materiallocationid) ? { value: consumables[conId].materiallocationid, label: `${batches.find(b => String(b.id) === consumables[conId].materiallocationid).newidno}(${batches.find(b => String(b.id) === consumables[conId].materiallocationid).batchno})` } : null}
                        onChange={(selectedOption) =>
                          setConsumables((prev) => ({
                            ...prev,
                            [conId]: {
                              ...(prev[conId] ?? {}),
                              materiallocationid: selectedOption ? selectedOption.value : "",
                            },
                          }))
                        }
                        options={batches.map(b => ({
                          value: String(b.id),
                          label: `${b.newidno}(${b.batchno})`
                        }))}
                        placeholder="Select Batch"
                        isClearable
                        styles={customSelectStyles}
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                      />
                      {/* PHP: name="quantity['{$mid}']" */}
                      <input
                        type="text"
                        placeholder={`enter value in ${con.unit}`}
                        value={consumables[conId]?.quantity ?? ""}
                        onChange={(e) =>
                          setConsumables((prev) => ({
                            ...prev,
                            [conId]: {
                              ...(prev[conId] ?? {}),
                              quantity: e.target.value,
                            },
                          }))
                        }
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Measurement Table ─────────────────────────────────────────── */}
          {/* PHP: parameterelements → TH headers + for($i=0; $i<$cycle; $i++) */}
          {/* PHP: $pid = $frow['element'] = API measurement_id                 */}
          {/* PHP: name="$pid[]"  e.g. "7[]", "15[]"                           */}
          {paramElements.length > 0 && (
            <div className="mb-6">
              <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                {/* PHP: echo $prow['name'] */}
                {prow.name ?? "Measurements"}
              </h4>
              {aacGrid && (
                <div className="space-y-4">
                  {paramElements.map((el) => {
                    const pid = el.measurement_id;
                    const nums = Array.from({ length: cycle }, (_, i) => String(measurements[i]?.[pid] ?? "").trim())
                      .filter((v) => v !== "" && !isNaN(Number(v)))
                      .map(Number);
                    const decimals = Number(prow.decimal ?? 0) || 0;
                    // Preview only - the saved result is calculated on the server (IS 2 : 1960 rounding)
                    const avgPreview = nums.length
                      ? roundIs2(nums.reduce((a, b) => a + b, 0) / nums.length, decimals)
                      : null;
                    const rowCount = Math.ceil(cycle / 8);
                    return (
                      <div key={pid} className="overflow-x-auto border border-gray-200 dark:border-gray-600">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="border-b border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-700">
                              <th rowSpan="2" className="border-r border-gray-300 px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:border-gray-600 dark:text-gray-200">Sr. No.</th>
                              <th colSpan="8" className="border-b border-r border-gray-300 px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-700 dark:border-gray-600 dark:text-gray-200">
                                {el.name}{el.unit ? ` (${el.unit})` : ""} — enter {cycle} values (one per block)
                              </th>
                              <th rowSpan="2" className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-200">Average of {cycle}</th>
                            </tr>
                            <tr className="border-b border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-600">
                              {Array.from({ length: 8 }, (_, c) => (
                                <th key={c} className="border-r border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-600 dark:border-gray-600 dark:text-gray-300">{c + 1}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from({ length: rowCount }, (_, row) => (
                              <tr key={row} className="border-b border-gray-200 dark:border-gray-600">
                                <td className="whitespace-nowrap border-r border-gray-200 px-3 py-2 align-middle text-xs text-gray-600 dark:border-gray-600 dark:text-gray-300">
                                  Samples {row * 8 + 1}–{Math.min(row * 8 + 8, cycle)}
                                </td>
                                {Array.from({ length: 8 }, (_, col) => {
                                  const i = row * 8 + col;
                                  if (i >= cycle) return <td key={col} className="border-r border-gray-200 dark:border-gray-600" />;
                                  const v = String(measurements[i]?.[pid] ?? "");
                                  const bad = status === 0 && v.trim() !== "" && isNaN(Number(v));
                                  return (
                                    <td key={col} className="whitespace-nowrap border-r border-gray-200 px-3 py-2 align-middle text-sm dark:border-gray-600">
                                      {status === 0 ? (
                                        <input
                                          type="text"
                                          inputMode="decimal"
                                          id={`measurement_${pid}_${i}`}
                                          name={`${pid}[]`}
                                          placeholder={`S${i + 1}`}
                                          value={v}
                                          onChange={(e) => handleMeasurement(i, pid, e.target.value)}
                                          className={`w-full min-w-[56px] rounded border px-2 py-1 text-center text-sm focus:border-transparent focus:ring-1 focus:ring-blue-500 dark:bg-gray-600 dark:text-white ${bad ? "border-red-400 bg-red-50/30" : "border-gray-300 dark:border-gray-600"}`}
                                        />
                                      ) : (
                                        <span className="block text-center text-gray-700 dark:text-gray-300">{v === "" ? "—" : v}</span>
                                      )}
                                    </td>
                                  );
                                })}
                                {row === 0 && (
                                  <td rowSpan={rowCount} className="px-3 py-2 text-center align-middle text-base font-semibold text-gray-800 dark:text-gray-100">
                                    {avgPreview === null ? "—" : avgPreview}
                                    <div className="mt-1 text-[10px] font-normal text-gray-400">auto-calculated (IS 2 rounding)</div>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              )}
              {!aacGrid && (
              <div className="overflow-x-auto rounded-lg border border-gray-300">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-200 dark:bg-gray-800 border-b border-gray-300">
                      {isAac && (
                        <th className="border-r border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 uppercase dark:border-gray-700 dark:text-gray-300">
                          Sample
                        </th>
                      )}
                      {paramElements.map((el) => (
                        <th
                          key={el.measurement_id}
                          className="border-r border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 uppercase last:border-r-0 dark:border-gray-700 dark:text-gray-300"
                        >
                          {/* PHP: $pname = selectfieldwhere("measurements","name","id=$pid") */}
                          {el.name}
                          {el.unit && (
                            <span className="ml-1 font-normal text-gray-400 normal-case">
                              ({el.unit})
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* PHP: for ($i = 0; $i < $cycle; $i++) */}
                    {Array.from({ length: cycle }, (_, i) => (
                      <tr
                        key={i}
                        className="border-b border-gray-300 dark:border-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        {isAac && (
                          <td className="whitespace-nowrap border-r border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 dark:border-gray-700 dark:text-gray-300">
                            Sample-{i + 1}
                          </td>
                        )}
                        {paramElements.map((el) => {
                          const pid = el.measurement_id; // PHP: $pid = $frow['element']
                          const unit = el.unit ?? "";
                          const placeholder = unit && unit !== "-" ? `enter value in ${unit}` : "enter value";
                          return (
                            <td key={pid} className="border-r border-gray-300 px-2 py-1 last:border-r-0 dark:border-gray-700">
                              {status === 0 ? (
                                // PHP: <input name="$pid[]" placeholder="enter value in $unit" />
                                <>
                                  <input
                                    type="text"
                                    id={`measurement_${pid}_${i}`}
                                    name={`${pid}[]`}
                                    list={`datalist_${pid}`}
                                    autoComplete="on"
                                    placeholder={placeholder}
                                    value={measurements[i]?.[pid] ?? ""}
                                    onChange={(e) =>
                                      handleMeasurement(i, pid, e.target.value)
                                    }
                                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                                  />
                                  <datalist id={`datalist_${pid}`}>
                                    {getMeasurementHistory(pid, el.name).map(
                                      (optVal, optIdx) => (
                                        <option key={optIdx} value={optVal} />
                                      ),
                                    )}
                                  </datalist>
                                </>
                              ) : (
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  {measurements[i]?.[pid] ?? "—"} {unit}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          )}

          {/* ── Action Buttons ─────────────────────────────────────────────── */}
          <div className="mt-6 border-t border-gray-100 pt-6 dark:border-gray-800">
            {/* status == 0 → Submit */}
            {/* PHP: if ($hakunastatus == 0) → sendForm inserttestdata.php */}
            {status === 0 && (
              <div className="flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={clsx(
                    "rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700",
                    submitting && "cursor-not-allowed opacity-60",
                  )}
                >
                  {submitting ? "Submitting..." : "Submit Test Data"}
                </button>
              </div>
            )}

            {/* status == 24 → Results table + Finalise + Retest */}
            {/* PHP: elseif ($hakunastatus == 24) */}
            {status === 24 && (
              <>
                <ResultsTable results={results} decimal={prow.decimal} />
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {/* PHP: if(mysqli_num_rows($itemDocument) > 0) → setEndDAte() modal
                            else → view(teid, finalsubmitdata.php, 'updating')         */}
                  <button
                    onClick={
                      has_documents
                        ? () => setEndDateModal(true)
                        : handleFinalise
                    }
                    disabled={submitting}
                    className={clsx(
                      "rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700",
                      submitting && "cursor-not-allowed opacity-60",
                    )}
                  >
                    {submitting ? "Finalising..." : "Finalise Data"}
                  </button>

                  {/* PHP: view(teid, requestretest.php, 'updating') */}
                  <button
                    onClick={handleRetest}
                    disabled={retesting}
                    className={clsx(
                      "rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700",
                      retesting && "cursor-not-allowed opacity-60",
                    )}
                  >
                    {retesting ? "Requesting..." : "Retest Data"}
                  </button>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Set End Date Modal — PHP: modal-setEndDate → submiEndDate() */}
      {endDateModal && (
        <SetEndDateModal
          teid={teid}
          startDate={evt.start_date || evt.startdate || evt.startTime || evt.start_time || testData?.startdate || testData?.start_date || testData?.startTime || testData?.start_time} // Handle all possible API keys
          onClose={() => setEndDateModal(false)}
          onFinalised={() =>
            navigate(`/dashboards/action-items/perform-testing/${trfproduct}`)
          }
        />
      )}
    </Page>
  );
}
