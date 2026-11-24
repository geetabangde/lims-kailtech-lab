import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'utils/axios';
import { toast } from 'sonner';

// "Send Traceability": e-mail the consolidated master calibration traceability certificates
// for the selected inward instruments to the customer.
// Rendered into <body> via createPortal to prevent table cell overflow clipping.
export default function SendTraceabilityModal({ isOpen, onClose, inwardId }) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState([]);
  const [mode, setMode] = useState('test');
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [note, setNote] = useState('');
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [confirmResp, setConfirmResp] = useState(false);

  useEffect(() => {
    if (!isOpen || !inwardId) return;
    setData(null);
    setSelected([]);
    setMode('test');
    setTo('');
    setCc('');
    setNote('');
    setConfirmChecked(false);
    setConfirmResp(false);
    setLoading(true);

    axios.get('/dispatch-traceability/items', { params: { inward_id: inwardId } })
      .then((r) => {
        const d = r.data?.data;
        setData(d);
        // Pre-select items that have traceability records linked
        const itemsWithMasters = (d?.items || []).filter((i) => i.has_traceability).map((i) => i.id);
        setSelected(itemsWithMasters.length > 0 ? itemsWithMasters : (d?.items || []).map((i) => i.id));
        setTo(d?.my_email || '');
      })
      .catch((e) => toast.error(e?.response?.data?.message || e?.message || 'Could not load traceability items.'))
      .finally(() => setLoading(false));
  }, [isOpen, inwardId]);

  if (!isOpen) return null;

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const selectAll = () => setSelected((data?.items || []).map((i) => i.id));
  const deselectAll = () => setSelected([]);

  const changeMode = (m) => {
    setMode(m);
    if (m === 'live') {
      if (!to.trim() || to === (data?.my_email || '')) setTo(data?.customer_to || '');
      if (!cc.trim()) setCc(data?.customer_cc || '');
    }
    if (m === 'test' && (!to.trim() || to === (data?.customer_to || ''))) setTo(data?.my_email || '');
  };

  const send = async () => {
    if (!selected.length) { toast.error('Select at least one instrument.'); return; }
    if (!to.trim()) { toast.error('Type the recipient email address.'); return; }
    if (!confirmChecked || !confirmResp) { toast.error('Please tick both confirmation checkboxes.'); return; }

    setSending(true);
    try {
      const r = await axios.post('/dispatch-traceability/send', {
        inward_id: inwardId,
        item_ids: selected,
        mode,
        to,
        cc,
        note,
        confirm: true,
      });
      toast.success(r.data?.message || 'Traceability certificates sent.');
      onClose();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || (typeof e === 'string' ? e : '');
      if (/time-?out|server error occurred|something went wrong|network error/i.test(msg)) {
        toast.warning('Preparing large PDF: the server is processing this request. Please check the Email Log to confirm delivery.', { duration: 15000 });
        onClose();
      } else {
        toast.error(msg || 'The traceability email could not be sent.');
      }
    } finally {
      setSending(false);
    }
  };

  const canSend = !sending && (data?.items?.length > 0) && selected.length > 0 && confirmChecked && confirmResp && to.trim();

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 p-4 overflow-y-auto whitespace-normal">
      <div className="my-auto w-full max-w-2xl rounded-xl bg-white dark:bg-dark-800 text-gray-800 dark:text-dark-100 shadow-xl p-5 space-y-3 text-sm">
        <div className="flex items-center justify-between border-b pb-2 dark:border-dark-700">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-emerald-500"></span>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Email Calibration Traceability</h2>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-xl leading-none">&times;</button>
        </div>

        {loading && (
          <div className="py-8 text-center text-gray-500">
            <p>Loading traceability details for Inward #{inwardId}...</p>
          </div>
        )}

        {!loading && data && (
          <>
            <div className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-dark-700/50 p-2.5 rounded-lg border dark:border-dark-600">
              <span className="font-semibold text-gray-800 dark:text-gray-100">Inward #{data.inward_id} ({data.inward_no})</span> &middot; {data.customer || 'Customer'}
              <p className="mt-1 text-gray-500 dark:text-gray-400">
                Master equipment calibration certificates linked to selected items will be merged into a single PDF and emailed.
              </p>
            </div>

            {data.items.length === 0 ? (
              <p className="rounded border border-amber-300 bg-amber-50 text-amber-900 p-2 text-xs">
                No instruments found for this inward.
              </p>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1.5 text-xs text-gray-600 dark:text-gray-400">
                  <span>Select instruments ({selected.length} of {data.items.length} selected):</span>
                  <div className="space-x-2">
                    <button type="button" onClick={selectAll} className="text-blue-600 hover:underline">Select All</button>
                    <span>&middot;</span>
                    <button type="button" onClick={deselectAll} className="text-blue-600 hover:underline">Deselect All</button>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto border rounded divide-y dark:border-dark-600 dark:divide-dark-600">
                  {data.items.map((i) => (
                    <label key={i.id} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-dark-700 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={selected.includes(i.id)}
                        onChange={() => toggle(i.id)}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="font-medium text-gray-800 dark:text-gray-100">{i.name}</span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {i.idno && `[${i.idno}]`} {i.serialno && `S/N: ${i.serialno}`}
                      </span>
                      <span className="ml-auto flex items-center gap-1.5">
                        {i.has_traceability ? (
                          <span className="rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-semibold">
                            {i.master_count} Master{i.master_count === 1 ? '' : 's'}
                          </span>
                        ) : (
                          <span className="rounded bg-gray-200 dark:bg-dark-600 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 text-[10px]">
                            No masters
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4 text-xs font-medium">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" checked={mode === 'test'} onChange={() => changeMode('test')} />
                <span>Test Mode (subject marked [TEST])</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" checked={mode === 'live'} onChange={() => changeMode('live')} />
                <span>Send to Customer</span>
              </label>
            </div>

            {mode === 'test' && (
              <p className="rounded border border-sky-300 bg-sky-50 dark:bg-sky-900/20 text-sky-900 dark:text-sky-300 p-2 text-xs">
                Test mode: email is sent ONLY to the address below (pre-filled with your own {data.my_email ? <b>({data.my_email})</b> : ''}). The client receives nothing in test mode.
              </p>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-medium">
                To (email address, comma separated)
                <input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-1 block w-full border rounded p-1.5 text-xs dark:bg-dark-900 dark:border-dark-600"
                  placeholder="client@example.com"
                />
              </label>
              <label className="block text-xs font-medium">
                CC (optional)
                <input
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  className="mt-1 block w-full border rounded p-1.5 text-xs dark:bg-dark-900 dark:border-dark-600"
                  placeholder="cc@example.com"
                />
              </label>
            </div>

            <label className="block text-xs font-medium">
              Message to add (optional)
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="mt-1 block w-full border rounded p-1.5 text-xs dark:bg-dark-900 dark:border-dark-600"
                placeholder="Optional notes or remarks to include in the email..."
              />
            </label>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 p-3 space-y-2">
              <p className="text-[11px] text-emerald-900/80 dark:text-emerald-300 font-semibold">
                Authorization &amp; Responsibility Confirmation:
              </p>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmChecked}
                  onChange={(e) => setConfirmChecked(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600"
                />
                <span className="text-xs">
                  I have verified the calibration traceability records and recipient email address(es) entered above.
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmResp}
                  onChange={(e) => setConfirmResp(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600"
                />
                <span className="text-xs">
                  {mode === 'test'
                    ? 'I understand this is a test. I am solely responsible for the documents transmitted.'
                    : 'I accept full authorization and responsibility for releasing and transmitting these traceability documents to the client, including confidentiality.'}
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t dark:border-dark-700">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded border text-xs font-medium hover:bg-gray-50 dark:hover:bg-dark-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={send}
                disabled={!canSend}
                className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-sm"
              >
                {sending
                  ? 'Compiling & Sending...'
                  : mode === 'test'
                  ? 'Send Test Email'
                  : 'Send Traceability to Customer'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
