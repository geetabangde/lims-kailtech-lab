import PropTypes from "prop-types";

// Shared by the three quotation forms (Add calibration, Add testing, Convert enquiry): the switch between the regular
// quotation (items are added on the next screen) and an uploaded PDF, plus the extra fields an upload needs.
export const QUOTATION_MODES = { regular: "regular", upload: "upload" };

export function QuotationModeToggle({ mode, onChange }) {
  const btn = (key, title, sub) => (
    <button
      type="button"
      onClick={() => onChange(key)}
      className={
        "flex-1 rounded-lg border px-4 py-3 text-left transition " +
        (mode === key
          ? "border-primary-600 bg-primary-50 ring-2 ring-primary-500/30 dark:bg-primary-900/20"
          : "border-gray-300 bg-white hover:bg-gray-50 dark:border-dark-500 dark:bg-dark-800")
      }
    >
      <p className="text-sm font-semibold text-gray-800 dark:text-dark-50">{title}</p>
      <p className="text-xs text-gray-500">{sub}</p>
    </button>
  );
  return (
    <div className="mb-2 flex flex-col gap-3 sm:flex-row">
      {btn(QUOTATION_MODES.regular, "Prepare quotation", "Fill the form and add the items on the next screen (regular format).")}
      {btn(QUOTATION_MODES.upload, "Upload quotation (PDF)", "For a customer format the regular form cannot produce: upload the ready PDF.")}
    </div>
  );
}
QuotationModeToggle.propTypes = { mode: PropTypes.string.isRequired, onChange: PropTypes.func.isRequired };

const inputCls =
  "h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:ring-1 focus:ring-blue-500 dark:border-dark-500 dark:bg-dark-800";

export function UploadQuotationFields({ number, setNumber, amount, setAmount, note, setNote, file, setFile }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="form-group">
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-100">
          Quotation Number <span className="text-red-500">*</span>
        </label>
        <input
          className={inputCls}
          value={number}
          maxLength={100}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="Exactly as written on the uploaded quotation"
        />
        <p className="mt-1 text-xs text-gray-500">It must be unique. This number is what the quotation list, e-mail and reports will show.</p>
      </div>
      <div className="form-group">
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-100">Quotation Value (Rs)</label>
        <input
          className={inputCls}
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Total of the uploaded quotation"
        />
        <p className="mt-1 text-xs text-gray-500">Used in the lists and in Win / Loss. Leave blank if not known.</p>
      </div>
      <div className="form-group md:col-span-2">
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-100">
          Quotation PDF <span className="text-red-500">*</span>
        </label>
        <input
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full rounded-md border border-gray-300 bg-white p-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary-600 file:px-3 file:py-1.5 file:text-white dark:border-dark-500 dark:bg-dark-800"
        />
        <p className="mt-1 text-xs text-gray-500">PDF only, up to 10 MB. {file ? `Selected: ${file.name}` : ""}</p>
      </div>
      <div className="form-group md:col-span-2">
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-100">Note (optional)</label>
        <textarea
          className="min-h-[70px] w-full rounded-md border border-gray-300 p-2 text-sm dark:border-dark-500 dark:bg-dark-800"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
    </div>
  );
}
UploadQuotationFields.propTypes = {
  number: PropTypes.string,
  setNumber: PropTypes.func,
  amount: PropTypes.string,
  setAmount: PropTypes.func,
  note: PropTypes.string,
  setNote: PropTypes.func,
  file: PropTypes.object,
  setFile: PropTypes.func,
};

// Builds the multipart body for POST enquiry-lifecycle/quotation-upload from a payload object + the PDF.
const SKIP = ["customterms", "ourscope", "yourscope", "notes"];
export const buildUploadFormData = (payload, extra) => {
  const fd = new FormData();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && !SKIP.includes(k)) fd.append(k, v);
  });
  fd.append("quotationno", extra.number.trim());
  if (extra.amount !== "") fd.append("amount", extra.amount);
  if (extra.note.trim()) fd.append("note", extra.note.trim());
  fd.append("quotation_file", extra.file);
  return fd;
};

// Client-side checks shared by the three forms; returns an error text or "".
export const checkUploadInputs = ({ number, file }) => {
  if (!number.trim()) return "Enter the quotation number - it is compulsory for an uploaded quotation";
  if (!file) return "Please choose the quotation PDF";
  if (!/\.pdf$/i.test(file.name)) return "Only a PDF file can be uploaded";
  if (file.size > 10 * 1024 * 1024) return "The PDF must be 10 MB or smaller";
  return "";
};
