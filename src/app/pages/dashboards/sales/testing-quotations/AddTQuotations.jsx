import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Page } from "components/shared/Page";
import { Button, Card, Table, TBody, Tr, Td } from "components/ui";
import axios from "utils/axios";
import { toast } from "sonner";
import Select from "react-select";

import { DatePicker } from "components/shared/form/Datepicker";
import dayjs from "dayjs";
import { TextEditor } from "components/shared/form/TextEditor";
import { QuotationModeToggle, UploadQuotationFields, QUOTATION_MODES, buildUploadFormData, checkUploadInputs } from "../shared/UploadQuotationFields";
import { uploadQuotation } from "../shared/lifecycleApi";

export default function AddTestingQuotation() {
  const navigate = useNavigate();
  const permissions = JSON.parse(localStorage.getItem("userPermissions") || "[]");

  useEffect(() => {
    if (!permissions.includes(94)) {
      navigate("/dashboards/sales/testing-quotations");
    }
  }, [navigate, permissions]);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // 2026-11-27: regular quotation (items added next) or an uploaded PDF
  const [mode, setMode] = useState(QUOTATION_MODES.regular);
  const [upNumber, setUpNumber] = useState("");
  const [upAmount, setUpAmount] = useState("");
  const [upNote, setUpNote] = useState("");
  const [upFile, setUpFile] = useState(null);
  const isUpload = mode === QUOTATION_MODES.upload;

  const [formData, setFormData] = useState({
    customer: "",
    customername: "",
    customeraddress: "",
    contactpersonname: "",
    concernpersondesignation: "",
    concernpersonemail: "",
    concernpersonmobile: "",
    gstno: "",
    country: "",
    state: "",
    stateid: "",
    ctype: "",
    specificpurpose: "",
    enquirydate: dayjs().format("YYYY-MM-DD"),
    modeof: "0",
    customterms: `Kindly arrange to provide 100% advance payment.`,
    ourscope: "",
    yourscope: "",
    vertical: "2", // Assuming 2 for Testing
    caddress: "",
    cperson: "",
    notes: "",
  });

  const [customers, setCustomers] = useState([]);
  const [customerAddresses, setCustomerAddresses] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [customerTypes, setCustomerTypes] = useState([]);
  const [specificPurposes, setSpecificPurposes] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [statutoryDetails, setStatutoryDetails] = useState([]);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [isIndianCountry, setIsIndianCountry] = useState(false);

  const MODE_OPTIONS = [
    { value: "0", label: "Telephone" },
    { value: "1", label: "Email" },
    { value: "2", label: "Personal" },
    { value: "3", label: "Whatsapp" },
    { value: "4", label: "E-Media" },
    { value: "5", label: "Other (please mention)" },
  ];

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const fetchDropdownData = async () => {
    try {
      setLoading(true);
      const [custRes, ctypeRes, purposeRes, countryRes, statutoryRes, stateRes] =
        await Promise.all([
          axios.get("/people/get-all-customers"),
          axios.get("/people/get-customer-type-list"),
          axios.get("/people/get-specific-purpose-list"),
          axios.get("/people/get-country"),
          axios.get("/sales/get-satutory-details"),
          axios.get("/people/get-state"),
        ]);

      const getData = (res) => res.data?.Data || res.data?.data || [];

      setCustomers(getData(custRes));
      setCustomerTypes(getData(ctypeRes));
      setSpecificPurposes(getData(purposeRes));
      setCountries(getData(countryRes));
      setStatutoryDetails(getData(statutoryRes));
      setStates(getData(stateRes));
    } catch (err) {
      console.error("Error fetching dropdown data:", err);
      toast.error("Failed to load form data");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerChange = async (selectedOption) => {
    const val = selectedOption ? selectedOption.value : "";
    setFormData((prev) => ({ ...prev, customer: val }));

    if (val === "new") {
      setIsNewCustomer(true);
      setCustomerAddresses([]);
      setContacts([]);
      setFormData((prev) => ({
        ...prev,
        customername: "",
        customeraddress: "",
        contactpersonname: "",
        concernpersondesignation: "",
        concernpersonemail: "",
        concernpersonmobile: "",
        gstno: "",
        country: "",
        state: "",
        stateid: "",
        caddress: "",
        cperson: "",
      }));
      setIsIndianCountry(false);
    } else if (val) {
      setIsNewCustomer(false);
      try {
        const [addrRes, custRes, contactRes] = await Promise.all([
          axios.get(`/people/get-customers-address/${val}`).catch(() => null),
          axios.get(`/people/get-single-customer/${val}`).catch(() => null),
          axios.get(`/get-concern-person/${val}`).catch(() => null),
        ]);

        const addresses = addrRes?.data?.data || [];
        const custData = custRes?.data?.data || {};
        const contactList = contactRes?.data?.data || custData.contacts || [];

        setContacts(contactList);

        const allAddresses = [];
        if (custData.address) {
          allAddresses.push({
            id: "main",
            address: custData.address,
            city: "",
            pincode: "",
            contact_person: custData.pname,
            email: custData.email,
            mobile: custData.mobile || custData.pnumber,
            contact_person_id: custData.contact_person_id,
          });
        }
        addresses.forEach((addr) => {
          allAddresses.push({
            id: addr.id,
            address: addr.address,
            city: addr.city,
            pincode: addr.pincode,
            contact_person: addr.contact_person,
            email: addr.email,
            mobile: addr.mobile,
            contact_person_id: addr.contact_person_id,
          });
        });
        setCustomerAddresses(allAddresses);

        const addrData = allAddresses[0] || {};
        const defaultAddressStr = addrData.address
          ? `${addrData.address || ""} ${addrData.city || ""} ${addrData.pincode || ""}`.trim()
          : "";

        const primaryContact = contactList[0] || {};
        const contactName = primaryContact.name || addrData.contact_person || custData.pname || "";
        const contactEmail = primaryContact.email || addrData.email || custData.email || "";
        const contactMobile = primaryContact.mobile || addrData.mobile || custData.mobile || custData.pnumber || "";
        const contactDesignation = primaryContact.designation || "";
        const contactPersonId = primaryContact.id || addrData.contact_person_id || custData.contact_person_id || "";

        setFormData((prev) => ({
          ...prev,
          customername: custData.name || prev.customername,
          customeraddress: defaultAddressStr,
          contactpersonname: contactName,
          concernpersonemail: contactEmail,
          concernpersonmobile: contactMobile,
          concernpersondesignation: contactDesignation,
          gstno: custData.gstno || "",
          country: custData.country || "",
          state: custData.state || "",
          stateid: custData.stateid || "",
          caddress: addrData.id === "main" ? "" : (addrData.id || ""),
          cperson: contactPersonId,
        }));
      } catch (err) {
        console.error("Error fetching customer details:", err);
      }
    } else {
      setIsNewCustomer(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };



  const handleSelectChange = (name, selectedOption) => {
    const val = selectedOption ? selectedOption.value : "";
    setFormData((prev) => ({
      ...prev,
      [name]: val,
    }));
    if (name === "country") {
      setIsIndianCountry(String(val) === "1");
    }
  };

  const handleEditorChange = (name, val, quill) => {
    setFormData((prev) => ({
      ...prev,
      [name]: quill?.root?.innerHTML || "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic Validation
    if (!formData.customer) {
      toast.error("Please select a valid customer");
      return;
    }
    if (formData.customer === "new") {
      if (!formData.customername || !formData.customeraddress || !formData.contactpersonname) {
        toast.error("Please fill in all the required new customer details");
        return;
      }
    }
    if (!formData.ctype) {
      toast.error("Please select a customer type");
      return;
    }
    if (!formData.specificpurpose) {
      toast.error("Please select a specific purpose");
      return;
    }
    if (isUpload) {
      const upErr = checkUploadInputs({ number: upNumber, file: upFile });
      if (upErr) {
        toast.error(upErr);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        customer: formData.customer === "new" ? "new" : Number(formData.customer),
        caddress: formData.caddress ? Number(formData.caddress) : 0,
        cperson: formData.cperson ? Number(formData.cperson) : 0,
        ctype: Number(formData.ctype),
        specificpurpose: Number(formData.specificpurpose),
        enquirydate: dayjs(formData.enquirydate).format("DD/MM/YYYY"),
        modeof: Number(formData.modeof),
        customterms: formData.customterms,
        ourscope: formData.ourscope,
        yourscope: formData.yourscope,
        notes: formData.notes,
        customername: formData.customername,
        customeraddress: formData.customeraddress,
        contactpersonname: formData.contactpersonname,
        concernpersondesignation: formData.concernpersondesignation,
        concernpersonemail: formData.concernpersonemail,
        concernpersonmobile: formData.concernpersonmobile,
        gstno: formData.gstno,
        country: formData.country,
      };

      if (isIndianCountry) {
        payload.stateid = formData.stateid;
      } else {
        payload.state = formData.state;
      }

      if (isUpload) {
        const fd = buildUploadFormData(
          { ...payload, quotation_type: "testing" },
          { number: upNumber, amount: upAmount, note: upNote, file: upFile },
        );
        const upRes = await uploadQuotation(fd);
        toast.success(upRes.data?.message || "Quotation uploaded and saved");
        navigate(`/dashboards/sales/testing-quotations/view/${upRes.data.quotation_id}`);
        return;
      }

      const res = await axios.post("/sales/add-testing-quotation", payload);
      if (res.data.status === "true" || res.data.status === true) {
        toast.success(res.data.message || "Quotation created successfully");
        navigate(`/dashboards/sales/testing-quotations/items/${res.data.quotation_id}`);
      } else {
        toast.error(res.data.message || "Failed to create quotation");
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || "Something went wrong while creating quotation";
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Page title="Add New Testing Quotation">
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <span className="ml-3 text-gray-600">Loading form data...</span>
        </div>
      </Page>
    );
  }

  return (
    <Page title="Add New Testing Quotation">
      <div className="transition-content px-[var(--margin-x)] pb-8">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            Add New Testing Quotation
          </h1>
          <Link to="/dashboards/sales/testing-quotations">
            <Button
              variant="outline"
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              &lt;&lt; Back to Quotation List
            </Button>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <QuotationModeToggle mode={mode} onChange={setMode} />
          <Card className="p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Customer Selection */}
              <div className="form-group">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-100">
                  Select Customer
                </label>
                <Select
                  options={[
                    { value: "new", label: "Add New Customer" },
                    ...customers.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                  value={
                    formData.customer === "new"
                      ? { value: "new", label: "Add New Customer" }
                      : customers
                        .map((c) => ({ value: c.id, label: c.name }))
                        .find((opt) => String(opt.value) === String(formData.customer)) || null
                  }
                  onChange={handleCustomerChange}
                  placeholder="Choose Customer..."
                  className="react-select-container"
                />
              </div>

              {/* Customer Type */}
              <div className="form-group">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-100">
                  Customer Type
                </label>
                <Select
                  options={customerTypes.map((t) => ({
                    value: t.id,
                    label: t.name,
                  }))}
                  value={customerTypes
                    .map((t) => ({ value: t.id, label: t.name }))
                    .find((opt) => String(opt.value) === String(formData.ctype))}
                  onChange={(opt) => handleSelectChange("ctype", opt)}
                  placeholder="Select Type..."
                />
              </div>

              {/* Conditional Customer Details */}
              {isNewCustomer && (
                <>
                  <div className="form-group md:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Customer Name
                    </label>
                    <input
                      name="customername"
                      value={formData.customername}
                      onChange={handleChange}
                      className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                      required
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div className="form-group md:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Customer Address
                    </label>
                    <input
                      name="customeraddress"
                      value={formData.customeraddress}
                      onChange={handleChange}
                      className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                      required
                      placeholder="Enter address"
                    />
                  </div>
                  <div className="form-group">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Contact Person Name
                    </label>
                    <input
                      name="contactpersonname"
                      value={formData.contactpersonname}
                      onChange={handleChange}
                      className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                      required
                      placeholder="Enter contact person"
                    />
                  </div>
                  <div className="form-group">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Contact Person Designation
                    </label>
                    <input
                      name="concernpersondesignation"
                      value={formData.concernpersondesignation}
                      onChange={handleChange}
                      className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter designation"
                    />
                  </div>
                  <div className="form-group">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Contact Person Email
                    </label>
                    <input
                      type="text"
                      name="concernpersonemail"
                      value={formData.concernpersonemail}
                      onChange={handleChange}
                      className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter email address"
                    />
                  </div>
                  <div className="form-group">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Contact Person Mobile
                    </label>
                    <input
                      type="tel"
                      name="concernpersonmobile"
                      value={formData.concernpersonmobile}
                      onChange={handleChange}
                      className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter mobile number"
                    />
                  </div>
                  <div className="form-group">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      GST NO
                    </label>
                    <input
                      name="gstno"
                      value={formData.gstno}
                      onChange={handleChange}
                      className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter GST"
                    />
                  </div>
                  <div className="form-group">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Country
                    </label>
                    <Select
                      options={countries.map((c) => ({
                        value: c.id,
                        label: c.country_name,
                      }))}
                      value={countries
                        .map((c) => ({ value: c.id, label: c.country_name }))
                        .find((opt) => opt.value === formData.country)}
                      onChange={(opt) => handleSelectChange("country", opt)}
                      placeholder="Select Country..."
                    />
                  </div>
                  <div className="form-group">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      State / Province
                    </label>
                    {isIndianCountry ? (
                      <Select
                        options={states.map((s) => ({ value: s.id, label: s.state }))}
                        value={states
                          .map((s) => ({ value: s.id, label: s.state }))
                          .find((opt) => String(opt.value) === String(formData.stateid))}
                        onChange={(opt) => handleSelectChange("stateid", opt)}
                        placeholder="Select State..."
                      />
                    ) : (
                      <input
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Enter state"
                      />
                    )}
                  </div>
                </>
              )}

              {!isNewCustomer && formData.customer && formData.customer !== "new" && (
                <>
                  <div className="form-group md:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Customer Address
                    </label>
                    <Select
                      options={customerAddresses.map((addr) => ({
                        value: addr.id,
                        label: `${addr.address || ""} ${addr.city || ""} ${addr.pincode || ""}`.trim(),
                        original: addr
                      }))}
                      value={formData.caddress
                        ? { label: formData.customeraddress, value: formData.caddress }
                        : (formData.customeraddress ? { label: formData.customeraddress, value: "main" } : null)}
                      onChange={(opt) => {
                        if (opt) {
                          const addrData = opt.original;
                          setFormData((prev) => ({
                            ...prev,
                            customeraddress: opt.label,
                            caddress: addrData.id === "main" ? "" : addrData.id,
                            contactpersonname: addrData.contact_person || prev.contactpersonname,
                            concernpersonemail: addrData.email || prev.concernpersonemail,
                            concernpersonmobile: addrData.mobile || prev.concernpersonmobile,
                            cperson: addrData.contact_person_id || prev.cperson,
                          }));
                        } else {
                          setFormData((prev) => ({
                            ...prev,
                            customeraddress: "",
                            caddress: "",
                          }));
                        }
                      }}
                      placeholder="Select address..."
                    />
                  </div>
                  <div className="form-group md:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Contact Person Name
                    </label>
                    <Select
                      options={contacts.length > 0
                        ? contacts.map(c => ({
                            value: c.id,
                            label: c.name,
                            email: c.email,
                            mobile: c.mobile,
                            designation: c.designation
                          }))
                        : Array.from(new Map(customerAddresses.filter(a => a.contact_person).map(a => [a.contact_person_id, { id: a.contact_person_id, name: a.contact_person, email: a.email, mobile: a.mobile }])).values()).map(c => ({
                            value: c.id,
                            label: c.name,
                            email: c.email,
                            mobile: c.mobile,
                            designation: ""
                          }))}
                      value={formData.cperson
                        ? { label: formData.contactpersonname, value: formData.cperson }
                        : (formData.contactpersonname ? { label: formData.contactpersonname, value: "" } : null)}
                      onChange={(opt) => {
                        if (opt) {
                          setFormData(prev => ({
                            ...prev,
                            cperson: opt.value,
                            contactpersonname: opt.label,
                            concernpersonemail: opt.email || prev.concernpersonemail,
                            concernpersonmobile: opt.mobile || prev.concernpersonmobile,
                            concernpersondesignation: opt.designation || prev.concernpersondesignation
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            cperson: "",
                            contactpersonname: "",
                            concernpersonemail: "",
                            concernpersonmobile: "",
                            concernpersondesignation: ""
                          }));
                        }
                      }}
                      placeholder="Select Contact Person..."
                      noOptionsMessage={() => "No contact persons found"}
                    />
                  </div>
                </>
              )}

              {/* Specific Purpose */}
              <div className="form-group">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Specific Purpose
                </label>
                <Select
                  options={specificPurposes.map((p) => ({
                    value: p.id,
                    label: p.name,
                  }))}
                  value={specificPurposes
                    .map((p) => ({ value: p.id, label: p.name }))
                    .find((opt) => String(opt.value) === String(formData.specificpurpose))}
                  onChange={(opt) => handleSelectChange("specificpurpose", opt)}
                  placeholder="Select Purpose..."
                />
              </div>

              {/* Enquiry Date */}
              <div className="form-group">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Enquiry Date
                </label>
                <DatePicker
                  value={formData.enquirydate}
                  onChange={([date]) =>
                    setFormData((prev) => ({
                      ...prev,
                      enquirydate: date ? dayjs(date).format("YYYY-MM-DD") : "",
                    }))
                  }
                  className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Mode of Enquiry */}
              <div className="form-group">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Mode Of Enquiry
                </label>
                <Select
                  options={MODE_OPTIONS}
                  value={MODE_OPTIONS.find(
                    (opt) => opt.value === formData.modeof,
                  )}
                  onChange={(opt) => handleSelectChange("modeof", opt)}
                />
              </div>
            </div>
          </Card>

          {isUpload && (
            <Card className="p-6">
              <h3 className="mb-4 text-lg font-medium text-gray-800">Upload Quotation</h3>
              <UploadQuotationFields
                number={upNumber} setNumber={setUpNumber}
                amount={upAmount} setAmount={setUpAmount}
                note={upNote} setNote={setUpNote}
                file={upFile} setFile={setUpFile}
              />
            </Card>
          )}

          {/* Terms and Scope Section */}
          {!isUpload && (
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-medium text-gray-800">
              Terms & Scope of Work
            </h3>
            <div className="space-y-4">
              <div className="form-group">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Note :-
                </label>
                <TextEditor
                  value={formData.notes}
                  onChange={(val, quill) => handleEditorChange("notes", val, quill)}
                  className="min-h-[100px] bg-white rounded-md border border-gray-300"
                />
              </div>
              <div className="form-group">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Custom Terms
                </label>
                <TextEditor
                  value={formData.customterms}
                  onChange={(val, quill) => handleEditorChange("customterms", val, quill)}
                  className="min-h-[150px] bg-white rounded-md border border-gray-300"
                />
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="form-group">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Our Scope of Work
                  </label>
                  <TextEditor
                    value={formData.ourscope}
                    onChange={(val, quill) => handleEditorChange("ourscope", val, quill)}
                    className="min-h-[150px] bg-white rounded-md border border-gray-300"
                  />
                </div>
                <div className="form-group">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Your Scope of Work
                  </label>
                  <TextEditor
                    value={formData.yourscope}
                    onChange={(val, quill) => handleEditorChange("yourscope", val, quill)}
                    className="min-h-[150px] bg-white rounded-md border border-gray-300"
                  />
                </div>
              </div>
            </div>
          </Card>
          )}

          {/* Statutory Details Table */}
          {!isUpload && statutoryDetails.length > 0 && (
            <Card className="p-6">
              <h3 className="mb-4 text-lg font-medium text-gray-800">
                Statutory Detail
              </h3>
              <div className="overflow-x-auto">
                <Table className="shadow-xs w-full overflow-hidden rounded-lg border">
                  <TBody>
                    {statutoryDetails.map((item, idx) => (
                      <Tr key={idx} className="border-b">
                        <Td className="w-1/3 font-semibold text-gray-700">
                          {item.name}
                        </Td>
                        <Td className="text-gray-600">
                          <div dangerouslySetInnerHTML={{ __html: item.description }} />
                        </Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            </Card>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              color="success"
              disabled={submitting}
              className="h-10 px-6 text-base font-medium shadow-md transition-all hover:shadow-lg"
            >
              {submitting ? (isUpload ? "Uploading..." : "Creating...") : isUpload ? "Upload & Save Quotation" : "Proceed to add Quotation Items"}
            </Button>
          </div>
        </form>
      </div>
    </Page>
  );
}