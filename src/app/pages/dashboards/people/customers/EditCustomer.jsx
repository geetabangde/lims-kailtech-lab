// EditCustomer.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import axios from "utils/axios";
import { toast } from "sonner";
import { Button, Input, Select } from "components/ui";
import { Page } from "components/shared/Page";
import ReactSelect from "react-select";

// Phone and Email dynamic management helpers
const parsePhoneNumbers = (raw) => {
  if (!raw || typeof raw !== 'string') return [{ type: 'Mobile', number: '' }];
  const parts = raw.split(/[\n,]+/).map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return [{ type: 'Mobile', number: '' }];
  return parts.map(part => {
    let type = 'Mobile';
    let number = part;
    const colonMatch = part.match(/^(Mobile|WhatsApp|Landline)\s*:\s*(.+)$/i);
    if (colonMatch) {
      const t = colonMatch[1].toLowerCase();
      type = t === 'whatsapp' ? 'WhatsApp' : (t === 'landline' ? 'Landline' : 'Mobile');
      number = colonMatch[2].trim();
    } else {
      const parenMatch = part.match(/^(.+?)\s*\((Mobile|WhatsApp|Landline)\)$/i);
      if (parenMatch) {
        const t = parenMatch[2].toLowerCase();
        type = t === 'whatsapp' ? 'WhatsApp' : (t === 'landline' ? 'Landline' : 'Mobile');
        number = parenMatch[1].trim();
      }
    }
    return { type, number };
  });
};

const serializePhoneNumbers = (phoneList) => {
  if (!Array.isArray(phoneList) || phoneList.length === 0) return '';
  const valid = phoneList.filter(p => p.number && p.number.trim());
  if (valid.length === 0) return '';
  return valid.map(p => `${p.type}: ${p.number.trim()}`).join(', ');
};

const parseEmails = (raw) => {
  if (!raw || typeof raw !== 'string') return [''];
  const parts = raw.split(/[\n,;]+/).map(e => e.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [''];
};

const serializeEmails = (emailList) => {
  if (!Array.isArray(emailList) || emailList.length === 0) return '';
  return emailList.map(e => e.trim()).filter(Boolean).join(', ');
};

export default function EditCustomer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    name: "",
    customertype: [],
    modeofpayment: "",
    creditdays: "",
    creditamount: "",
    leftamount: "", // Credit Left
    mobile: "",
    pname: "",
    pnumber: "",
    email: "",
    country: "",
    stateid: "",
    state: "", // For non-India countries
    city: "",
    gstno: "",
    pan: "",
    discount: "",
    verticals: "",
    thumb_image: null,
    existing_thumb: "" // For displaying existing photo
  });

  const [customerTypeOptions, setCustomerTypeOptions] = useState([]);
  const [paymentModes, setPaymentModes] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [verticals, setVerticals] = useState([]);
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

  // Address & Contact management
  const [addresses, setAddresses] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showEditAddressModal, setShowEditAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [activeTab, setActiveTab] = useState("address");

  // Required fields (thumb_image is optional)
  const getRequiredFields = () => {
    const fields = {
      name: "Customer Name",
      customertype: "Customer Type",
      creditdays: "Credit Days",
      creditamount: "Credit Amount",
      leftamount: "Credit Left",
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
    const fetchDropdownsAndCustomer = async () => {
      try {
        setLoading(true);

        // 1. Fetch main customer data first (Critical)
        let mainCustomer = {};
        try {
          const res = await axios.get(`/people/get-single-customer/${id}`);
          mainCustomer = res?.data?.data || {};
        } catch (err) {
          console.error("Error fetching main customer:", err);
          toast.error("Failed to load customer profile");
        }

        // 2. Fetch dropdowns and related data in parallel (Non-critical)
        const [ctRes, pmRes, countryRes, stateRes, verticalsRes, addressRes, contactRes] = await Promise.allSettled([
          axios.get("/people/get-customer-type-list"),
          axios.get("/people/get-payment-mode"),
          axios.get("/people/get-country"),
          axios.get("/people/get-state"),
          axios.get("/master/vertical-list"),
          axios.get(`/people/get-customers-address/${id}`),
          axios.get(`/get-concern-person/${id}`)
        ]);

        // Process Dropdowns
        const ctData = ctRes.status === 'fulfilled' && Array.isArray(ctRes.value?.data?.Data) ? ctRes.value.data.Data : [];
        const pmData = pmRes.status === 'fulfilled' && Array.isArray(pmRes.value?.data?.data) ? pmRes.value.data.data : [];
        const countryData = countryRes.status === 'fulfilled' && Array.isArray(countryRes.value?.data?.data) ? countryRes.value.data.data : [];
        const stateData = stateRes.status === 'fulfilled' && Array.isArray(stateRes.value?.data?.data) ? stateRes.value.data.data : [];
        const verticalsData = verticalsRes.status === 'fulfilled' && Array.isArray(verticalsRes.value?.data?.data) ? verticalsRes.value.data.data : [];

        setCustomerTypeOptions(ctData.map((item) => ({ label: item.name, value: item.id })));
        setPaymentModes(pmData.map((item) => ({ label: item.name, value: item.id })));
        setCountries(countryData.map((item) => ({ label: item.name, value: item.id })));
        setStates(stateData.map((item) => ({ label: item.state, value: item.id })));
        setVerticals(verticalsData.map((item) => ({ label: item.name, value: item.id })));

        // Process Related Lists
        const finalAddresses = addressRes.status === 'fulfilled'
          ? (Array.isArray(addressRes.value?.data?.data) ? addressRes.value.data.data : (Array.isArray(addressRes.value?.data) ? addressRes.value.data : []))
          : [];

        const finalContacts = contactRes.status === 'fulfilled'
          ? (Array.isArray(contactRes.value?.data?.data) ? contactRes.value.data.data : (Array.isArray(contactRes.value?.data) ? contactRes.value.data : []))
          : [];

        setAddresses(finalAddresses);
        setContacts(finalContacts);

        // 3. Map Customer to Form
        const isIndia = String(mainCustomer.country) === "1";
        setIsIndianCountry(isIndia);

        // Parse customertype - handle string "1" or "1,2,3" or already an array
        let customerTypeArray = [];
        if (mainCustomer.customertype) {
          if (typeof mainCustomer.customertype === 'string') {
            customerTypeArray = mainCustomer.customertype.split(",").map(cid => String(cid).trim()).filter(Boolean);
          } else if (Array.isArray(mainCustomer.customertype)) {
            customerTypeArray = mainCustomer.customertype.map(cid => String(cid));
          } else {
            customerTypeArray = [String(mainCustomer.customertype)];
          }
        }

        setFormData({
          name: mainCustomer.name || "",
          customertype: customerTypeArray,
          modeofpayment: mainCustomer.modeofpayment != null ? String(mainCustomer.modeofpayment) : "",
          creditdays: mainCustomer.creditdays != null ? String(mainCustomer.creditdays) : "",
          creditamount: mainCustomer.creditamount != null ? String(mainCustomer.creditamount) : "",
          leftamount: mainCustomer.leftamount != null ? String(mainCustomer.leftamount) : "",
          mobile: mainCustomer.mobile || "",
          pname: mainCustomer.pname || "",
          pnumber: mainCustomer.pnumber || "",
          email: mainCustomer.email || "",
          country: mainCustomer.country != null ? String(mainCustomer.country) : "",
          stateid: isIndia ? (mainCustomer.stateid != null ? String(mainCustomer.stateid) : "") : "",
          state: !isIndia ? (mainCustomer.state || "") : "",
          city: mainCustomer.city || "",
          gstno: mainCustomer.gstno || "",
          pan: mainCustomer.pan || "",
          discount: mainCustomer.discount != null ? String(mainCustomer.discount) : "",
          verticals: mainCustomer.verticals != null ? String(mainCustomer.verticals) : "",
          thumb_image: null,
          existing_thumb: mainCustomer.thumb_image || ""
        });

        setPhoneNumbers(parsePhoneNumbers(mainCustomer.mobile));
        setEmailsList(parseEmails(mainCustomer.email));
      } catch (err) {
        toast.error("An unexpected error occurred");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDropdownsAndCustomer();
  }, [id]);

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
      [name]: selectedOptions ? selectedOptions.map((opt) => String(opt.value)) : []
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

  // Edit address
  const handleEditAddress = (addr) => {
    setEditingAddress(addr);
    setShowEditAddressModal(true);
  };

  // Delete address
  const handleDeleteAddress = (addressId) => {
    toast("Are you sure you want to delete this address?", {
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            await axios.post(`/remove-customer-address/${addressId}`);
            setAddresses(prev => prev.filter(addr => addr.id !== addressId));
            toast.success("Address deleted successfully");
          } catch (err) {
            toast.error("Failed to delete address");
            console.error(err);
          }
        }
      },
      cancel: {
        label: "Cancel",
        onClick: () => { }
      },
      actionButtonStyle: {
        backgroundColor: '#ef4444',
        color: '#fff',
        fontWeight: 'bold'
      }
    });
  };

  // Delete contact
  const handleDeleteContact = (contactId) => {
    toast("Are you sure you want to delete this contact?", {
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            await axios.post(`/remove-customer-contact/${contactId}`);
            setContacts(prev => prev.filter(contact => contact.id !== contactId));
            toast.success("Contact deleted successfully");
          } catch (err) {
            toast.error("Failed to delete contact");
            console.error(err);
          }
        }
      },
      cancel: {
        label: "Cancel",
        onClick: () => { }
      },
      actionButtonStyle: {
        backgroundColor: '#ef4444',
        color: '#fff',
        fontWeight: 'bold'
      }
    });
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
        if (!formData[field] || formData[field].length === 0) {
          newErrors[field] = true;
        }
      } else {
        if (!formData[field] || formData[field].toString().trim() === '') {
          newErrors[field] = true;
        }
      }
    });

    // Email format validation (supports comma-separated multiple emails)
    if (formData.email && formData.email.trim() !== '') {
      const emails = formData.email.split(',').map(e => e.trim()).filter(e => e !== '');
      // Very relaxed validation: must contain at least one '@' symbol
      const invalidEmails = emails.filter(e => !e.includes('@'));

      if (invalidEmails.length > 0) {
        newValidationErrors.email = "Please enter email";
      }
    }

    // Custom validations (only if fields are filled)
    // Note: We don't validate name/email if unchanged from original

    setErrors(newErrors);
    setValidationErrors(newValidationErrors);

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

      Object.entries(formData).forEach(([key, value]) => {
        if (key === "customertype") {
          if (Array.isArray(value)) {
            value.forEach((v) => {
              payload.append("customertype[]", v);
            });
          } else {
            payload.append("customertype[]", value);
          }
        } else if (key === "thumb_image" && value) {
          if (value instanceof File) {
            const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/jpg"];
            if (allowedTypes.includes(value.type)) {
              payload.append("thumb_image", value);
            }
          }
        } else if (key === "stateid" || key === "state") {
          // Only send the relevant state field based on country
          if (isIndianCountry && key === "stateid" && value) {
            payload.append(key, value);
          } else if (!isIndianCountry && key === "state" && value) {
            payload.append(key, value);
          }
        } else if (key !== "thumb_image" && key !== "existing_thumb") {
          payload.append(key, value);
        }
      });

      const res = await axios.post(`/people/update-customer/${id}`, payload);

      if (res.data.status === true || res.data.status === "true") {
        toast.success("Customer updated successfully");
        navigate("/dashboards/people/customers");
      } else {
        toast.error(res.data.message || "Update failed");
      }
    } catch (err) {
      toast.error("Error updating customer");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page title="Edit Customer">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Edit Customer</h2>
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
              value={formData.name}
              onChange={handleInputChange}
              className={errors.name ? "border-red-500 bg-red-50" : ""}
            />
            {errors.name && (
              <p className="text-red-600 text-sm mt-1">This field is required</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
              Customer Type <span className="text-red-500">*</span>
            </label>
            <ReactSelect
              isMulti
              value={customerTypeOptions.filter((opt) =>
                formData.customertype.includes(String(opt.value))
              )}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
              Mode of Payment
            </label>
            <Select
              name="modeofpayment"
              value={formData.modeofpayment}
              onChange={(e) => handleSelectChange(e, "modeofpayment")}
              className={errors.modeofpayment ? "border-red-500 bg-red-50" : ""}
            >
              <option value="">Choose...</option>
              {paymentModes.map((mode) => (
                <option key={mode.value} value={mode.value}>{mode.label}</option>
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
              value={formData.creditdays}
              onChange={handleInputChange}
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
              value={formData.creditamount}
              onChange={handleInputChange}
              className={errors.creditamount ? "border-red-500 bg-red-50" : ""}
            />
            {errors.creditamount && (
              <p className="text-red-600 text-sm mt-1">This field is required</p>
            )}
          </div>

          <div>
            <Input
              label="Credit Left"
              name="leftamount"
              type="number"
              onWheel={(e) => e.target.blur()}
              value={formData.leftamount}
              onChange={handleInputChange}
              className={errors.leftamount ? "border-red-500 bg-red-50" : ""}
            />
            {errors.leftamount && (
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
              value={formData.pname}
              onChange={handleInputChange}
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
              value={formData.pnumber}
              onChange={handleInputChange}
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
                  className={errors.stateid ? "react-select-error" : ""}
                  isClearable
                />
                {errors.stateid && (
                  <p className="text-red-600 text-sm mt-1">This field is required</p>
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
                  value={formData.state}
                  onChange={handleInputChange}
                  className={errors.state ? "border-red-500 bg-red-50" : ""}
                />
                {errors.state && (
                  <p className="text-red-600 text-sm mt-1">This field is required</p>
                )}
              </div>
            )}
          </div>

          <div>
            <Input
              label="City"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              className={errors.city ? "border-red-500 bg-red-50" : ""}
            />
            {errors.city && (
              <p className="text-red-600 text-sm mt-1">This field is required</p>
            )}
          </div>

          <div>
            <Input
              label="GST No"
              name="gstno"
              placeholder="GST number (e.g., 22AAAAA0000A1Z5)"
              value={formData.gstno}
              onChange={handleInputChange}
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
              label="PAN"
              name="pan"
              value={formData.pan}
              onChange={handleInputChange}
              className={errors.pan ? "border-red-500 bg-red-50" : ""}
            />
            {errors.pan && (
              <p className="text-red-600 text-sm mt-1">This field is required</p>
            )}
          </div>

          <div>
            <Input
              label="Discount %"
              name="discount"
              type="number"
              onWheel={(e) => e.target.blur()}
              value={formData.discount}
              onChange={handleInputChange}
              className={errors.discount ? "border-red-500 bg-red-50" : ""}
            />
            {errors.discount && (
              <p className="text-red-600 text-sm mt-1">This field is required</p>
            )}
          </div>

          {/* Verticals */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
              Verticals
            </label>
            <Select
              name="verticals"
              value={formData.verticals}
              onChange={(e) => handleSelectChange(e, "verticals")}
            >
              <option value="">Choose...</option>
              {verticals.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </Select>
          </div>

          {/* Image Upload with Preview */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
              Photo
            </label>
            {formData.existing_thumb && (
              <div className="mb-3">
                <img
                  src={formData.existing_thumb}
                  alt="Current"
                  className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                />
                <p className="text-xs text-gray-500 mt-1">Current photo</p>
              </div>
            )}
            <input
              type="file"
              name="thumb_image"
              accept="image/*"
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary-600 file:text-white hover:file:bg-primary-700"
            />
          </div>

          {/* Submit Button */}
          <div className="col-span-1 md:col-span-2">
            <Button type="submit" color="primary" disabled={loading}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 000 8v4a8 8 0 01-8-8z"></path>
                  </svg>
                  Updating...
                </div>
              ) : (
                "Update Customer"
              )}
            </Button>
          </div>
        </form>

        {/* Tabs for Address and Contacts */}
        <div className="mt-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("address")}
                className={`${activeTab === "address"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Address
              </button>
              <button
                onClick={() => setActiveTab("contact")}
                className={`${activeTab === "contact"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Contacts
              </button>
            </nav>
          </div>

          <div className="mt-6">
            {activeTab === "address" && (
              <div>
                <Button
                  onClick={() => setShowAddressModal(true)}
                  className="mb-4"
                  color="primary"
                >
                  + Add New Address
                </Button>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="p-4 border border-gray-200 rounded-lg dark:border-gray-700"
                    >
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                        {addr.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {addr.address}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {addr.city}, {addr.pincode}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {addr.mobile}
                      </p>
                      <div className="mt-3 flex gap-3">
                        <button
                          onClick={() => handleEditAddress(addr)}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "contact" && (
              <div>
                <Button
                  onClick={() => setShowContactModal(true)}
                  className="mb-4"
                  color="primary"
                >
                  + Add New Contact
                </Button>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="p-4 border border-gray-200 rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-dark-800"
                    >
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                        {contact.name || "—"}
                      </h4>
                      <button
                        onClick={() => handleDeleteContact(contact.id)}
                        className="mt-3 text-sm text-red-600 hover:text-red-800 font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add Address Modal */}
        {showAddressModal && (
          <AddAddressModal
            customerId={id}
            onClose={() => setShowAddressModal(false)}
            onSuccess={(newAddress) => {
              setAddresses(prev => [...prev, newAddress]);
              setShowAddressModal(false);
            }}
          />
        )}

        {/* Edit Address Modal */}
        {showEditAddressModal && editingAddress && (
          <EditAddressModal
            initialData={editingAddress}
            onClose={() => {
              setShowEditAddressModal(false);
              setEditingAddress(null);
            }}
            onSuccess={(updatedAddress) => {
              setAddresses(prev =>
                prev.map(a => (a.id === updatedAddress.id ? updatedAddress : a))
              );
              setShowEditAddressModal(false);
              setEditingAddress(null);
            }}
          />
        )}

        {/* Add Contact Modal */}
        {showContactModal && (
          <AddContactModal
            customerId={id}
            onClose={() => setShowContactModal(false)}
            onSuccess={(newContact) => {
              setContacts(prev => [...prev, newContact]);
              setShowContactModal(false);
            }}
          />
        )}
      </div>
    </Page>
  );
}

// Add Address Modal Component
function AddAddressModal({ customerId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    address: "",
    city: "",
    pincode: ""
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post("/people/add-customer-address", {
        ...formData,
        customer: customerId
      });

      if (res.data.status === true || res.data.status === "true") {
        toast.success(res.data.message || "Address added successfully");
        const newAddress = {
          ...formData,
          id: res.data.id || Date.now()
        };
        onSuccess(newAddress);
      } else {
        toast.error(res.data.message || "Failed to add address");
      }
    } catch (err) {
      toast.error("Error adding address");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
          Add New Address
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Address Nickname"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
          <Input
            label="Mobile"
            value={formData.mobile}
            onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              rows={3}
              required
            />
          </div>
          <Input
            label="City"
            value={formData.city}
            onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
            required
          />
          <Input
            label="Pincode"
            value={formData.pincode}
            onChange={(e) => setFormData(prev => ({ ...prev, pincode: e.target.value }))}
            maxLength={6}
            required
          />
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" onClick={onClose} variant="outline">
              Close
            </Button>
            <Button type="submit" color="primary" disabled={loading}>
              {loading ? "Saving..." : "Add Address"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Address Modal Component
function EditAddressModal({ initialData, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    mobile: initialData?.mobile || "",
    address: initialData?.address || "",
    city: initialData?.city || "",
    pincode: initialData?.pincode || ""
  });
  const [loading, setLoading] = useState(false);
  const addressId = initialData?.id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`/people/update-customer-address/${addressId}`, formData);
      if (res.data.status === true || res.data.status === "true") {
        toast.success(res.data.message || "Address updated successfully");
        onSuccess({ ...formData, id: addressId });
      } else {
        toast.error(res.data.message || "Failed to update address");
      }
    } catch (err) {
      toast.error("Error updating address");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
          Edit Address
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Address Nickname"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
          <Input
            label="Mobile"
            value={formData.mobile}
            onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              rows={3}
              required
            />
          </div>
          <Input
            label="City"
            value={formData.city}
            onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
            required
          />
          <Input
            label="Pincode"
            value={formData.pincode}
            onChange={(e) => setFormData(prev => ({ ...prev, pincode: e.target.value }))}
            maxLength={6}
            required
          />
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" onClick={onClose} variant="outline">
              Close
            </Button>
            <Button type="submit" color="primary" disabled={loading}>
              {loading ? "Saving..." : "Update Address"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add Contact Modal Component
function AddContactModal({ customerId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    designation: "",
    department: ""
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post("/people/add-contact", {
        ...formData,
        customer: customerId
      });

      if (res.data.status === true || res.data.status === "true") {
        toast.success(res.data.message || "Contact added successfully");
        const newContact = {
          ...formData,
          id: res.data.id || Date.now()
        };
        onSuccess(newContact);
      } else {
        toast.error(res.data.message || "Failed to add contact");
      }
    } catch (err) {
      toast.error("Error adding contact");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
          Add New Contact
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
          <Input
            label="Email"
            type="text"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            required
          />
          <Input
            label="Mobile"
            value={formData.mobile}
            onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
            required
          />
          <Input
            label="Designation"
            value={formData.designation}
            onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
            required
          />
          <Input
            label="Department"
            value={formData.department}
            onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
            required
          />
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" onClick={onClose} variant="outline">
              Close
            </Button>
            <Button type="submit" color="primary" disabled={loading}>
              {loading ? "Saving..." : "Add Contact"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}