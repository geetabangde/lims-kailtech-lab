import axios from "utils/axios";

// Thin helpers for the Enquiry lifecycle endpoints (EnquiryLifecycleController, 2026-11-24).
export const logDenial = (payload) =>
  axios.post("/enquiry-lifecycle/log-event", payload).catch((e) => {
    console.error("Rejection log failed", e);
    return null;
  });
export const techVerify = (payload) => axios.post("/enquiry-lifecycle/tech-verify", payload);
export const getRejectionLog = (params) => axios.get("/enquiry-lifecycle/rejection-log", { params });
export const saveDispatch = (payload) => axios.post("/enquiry-lifecycle/dispatch", payload);
export const getDispatches = (params) => axios.get("/enquiry-lifecycle/dispatch-list", { params });
export const savePo = (formData) =>
  axios.post("/enquiry-lifecycle/po", formData, { headers: { "Content-Type": "multipart/form-data" } });

// 2026-11-27: Upload quotation (PDF) with versions
const multipart = { headers: { "Content-Type": "multipart/form-data" } };
export const uploadQuotation = (formData) => axios.post("/enquiry-lifecycle/quotation-upload", formData, multipart);
export const uploadQuotationVersion = (formData) => axios.post("/enquiry-lifecycle/quotation-upload-version", formData, multipart);
export const getQuotationUploads = (params) => axios.get("/enquiry-lifecycle/quotation-uploads", { params });
