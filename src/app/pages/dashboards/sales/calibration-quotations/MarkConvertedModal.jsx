// Import Dependencies
import { useState, useEffect } from "react";
import axios from "utils/axios";
import { toast } from "sonner";

// Local Imports
import { Input } from "components/ui";
import PoFields, { emptyPo, persistPo } from "../shared/PoFields";

// ----------------------------------------------------------------------

export default function MarkConvertedModal({ show, id, onClose, onSuccess }) {
  const [comment, setComment] = useState("");
  const [po, setPo] = useState(emptyPo);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (show) {
      setComment("");
      setPo(emptyPo);
    }
  }, [show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await axios.post("/sales/mark-quotation-convert", {
        id: Number(id),
        comment: comment
      });

      if (res.data.status === true || res.data.status === "true") {
        toast.success(res.data.message || "Quotation marked as converted ✅");
        try {
          await persistPo(po, Number(id), "calibration");
        } catch {
          toast.error("Converted, but the PO details could not be saved");
        }
        onSuccess?.();
        onClose();
      } else {
        toast.error(res.data.message || "Failed to convert quotation");
      }
    } catch (err) {
      console.error("Conversion Error:", err);
      toast.error("An error occurred during conversion");
    } finally {
      setIsSubmitting(false);
    }
  };

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
            Mark Quotation Converted
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
          <div className="px-5 py-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Comment On Conversion <span className="text-red-500">*</span>
              </label>
              <Input
                autoFocus
                placeholder="Enter conversion details..."
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="h-10 rounded-lg text-sm"
              />
            </div>
            <PoFields po={po} setPo={setPo} />
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
