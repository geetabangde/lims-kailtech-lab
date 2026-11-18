import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'utils/axios';
import { toast } from 'sonner';

// "Mark as sent (offline)": the approver records that reports were handed over by hand / collected by the customer / sent by courier or post
// outside the LIMS / other. Nothing is e-mailed. Every mark is logged (who, when, how, remark, declaration, IP) in report_manual_dispatch and
// the MIS reads it as the dispatch date. Server: GET /dispatch/manual/candidates, POST /dispatch/manual/mark, POST /dispatch/manual/cancel
// (EmailDispatchController, same user rule as the e-mail buttons). The e-mail and challan dispatch flows are not touched.
const isoToday = () => new Date().toLocaleDateString('en-CA');
const isoDaysAgo = (n) => new Date(Date.now() - n * 86400000).toLocaleDateString('en-CA');
const dmy = (v) => {
  const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : (v || '');
};

export default function MarkSentModal({ isOpen, onClose, kind = 'calibration', inwardId, trfId, onDone, preselectIds }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [mode, setMode] = useState('');
  const [sentOn, setSentOn] = useState(isoToday());
  const [detail, setDetail] = useState('');
  const [remark, setRemark] = useState('');
  const [confirmVerified, setConfirmVerified] = useState(false);
  const [confirmResp, setConfirmResp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelId, setCancelId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const params = kind === 'testing' ? { kind, trf_id: trfId } : { kind, inward_id: inwardId };

  const load = (initial) => {
    setLoading(true);
    axios.get('/dispatch/manual/candidates', { params })
      .then((r) => {
        const d = r.data?.data;
        setData(d);
        setMode((m) => m || d?.modes?.[0] || '');
        const okIds = (d?.items || []).filter((i) => !i.manual).map((i) => i.id);
        setSelected((s) => (initial && Array.isArray(preselectIds) && preselectIds.length
          ? preselectIds.map(Number).filter((id) => okIds.includes(id))
          : s.filter((id) => okIds.includes(id))));
      })
      .catch((e) => { toast.error(e?.message || (typeof e === 'string' ? e : 'Could not load the reports.')); onClose(); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isOpen) return;
    setData(null); setSelected([]); setDetail(''); setRemark(''); setConfirmVerified(false); setConfirmResp(false); setCancelId(null); setCancelReason(''); setSentOn(isoToday());
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, inwardId, trfId, kind]);

  if (!isOpen) return null;

  const selectable = (data?.items || []).filter((i) => !i.manual);
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allSelected = selectable.length > 0 && selected.length === selectable.length;

  const save = async () => {
    if (!selected.length) { toast.error('Select at least one report.'); return; }
    if (!mode) { toast.error('Choose how the reports were sent.'); return; }
    if (mode === 'Other' && !detail.trim()) { toast.error('For "Other" please say how it was sent.'); return; }
    if (!confirmVerified || !confirmResp) { toast.error('Please tick both confirmations.'); return; }
    setSaving(true);
    try {
      const r = await axios.post('/dispatch/manual/mark', {
        ...params, item_ids: selected, mode, sent_on: sentOn, detail, remark, confirm_verified: true, confirm_responsible: true,
      });
      toast.success(r.data?.message || 'Marked as sent.');
      if (onDone) onDone();
      onClose();
    } catch (e) {
      toast.error(e?.message || (typeof e === 'string' ? e : 'Could not save.'));
    } finally {
      setSaving(false);
    }
  };

  const cancelMark = async () => {
    if (cancelReason.trim().length < 3) { toast.error('Please give a reason for cancelling.'); return; }
    try {
      const r = await axios.post('/dispatch/manual/cancel', { id: cancelId, reason: cancelReason.trim() });
      toast.success(r.data?.message || 'Cancelled.');
      setCancelId(null); setCancelReason('');
      load();
      if (onDone) onDone();
    } catch (e) {
      toast.error(e?.message || (typeof e === 'string' ? e : 'Could not cancel.'));
    }
  };

  const canSave = !saving && selected.length > 0 && confirmVerified && confirmResp && mode;
  const hasItems = (data?.items || []).length > 0;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-start justify-center bg-black/60 p-4 overflow-y-auto whitespace-normal">
      <div className="my-auto w-full max-w-2xl rounded-xl bg-white text-gray-800 shadow-xl p-5 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#18457c]">Mark Reports as Sent (offline)</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-800 text-xl leading-none">&times;</button>
        </div>
        <p className="rounded border border-sky-300 bg-sky-50 text-sky-900 p-2 text-xs">
          Use this when the reports were handed over by hand, collected by the customer, or sent by courier / post outside the LIMS. <b>Nothing is e-mailed.</b> Your
          name, the date and the time are recorded, and the MIS shows the report as sent.
        </p>
        {loading && <p>Loading...</p>}
        {!loading && data && (
          <>
            {data.items.length === 0 ? (
              <p className="rounded border border-amber-300 bg-amber-50 text-amber-900 p-2">No authorised report is ready to be marked for this {kind === 'testing' ? 'TRF' : 'inward'}.</p>
            ) : (
              <div className="border rounded">
                <label className="flex items-center gap-2 px-2 py-1 border-b bg-gray-50 cursor-pointer font-semibold">
                  <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : selectable.map((i) => i.id))} disabled={!selectable.length} />
                  Select all ({selectable.length} can be marked)
                </label>
                <div className="max-h-52 overflow-y-auto">
                  {data.items.map((i) => (
                    <div key={i.id} className="flex flex-wrap items-center gap-2 px-2 py-1 border-b last:border-0">
                      <input type="checkbox" checked={selected.includes(i.id)} disabled={!!i.manual} onChange={() => toggle(i.id)} />
                      <span className="font-medium">{i.label}</span>
                      {i.lrn ? <span className="text-gray-500 font-mono text-xs">{i.lrn}</span> : null}
                      {i.emailed_on ? <span className="rounded bg-amber-100 px-1.5 text-[10px] font-bold text-amber-800">E-MAILED {dmy(i.emailed_on)}</span> : null}
                      {i.challan_on ? <span className="rounded bg-indigo-100 px-1.5 text-[10px] font-bold text-indigo-800">CHALLAN {dmy(i.challan_on)}</span> : null}
                      {i.manual ? (
                        <span className="ml-auto flex flex-wrap items-center gap-1 text-[11px]">
                          <span className="rounded bg-emerald-100 px-1.5 font-bold text-emerald-800">SENT OFFLINE {dmy(i.manual.sent_on)} - {i.manual.mode} - by {i.manual.by}</span>
                          <button type="button" className="text-red-700 underline" onClick={() => { setCancelId(i.manual.id); setCancelReason(''); }}>Cancel mark</button>
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {cancelId && (
              <div className="rounded border border-red-300 bg-red-50 p-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-red-800">Reason for cancelling this mark:</span>
                <input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="flex-1 min-w-[180px] border rounded p-1" placeholder="e.g. marked by mistake" />
                <button type="button" onClick={cancelMark} className="px-3 py-1 rounded bg-red-600 text-white font-bold">Cancel the mark</button>
                <button type="button" onClick={() => setCancelId(null)} className="px-2 py-1 rounded border">Keep it</button>
              </div>
            )}
            {data.items.some((i) => (i.emailed_on || i.challan_on) && selected.includes(i.id)) && (
              <p className="rounded border border-amber-300 bg-amber-50 text-amber-900 p-2 text-xs">
                Some selected reports were already e-mailed / dispatched by challan. Marking them again is allowed (both records are kept; the earliest date counts in the MIS).
              </p>
            )}
            {hasItems && (<>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">How were they sent?
                <select value={mode} onChange={(e) => setMode(e.target.value)} className="mt-1 block w-full border rounded p-1.5">
                  {(data.modes || []).map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
              <label className="block">Date sent / handed over
                <input type="date" value={sentOn} min={isoDaysAgo(30)} max={isoToday()} onChange={(e) => setSentOn(e.target.value)} className="mt-1 block w-full border rounded p-1.5" />
              </label>
            </div>
            <label className="block">Detail {mode === 'Other' ? <b className="text-red-700">(required)</b> : '(who took it / courier docket / how)'}
              <input value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={255} className="mt-1 block w-full border rounded p-1.5" placeholder="e.g. Mr. Sharma collected / DTDC 123456789" />
            </label>
            <label className="block">Remark (optional)
              <textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={2} className="mt-1 block w-full border rounded p-1.5" />
            </label>
            <div className="rounded border border-blue-200 bg-blue-50 p-2 space-y-2 text-xs">
              <p className="text-blue-900">By marking these reports as sent you confirm that you have carried out the necessary checks and assume sole responsibility for this entry:</p>
              <label className="flex items-start gap-2">
                <input type="checkbox" className="mt-0.5" checked={confirmVerified} onChange={(e) => setConfirmVerified(e.target.checked)} />
                <span>I have thoroughly verified the selected reports and the handover details entered above (how, date and detail).</span>
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" className="mt-0.5" checked={confirmResp} onChange={(e) => setConfirmResp(e.target.checked)} />
                <span>I accept full authorisation and sole responsibility for marking these reports as sent offline, including the accuracy of this entry. I understand my name, the date and the time are recorded.</span>
              </label>
            </div>
            </>)}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="px-3 py-1.5 rounded border">Close</button>
              {hasItems && (
                <button type="button" onClick={save} disabled={!canSave} className="px-3 py-1.5 rounded bg-[#18457c] text-white font-semibold disabled:opacity-50">
                  {saving ? 'Saving...' : `Mark ${selected.length || ''} as sent`}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
