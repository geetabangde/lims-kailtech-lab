import { useState, useEffect } from 'react';
import axios from 'utils/axios';
import { toast } from 'sonner';

// "Send Draft": e-mail the DRAFT certificates (draft stage) of one inward to the customer for review.
// Separate from SendBatchDispatchModal (final reports + invoice). The recipients are always the addresses typed here.
// Test mode (default) only marks the e-mail "[TEST]". Both modes need the sender's responsibility confirmation.
// WhatsApp is wired in but OFF until the server reports whatsapp_ready (same switch as the final dispatch).
export default function SendDraftModal({ isOpen, onClose, inwardId }) {
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
  const [sendWa, setSendWa] = useState(false);
  const [waNumbers, setWaNumbers] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setData(null); setSelected([]); setMode('test'); setTo(''); setCc(''); setNote('');
    setConfirmChecked(false); setConfirmResp(false); setSendWa(false); setWaNumbers('');
    setLoading(true);
    axios.get('/dispatch-draft/items', { params: { inward_id: inwardId } })
      .then((r) => {
        const d = r.data?.data;
        setData(d);
        setSelected((d?.items || []).map((i) => i.id));
        setTo(d?.my_email || ''); // test mode starts with the sender's own address (editable)
      })
      .catch((e) => toast.error(e?.message || 'Could not load the draft certificates.'))
      .finally(() => setLoading(false));
  }, [isOpen, inwardId]);

  if (!isOpen) return null;

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const changeMode = (m) => {
    setMode(m);
    // switching to "customer": replace the pre-filled own address with the customer's e-mail from the inward / customer master
    // (same source as the final dispatch); still editable. Nothing is sent until the confirmations are ticked.
    if (m === 'live') {
      if (!to.trim() || to === (data?.my_email || '')) setTo(data?.customer_to || '');
      if (!cc.trim()) setCc(data?.customer_cc || '');
    }
    if (m === 'test' && (!to.trim() || to === (data?.customer_to || ''))) setTo(data?.my_email || '');
  };

  const send = async () => {
    if (!selected.length) { toast.error('Select at least one certificate.'); return; }
    if (!to.trim()) { toast.error('Type the recipient e-mail.'); return; }
    if (!confirmChecked || !confirmResp) { toast.error('Please tick both confirmations.'); return; }
    setSending(true);
    try {
      const r = await axios.post('/dispatch-draft/send', {
        inward_id: inwardId, item_ids: selected, mode, to, cc, note, confirm: true,
        send_whatsapp: Boolean(data?.whatsapp_ready) && sendWa,
        whatsapp_numbers: waNumbers.split(/[\s,;]+/).filter(Boolean),
      });
      toast.success(r.data?.message || 'Sent.');
      onClose();
    } catch (e) {
      const msg = e?.message || (typeof e === 'string' ? e : '');
      // 18-Nov-2026: a big batch (80+ certificates) takes longer than the web server waits; the server keeps going and the e-mail IS sent.
      if (/time-?out|server error occurred|something went wrong|network error/i.test(msg)) {
        toast.warning('Large batch: the server is still preparing and sending this e-mail (it can take a few minutes). Do NOT click Send again - check the Email Log in the MIS to confirm.', { duration: 15000 });
        onClose();
      } else {
        toast.error(msg || 'The e-mail could not be sent.');
      }
    } finally {
      setSending(false);
    }
  };

  const canSend = !sending && data?.items?.length && confirmChecked && confirmResp && to.trim();

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 p-4 overflow-y-auto whitespace-normal">
      <div className="my-auto w-full max-w-2xl rounded-xl bg-white dark:bg-dark-800 text-gray-800 dark:text-dark-100 shadow-xl p-5 space-y-3 text-sm">
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
              <label className="flex items-center gap-1"><input type="radio" checked={mode === 'test'} onChange={() => changeMode('test')} /> Test (subject marked [TEST])</label>
              <label className="flex items-center gap-1"><input type="radio" checked={mode === 'live'} onChange={() => changeMode('live')} /> Send to customer</label>
            </div>
            {mode === 'test' && (
              <p className="rounded border border-sky-300 bg-sky-50 text-sky-900 p-2 text-xs">
                Test mode: the e-mail is sent ONLY to the address(es) typed below (pre-filled with your own{data.my_email ? <> (<b>{data.my_email}</b>)</> : ''}). The customer receives nothing unless you type their address.
              </p>
            )}
            <div className="space-y-2">
              <label className="block">To (type the e-mail address(es), comma separated)
                <input value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block w-full border rounded p-1.5 dark:bg-dark-900" placeholder="name@example.com" />
              </label>
              <label className="block">CC (optional)
                <input value={cc} onChange={(e) => setCc(e.target.value)} className="mt-1 block w-full border rounded p-1.5 dark:bg-dark-900" />
              </label>
            </div>
            <label className="block">Message to add (optional)
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1 block w-full border rounded p-1.5 dark:bg-dark-900" />
            </label>

            {/* WhatsApp: code is ready; stays off until the server reports whatsapp_ready */}
            <div className="rounded border border-gray-200 p-2">
              <label className={`flex items-center gap-2 ${data.whatsapp_ready ? '' : 'opacity-50'}`}>
                <input type="checkbox" checked={sendWa} disabled={!data.whatsapp_ready} onChange={(e) => setSendWa(e.target.checked)} />
                Also notify on WhatsApp {data.whatsapp_ready ? '' : '(not active yet)'}
              </label>
              {data.whatsapp_ready && sendWa && (
                <input value={waNumbers} onChange={(e) => setWaNumbers(e.target.value)} className="mt-1 block w-full border rounded p-1.5 dark:bg-dark-900" placeholder="WhatsApp number(s), 10 digits or with country code" />
              )}
            </div>

            <div className="rounded-lg border border-indigo-200 bg-indigo-50 dark:bg-indigo-900/20 p-3 space-y-2">
              <p className="text-[11px] text-indigo-900/80 dark:text-indigo-300">
                By sending these laboratory documents you confirm that you have carried out the necessary checks and assume sole responsibility for this release:
              </p>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={confirmChecked} onChange={(e) => setConfirmChecked(e.target.checked)} className="mt-0.5" />
                <span className="text-xs font-medium">I have thoroughly verified the contents of these DRAFT certificates and the recipient address(es) entered above.</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={confirmResp} onChange={(e) => setConfirmResp(e.target.checked)} className="mt-0.5" />
                <span className="text-xs font-medium">
                  {mode === 'test'
                    ? 'I understand this is a test. I am solely responsible for the documents sent to the address(es) I entered, including their confidentiality.'
                    : 'I accept full authorization and sole responsibility for releasing and transmitting these documents to the client, including their confidentiality. I understand they are DRAFT and not final.'}
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="px-3 py-1.5 rounded border">Cancel</button>
              <button type="button" onClick={send} disabled={!canSend} className="px-3 py-1.5 rounded bg-blue-600 text-white font-semibold disabled:opacity-50">
                {sending ? 'Sending (may take a minute)...' : mode === 'test' ? 'Send test' : 'Send DRAFT to customer'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
