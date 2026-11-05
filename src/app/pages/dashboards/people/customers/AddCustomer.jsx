import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import axios from "utils/axios";
import { toast } from "sonner";
import { Button, Input, Select } from "components/ui";
import { Page } from "components/shared/Page";
import ReactSelect from "react-select";

// Phone and Email dynamic management helpers
const serializePhoneNumbers = (phoneList) => {
  if (!Array.isArray(phoneList) || phoneList.length === 0) return '';
  const valid = phoneList.filter(p => p.number && p.number.trim());
  if (valid.length === 0) return '';
  return valid.map(p => `${p.type}: ${p.number.trim()}`).join(', ');
};

const serializeEmails = (emailList) => {
  if (!Array.isArray(emailList) || emailList.length === 0) return '';
  return emailList.map(e => e.trim()).filter(Boolean).join(', ');
};

const SHOW_LEGACY_ADDRESS_BLOCK = false;

export default function AddCustomer() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    name: "",
    customertype: [],
    modeofpayment: "",
    creditdays: "",
    creditamount: "",
    address: "",
    billing_address: "",
    mobile: "",
    pname: "",
    pnumber: "",
    email: "",
    country: "",
    stateid: "",
    state: "", // For non-India countries (text input)
    city: "",
    gstno: "",
    pan: "",
    discount: "",
    thumb_image: null
  });

  const [customerTypeOptions, setCustomerTypeOptions] = useState([]);
  const [paymentModes, setPaymentModes] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [isIndianCountry, setIsIndianCountry] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const [phoneNumbers, setPhoneNumbers] = useState([{ type: 'Mobile', number: '' }]);
  const [emailsList, setEmailsList] = useState(['']);
  const [billingSameAsReporting, setBillingSameAsReporting] = useState(false);
  const [contactPersons, setContactPersons] = useState([
    { id: null, name: "", department: "", designation: "", mobile: "", landline: "", email: "" }
  ]);

  const handleAddContactPerson = () => {
    setContactPersons((prev) => [
      ...prev,
      { id: null, name: "", department: "", designation: "", mobile: "", landline: "", email: "" }
    ]);
  };

  const handleRemoveContactPerson = (index) => {
    setContactPersons((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [{ id: null, name: "", department: "", designation: "", mobile: "", landline: "", email: "" }];
    });
  };

  const handleContactPersonChange = (index, field, value) => {
    setContactPersons((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddPhoneNumber = () => {
    setPhoneNumbers((prev) => [...prev, { type: "Mobile", number: "" }]);
  };

  const handleRemovePhoneNumber = (index) => {
    setPhoneNumbers((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [{ type: "Mobile", number: "" }];
    });
  };

  const handlePhoneNumberChange = (index, value) => {
    setPhoneNumbers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], number: value };
      return next;
    });
    if (errors.mobile) setErrors((prev) => ({ ...prev, mobile: false }));
  };

  const handlePhoneTypeChange = (index, value) => {
    setPhoneNumbers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], type: value };
      return next;
    });
  };

  const handleAddEmail = () => {
    setEmailsList((prev) => [...prev, ""]);
  };

  const handleRemoveEmail = (index) => {
    setEmailsList((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [""];
    });
  };

  const handleEmailChange = (index, value) => {
    setEmailsList((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    if (errors.email) setErrors((prev) => ({ ...prev, email: false }));
  };

  // Required fields (thumb_image is optional)
  const getRequiredFields = () => {
    const fields = {
      name: "Customer Name",
      customertype: "Customer Type",
      creditdays: "Credit Days",
      creditamount: "Credit Amount",
      mobile: "Mobile",
      email: "Email",
      country: "Country",
      city: "City",
      gstno: "GST No",
      pan: "PAN",
      discount: "Discount %"
    };

    // Add state field based on country
    if (isIndianCountry) {
      fields.stateid = "State";
    } else {
      fields.state = "State";
    }

    return fields;
  };

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [ctRes, pmRes, countryRes, stateRes] = await Promise.all([
          axios.get("/people/get-customer-type-list"),
          axios.get("/people/get-payment-mode"),
          axios.get("/people/get-country"),
          axios.get("/people/get-state"),
        ]);

        console.log("Customer Types:", ctRes?.data);
        console.log("Payment Modes:", pmRes?.data);
        console.log("Countries:", countryRes?.data);
        console.log("States:", stateRes?.data);

        // Fix: Correct response paths
        const ctData = Array.isArray(ctRes?.data?.Data) ? ctRes.data.Data : [];
        const pmData = Array.isArray(pmRes?.data?.data) ? pmRes.data.data : [];
        const countryData = Array.isArray(countryRes?.data?.data) ? countryRes.data.data : [];
        const stateData = Array.isArray(stateRes?.data?.data) ? stateRes.data.data : [];

        // Mapping for dropdowns
        setCustomerTypeOptions(
          ctData.map((item) => ({ label: item.name, value: item.id }))
        );
        setPaymentModes(
          pmData.map((item) => ({ label: item.name, value: item.id }))
        );
        setCountries(
          countryData.map((item) => ({ label: item.name, value: item.id }))
        );

        setStates(
          stateData.map((item) => ({ label: item.state, value: item.id }))
        );

      } catch (err) {
        toast.error("Error loading dropdown data");
        console.error("Dropdown Fetch Error:", err);
      }
    };

    fetchDropdowns();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;

    if (files) {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: false
      }));
    }
  };

  const handleMultiSelectChange = (selectedOptions, name) => {
    setFormData((prev) => ({
      ...prev,
      [name]: selectedOptions ? selectedOptions.map((opt) => opt.value) : []
    }));

    // Clear error when user makes selection
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: false
      }));
    }
  };

  const handleSelectChange = (e, name) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user makes selection
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: false
      }));
    }

    // Handle country change - check if India (id = "1")
    if (name === "country") {
      const isIndia = value === "1";
      setIsIndianCountry(isIndia);

      // Reset state fields when country changes
      setFormData((prev) => ({
        ...prev,
        stateid: "",
        state: ""
      }));

      // Clear state errors
      setErrors(prev => ({
        ...prev,
        stateid: false,
        state: false
      }));
    }
  };



  const validateForm = async () => {
    const newErrors = {};
    const newValidationErrors = {};
    const requiredFields = getRequiredFields();

    formData.mobile = serializePhoneNumbers(phoneNumbers);
    formData.email = serializeEmails(emailsList);

    // Check all required fields
    Object.keys(requiredFields).forEach(field => {
      if (field === 'customertype') {
        // For customertype array, check if it has at least one item
        if (!formData[field] || formData[field].length === 0) {
          newErrors[field] = true;
        }
      } else {
        // For other fields, check if empty or whitespace only
        if (!formData[field] || formData[field].toString().trim() === '') {
          newErrors[field] = true;
        }
      }
    });

    setErrors(newErrors);
    setValidationErrors(newValidationErrors);

    // If there are errors, focus on the first error field
    const allErrors = { ...newErrors, ...newValidationErrors };
    if (Object.keys(allErrors).length > 0) {
      const firstErrorField = Object.keys(allErrors)[0];
      const element = document.querySelector(`[name="${firstErrorField}"]`);
      if (element) {
        element.focus();
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return false;
    }

    return true;
  };

  // ─────────────────────────────────────────────────────────────────────
  // ✅ FIX: Fallback ID lookup.
  // The `/people/add-customer` API often does NOT return the new
  // customer's ID directly in the response (same issue as Proforma
  // Invoice). So if we can't extract an ID from the response, we fetch
  // the full customer list and find the one we JUST created by matching
  // name + mobile + email (all three, since name alone can repeat).
  // If more than one row matches (rare), we pick the one with the
  // highest id (i.e. most recently created).
  // ─────────────────────────────────────────────────────────────────────
  const findNewlyCreatedCustomerId = async () => {
    try {
      const listRes = await axios.get("/people/get-all-customers");
      const list = Array.isArray(listRes?.data?.data) ? listRes.data.data : [];

      const matches = list.filter(
        (c) =>
          String(c.name || "").trim().toLowerCase() ===
          String(formData.name || "").trim().toLowerCase() &&
          String(c.mobile || "").trim() === String(formData.mobile || "").trim() &&
          String(c.email || "").trim().toLowerCase() ===
          String(formData.email || "").trim().toLowerCase(),
      );

      if (matches.length > 0) {
        // Pick the highest id among matches (most recently created)
        return Math.max(...matches.map((m) => Number(m.id) || 0));
      }

      // Fallback: match on name only (in case mobile/email got normalized differently)
      const nameMatches = list.filter(
        (c) =>
          String(c.name || "").trim().toLowerCase() ===
          String(formData.name || "").trim().toLowerCase(),
      );
      if (nameMatches.length > 0) {
        return Math.max(...nameMatches.map((m) => Number(m.id) || 0));
      }

      // Last resort: assume the highest id in the whole list is the new one
      if (list.length > 0) {
        return Math.max(...list.map((m) => Number(m.id) || 0));
      }
    } catch (err) {
      console.error("Failed to fetch customer list for fallback ID lookup", err);
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form before submission
    const isValid = await validateForm();
    if (!isValid) {
      toast.error("Please fix all errors before submitting");
      return;
    }

    setLoading(true);

    try {
      const payload = new FormData();

      // Add sapua field (from PHP: <input name="sapua" value="1" type="hidden" />)
      payload.append("sapua", "1");

      payload.set("billing_address", billingSameAsReporting ? (formData.address || "") : (formData.billing_address || ""));
      payload.append("contacts", JSON.stringify(contactPersons));
      if (!formData.pname && contactPersons[0]?.name) {
        payload.set("pname", contactPersons[0].name);
      }
      if (!formData.pnumber && contactPersons[0]?.mobile) {
        payload.set("pnumber", contactPersons[0].mobile || "-");
      }

      Object.entries(formData).forEach(([key, value]) => {
        if (key === "customertype") {
          value.forEach((v) => payload.append("customertype[]", v));
        } else if (key === "thumb_image" && value) {
          // Only append image if file is selected
          payload.append(key, value);
        } else if (key === "stateid" || key === "state") {
          // Send the relevant state field based on country
          if (isIndianCountry && key === "stateid") {
            // For India, always send stateid (empty string if not selected)
            payload.append(key, value || "");
          } else if (!isIndianCountry && key === "state") {
            // For non-India countries, always send state (empty string if not entered)
            payload.append(key, value || "");
          }
          // Don't send the other state field
        } else if (key !== "thumb_image") {
          // Append all other fields
          payload.append(key, value || "");
        }
      });

      const res = await axios.post("/people/add-customer", payload);
      console.log("Add Customer Response:", res.data);

      if (res.data.status === true || res.data.status === "true") {
        // Try direct extraction first (some backends do return it)
        let customerId =
          res.data.id ||
          res.data.customer_id ||
          res.data.customerid ||
          res.data.insertId ||
          res.data.hakuna ||
          res.data.pradin;

        if (!customerId && res.data.data) {
          if (typeof res.data.data === 'object') {
            customerId = res.data.data.id || res.data.data.customer_id;
          } else {
            customerId = res.data.data; // e.g. if data is just the ID number
          }
        }

        // ✅ FIX: if still no ID, fall back to list lookup
        if (!customerId) {
          customerId = await findNewlyCreatedCustomerId();
        }

        console.log("Full API Response:", res.data);
        console.log("Extracted Customer ID:", customerId);

        toast.success("New Customer has been Added");

        if (customerId) {
          // ✅ Always go to the edit page of the customer we just created
          navigate(`/dashboards/people/customers/edit/${customerId}`);
        } else {
          console.warn("No customer ID found even after fallback, redirecting to list");
          toast.error("Customer added, but couldn't open edit page automatically.");
          navigate("/dashboards/people/customers");
        }
      } else {
        toast.error(res.data.message || "Failed to add customer");
      }
    } catch (err) {
      console.error("Error:", err);

      // Handle backend validation errors
      if (err.response?.data?.errors) {
        const backendErrors = err.response.data.errors;
        const errorMessages = {};

        Object.entries(backendErrors).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            errorMessages[field] = messages[0];
          }
        });

        setValidationErrors(errorMessages);

        // Show first error in toast
        const firstError = Object.values(errorMessages)[0];
        if (firstError) {
          toast.error(firstError);
        }

        // Focus on first error field
        const firstErrorField = Object.keys(errorMessages)[0];
        if (firstErrorField) {
          const element = document.querySelector(`[name="${firstErrorField}"]`);
          if (element) {
            element.focus();
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      } else {
        toast.error(err.response?.data?.message || "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page title="Add Customers">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Add Customer</h2>
          <Button
            variant="outline"
            className="text-white bg-blue-600 hover:bg-blue-700"
            onClick={() => navigate("/dashboards/people/customers")}
          >
            Back to List
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              label="Customer Name"
              name="name"
              placeholder="Customer name"
              onChange={handleInputChange}
              value={formData.name}
              className={errors.name || validationErrors.name ? "border-red-500 bg-red-50" : ""}
            />
            {errors.name && (
              <p className="text-red-600 text-sm mt-1">This field is required</p>
            )}
            {validationErrors.name && (
              <p className="text-red-600 text-sm mt-1">{validationErrors.name}</p>
            )}
          </div>

          {/* Customer Type - Multi Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
              Customer Type <span className="text-red-500">*</span>
            </label>
            <ReactSelect
              isMulti
              name="customertype"
              options={customerTypeOptions}
              onChange={(selected) => handleMultiSelectChange(selected, "customertype")}
              placeholder="Select customer types"
              className={errors.customertype ? "react-select-error" : ""}
            />
            {errors.customertype && (
              <p className="text-red-600 text-sm mt-1">This field is required</p>
            )}
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
              Mode of Payment
            </label>
            <Select
              name="modeofpayment"
              onChange={(e) => handleSelectChange(e, "modeofpayment")}
              value={formData.modeofpayment}
              className={errors.modeofpayment ? "border-red-500 bg-red-50" : ""}
            >
              <option value="">Choose...</option>
              {paymentModes.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </Select>
            {errors.modeofpayment && (
              <p className="text-red-600 text-sm mt-1">This field is required</p>
            )}
          </div>

          <div>
            <Input
              label="Credit Days"
              name="creditdays"
              type="number"
              onWheel={(e) => e.target.blur()}
              placeholder="Credit days"
              onChange={handleInputChange}
              value={formData.creditdays}
              className={errors.creditdays ? "border-red-500 bg-red-50" : ""}
            />
            {errors.creditdays && (
              <p className="text-red-600 text-sm mt-1">This field is required</p>
            )}
          </div>

          <div>
            <Input
              label="Credit Amount"
              name="creditamount"
              type="number"
              onWheel={(e) => e.target.blur()}
              placeholder="Credit amount"
              onChange={handleInputChange}
              value={formData.creditamount}
              className={errors.creditamount ? "border-red-500 bg-red-50" : ""}
            />
            {errors.creditamount && (
              <p className="text-red-600 text-sm mt-1">This field is required</p>
            )}
          </div>

          {/* Dynamic Phone Numbers */}
          <div className="md:col-span-2 rounded-lg border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-700 dark:bg-dark-700/60">
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                Contact Numbers (Mobile / WhatsApp / Landline) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddPhoneNumber}
                className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                <span className="text-sm font-bold">+</span> Add Number
              </button>
            </div>
            <div className="space-y-2.5">
              {phoneNumbers.map((phone, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={phone.type}
                    onChange={(e) => handlePhoneTypeChange(idx, e.target.value)}
                    className="w-36 rounded-md border border-gray-300 bg-white px-2.5 py-2 text-xs font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-dark-800 dark:text-gray-100"
                  >
                    <option value="Mobile">📱 Mobile</option>
                    <option value="WhatsApp">💬 WhatsApp</option>
                    <option value="Landline">☎️ Landline</option>
                  </select>
                  <div className="flex-1">
                    <Input
                      placeholder={`Enter ${phone.type} number`}
                      value={phone.number}
                      onChange={(e) => handlePhoneNumberChange(idx, e.target.value)}
                      className={errors.mobile && idx === 0 && !phone.number ? "border-red-500 bg-red-50" : ""}
                    />
                  </div>
                  {phoneNumbers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePhoneNumber(idx)}
                      title="Remove Number"
                      className="flex h-9 w-9 items-center justify-center rounded-md border border-red-300 text-sm font-bold text-red-600 transition hover:bg-red-600 hover:text-white dark:border-red-700 dark:text-red-400"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            {errors.mobile && (
              <p className="mt-1.5 text-xs text-red-600">At least one contact number is required</p>
            )}
          </div>

          {/* Reporting & Billing Addresses: hidden (addresses are managed in the Addresses list; set the flag to true to show again) */}
          {SHOW_LEGACY_ADDRESS_BLOCK && (
          <div className="md:col-span-2 rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-dark-700/60 shadow-xs">
            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              Address Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Reporting Address
                </label>
                <textarea
                  name="address"
                  rows={3}
                  placeholder="Enter reporting address..."
                  value={formData.address || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      address: val,
                      billing_address: billingSameAsReporting ? val : prev.billing_address
                    }));
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-dark-800 dark:text-white"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Billing Address
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={billingSameAsReporting}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setBillingSameAsReporting(checked);
                        if (checked) {
                          setFormData(prev => ({ ...prev, billing_address: prev.address || "" }));
                        }
                      }}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Both same (Same as Reporting)
                  </label>
                </div>
                <textarea
                  name="billing_address"
                  rows={3}
                  placeholder={billingSameAsReporting ? "Same as Reporting Address" : "Enter billing address..."}
                  disabled={billingSameAsReporting}
                  value={billingSameAsReporting ? (formData.address || "") : (formData.billing_address || "")}
                  onChange={(e) => setFormData(prev => ({ ...prev, billing_address: e.target.value }))}
                  className={`w-full rounded-lg border p-2.5 text-xs focus:ring-1 dark:bg-dark-800 dark:text-white ${
                    billingSameAsReporting
                      ? "border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed dark:border-gray-700 dark:bg-dark-900"
                      : "border-gray-300 bg-white text-gray-800 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600"
                  }`}
                />
              </div>
            </div>
          </div>

          )}

          {/* Contact Persons Directory */}
          <div className="md:col-span-2 rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-dark-700/60 shadow-xs">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                  Contact Persons Directory ({contactPersons.length})
                </h4>
                <p className="text-[11px] text-gray-500 mt-0.5">Add department contacts (name, department, designation, mobile, landline, email) for report & invoice dispatch</p>
              </div>
              <button
                type="button"
                onClick={handleAddContactPerson}
                className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                <span className="text-sm font-bold">+</span> Add Contact Person
              </button>
            </div>

            <div className="space-y-3">
              {contactPersons.map((cp, idx) => (
                <div key={idx} className="rounded-lg border border-gray-200 bg-white p-3 shadow-xs dark:border-gray-700 dark:bg-dark-800">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2 dark:border-gray-700/60">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                        {idx + 1}
                      </span>
                      Contact Person #{idx + 1}
                      {cp.name && <span className="text-gray-500 font-normal">({cp.name})</span>}
                    </span>
                    {contactPersons.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveContactPerson(idx)}
                        title="Remove this contact"
                        className="flex h-6 w-6 items-center justify-center rounded border border-red-200 text-xs font-bold text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/30"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Name</label>
                      <input
                        type="text"
                        placeholder="Name"
                        value={cp.name || ""}
                        onChange={(e) => handleContactPersonChange(idx, "name", e.target.value)}
                        className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-xs dark:border-gray-600 dark:bg-dark-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Department</label>
                      <input
                        type="text"
                        placeholder="e.g. Quality / QA"
                        value={cp.department || ""}
                        onChange={(e) => handleContactPersonChange(idx, "department", e.target.value)}
                        className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-xs dark:border-gray-600 dark:bg-dark-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Designation</label>
                      <input
                        type="text"
                        placeholder="e.g. Manager"
                        value={cp.designation || ""}
                        onChange={(e) => handleContactPersonChange(idx, "designation", e.target.value)}
                        className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-xs dark:border-gray-600 dark:bg-dark-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Mobile</label>
                      <input
                        type="text"
                        placeholder="10-digit mobile"
                        value={cp.mobile || ""}
                        onChange={(e) => handleContactPersonChange(idx, "mobile", e.target.value)}
                        className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-xs dark:border-gray-600 dark:bg-dark-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Landline</label>
                      <input
                        type="text"
                        placeholder="Landline / Ext."
                        value={cp.landline || ""}
                        onChange={(e) => handleContactPersonChange(idx, "landline", e.target.value)}
                        className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-xs dark:border-gray-600 dark:bg-dark-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Email</label>
                      <input
                        type="email"
                        placeholder="email@company.com"
                        value={cp.email || ""}
                        onChange={(e) => handleContactPersonChange(idx, "email", e.target.value)}
                        className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-xs dark:border-gray-600 dark:bg-dark-700"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic Emails */}
          <div className="md:col-span-2 rounded-lg border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-700 dark:bg-dark-700/60">
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                Email Addresses <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddEmail}
                className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                <span className="text-sm font-bold">+</span> Add Email
              </button>
            </div>
            <div className="space-y-2.5">
              {emailsList.map((em, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      type="email"
                      placeholder="Enter email address (e.g. client@example.com)"
                      value={em}
                      onChange={(e) => handleEmailChange(idx, e.target.value)}
                      className={errors.email && idx === 0 && !em ? "border-red-500 bg-red-50" : ""}
                    />
                  </div>
                  {emailsList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(idx)}
                      title="Remove Email"
                      className="flex h-9 w-9 items-center justify-center rounded-md border border-red-300 text-sm font-bold text-red-600 transition hover:bg-red-600 hover:text-white dark:border-red-700 dark:text-red-400"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            {errors.email && (
              <p className="mt-1.5 text-xs text-red-600">At least one valid email address is required</p>
            )}
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
              Country <span className="text-red-500">*</span>
            </label>
            <ReactSelect
              name="country"
              options={countries}
              onChange={(selected) => handleSelectChange({ target: { value: selected ? String(selected.value) : "" } }, "country")}
              value={countries.find(c => String(c.value) === String(formData.country)) || null}
              placeholder="Choose one..."
              className={errors.country ? "react-select-error" : ""}
              isClearable
            />
            {errors.country && (
              <p className="text-red-600 text-sm mt-1">This field is required</p>
            )}
          </div>

          {/* State - Dynamic: Dropdown for India, Text input for others */}
          <div>
            {isIndianCountry ? (
              <>
                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                  State <span className="text-red-500">*</span>
                </label>
                <ReactSelect
                  name="stateid"
                  options={states}
                  onChange={(selected) => handleSelectChange({ target: { value: selected ? String(selected.value) : "" } }, "stateid")}
                  value={states.find(s => String(s.value) === String(formData.stateid)) || null}
                  placeholder="Choose state..."
                  className={errors.stateid || validationErrors.stateid ? "react-select-error" : ""}
                  isClearable
                />
                {errors.stateid && (
                  <p className="text-red-600 text-sm mt-1">This field is required</p>
                )}
                {validationErrors.stateid && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.stateid}</p>
                )}
              </>
            ) : (
              <div>
                <Input
                  label={
                    <>
                      State <span className="text-red-500">*</span>
                    </>
                  }
                  name="state"
                  placeholder="Enter state"
                  onChange={handleInputChange}
                  value={formData.state}
                  className={errors.state || validationErrors.state ? "border-red-500 bg-red-50" : ""}
                />
                {errors.state && (
                  <p className="text-red-600 text-sm mt-1">This field is required</p>
                )}
                {validationErrors.state && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.state}</p>
                )}
              </div>
            )}
          </div>

          <div>
            <Input
              label={
                <>
                  City <span className="text-red-500">*</span>
                </>
              }
              name="city"
              placeholder="City"
              onChange={handleInputChange}
              value={formData.city}
              className={errors.city ? "border-red-500 bg-red-50" : ""}
            />
            {errors.city && (
              <p className="text-red-600 text-sm mt-1">This field is required</p>
            )}
          </div>

          <div>
            <Input
              label={
                <>
                  GST No <span className="text-red-500">*</span>
                </>
              }
              name="gstno"
              placeholder="GST Number"
              onChange={handleInputChange}
              value={formData.gstno}
              className={errors.gstno || validationErrors.gstno ? "border-red-500 bg-red-50" : ""}
            />
            {errors.gstno && (
              <p className="text-red-600 text-sm mt-1">This field is required</p>
            )}
            {validationErrors.gstno && (
              <p className="text-red-600 text-sm mt-1">{validationErrors.gstno}</p>
            )}
          </div>

          <div>
            <Input
              label={
                <>
                  PAN <span className="text-red-500">*</span>
                </>
              }
              name="pan"
              placeholder="PAN number"
              onChange={handleInputChange}
              value={formData.pan}
              className={errors.pan ? "border-red-500 bg-red-50" : ""}
            />
            {errors.pan && (
              <p className="text-red-600 text-sm mt-1">This field is required</p>
            )}
          </div>

          <div>
            <Input
              label={
                <>
                  Discount % <span className="text-red-500">*</span>
                </>
              }
              name="discount"
              type="number"
              onWheel={(e) => e.target.blur()}
              placeholder="Discount percentage"
              onChange={handleInputChange}
              value={formData.discount}
              className={errors.discount ? "border-red-500 bg-red-50" : ""}
            />
            {errors.discount && (
              <p className="text-red-600 text-sm mt-1">This field is required</p>
            )}
          </div>

          {/* Image Upload - Optional */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-white">
              Upload Photo
            </label>
            <input
              type="file"
              name="thumb_image"
              accept="image/*"
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary-600 file:text-white hover:file:bg-primary-700"
            />
          </div>

          <div className="col-span-1 md:col-span-2">
            <Button type="submit" color="primary" disabled={loading}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 000 8v4a8 8 0 01-8-8z"></path>
                  </svg>
                  Saving...
                </div>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </form>
      </div>
    </Page>
  );
}