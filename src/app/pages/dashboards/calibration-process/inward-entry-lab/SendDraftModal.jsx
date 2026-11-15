import { useState, useEffect } from 'react';
import axios from 'utils/axios';
import { toast } from 'sonner';

// "Send Draft": e-mail the DRAFT certificates (draft stage) of one inward to the customer for review.
// Separate from SendBatchDispatchModal (final reports + invoice). Test mode (default) sends only to the logged-in user's own e-mail.
export default function SendDraftModal({ isOpen, onClose, inwardId }) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState([]);
  const [mode, setMode] = useState('test');
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [note, setNote] = useState('');
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setData(null); setSelected([]); setMode('test'); setTo(''); setCc(''); setNote(''); setConfirm(false);
    setLoading(true);
    axios.get('/dispatch-draft/items', { params: { inward_id: inwardId } })
      .then((r) => {
        const d = r.data?.data;
        setData(d);
        setSelected((d?.items || []).map((i) => i.id));
      })
      .catch((e) => toast.error(e?.message || 'Could not load the draft certificates.'))
      .finally(() => setLoading(false));
  }, [isOpen, inwardId]);

  if (!isOpen) return null;

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const send = async () => {
    if (!selected.length) { toast.error('Select at least one certificate.'); return; }
    if (mode === 'live' && !to.trim()) { toast.error('Type the recipient e-mail.'); return; }
    if (mode === 'live' && !confirm) { toast.error('Please tick the confirmation.'); return; }
    setSending(true);
    try {
      const r = await axios.post('/dispatch-draft/send', { inward_id: inwardId, item_ids: selected, mode, to, cc, note, confirm });
      toast.success(r.data?.message || 'Sent.');
      onClose();
    } catch (e) {
      toast.error(e?.message || (typeof e === 'string' ? e : 'The e-mail could not be sent.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto whitespace-normal">
      <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-dark-800 text-gray-800 dark:text-dark-100 shadow-xl p-5 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Send DRAFT Certificates to Client</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-800 text-xl leading-none">&times;</button>
        </div>
        {loading && <p>Loading...</p>}
        {!loading && data && (
          <>
            <p className="text-gray-600">Inward {data.inward_id} &middot; {data.customer || '-'}. Only certificates in draft stage are listed. The e-mail clearly says these are DRAFT, not final.</p>
            {data.items.length === 0 ? (
              <p className="rounded border border-amber-300 bg-amber-50 text-amber-900 p-2">No certificate of this inward is in draft stage.</p>
            ) : (
              <div className="max-h-52 overflow-y-auto border rounded">
                {data.items.map((i) => (
                  <label key={i.id} className="flex items-center gap-2 px-2 py-1 border-b last:border-0 cursor-pointer">
                    <input type="checkbox" checked={selected.includes(i.id)} onChange={() => toggle(i.id)} />
                    <span className="font-medium">{i.name}</span>
                    <span className="text-gray-500">{i.idno} {i.serialno ? `· ${i.serialno}` : ''} {i.location ? `(${i.location})` : ''}</span>
                    <span className="ml-auto rounded bg-gray-200 px-1.5 text-[10px] font-bold text-gray-700">DRAFT</span>
                  </label>
                ))}
              </div>
            )}
            <div className="flex gap-4">
              <label className="flex items-center gap-1"><input type="radio" checked={mode === 'test'} onChange={() => setMode('test')} /> Test (only to my own e-mail)</label>
              <label className="flex items-center gap-1"><input type="radio" checked={mode === 'live'} onChange={() => setMode('live')} /> Send to customer</label>
            </div>
            <div className="space-y-2">
              {mode === 'test' && (
                <p className="rounded border border-sky-300 bg-sky-50 text-sky-900 p-2 text-xs">
                  Test mode: the e-mail goes ONLY to your own address{data.my_email ? <> (<b>{data.my_email}</b>)</> : ''}. The customer receives nothing. To e-mail the customer, choose &quot;Send to customer&quot; above.
                </p>
              )}
              <label className="block">To {mode === 'live' ? '(type the e-mail address(es), comma separated)' : '(test: your own address)'}
                <input
                  value={mode === 'live' ? to : (data.my_email || '')}
                  onChange={(e) => setTo(e.target.value)}
                  disabled={mode !== 'live'}
                  className="mt-1 block w-full border rounded p-1.5 dark:bg-dark-900 disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="customer@example.com"
                />
              </label>
              <label className="block">CC (optional{mode === 'live' ? '' : ', only used when sending to the customer'})
                <input value={cc} onChange={(e) => setCc(e.target.value)} disabled={mode !== 'live'} className="mt-1 block w-full border rounded p-1.5 dark:bg-dark-900 disabled:bg-gray-100" />
              </label>
            </div>
            <label className="block">Message to add (optional)
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1 block w-full border rounded p-1.5 dark:bg-dark-900" />
            </label>
            {mode === 'live' && (
              <label className="flex items-start gap-2 rounded border border-red-300 bg-red-50 text-red-900 p-2">
                <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-0.5" />
                <span>I confirm these are DRAFT certificates for the customer&apos;s review - not final - and the address typed above is correct.</span>
              </label>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="px-3 py-1.5 rounded border">Cancel</button>
              <button type="button" onClick={send} disabled={sending || !data.items.length} className="px-3 py-1.5 rounded bg-blue-600 text-white font-semibold disabled:opacity-50">
                {sending ? 'Sending (may take a minute)...' : mode === 'test' ? 'Send test to me' : 'Send DRAFT to customer'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
