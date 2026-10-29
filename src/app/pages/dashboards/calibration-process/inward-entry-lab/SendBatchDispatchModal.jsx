import { useState, useEffect } from 'react';
import axios from 'utils/axios';
import { toast } from 'sonner';

export default function SendBatchDispatchModal({ isOpen, onClose, inwardId, onSuccess }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // Form State
  const [toRecipients, setToRecipients] = useState([]);
  const [newToEmail, setNewToEmail] = useState('');
  const [ccRecipients, setCcRecipients] = useState([]);
  const [newCcEmail, setNewCcEmail] = useState('');
  const [referenceType, setReferenceType] = useState('recommended');
  const [poNumber, setPoNumber] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [skipUndoBuffer, setSkipUndoBuffer] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [confirmChecklist, setConfirmChecklist] = useState(false);
  const [confirmResponsibility, setConfirmResponsibility] = useState(false);

  // Testing Phase Safeguard State
  const [testMode, setTestMode] = useState(true);
  const [testRecipientEmail, setTestRecipientEmail] = useState('');

  // Active Hold Countdown State
  const [queuedLogId, setQueuedLogId] = useState(null);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showFeedbackCard, setShowFeedbackCard] = useState(false);
  const [sentLogId, setSentLogId] = useState(null);
  const [feedbackChecklist, setFeedbackChecklist] = useState({
    cert_numbers_correct: true,
    attachments_open: true,
    invoice_attached: true,
    wording_po_correct: true,
  });
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen && inwardId) {
      fetchPreviewData();
    } else {
      resetState();
    }
  }, [isOpen, inwardId]);

  const resetState = () => {
    setData(null);
    setToRecipients([]);
    setCcRecipients([]);
    setNewToEmail('');
    setNewCcEmail('');
    setPoNumber('');
    setCustomNote('');
    setSelectedItemIds([]);
    setConfirmChecklist(false);
    setConfirmResponsibility(false);
    setTestMode(true);
    setTestRecipientEmail('');
    setQueuedLogId(null);
    setCountdownSeconds(0);
    setIsSubmitting(false);
    setIsCancelling(false);
    setShowFeedbackCard(false);
    setSentLogId(null);
    setFeedbackNotes('');
    setFeedbackSubmitted(false);
  };

  const fetchPreviewData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/dispatch/preview/${inwardId}`);
      if (res.data?.status && res.data?.data) {
        const d = res.data.data;
        setData(d);
        setToRecipients(d.recipients?.to || []);
        setCcRecipients(d.recipients?.cc || []);
        setPoNumber(d.po_options?.recommended || '');
        setReferenceType(d.po_options?.recommended_type || 'po_number');

        // Select all approved items by default
        const approvedIds = (d.items || [])
          .filter((item) => item.is_approved)
          .map((item) => item.id);
        setSelectedItemIds(approvedIds);
      } else {
        toast.error(res.data?.message || 'Failed to load dispatch preview.');
      }
    } catch (err) {
      console.error('Preview error:', err);
      toast.error(err.response?.data?.message || 'Error fetching dispatch preview.');
    } finally {
      setLoading(false);
    }
  };

  // Add / Remove Recipient Chips
  const handleAddToEmail = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = newToEmail.trim().replace(',', '');
      if (trimmed && isValidEmail(trimmed)) {
        if (!toRecipients.includes(trimmed)) {
          setToRecipients([...toRecipients, trimmed]);
        }
        setNewToEmail('');
      } else if (trimmed) {
        toast.error('Invalid email address format.');
      }
    }
  };

  const handleAddCcEmail = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = newCcEmail.trim().replace(',', '');
      if (trimmed && isValidEmail(trimmed)) {
        if (!ccRecipients.includes(trimmed)) {
          setCcRecipients([...ccRecipients, trimmed]);
        }
        setNewCcEmail('');
      } else if (trimmed) {
        toast.error('Invalid email address format.');
      }
    }
  };

  const removeToEmail = (email) => {
    setToRecipients(toRecipients.filter((e) => e !== email));
  };

  const removeCcEmail = (email) => {
    setCcRecipients(ccRecipients.filter((e) => e !== email));
  };

  const parseTestRecipients = (value) =>
    [...new Set((value || '').split(/[\s,;]+/).map((a) => a.trim().toLowerCase()).filter(Boolean))];

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Toggle item selection
  const toggleItem = (id) => {
    if (selectedItemIds.includes(id)) {
      setSelectedItemIds(selectedItemIds.filter((i) => i !== id));
    } else {
      setSelectedItemIds([...selectedItemIds, id]);
    }
  };

  // Handle PO selection toggle
  const handleReferenceSelect = (type, value) => {
    setReferenceType(type);
    setPoNumber(value);
  };

  // Submit / Queue Dispatch
  const handleQueueDispatch = async () => {
    if (toRecipients.length === 0) {
      toast.error('Please specify at least one "To" recipient email.');
      return;
    }
    if (selectedItemIds.length === 0) {
      toast.error('Please select at least one certificate to dispatch.');
      return;
    }
    if (!poNumber.trim()) {
      toast.error('Please specify a P.O. Number or Reference.');
      return;
    }
    if (testMode || data?.test_mode) {
      const testList = parseTestRecipients(testRecipientEmail);
      if (testList.length === 0 || testList.some((a) => !isValidEmail(a))) {
        toast.error('Pilot testing requires valid test recipient email address(es), separated by commas.');
        return;
      }
      if (testList.length > 5) {
        toast.error('Please enter at most 5 test recipient addresses.');
        return;
      }
      if (testList.some((a) => !/@(kailtech\.(in|net)|gmail\.com)$/i.test(a))) {
        toast.error('Pilot test emails can only be delivered to a company mailbox (@kailtech.in) or a Gmail address (@gmail.com).');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        inward_id: inwardId,
        po_number: poNumber.trim(),
        reference_type: referenceType,
        to_recipients: toRecipients,
        cc_recipients: ccRecipients,
        selected_item_ids: selectedItemIds,
        custom_note: customNote.trim() || null,
        skip_undo_buffer: skipUndoBuffer,
        test_mode: testMode,
        test_recipient_email: parseTestRecipients(testRecipientEmail).join(', '),
        declaration_confirmed: true,
      };

      const res = await axios.post('/dispatch/queue', payload);
      if (res.data?.status) {
        toast.success(res.data.message || 'Dispatch scheduled successfully! 📧');
        if (res.data.test_mode) {
          setSentLogId(res.data.log_id);
          setShowFeedbackCard(true);
        } else if (res.data.undo_window_minutes > 0) {
          setQueuedLogId(res.data.log_id);
          setCountdownSeconds(res.data.undo_window_minutes * 60);
        } else {
          onSuccess && onSuccess(res.data);
          onClose();
        }
      } else {
        toast.error(res.data?.message || 'Failed to schedule dispatch.');
      }
    } catch (err) {
      console.error('Queue error:', err);
      toast.error(err.response?.data?.message || 'Error queueing dispatch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Pilot Feedback
  const handleSubmitFeedback = async () => {
    if (!sentLogId) return;
    setIsSubmittingFeedback(true);
    try {
      const res = await axios.post('/dispatch/feedback', {
        log_id: sentLogId,
        checklist: feedbackChecklist,
        notes: feedbackNotes.trim(),
      });
      if (res.data?.status) {
        toast.success('Thank you! Pilot feedback recorded successfully.');
        setFeedbackSubmitted(true);
        setTimeout(() => {
          onSuccess && onSuccess();
          onClose();
        }, 1200);
      }
    } catch {
      toast.error('Failed to save pilot feedback.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Cancel queued hold
  const handleCancelHold = async () => {
    if (!queuedLogId) return;
    setIsCancelling(true);
    try {
      const res = await axios.post('/dispatch/cancel', {
        log_id: queuedLogId,
        reason: 'Cancelled by operator via modal countdown',
      });
      if (res.data?.status) {
        toast.success('Dispatch cancelled successfully. No emails will leave.');
        setQueuedLogId(null);
        setCountdownSeconds(0);
      } else {
        toast.error(res.data?.message || 'Could not cancel dispatch.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error cancelling dispatch.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Live countdown ticker
  useEffect(() => {
    let timer;
    if (countdownSeconds > 0) {
      timer = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            toast.success('15-minute grace window concluded. Dispatch released.');
            onClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdownSeconds]);

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  // WhatsApp share link builder
  const getWhatsAppUrl = () => {
    const phone = (data?.recipients?.whatsapp || '').replace(/[^0-9]/g, '');
    const clientPhone = phone.length === 10 ? `91${phone}` : phone;
    const certCount = selectedItemIds.length;
    const invNo = data?.invoices?.[0]?.invoiceno || 'N/A';
    const text = encodeURIComponent(
      `Hello, Kailtech Test & Research Centre has completed and dispatched ${certCount} test/calibration certificate(s) against P.O. No: ${poNumber}. Linked Tax Invoice: ${invNo}. Copies sent to your email (${toRecipients.join(', ')}). Thank you!`
    );
    return `https://wa.me/${clientPhone}?text=${text}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📧</span>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                Send Reports & Tax Invoice to Client
              </h2>
              <p className="text-xs text-blue-200">
                Inward #{inwardId} · Consolidated Dispatch Package (Lab Owner Standard)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <p className="text-sm font-medium text-gray-500">
                Analyzing certificates, PDF attachments, and billing data...
              </p>
            </div>
          ) : showFeedbackCard ? (
            <div className="py-8 px-4 space-y-6 text-center max-w-lg mx-auto">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner font-bold">
                ✓
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Pilot Test Email Dispatched Successfully!
                </h3>
                <p className="text-xs text-gray-500 mt-1.5">
                  Delivered to: <strong className="text-emerald-700 dark:text-emerald-300 font-mono">{testRecipientEmail}</strong>
                </p>
                <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 rounded-lg text-amber-800 dark:text-amber-300 text-xs font-semibold">
                  Safe Pilot Phase: Real customer received ZERO emails.
                </div>
              </div>

              {/* 4-Point Pilot Checklist */}
              <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-left space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 block mb-1">
                  Tester Verification Checklist:
                </span>
                <label className="flex items-center gap-2.5 text-xs text-gray-800 dark:text-gray-200 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={feedbackChecklist.cert_numbers_correct}
                    onChange={(e) => setFeedbackChecklist({ ...feedbackChecklist, cert_numbers_correct: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-0"
                  />
                  <span>1. Certificate & Report numbers match correctly</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-gray-800 dark:text-gray-200 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={feedbackChecklist.attachments_open}
                    onChange={(e) => setFeedbackChecklist({ ...feedbackChecklist, attachments_open: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-0"
                  />
                  <span>2. All PDF certificate attachments open without error</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-gray-800 dark:text-gray-200 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={feedbackChecklist.invoice_attached}
                    onChange={(e) => setFeedbackChecklist({ ...feedbackChecklist, invoice_attached: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-0"
                  />
                  <span>3. Tax Invoice attached and amount matches</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-gray-800 dark:text-gray-200 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={feedbackChecklist.wording_po_correct}
                    onChange={(e) => setFeedbackChecklist({ ...feedbackChecklist, wording_po_correct: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-0"
                  />
                  <span>4. Subject line & P.O. reference are accurate</span>
                </label>

                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Tester Notes / Observations (Optional):
                  </label>
                  <textarea
                    rows={2}
                    value={feedbackNotes}
                    onChange={(e) => setFeedbackNotes(e.target.value)}
                    placeholder="e.g. Layout looks crisp, certificates downloaded fast, ready for pilot client."
                    className="w-full text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmittingFeedback || feedbackSubmitted}
                  onClick={handleSubmitFeedback}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-md transition-all active:scale-95"
                >
                  {isSubmittingFeedback ? 'Saving Feedback...' : feedbackSubmitted ? '✓ Feedback Saved' : 'Submit Pilot Feedback'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700"
                >
                  Close Window
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Active Countdown Banner (If scheduled hold is active) */}
              {countdownSeconds > 0 && (
                <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl dark:bg-amber-950/40 dark:border-amber-800 text-amber-900 dark:text-amber-200 animate-pulse">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">⏳</span>
                    <div>
                      <p className="text-sm font-bold">
                        15-Minute Undo Hold Active: Dispatches in {formatCountdown(countdownSeconds)}
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Emails are currently held on the server. You can cancel now with zero emails sent.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCancelHold}
                    disabled={isCancelling}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow transition-colors"
                  >
                    {isCancelling ? 'Cancelling...' : '❌ Cancel / Undo Dispatch'}
                  </button>
                </div>
              )}

              {/* Transparent Test Mode Banner */}
              {(data?.test_mode || testMode) && (
                <div className="p-3.5 bg-amber-500 text-white rounded-xl shadow-sm text-xs font-bold flex items-center gap-2">
                  <span className="text-base">⚠️</span>
                  <span>TEST MODE. Emails are sent to internal test addresses only. Nothing is sent to the customer yet.</span>
                </div>
              )}

              {/* 24h Duplicate Guard Warning */}
              {data?.duplicate_guard?.already_sent && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-xs flex items-center justify-between">
                  <span>
                    ⚠️ <strong>Duplicate Dispatch Notice:</strong> This inward was already dispatched within the last 24 hours (
                    {new Date(data.duplicate_guard.last_sent_at).toLocaleString()} by {data.duplicate_guard.sent_by_name}).
                  </span>
                </div>
              )}

              {/* Client & Clearance Card */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Customer Name
                  </span>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    {data?.customer_name}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      data?.financial_clearance?.cleared
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                    }`}
                  >
                    {data?.financial_clearance?.cleared ? '✓ ' : '⚠️ '}
                    {data?.financial_clearance?.reason}
                  </span>
                  {data?.summary?.missing_pdf_count > 0 && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
                      {data.summary.missing_pdf_count} PDF(s) Missing
                    </span>
                  )}
                </div>
              </div>

              {/* P.O. / Reference Selector */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                  Select P.O. / Delivery Challan Reference for Email Subject & Body
                </label>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  {data?.po_options?.invoice_po && (
                    <button
                      type="button"
                      onClick={() => handleReferenceSelect('invoice_po', data.po_options.invoice_po)}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                        poNumber === data.po_options.invoice_po
                          ? 'border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:border-blue-500 font-bold'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="text-[10px] uppercase font-bold text-gray-400">Invoice P.O.</div>
                      <div className="truncate">{data.po_options.invoice_po}</div>
                    </button>
                  )}
                  {data?.po_options?.inward_po && (
                    <button
                      type="button"
                      onClick={() => handleReferenceSelect('inward_po', data.po_options.inward_po)}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                        poNumber === data.po_options.inward_po
                          ? 'border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:border-blue-500 font-bold'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="text-[10px] uppercase font-bold text-gray-400">Inward P.O.</div>
                      <div className="truncate">{data.po_options.inward_po}</div>
                    </button>
                  )}
                  {data?.po_options?.challan_no && (
                    <button
                      type="button"
                      onClick={() => handleReferenceSelect('challan_no', data.po_options.challan_no)}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                        poNumber === data.po_options.challan_no
                          ? 'border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:border-blue-500 font-bold'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="text-[10px] uppercase font-bold text-gray-400">Delivery Challan</div>
                      <div className="truncate">{data.po_options.challan_no}</div>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleReferenceSelect('inward_ref', data?.po_options?.inward_ref)}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                      poNumber === data?.po_options?.inward_ref
                        ? 'border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:border-blue-500 font-bold'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-bold text-gray-400">Inward Ref</div>
                    <div className="truncate">{data?.po_options?.inward_ref}</div>
                  </button>
                </div>
                <input
                  type="text"
                  value={poNumber}
                  onChange={(e) => {
                    setPoNumber(e.target.value);
                    setReferenceType('custom');
                  }}
                  className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="off"
                  placeholder="Enter or customize P.O. / Work Order Number"
                />
              </div>

              {/* Recipients Management */}
              <div className="space-y-4 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    Recipients & Notification Channels
                  </h4>
                  {data?.recipients?.whatsapp && (
                    <a
                      href={getWhatsAppUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow transition-colors"
                    >
                      <span>📲 Share via WhatsApp</span>
                    </a>
                  )}
                </div>

                {/* Testing Phase Safeguard Card (2-Day Trial Enforced) */}
                <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/80 dark:bg-amber-950/40 dark:border-amber-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={true}
                        disabled={true}
                        readOnly={true}
                        className="rounded text-amber-600 focus:ring-0 opacity-80 cursor-not-allowed"
                      />
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        Initial 2-Day Test Mode Enforced (Real Clients 100% Untouched)
                      </span>
                    </label>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-200 text-amber-800">
                      Safe Test Phase
                    </span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-amber-900 dark:text-amber-300 mb-1">
                      Send Pilot Test Email To (up to 5 addresses, separated by commas):
                    </label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={testRecipientEmail}
                      onChange={(e) => setTestRecipientEmail(e.target.value)}
                      placeholder="e.g. yourname@kailtech.in, yourname@gmail.com"
                      className="w-full text-xs rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 p-2 outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
                      Confidentiality Safeguard: For safety during pilot testing, emails are dispatched ONLY to this @kailtech.in or @gmail.com mailbox. Customers will receive NOTHING. If you use a Gmail address, you are responsible for these documents once sent.
                    </p>
                  </div>
                </div>

                {/* Display Intended Customer Recipients for Verification */}
                <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                    <span>ℹ️</span>
                    <span>When live, this dispatch would be delivered to:</span>
                  </div>
                  <div className="text-blue-900 dark:text-blue-300 pl-5 text-[11px]">
                    <div><strong>Customer Primary (To):</strong> {toRecipients.join(', ') || 'No customer email registered'}</div>
                    {ccRecipients.length > 0 && (
                      <div><strong>Customer Accounts (CC):</strong> {ccRecipients.join(', ')}</div>
                    )}
                  </div>
                  <div className="text-[10px] text-blue-600 dark:text-blue-400 pl-5 italic">
                    (Verify these customer addresses are correct in directory records before live rollout)
                  </div>
                </div>

                {/* TO field */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                    &quot;To&quot; Primary Recipients (Quality / Technical Desk)
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 min-h-[42px]">
                    {toRecipients.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1 bg-blue-100 text-blue-900 dark:bg-blue-900/60 dark:text-blue-200 text-xs px-2.5 py-1 rounded-full font-medium"
                      >
                        {email}
                        <button
                          type="button"
                          onClick={() => removeToEmail(email)}
                          className="hover:text-red-600 text-blue-500"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      type="email"
                      value={newToEmail}
                      onChange={(e) => setNewToEmail(e.target.value)}
                      onKeyDown={handleAddToEmail}
                      placeholder={toRecipients.length === 0 ? 'Type email & press Enter...' : '+ add more...'}
                      className="flex-1 min-w-[140px] text-xs bg-transparent border-none outline-none py-1"
                    />
                  </div>
                </div>

                {/* CC field */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                    &quot;CC&quot; Secondary Recipients (Accounts / Finance / Invoices)
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 min-h-[42px]">
                    {ccRecipients.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200 text-xs px-2.5 py-1 rounded-full font-medium"
                      >
                        {email}
                        <button
                          type="button"
                          onClick={() => removeCcEmail(email)}
                          className="hover:text-red-600 text-emerald-500"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      type="email"
                      value={newCcEmail}
                      onChange={(e) => setNewCcEmail(e.target.value)}
                      onKeyDown={handleAddCcEmail}
                      placeholder={ccRecipients.length === 0 ? 'Type CC email & press Enter...' : '+ add more...'}
                      className="flex-1 min-w-[140px] text-xs bg-transparent border-none outline-none py-1"
                    />
                  </div>
                </div>

              </div>

              {/* Items & Certificate Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    Enclosed Certificates ({selectedItemIds.length} of {data?.items?.length || 0} selected)
                  </h4>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedItemIds(
                          (data?.items || []).filter((i) => i.is_approved).map((i) => i.id)
                        )
                      }
                      className="text-blue-600 hover:underline"
                    >
                      Select All Approved
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => setSelectedItemIds([])}
                      className="text-gray-500 hover:underline"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="max-h-56 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 text-gray-500 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="p-2.5 w-8 text-center">✓</th>
                        <th className="p-2.5">Cert / Report No</th>
                        <th className="p-2.5">Instrument / Item</th>
                        <th className="p-2.5">Serial No</th>
                        <th className="p-2.5">ULR No</th>
                        <th className="p-2.5 text-right">PDF File</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {(data?.items || []).map((item) => (
                        <tr
                          key={item.id}
                          className={`${
                            !item.is_approved
                              ? 'opacity-50 bg-gray-50/50'
                              : selectedItemIds.includes(item.id)
                              ? 'bg-blue-50/30'
                              : ''
                          }`}
                        >
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={selectedItemIds.includes(item.id)}
                              disabled={!item.is_approved}
                              onChange={() => toggleItem(item.id)}
                              className="rounded text-blue-600 focus:ring-0"
                            />
                          </td>
                          <td className="p-2.5 font-bold text-gray-900 dark:text-white">
                            {item.certificateno}
                          </td>
                          <td className="p-2.5 text-gray-700 dark:text-gray-300">{item.name}</td>
                          <td className="p-2.5 text-gray-500">{item.serialno}</td>
                          <td className="p-2.5 font-mono text-[11px] text-gray-600">{item.ulrno}</td>
                          <td className="p-2.5 text-right">
                            {item.pdf_exists ? (
                              <span className="text-emerald-600 font-medium">
                                ✓ {item.file_size_formatted}
                              </span>
                            ) : (
                              <span className="text-red-500 font-semibold">Missing PDF</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Linked Tax Invoice Banner */}
              {data?.invoices?.length > 0 && (
                <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs text-emerald-950 dark:text-emerald-200">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📄</span>
                    <div>
                      <span className="font-bold">Linked Tax Invoice: </span>
                      {data.invoices[0].invoiceno} (Dated: {data.invoices[0].date})
                    </div>
                  </div>
                  <div className="font-bold text-sm">
                    ₹ {Number(data.invoices[0].finaltotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              )}

              {/* Attachment Meter & Multi-Part Alert */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-500 font-medium">Estimated Attachment Size: </span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {data?.summary?.total_formatted}
                  </span>
                  <span className="text-gray-400"> (Threshold: 18.0 MB safe limit)</span>
                </div>
                <div>
                  {data?.summary?.split_required ? (
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                      📦 Multi-Part Auto-Split ({data.summary.parts_count} Emails)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                      ✓ Single Consolidated Email
                    </span>
                  )}
                </div>
              </div>

              {/* Custom Note Option */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Custom Closing Note for Client (Optional)
                </label>
                <textarea
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  rows={2}
                  className="w-full text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Kindly verify the test results. Hard copies are also dispatched via courier docket #..."
                />
              </div>

              {/* Mandatory Approver Undertaking & Accountability Card */}
              <div className="p-4 rounded-xl border-2 border-indigo-200 dark:border-indigo-900 bg-indigo-50/70 dark:bg-indigo-950/30 space-y-3">
                <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚖️</span>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                      Authorized Approver Undertaking & Accountability
                    </h4>
                  </div>
                  <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                    Logged Approver: {data?.approver_info?.name || 'Authorized Signatory'} ({data?.approver_info?.role || 'Quality In-Charge'})
                  </span>
                </div>

                <p className="text-[11px] text-indigo-900/80 dark:text-indigo-300">
                  By dispatching official laboratory certificates and billing records, you confirm that you have conducted thorough quality checks and assume sole responsibility for this release:
                </p>

                <div className="space-y-2 pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmChecklist}
                      onChange={(e) => setConfirmChecklist(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-0"
                    />
                    <span className="text-xs text-gray-800 dark:text-gray-200 font-medium">
                      I have thoroughly verified all certificate contents, report attachments, linked Tax Invoice details, and client P.O. references.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmResponsibility}
                      onChange={(e) => setConfirmResponsibility(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-0"
                    />
                    <span className="text-xs text-gray-800 dark:text-gray-200 font-medium">
                      {(data?.test_mode || testMode)
                        ? (parseTestRecipients(testRecipientEmail).some((a) => /@gmail\.com$/i.test(a))
                          ? `I understand this is a test and no email is sent to the customer. I am sending these certificates to the personal Gmail address ${parseTestRecipients(testRecipientEmail).filter((a) => /@gmail\.com$/i.test(a)).join(', ')} and accept full responsibility for this release.`
                          : "I understand this is a test and no email is sent to the customer.")
                        : "I accept full authorization and sole responsibility for releasing and transmitting these official documents to the client."}
                    </span>
                  </label>
                </div>
              </div>

              {/* Immediate send override checkbox */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="skipUndo"
                  checked={skipUndoBuffer}
                  onChange={(e) => setSkipUndoBuffer(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0"
                />
                <label htmlFor="skipUndo" className="text-xs text-gray-600 dark:text-gray-400">
                  Skip 15-minute undo hold buffer (Dispatch immediately without delay)
                </label>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer (Hidden during feedback submission) */}
        {!showFeedbackCard && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/40 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Close
            </button>

            <div className="flex flex-col items-end gap-1.5">
              <button
                type="button"
                disabled={loading || isSubmitting || selectedItemIds.length === 0 || !confirmChecklist || !confirmResponsibility}
                onClick={handleQueueDispatch}
                className={`px-5 py-2.5 text-xs font-bold text-white rounded-lg shadow-lg flex items-center gap-2 transition-all ${
                  loading || isSubmitting || selectedItemIds.length === 0 || !confirmChecklist || !confirmResponsibility
                    ? 'bg-gray-400 cursor-not-allowed opacity-60'
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                }`}
              >
                <span>{confirmChecklist && confirmResponsibility ? '📧' : '🔒'}</span>
                <span>
                  {isSubmitting
                    ? 'Processing...'
                    : !confirmChecklist || !confirmResponsibility
                    ? 'Confirm Undertaking to Dispatch'
                    : (data?.test_mode || testMode)
                    ? `Send Test Dispatch`
                    : skipUndoBuffer
                    ? 'Send to Client Immediately'
                    : 'Schedule Dispatch (15-Min Safety Hold)'}
                </span>
              </button>
              {(data?.test_mode || testMode) && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400 max-w-sm text-right font-medium">
                  Test dispatch: this will email the selected certificates and invoice to the internal test address(es) only. The customer will NOT receive it. Do not tell the customer it has been sent.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
