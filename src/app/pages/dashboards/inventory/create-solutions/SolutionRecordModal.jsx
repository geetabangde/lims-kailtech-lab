// Import Dependencies
import { useEffect, useState } from "react";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import PropTypes from "prop-types";
import { XMarkIcon } from "@heroicons/react/24/outline";
import axios from "utils/axios";

// Local Imports
import { Button } from "components/ui";

// ----------------------------------------------------------------------

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// Preparation record of one prepared solution: parents -> solution, plus earlier preparations of the same solution.
export default function SolutionRecordModal({ show, id, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!show || !id) return;
    setData(null);
    setFailed(false);
    setLoading(true);
    axios
      .get(`inventory/get-solution-record/${id}`)
      .then((res) => {
        if (res.data?.status) setData(res.data);
        else setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [show, id]);

  const handlePrint = () => {
    if (!data) return;
    const s = data.solution;
    const rows = (data.parents || [])
      .map(
        (p, i) =>
          `<tr><td>${i + 1}</td><td>${esc(p.name)}</td><td>${esc(p.newidno)}</td><td>${esc(p.batchno)}</td><td>${esc(p.exp || "-")}</td><td>${esc(p.qty)} ${esc(p.unit)}</td><td>${esc(p.location)}</td></tr>`,
      )
      .join("");
    const hist = (data.history || [])
      .map((h) => `<tr><td>${esc(h.id)}</td><td>${esc(h.added_on)}</td><td>${esc(h.qty)} ${esc(h.unit)}</td><td>${esc(h.exp || "-")}</td><td>${esc(h.prepared_by)}</td></tr>`)
      .join("");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Preparation record ${esc(s.id)}</title>
      <style>body{font-family:Arial,sans-serif;font-size:12px;margin:24px}h2{margin:0 0 8px}table{border-collapse:collapse;width:100%;margin:8px 0 16px}td,th{border:1px solid #444;padding:4px 6px;text-align:left}th{background:#eee}</style></head><body>
      <h2>Solution preparation record</h2>
      <table><tr><th>Solution</th><td>${esc(s.name)}</td><th>Record no.</th><td>${esc(s.id)}</td></tr>
      <tr><th>Category</th><td>${esc(s.category)}</td><th>Department</th><td>${esc(s.department)}</td></tr>
      <tr><th>Quantity prepared</th><td>${esc(s.qty)} ${esc(s.unit)}</td><th>Expiry</th><td>${esc(s.exp || "-")}</td></tr>
      <tr><th>Prepared on</th><td>${esc(s.added_on)}</td><th>Prepared by</th><td>${esc(s.prepared_by)}</td></tr></table>
      <h3>Prepared from (parents)</h3>
      <table><tr><th>#</th><th>Item</th><th>ID no.</th><th>Batch</th><th>Expiry</th><th>Quantity used</th><th>Location</th></tr>${rows}</table>
      <h3>Earlier preparations of this solution</h3>
      <table><tr><th>Record</th><th>Prepared on</th><th>Quantity</th><th>Expiry</th><th>By</th></tr>${hist}</table>
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  const s = data?.solution;
  const th = "px-3 py-2 text-left text-xs font-semibold uppercase text-gray-800 bg-gray-200 dark:bg-dark-800 dark:text-dark-100";
  const td = "px-3 py-2 text-sm text-gray-700 dark:text-dark-200 border-b border-gray-200 dark:border-dark-500";

  return (
    <Transition
      appear
      show={show}
      as={Dialog}
      onClose={onClose}
      className="fixed inset-0 z-100 flex flex-col items-center justify-center overflow-hidden px-4 py-6 sm:px-5"
    >
      <TransitionChild
        as="div"
        enter="ease-out duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-200"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
        className="absolute inset-0 bg-gray-900/50 transition-opacity dark:bg-black/40"
      />
      <TransitionChild
        as={DialogPanel}
        enter="ease-out duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-200"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white transition-opacity duration-300 dark:bg-dark-700"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-dark-500 sm:px-5">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-100">Preparation record</h3>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            aria-label="Close"
            className="rounded p-1 text-gray-500 transition hover:bg-gray-100 dark:text-dark-300 dark:hover:bg-dark-600"
          >
            <XMarkIcon className="size-6" />
          </button>
        </div>

        <div className="scrollbar-sm overflow-y-auto px-4 py-4 sm:px-5">
          {loading && <p className="text-sm text-gray-600 dark:text-dark-300">Loading...</p>}
          {failed && <p className="text-error text-sm">Could not load this record.</p>}
          {s && (
            <div className="space-y-5">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                {[
                  ["Solution", s.name],
                  ["Record no.", s.id],
                  ["Category", s.category],
                  ["Department", s.department],
                  ["Quantity prepared", `${s.qty} ${s.unit || ""}`],
                  ["Expiry", s.exp || "-"],
                  ["Prepared on", s.added_on],
                  ["Prepared by", s.prepared_by || "-"],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <dt className="w-36 shrink-0 text-gray-500 dark:text-dark-300">{k}</dt>
                    <dd className="font-medium text-gray-800 dark:text-dark-100">{v}</dd>
                  </div>
                ))}
              </dl>

              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-dark-100">Prepared from (parents)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        {["#", "Item", "ID no.", "Batch", "Expiry", "Quantity used", "Location"].map((h) => (
                          <th key={h} className={th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(data.parents || []).map((p, i) => (
                        <tr key={i}>
                          <td className={td}>{i + 1}</td>
                          <td className={td}>{p.name}</td>
                          <td className={td}>{p.newidno}</td>
                          <td className={td}>{p.batchno}</td>
                          <td className={td}>{p.exp || "-"}</td>
                          <td className={td}>{p.qty} {p.unit}</td>
                          <td className={td}>{p.location}</td>
                        </tr>
                      ))}
                      {!(data.parents || []).length && (
                        <tr><td className={td} colSpan={7}>No parent items recorded.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-dark-100">Earlier preparations of this solution</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        {["Record", "Prepared on", "Quantity", "Expiry", "By"].map((h) => (
                          <th key={h} className={th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(data.history || []).map((h) => (
                        <tr key={h.id}>
                          <td className={td}>{h.id}</td>
                          <td className={td}>{h.added_on}</td>
                          <td className={td}>{h.qty} {h.unit}</td>
                          <td className={td}>{h.exp || "-"}</td>
                          <td className={td}>{h.prepared_by}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-dark-500 sm:px-5">
          <Button onClick={handlePrint} variant="outline" color="primary" className="h-9 min-w-[7rem]" disabled={!s}>
            Print
          </Button>
          <Button onClick={onClose} color="primary" className="h-9 min-w-[7rem]">
            Close
          </Button>
        </div>
      </TransitionChild>
    </Transition>
  );
}

SolutionRecordModal.propTypes = {
  show: PropTypes.bool,
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onClose: PropTypes.func.isRequired,
};
