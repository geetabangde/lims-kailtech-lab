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
      pname: "Contact Person Name",
      pnumber: "Contact Person Number",
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

          <div>
            <Input
              label="Contact Person Name"
              name="pname"
              placeholder="Contact person name"
              onChange={handleInputChange}
              value={formData.pname}
              className={errors.pname ? "border-red-500 bg-red-50" : ""}
            />
            {errors.pname && (
              <p className="text-red-600 text-sm mt-1">This field is required</p>
            )}
          </div>

          <div>
            <Input
              label="Contact Person Number"
              name="pnumber"
              type="tel"
              placeholder="Contact person number"
              onChange={handleInputChange}
              value={formData.pnumber}
              className={errors.pnumber ? "border-red-500 bg-red-50" : ""}
            />
            {errors.pnumber && (
              <p className="text-red-600 text-sm mt-1">This field is required</p>
            )}
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