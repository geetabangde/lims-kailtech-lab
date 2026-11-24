// Import Dependencies
import { useState, useEffect } from "react";
import { logDenial } from "../shared/lifecycleApi";
import { LOSS_REASONS } from "../enquiry/enquiryOptions";
import { useNavigate } from "react-router-dom";
import axios from "utils/axios";
import { toast } from "sonner";
import dayjs from "dayjs";

// Local Imports
import { Input, Select, Textarea } from "components/ui";

// ----------------------------------------------------------------------

export default function AddQuoteFollowUpModal({ show, id, mode, onClose, onSuccess, title }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    quotationid: id,
    subject: "",
    follow_up_type: "call",
    follow_up_date: dayjs().format("YYYY-MM-DD"),
    remark: "",
    followup: "contact", // "contact", "interested", "not_interested"
    next_follow_up_date: "",
    next_follow_up_type: "call",
    reason: "", // For close mode
  });
  const [lossCategory, setLossCategory] = useState("");

  const isCloseMode = mode === "Close";
  const displayTitle = title || (isCloseMode ? "Close Quotation (Lost)" : "Add Follow-Up Interaction");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (show) {
      setFormData({
        quotationid: id,
        subject: "",
        follow_up_type: "call",
        follow_up_date: dayjs().format("YYYY-MM-DD"),
        remark: "",
        followup: "contact",
        next_follow_up_date: "",
        next_follow_up_type: "call",
        reason: "",
      });
      setLossCategory("");
    }
  }, [show, id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isCloseMode && !lossCategory) {
      toast.error("Please select the reason category");
      return;
    }
    setIsSubmitting(true);

    let payload = {};

    if (isCloseMode) {
      payload = {
        quotationid: Number(id),
        reason: `${lossCategory} - ${formData.reason}`
      };
    } else {
      payload = {
        quotationid: Number(id),
        subject: formData.subject,
        follow_up_type: formData.follow_up_type,
        follow_up_date: dayjs(formData.follow_up_date).format("DD/MM/YYYY"),
        remark: formData.remark,
        followup: formData.followup,
        next_follow_up_date: formData.next_follow_up_date
          ? dayjs(formData.next_follow_up_date).format("DD/MM/YYYY")
          : "",
        next_follow_up_type: formData.next_follow_up_type
      };
    }

    try {
      const res = await axios.post("/sales/add-quotation-followup", payload);

      if (res.data.quotation_id || res.data.status === true || res.data.status === "true") {
        if (isCloseMode) {
          await logDenial({ event_type: "Quotation Lost", quotation_id: Number(id), quotation_type: "calibration", reason_category: lossCategory, remark: formData.reason });
        }
        toast.success(res.data.message || "New Follow-Up has been Added ✅");
        onSuccess?.();
        onClose();
        // Redirect to track follow up page
        navigate(`/dashboards/sales/calibration-quotations/followup/${id}`);
      } else {
        toast.error(res.data.message || "Failed to process request");
      }
    } catch (err) {
      console.error("Submission Error:", err);
      toast.error("An error occurred while saving interaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const showNextFollowUp = formData.followup === "contact" || formData.followup === "interested";

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 px-4"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white shadow-xl dark:bg-gray-900 overflow-hidden text-left"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h4 className="text-base font-semibold text-gray-800 dark:text-white">
            {displayTitle}
          </h4>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none transition"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-5 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

            {isCloseMode ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Loss Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={lossCategory}
                    onChange={(e) => setLossCategory(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                  >
                    <option value="">Select reason...</option>
                    {LOSS_REASONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Reason For Close <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    name="reason"
                    placeholder="Specify why this quotation is being closed..."
                    rows={4}
                    required
                    value={formData.reason}
                    onChange={handleChange}
                    className="w-full border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">

                {/* Subject */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="subject"
                    placeholder="Enter Subject"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    className="h-10 rounded-lg text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Type */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <Select
                      name="follow_up_type"
                      required
                      value={formData.follow_up_type}
                      onChange={handleChange}
                      data={[
                        { value: "", label: "choose one.." },
                        { value: "call", label: "Call" },
                        { value: "meeting", label: "Meeting" },
                        { value: "email", label: "Email" },
                      ]}
                      className="h-10 rounded-lg text-sm"
                    />
                  </div>

                  {/* Follow-up Date */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Follow-up Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      name="follow_up_date"
                      required
                      value={formData.follow_up_date}
                      onChange={handleChange}
                      className="h-10 rounded-lg text-sm"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Follow-up Description
                  </label>
                  <Textarea
                    name="remark"
                    placeholder="Follow-Up Summary"
                    rows={3}
                    value={formData.remark}
                    onChange={handleChange}
                    className="w-full border-gray-300 rounded-lg text-sm"
                  />
                </div>

                {/* Open */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Open <span className="text-red-500">*</span>
                  </label>
                  <Select
                    name="followup"
                    required
                    value={formData.followup}
                    onChange={handleChange}
                    data={[
                      { value: "", label: "choose one.." },
                      { value: "contact", label: "Contact Again" },
                      { value: "interested", label: "Interested" },
                      { value: "not_interested", label: "Not Interested" },
                    ]}
                    className="h-10 rounded-lg text-sm"
                  />
                </div>

                {/* Next Follow-up Section */}
                {showNextFollowUp && (
                  <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 space-y-4">
                      <h4 className="text-xs font-bold text-blue-800 uppercase tracking-tight">Next Follow-Up Schedule</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-blue-700">Date</label>
                          <Input
                            type="date"
                            name="next_follow_up_date"
                            required={showNextFollowUp}
                            value={formData.next_follow_up_date}
                            onChange={handleChange}
                            className="h-9 bg-white border-blue-200 text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-blue-700">Type</label>
                          <Select
                            name="next_follow_up_type"
                            required={showNextFollowUp}
                            value={formData.next_follow_up_type}
                            onChange={handleChange}
                            data={[
                              { value: "", label: "choose one.." },
                              { value: "call", label: "Call" },
                              { value: "meeting", label: "Meeting" },
                              { value: "email", label: "Email" },
                            ]}
                            className="h-9 bg-white border-blue-200 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800 disabled:opacity-50 transition"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition"
            >
              {isSubmitting ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
