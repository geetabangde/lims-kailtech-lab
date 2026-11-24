// Import Dependencies
import { useState, useEffect } from "react";
import axios from "utils/axios";
import { toast } from "sonner";
import { X } from "lucide-react";
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
            console.log("ID being sent:", id);
            const payload = {
                hakuna: Number(id),
                id: Number(id), // Try both fields to see which one works
                what: comment
            };
            console.log("Payload being sent:", payload);
            const res = await axios.post("/sales/marked-testing-quotation-asconverted", payload);

            if (res.data.status === true || res.data.status === "true") {
                toast.success(res.data.message || "Testing quotation marked as converted ✅");
                try {
                    await persistPo(po, Number(id), "testing");
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
            const errorMsg = err.response?.data?.message || err.message || "An error occurred during conversion";
            toast.error(errorMsg);
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
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={handleBackdropClick}
        >
            <div
                className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden text-left animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
                    <div>
                        <h4 className="text-lg font-bold text-gray-800">
                            Mark As Converted
                        </h4>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">QID: {id}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit}>
                    <div className="px-6 py-8 space-y-5">
                        <div className="space-y-3">
                            <label className="block text-sm font-bold text-gray-700 uppercase tracking-tight">
                                Conversion Remarks / Comments
                            </label>
                            <textarea
                                autoFocus
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows={4}
                                placeholder="Enter any final notes about this conversion..."
                                className="w-full border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-4 shadow-sm min-h-[120px] bg-gray-50/30"
                            />
                        </div>
                        <PoFields po={po} setPo={setPo} />
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4 bg-white">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="rounded-lg px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60 transition-all shadow-lg shadow-blue-200 active:scale-95"
                        >
                            {isSubmitting ? "Converting..." : "Mark Converted"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
