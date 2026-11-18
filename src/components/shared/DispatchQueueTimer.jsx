// Header timer for held e-mails (the 15-minute "undo" hold of Send Reports & Invoice).
// Shows "N e-mail(s) sending in mm:ss" whenever something is held, and lets the sender / management STOP it or SEND IT NOW.
// Server: GET /dispatch/queued (also releases the e-mails whose hold has passed - this poll is what actually sends them),
//         POST /dispatch/send-now, POST /dispatch/cancel (EmailDispatchController). Nothing is shown when nothing is held.
import { useCallback, useEffect, useRef, useState } from "react";
import axios from "utils/axios";
import { toast } from "sonner";

const POLL_MS = 30000;

const fmt = (s) => {
  const v = Math.max(0, Math.floor(s));
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
};

export function DispatchQueueTimer() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const [, setTick] = useState(0);
  const fetchedAt = useRef(Date.now());
  const refetching = useRef(false);

  const load = useCallback(async () => {
    if (refetching.current) return;
    refetching.current = true;
    try {
      const res = await axios.get("/dispatch/queued", { timeout: 120000 });
      const d = res.data?.data;
      fetchedAt.current = Date.now();
      setRows(Array.isArray(d?.rows) ? d.rows : []);
      if (d?.released > 0) toast.success(`${d.released} held e-mail(s) sent.`);
    } catch {
      /* not logged in / no access: stay hidden */
    } finally {
      refetching.current = false;
    }
  }, []);

  // poll (only while the tab is visible) + local 1-second countdown
  useEffect(() => {
    load();
    const poll = setInterval(() => { if (!document.hidden) load(); }, POLL_MS);
    const tick = setInterval(() => setTick((n) => n + 1), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, [load]);

  const left = (r) => Math.max(0, (r.seconds_left || 0) - (Date.now() - fetchedAt.current) / 1000);
  const soonest = rows.length ? Math.min(...rows.map(left)) : 0;

  // when a hold reaches 0, ask the server straight away (it sends the due e-mail)
  useEffect(() => {
    if (rows.length && soonest <= 0 && !refetching.current) {
      const t = setTimeout(load, 1500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [rows, soonest, load]);

  const sendNow = async (r) => {
    if (!window.confirm(`Send this e-mail now (${r.reports} report(s) to ${(r.to || []).join(", ") || "the recipients"})?`)) return;
    setBusy(r.id);
    try {
      const res = await axios.post("/dispatch/send-now", { log_id: r.id }, { timeout: 180000 });
      toast.success(res.data?.message || "E-mail sent.");
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Could not send the e-mail.");
    } finally {
      setBusy(null);
      load();
    }
  };

  const stop = async (r) => {
    if (!window.confirm("Stop this e-mail? Nothing will be sent to the recipients.")) return;
    setBusy(r.id);
    try {
      const res = await axios.post("/dispatch/cancel", { log_id: r.id, reason: "Stopped from the header timer" });
      toast.success(res.data?.message || "E-mail stopped.");
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Could not stop the e-mail.");
    } finally {
      setBusy(null);
      load();
    }
  };

  if (!rows.length) return null;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="E-mails waiting in the 15-minute hold - click to stop or send now"
        className="flex h-9 items-center gap-2 rounded-lg border border-amber-400 bg-amber-50 px-3 text-xs font-bold text-amber-900 shadow-sm hover:bg-amber-100"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-600" />
        </span>
        <span>
          {rows.length} e-mail{rows.length > 1 ? "s" : ""} sending in <span className="font-mono">{fmt(soonest)}</span>
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-[min(92vw,420px)] rounded-xl border border-[#18457c]/30 bg-white p-3 text-xs shadow-xl dark:bg-dark-800">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-bold text-[#18457c]">E-mails in the 15-minute hold</span>
            <button type="button" onClick={() => setOpen(false)} className="text-lg leading-none text-gray-500 hover:text-red-600" aria-label="Close">&times;</button>
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {rows.map((r) => (
              <div key={r.id} className="rounded-lg border border-gray-200 p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-gray-900 dark:text-gray-100" title={r.subject}>{r.subject}</div>
                    <div className="truncate text-gray-600">To: {(r.to || []).join(", ") || "-"}</div>
                    <div className="text-gray-600">{r.reports} report(s) · queued by {r.sent_by_name}{r.mode === "test" ? " · TEST" : ""}</div>
                  </div>
                  <span className="shrink-0 rounded bg-amber-100 px-2 py-1 font-mono text-sm font-bold text-amber-900">{fmt(left(r))}</span>
                </div>
                {r.can_act && (
                  <div className="mt-2 flex gap-2">
                    <button type="button" disabled={busy === r.id} onClick={() => sendNow(r)} className="h-7 rounded-lg bg-[#18457c] px-3 font-bold text-white hover:bg-[#133763] disabled:opacity-60">
                      {busy === r.id ? "Please wait..." : "Send now"}
                    </button>
                    <button type="button" disabled={busy === r.id} onClick={() => stop(r)} className="h-7 rounded-lg border border-red-300 bg-white px-3 font-bold text-red-700 hover:bg-red-50 disabled:opacity-60">
                      Stop
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
