import { useState, useEffect } from "react";
import axios from "utils/axios";
import { toast } from "sonner";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  SERVICES,
  TYPES,
  AREAS,
  STATUSES,
  PAYMENT_STATUSES,
  REPORTED_OPTIONS,
  isoDate
} from "./config";

export default function EnquiryFormModal({
  isOpen,
  onClose,
  onSuccess,
  editRecord = null,
  staffList = []
}) {
  const [formData, setFormData] = useState({
    enq_date: isoDate(new Date()),
    client_name: "",
    service: "Calibration",
    enq_type: "New",
    area: "Indore",
    area_other: "",
    contact_person: "",
    mobile: "",
    email: "",
    order_value: "",
    status: "Contacted",
    payment_status: "Not received",
    reported: "No",
    due_date: "",
    handled_by: "",
    remark: ""
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editRecord) {
      const isKnownArea = AREAS.includes(editRecord.area);
      setFormData({
        enq_date: editRecord.enq_date ? isoDate(editRecord.enq_date) : isoDate(new Date()),
        client_name: editRecord.client_name || "",
        service: editRecord.service || "Calibration",
        enq_type: editRecord.enq_type || "New",
        area: isKnownArea ? editRecord.area : (editRecord.area ? "Other" : "Indore"),
        area_other: isKnownArea ? "" : (editRecord.area || ""),
        contact_person: editRecord.contact_person || "",
        mobile: editRecord.mobile || "",
        email: editRecord.email || "",
        order_value: editRecord.order_value ? Number(editRecord.order_value) : "",
        status: editRecord.status || "Contacted",
        payment_status: editRecord.payment_status || "Not received",
        reported: editRecord.reported || "No",
        due_date: editRecord.due_date ? isoDate(editRecord.due_date) : "",
        handled_by: editRecord.handled_by || "",
        remark: editRecord.remark || ""
      });
    } else {
      setFormData({
        enq_date: isoDate(new Date()),
        client_name: "",
        service: "Calibration",
        enq_type: "New",
        area: "Indore",
        area_other: "",
        contact_person: "",
        mobile: "",
        email: "",
        order_value: "",
        status: "Contacted",
        payment_status: "Not received",
        reported: "No",
        due_date: "",
        handled_by: "",
        remark: ""
      });
    }
  }, [editRecord, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e, addAnother = false) => {
    if (e) e.preventDefault();

    if (!formData.client_name.trim()) {
      toast.error("Please enter Client Name.");
      return;
    }
    if (!formData.enq_date) {
      toast.error("Please select Enquiry Date.");
      return;
    }

    const finalArea = formData.area === "Other"
      ? (formData.area_other.trim() || "Other")
      : formData.area;

    const payload = {
      ...formData,
      area: finalArea,
      order_value: formData.order_value === "" ? 0 : Number(formData.order_value),
      handled_by: formData.handled_by || null,
      due_date: formData.due_date || null
    };

    setSaving(true);
    try {
      if (editRecord && editRecord.id) {
        const res = await axios.put(`/enquiry-tracker/update/${editRecord.id}`, payload);
        toast.success(res.data.message || "Enquiry updated successfully.");
        onSuccess();
        onClose();
      } else {
        const res = await axios.post("/enquiry-tracker/store", payload);
        toast.success(res.data.message || "Enquiry saved successfully.");
        if (res.data.duplicate_warning) {
          toast.warning(res.data.duplicate_warning, { duration: 6000 });
        }
        onSuccess();
        if (addAnother) {
          setFormData((prev) => ({
            ...prev,
            client_name: "",
            contact_person: "",
            mobile: "",
            email: "",
            order_value: "",
            remark: "",
            due_date: ""
          }));
        } else {
          onClose();
        }
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || "Failed to save enquiry.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl dark:bg-dark-700 dark:text-dark-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-3 dark:border-dark-600">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-dark-50">
              {editRecord ? "✏️ Edit Enquiry" : "📝 Log New Customer Enquiry"}
            </h3>
            <p className="text-xs text-gray-500 dark:text-dark-300">
              Matches lab Excel tracker format with auto-status formatting.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-dark-600 dark:hover:text-dark-100"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* 1. Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-dark-200">
                Enquiry Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="enq_date"
                value={formData.enq_date}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100"
              />
            </div>

            {/* 2. Client Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-dark-200">
                Client Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="client_name"
                value={formData.client_name}
                onChange={handleChange}
                placeholder="e.g. UltraTech Cement, JSW Steel"
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100"
              />
            </div>

            {/* 3. Service */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-dark-200">
                Service <span className="text-red-500">*</span>
              </label>
              <select
                name="service"
                value={formData.service}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100"
              >
                {SERVICES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* 4. Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-dark-200">
                Client Type <span className="text-red-500">*</span>
              </label>
              <select
                name="enq_type"
                value={formData.enq_type}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* 5. Area */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-dark-200">
                Area / City <span className="text-red-500">*</span>
              </label>
              <select
                name="area"
                value={formData.area}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100"
              >
                {AREAS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              {formData.area === "Other" && (
                <input
                  type="text"
                  name="area_other"
                  value={formData.area_other}
                  onChange={handleChange}
                  placeholder="Specify other city/area"
                  className="mt-2 block w-full rounded-lg border border-amber-300 bg-amber-50/50 px-3 py-1.5 text-xs text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100"
                />
              )}
            </div>

            {/* 6. Contact Person */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-dark-200">
                Contact Person
              </label>
              <input
                type="text"
                name="contact_person"
                value={formData.contact_person}
                onChange={handleChange}
                placeholder="e.g. Mr. Sharma"
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100"
              />
            </div>

            {/* 7. Mobile */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-dark-200">
                Mobile Number (WhatsApp)
              </label>
              <input
                type="tel"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                placeholder="e.g. 9876543210"
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100"
              />
            </div>

            {/* 8. Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-dark-200">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="client@company.com"
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100"
              />
            </div>

            {/* 9. Order Value (₹) */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-dark-200">
                Order Value (₹ Rupees)
              </label>
              <input
                type="number"
                step="any"
                name="order_value"
                value={formData.order_value}
                onChange={handleChange}
                placeholder="e.g. 25000"
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100"
              />
            </div>

            {/* 10. Status */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-dark-200">
                Lifecycle Status <span className="text-red-500">*</span>
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100"
              >
                {STATUSES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* 11. Payment Status */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-dark-200">
                Payment Status
              </label>
              <select
                name="payment_status"
                value={formData.payment_status}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100"
              >
                {PAYMENT_STATUSES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* 12. Reported */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-dark-200">
                Reported
              </label>
              <select
                name="reported"
                value={formData.reported}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100"
              >
                {REPORTED_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* 13. Due Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-dark-200">
                Follow-up Due Date
              </label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100"
              />
            </div>

            {/* 14. Handled By */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-dark-200">
                Assigned Staff / BD
              </label>
              <select
                name="handled_by"
                value={formData.handled_by}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100"
              >
                <option value="">-- Auto (Current User) --</option>
                {staffList.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.designation || "Staff"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 15. Remark */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-dark-200">
              Remarks & Action Notes
            </label>
            <textarea
              name="remark"
              rows={2}
              value={formData.remark}
              onChange={handleChange}
              placeholder="e.g. Quotation to be mailed, party offered lower rates, samples arriving Saturday"
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4 dark:border-dark-600">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none dark:border-dark-500 dark:bg-dark-800 dark:text-dark-200 dark:hover:bg-dark-700"
            >
              Cancel
            </button>
            {!editRecord && (
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={saving}
                className="rounded-lg border border-primary-600 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100 focus:outline-none dark:bg-primary-950/40 dark:text-primary-300"
              >
                Save & Add Another
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {saving ? "Saving..." : editRecord ? "Update Enquiry" : "Save Enquiry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
