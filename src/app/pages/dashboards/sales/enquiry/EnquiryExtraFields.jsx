import PropTypes from "prop-types";
import Select from "react-select";
import {
  LEAD_SOURCES,
  AREAS,
  PAYMENT_STATUSES,
  SAMPLE_ARRIVED,
  TECH_STATUSES,
  whatsappLink,
} from "./enquiryOptions";

// Additive fields (2026-11-24): shared by AddEnquiry and EditEnquiry. All optional.
const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300";

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-3">
      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</label>
      <div className="md:col-span-2">{children}</div>
    </div>
  );
}
Row.propTypes = { label: PropTypes.string, children: PropTypes.node };

export default function EnquiryExtraFields({ formData, setFormData }) {
  const set = (name, value) => setFormData((prev) => ({ ...prev, [name]: value }));
  const pick = (opts, v) => opts.find((o) => o.value === v) || null;
  const wa = whatsappLink(formData.whatsapp_number || formData.concernpersonmobile, formData.concernpersonname);

  return (
    <div className="space-y-6 border-t pt-6">
      <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
        Lead &amp; Follow-up Details
      </h4>
      <Row label="Source of Enquiry (Lead Source)">
        <Select
          options={LEAD_SOURCES}
          value={pick(LEAD_SOURCES, formData.lead_source)}
          onChange={(o) => set("lead_source", o ? o.value : "")}
          placeholder="Select Source"
          isClearable
        />
      </Row>
      <Row label="City / Area">
        <Select
          options={AREAS}
          value={pick(AREAS, formData.area)}
          onChange={(o) => set("area", o ? o.value : "")}
          placeholder="Select City / Area"
          isClearable
          isSearchable
        />
      </Row>
      <Row label="WhatsApp Number">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={formData.whatsapp_number || ""}
            onChange={(e) => set("whatsapp_number", e.target.value)}
            placeholder="10-digit WhatsApp number (defaults to contact mobile)"
            className={inputCls}
          />
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              WhatsApp
            </a>
          )}
        </div>
      </Row>
      <Row label="Payment Status">
        <Select
          options={PAYMENT_STATUSES}
          value={pick(PAYMENT_STATUSES, formData.payment_status)}
          onChange={(o) => set("payment_status", o ? o.value : "")}
          placeholder="Select"
          isClearable
        />
      </Row>
      <Row label="Sample Arrived">
        <Select
          options={SAMPLE_ARRIVED}
          value={pick(SAMPLE_ARRIVED, formData.sample_arrived)}
          onChange={(o) => set("sample_arrived", o ? o.value : "")}
          placeholder="Select"
          isClearable
        />
      </Row>
      <Row label="Technical Verification">
        <Select
          options={TECH_STATUSES}
          value={pick(TECH_STATUSES, formData.tech_verification_status)}
          onChange={(o) => set("tech_verification_status", o ? o.value : "")}
          placeholder="Select"
          isClearable
        />
      </Row>
      {formData.tech_verification_status &&
        formData.tech_verification_status !== "Not Required" && (
          <Row label="Technical Remark (scope / CMC / master / method)">
            <textarea
              rows={2}
              value={formData.tech_verification_remark || ""}
              onChange={(e) => set("tech_verification_remark", e.target.value)}
              className={inputCls}
            />
          </Row>
        )}
    </div>
  );
}

EnquiryExtraFields.propTypes = {
  formData: PropTypes.object.isRequired,
  setFormData: PropTypes.func.isRequired,
};
