// Allotment confirmation popup (MIS) - "Confirm received" / "I will confirm later" / "Not received".
// TESTING PHASE: the person can simply close it with the cross; closing hides it until the next login / page reload.
import { useCallback, useEffect, useState } from "react";
import axios from "utils/axios";
import { toast } from "sonner";

const DISMISS_KEY = "misAckDismissed";
const POLL_MS = 10 * 60 * 1000;

const signatureOf = (list) => list.map((g) => `${g.kind}:${g.ref}:${(g.allotted_on || "").slice(0, 10)}`).sort().join("|");

export function AllotmentAckPopup() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [busyKey, setBusyKey] = useState("");
  const [disputeFor, setDisputeFor] = useState(null);
  const [note, setNote] = useState("");
  const [laterHours, setLaterHours] = useState(2);

  const load = useCallback(async () => {
    if (!localStorage.getItem("userId")) return;
    try {
      const res = await axios.get("/mis/my-allotments");
      const list = res.data?.data || [];
      setItems(list);
      let dismissed = "";
      try {
        dismissed = sessionStorage.getItem(DISMISS_KEY) || "";
      } catch {
        dismissed = "";
      }
      setOpen(list.length > 0 && dismissed !== signatureOf(list));
    } catch {
      // popup is optional - never disturb the user if the call fails
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const closePopup = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, signatureOf(items));
    } catch {
      // ignore
    }
    setOpen(false);
  };

  const send = async (g, action, extra = {}) => {
    const key = `${g.kind}:${g.ref}`;
    setBusyKey(key);
    try {
      const res = await axios.post("/mis/ack", { kind: g.kind, ref_id: g.ref, action, ...extra });
      if (res.data?.status) {
        toast.success(res.data.message || "Saved.");
        setDisputeFor(null);
        setNote("");
        const rest = items.filter((x) => `${x.kind}:${x.ref}` !== key);
        setItems(rest);
        if (rest.length === 0) setOpen(false);
      } else {
        toast.error(res.data?.message || "Could not save.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save.");
    } finally {
      setBusyKey("");
    }
  };

  if (!open || items.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b bg-indigo-50 dark:bg-indigo-950/40 rounded-t-2xl">
          <div>
            <h3 className="text-base font-bold text-indigo-950 dark:text-indigo-100">Please confirm: samples / jobs allotted to you</h3>
            <p className="text-xs text-indigo-800 dark:text-indigo-300">Tell us if you have received what was allotted to you.</p>
          </div>
          <button type="button" onClick={closePopup} aria-label="Close" title="Close (you can ignore this for now)" className="text-xl leading-none text-gray-500 hover:text-gray-800 px-2">
            ✕
          </button>
        </div>

        <div className="mx-5 mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-[11px] font-semibold text-amber-900">
          ⚠ UNDER TESTING: this confirmation feature is being tested. You may simply close this window with the ✕ to ignore it for now.
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {items.map((g) => {
            const key = `${g.kind}:${g.ref}`;
            const busy = busyKey === key;
            return (
              <div key={key} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {g.kind === "testing" ? "Testing" : "Calibration"} · {g.kind === "testing" ? `TRF #${g.ref}` : `Inward #${g.ref}`}
                    {g.refno ? ` (${g.refno})` : ""}
                  </div>
                  <div className="text-[11px] text-gray-500">Allotted on {(g.allotted_on || "").slice(0, 16)} · {g.n} item(s)</div>
                </div>
                <div className="text-xs text-gray-700 dark:text-gray-300">{g.customer}</div>

                {disputeFor === key ? (
                  <div className="space-y-2">
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      placeholder="What did you not receive? (e.g. sample not handed over, wrong person)"
                      className="w-full text-xs rounded-lg border border-gray-300 p-2"
                    />
                    <div className="flex gap-2">
                      <button type="button" disabled={busy} onClick={() => send(g, "not_received", { note })} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold">
                        Submit &quot;Not received&quot;
                      </button>
                      <button type="button" onClick={() => { setDisputeFor(null); setNote(""); }} className="px-3 py-1.5 rounded-lg border text-xs">Back</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" disabled={busy} onClick={() => send(g, "confirm")} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
                      ✓ Confirm received
                    </button>
                    <span className="inline-flex items-center gap-1">
                      <button type="button" disabled={busy} onClick={() => send(g, "later", { later_hours: laterHours })} className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold">
                        ⏰ I will confirm later
                      </button>
                      <select value={laterHours} onChange={(e) => setLaterHours(Number(e.target.value))} className="text-xs border rounded-lg p-1">
                        <option value={1}>in 1 h</option>
                        <option value={2}>in 2 h</option>
                        <option value={4}>in 4 h</option>
                        <option value={8}>in 8 h</option>
                      </select>
                    </span>
                    <button type="button" disabled={busy} onClick={() => setDisputeFor(key)} className="px-3 py-1.5 rounded-lg border border-red-300 text-red-700 text-xs font-semibold">
                      ✗ Not received
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default AllotmentAckPopup;
