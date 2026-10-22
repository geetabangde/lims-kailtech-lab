import { useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { Button, Input } from "components/ui";
import { Page } from "components/shared/Page";
import axios from "utils/axios";
import { toast } from "sonner";
import Select from "react-select";

export default function AddTestParameter() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Form data state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    mintemp: "27.5",
    maxtemp: "27.5",
    minhumidity: "50",
    maxhumidity: "50",
    time: "",
    mindurationdays: "",
    mindurationhours: "",
    maxdurationdays: "",
    maxdurationhours: "",
    reminderdays: "",
    reminderhours: "",
    department: "",
    nabl: "",
    products: [],
    instruments: [],
    measurements: [],
    results: [],
    formula: "",
    cycle: "",
    formattype: "",
    visible: "",
    resultype: [],
    resultunit: "",
    decimal: "",
    minnabl: "",
    maxnabl: "",
    minqai: "",
    maxqai: "",
    remark: "",
  });

  // Dropdown data states
  const [dropdowns, setDropdowns] = useState({
    products: [],
    instruments: [],
    measurements: [],
    results: [],
    resultTypes: [],
    labs: [],
    units: [],
    consumables: [],
    choices: [
      { id: 1, name: "Yes" },
      { id: 2, name: "No" },
    ],
  });

  const [fetchingDropdowns, setFetchingDropdowns] = useState(false);

  // Type of Format options come from the server list (App\Support\TestFormats): "Other" is the empty value
  const [formatOptions, setFormatOptions] = useState([]);
  useEffect(() => {
    axios
      .get("/testing/get-test-formats")
      .then((res) => setFormatOptions(Array.isArray(res.data?.data) ? res.data.data : []))
      .catch(() => setFormatOptions([]));
  }, []);

  // Fetch all dropdown data
  useEffect(() => {
    const fetchAllDropdowns = async () => {
      try {
        setFetchingDropdowns(true);

        const [
          productsRes,
          instrumentsRes,
          measurementsRes,
          resultsRes,
          resultTypesRes,
          labsRes,
          unitsRes,
          consumablesRes,
        ] = await Promise.all([
          axios.get("/testing/get-prodcut-list"),
          axios.get("/testing/get-instrument-categories"),
          axios.get("/testing/get-measurement"),
          axios.get("/testing/get-measurement-result"),
          axios.get("/testing/get-resulttypes"),
          axios.get("/master/list-lab"),
          axios.get("/master/units-list"),
          axios.get("/testing/get-counsumable-category"),
        ]);

        console.log("Products API response:", productsRes.data);
        console.log("Instruments API response:", instrumentsRes.data);
        console.log("Measurements API response:", measurementsRes.data);
        console.log("Results API response:", resultsRes.data);

        // Extract data properly - based on your API response
        const productsData = productsRes.data?.data || [];
        const instrumentsData = instrumentsRes.data?.data || [];
        const measurementsData = measurementsRes.data?.data || []; // This is already an array
        const resultsData = resultsRes.data?.data || [];
        const resultTypesData = resultTypesRes.data?.data || [];
        const labsData = labsRes.data?.data || [];
        const unitsData = unitsRes.data?.data || [];

        console.log("Measurements data:", measurementsData);
        console.log("Measurements count:", measurementsData?.length || 0);

        setDropdowns({
          products: productsData,
          instruments: instrumentsData,
          measurements: measurementsData, // Direct array
          results: resultsData,
          resultTypes: resultTypesData,
          labs: labsData,
          units: unitsData,
          consumables: consumablesRes.data?.data || [],
          choices: [
            { id: 1, name: "Yes" },
            { id: 2, name: "No" },
          ],
        });
      } catch (err) {
        console.error("Error fetching dropdowns:", err);
        toast.error("Failed to load dropdown data");
      } finally {
        setFetchingDropdowns(false);
      }
    };

    fetchAllDropdowns();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // Handler for react-select multi-select
  const handleReactSelectChange = (selectedOptions, fieldName) => {
    const selectedValues = selectedOptions
      ? selectedOptions.map(option => option.value)
      : [];

    setFormData((prev) => ({
      ...prev,
      [fieldName]: selectedValues,
    }));

    if (errors[fieldName]) {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = "Parameter name is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    if (!formData.department) newErrors.department = "Lab is required";
    if (!formData.nabl) newErrors.nabl = "NABL selection is required";
    if (!formData.visible) newErrors.visible = "Visible selection is required";
    if (formData.resultype.length === 0) newErrors.resultype = "Result type is required";
    if (!formData.resultunit) newErrors.resultunit = "Result unit is required";

    if (!formData.mindurationdays && formData.mindurationdays !== 0 && formData.mindurationdays !== "0") newErrors.mindurationdays = "Required";
    if (!formData.mindurationhours && formData.mindurationhours !== 0 && formData.mindurationhours !== "0") newErrors.mindurationhours = "Required";
    else if (Number(formData.mindurationhours) > 24) newErrors.mindurationhours = "Max 24 hours";

    if (!formData.maxdurationdays && formData.maxdurationdays !== 0 && formData.maxdurationdays !== "0") newErrors.maxdurationdays = "Required";
    if (!formData.maxdurationhours && formData.maxdurationhours !== 0 && formData.maxdurationhours !== "0") newErrors.maxdurationhours = "Required";
    else if (Number(formData.maxdurationhours) > 24) newErrors.maxdurationhours = "Max 24 hours";

    if (!formData.reminderdays && formData.reminderdays !== 0 && formData.reminderdays !== "0") newErrors.reminderdays = "Required";
    if (!formData.reminderhours && formData.reminderhours !== 0 && formData.reminderhours !== "0") newErrors.reminderhours = "Required";
    else if (Number(formData.reminderhours) > 24) newErrors.reminderhours = "Max 24 hours";

    if (!formData.remark?.trim()) newErrors.remark = "Remark is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        mintemp: Number(formData.mintemp),
        maxtemp: Number(formData.maxtemp),
        minhumidity: Number(formData.minhumidity),
        maxhumidity: Number(formData.maxhumidity),
        time: formData.time ? Number(formData.time) : 0,
        mindurationdays: formData.mindurationdays ? Number(formData.mindurationdays) : 0,
        mindurationhours: formData.mindurationhours ? Number(formData.mindurationhours) : 0,
        maxdurationdays: formData.maxdurationdays ? Number(formData.maxdurationdays) : 0,
        maxdurationhours: formData.maxdurationhours ? Number(formData.maxdurationhours) : 0,
        reminderdays: formData.reminderdays ? Number(formData.reminderdays) : 0,
        reminderhours: formData.reminderhours ? Number(formData.reminderhours) : 0,
        department: Number(formData.department),
        nabl: Number(formData.nabl),
        products: formData.products,
        instruments: formData.instruments,
        measurements: formData.measurements,
        results: formData.results,
        formula: formData.formula,
        cycle: formData.cycle ? Number(formData.cycle) : 0,
        formattype: formData.formattype ?? "",
        visible: Number(formData.visible),
        resultype: formData.resultype,
        resultunit: Number(formData.resultunit),
        decimal: formData.decimal ? Number(formData.decimal) : 0,
        minnabl: formData.minnabl ? Number(formData.minnabl) : 0,
        maxnabl: formData.maxnabl ? Number(formData.maxnabl) : 0,
        minqai: formData.minqai ? Number(formData.minqai) : 0,
        maxqai: formData.maxqai ? Number(formData.maxqai) : 0,
        remark: formData.remark,
      };

      console.log("Payload:", payload);

      const res = await axios.post("/testing/add-perameter", payload);

      if (res.data?.status === true || res.data?.status === "true") {
        toast.success("Test parameter added successfully ✅", {
          duration: 1000,
        });
        const newId = res.data?.data?.id || res.data?.id;
        navigate("/dashboards/testing/test-parameters", {
          state: { updatedId: newId }
        });
      } else {
        toast.error(res.data?.message || "Failed to add test parameter ❌");
      }
    } catch (err) {
      console.error("Add Parameter Error:", err);
      toast.error(
        err?.response?.data?.message || "Something went wrong while adding parameter"
      );
    } finally {
      setLoading(false);
    }
  };

  // Convert dropdown data to react-select format
  const getSelectOptions = (items, type = "") => {
    if (!items || !Array.isArray(items)) {
      console.log("getSelectOptions received non-array items:", items);
      return [];
    }

    return items.map(item => {
      let label = item.name || item.label || `Item ${item.id}`;
      // Add SKU to label for consumables to make them easier to identify
      if (type === "consumable" && item.sku) {
        label = `${item.name} (${item.sku})`;
      }
      return {
        value: item.id,
        label: label
      };
    });
  };

  const getProductOptions = () => dropdowns.products.map(item => ({
    value: item.id,
    label: item.description ? `${item.name} (${item.description})` : item.name
  }));

  const getResultOptions = () => dropdowns.results.map(item => ({
    value: item.id,
    label: item.label || `Result ${item.id} (VR${item.id})`
  }));

  // Get selected values for react-select
  const getSelectedOptions = (selectedIds, options) => {
    if (!selectedIds || !options) return [];

    // If it's an array (multi-select)
    if (Array.isArray(selectedIds)) {
      return options.filter(option => selectedIds.includes(option.value));
    }

    // If it's a single value (single-select)
    return options.filter(option => option.value === selectedIds);
  };

  // Custom styles for react-select to match your theme
  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: '42px',
      borderColor: state.isFocused
        ? '#3b82f6'
        : 'rgb(209 213 219)', // gray-300
      boxShadow: state.isFocused ? '0 0 0 2px rgb(59 130 246 / 0.5)' : 'none',
      '&:hover': {
        borderColor: '#3b82f6'
      },
      backgroundColor: 'white',
      borderRadius: '0.5rem',
    }),
    menu: (base) => ({
      ...base,
      borderRadius: '0.5rem',
      zIndex: 9999,
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999,
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: '#dbeafe', // blue-100
      borderRadius: '0.25rem',
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: '#1e40af', // blue-800
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: '#3b82f6',
      '&:hover': {
        backgroundColor: '#3b82f6',
        color: 'white',
      },
    }),
  };

  // Get measurement options - with debugging
  const measurementOptions = dropdowns.measurements.map(item => ({
    value: item.id,
    label: `${item.name} ${item.description ? `- ${item.description}` : ''} (VC${item.id})`
  }));
  console.log("Measurement options for dropdown:", measurementOptions);

  if (fetchingDropdowns) {
    return (
      <Page title="Add Test Parameter">
        <div className="p-6 flex items-center justify-center">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 000 8v4a8 8 0 01-8-8z"></path>
            </svg>
            <p className="text-gray-600 dark:text-gray-300">Loading form data...</p>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page title="Add Test Parameter">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Add Test Parameter
          </h2>
          <Button
            variant="outline"
            className="text-white bg-blue-600 hover:bg-blue-700"
            onClick={() => navigate("/dashboards/testing/test-parameters")}
          >
            Back to List
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                label="Parameter Name"
                name="name"
                placeholder="Enter parameter name"
                value={formData.name}
                onChange={handleChange}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <Input
                label="Description/Symbol"
                name="description"
                placeholder="Enter symbol"
                value={formData.description}
                onChange={handleChange}
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description}</p>
              )}
            </div>
          </div>

          {/* Temperature */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                label="Min Temperature Required (°C)"
                name="mintemp"
                type="number"
                step="0.1"
                placeholder="Min temperature"
                value={formData.mintemp}
                onChange={handleChange}
              />
            </div>

            <div>
              <Input
                label="Max Temperature Required (°C)"
                name="maxtemp"
                type="number"
                step="0.1"
                placeholder="Max temperature"
                value={formData.maxtemp}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Humidity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                label="Min Humidity Required (%)"
                name="minhumidity"
                type="number"
                placeholder="Min humidity"
                value={formData.minhumidity}
                onChange={handleChange}
              />
            </div>

            <div>
              <Input
                label="Max Humidity Required (%)"
                name="maxhumidity"
                type="number"
                placeholder="Max humidity"
                value={formData.maxhumidity}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Time Required */}
          <div>
            <Input
              label="Time Required (days)"
              name="time"
              type="number"
              placeholder="Time required in days"
              value={formData.time}
              onChange={handleChange}
            />
          </div>

          {/* Min Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                label="Min Duration (Days)"
                name="mindurationdays"
                type="number"
                placeholder="Minimum duration in days"
                value={formData.mindurationdays}
                onChange={handleChange}
              />
              {errors.mindurationdays && <p className="text-red-500 text-sm mt-1">{errors.mindurationdays}</p>}
            </div>

            <div>
              <Input
                label="Min Duration (Hours)"
                name="mindurationhours"
                type="number"
                max="24"
                placeholder="Minimum duration in hours"
                value={formData.mindurationhours}
                onChange={handleChange}
              />
              {errors.mindurationhours && <p className="text-red-500 text-sm mt-1">{errors.mindurationhours}</p>}
            </div>
          </div>

          {/* Max Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                label="Max Duration (Days)"
                name="maxdurationdays"
                type="number"
                placeholder="Maximum duration in days"
                value={formData.maxdurationdays}
                onChange={handleChange}
              />
              {errors.maxdurationdays && <p className="text-red-500 text-sm mt-1">{errors.maxdurationdays}</p>}
            </div>

            <div>
              <Input
                label="Max Duration (Hours)"
                name="maxdurationhours"
                type="number"
                max="24"
                placeholder="Maximum duration in hours"
                value={formData.maxdurationhours}
                onChange={handleChange}
              />
              {errors.maxdurationhours && <p className="text-red-500 text-sm mt-1">{errors.maxdurationhours}</p>}
            </div>
          </div>

          {/* Reminder Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                label="Reminder Duration (Days)"
                name="reminderdays"
                type="number"
                placeholder="Reminder duration in days"
                value={formData.reminderdays}
                onChange={handleChange}
              />
              {errors.reminderdays && <p className="text-red-500 text-sm mt-1">{errors.reminderdays}</p>}
            </div>

            <div>
              <Input
                label="Reminder Duration (Hours)"
                name="reminderhours"
                type="number"
                max="24"
                placeholder="Reminder duration in hours"
                value={formData.reminderhours}
                onChange={handleChange}
              />
              {errors.reminderhours && <p className="text-red-500 text-sm mt-1">{errors.reminderhours}</p>}
            </div>
          </div>

          {/* Select Lab */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Lab <span className="text-red-500">*</span>
            </label>
            <Select
              name="department"
              options={getSelectOptions(dropdowns.labs)}
              value={getSelectedOptions(Number(formData.department), getSelectOptions(dropdowns.labs))[0] || null}
              onChange={(selected) => {
                setFormData(prev => ({ ...prev, department: selected ? selected.value.toString() : "" }));
                if (errors.department) setErrors(prev => ({ ...prev, department: "" }));
              }}
              styles={customSelectStyles}
              className="react-select-container"
              classNamePrefix="react-select"
              placeholder="Search and select lab..."
              isSearchable
              isClearable
              menuPortalTarget={document.body}
              menuPosition="fixed"
            />
            {errors.department && (
              <p className="text-red-500 text-sm mt-1">{errors.department}</p>
            )}
          </div>

          {/* Covered Under NABL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Covered Under NABL? <span className="text-red-500">*</span>
            </label>
            <select
              name="nabl"
              value={formData.nabl}
              onChange={handleChange}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select</option>
              {dropdowns.choices.map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.name}
                </option>
              ))}
            </select>
            {errors.nabl && <p className="text-red-500 text-sm mt-1">{errors.nabl}</p>}
          </div>

          {/* Applicable Products */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Applicable Products
            </label>
            <Select
              isMulti
              name="products"
              options={getProductOptions()}
              value={getSelectedOptions(formData.products, getProductOptions())}
              onChange={(selected) => handleReactSelectChange(selected, 'products')}
              styles={customSelectStyles}
              className="react-select-container"
              classNamePrefix="react-select"
              placeholder="Select products..."
              isClearable
              isSearchable
            />
            <p className="text-xs text-gray-500 mt-1">Search and select multiple products</p>
          </div>

          {/* Applicable Instruments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Applicable Instruments
            </label>
            <Select
              isMulti
              name="instruments"
              options={getSelectOptions(dropdowns.instruments)}
              value={getSelectedOptions(formData.instruments, getSelectOptions(dropdowns.instruments))}
              onChange={(selected) => handleReactSelectChange(selected, 'instruments')}
              styles={customSelectStyles}
              className="react-select-container"
              classNamePrefix="react-select"
              placeholder="Select instruments..."
              isClearable
              isSearchable
            />
            <p className="text-xs text-gray-500 mt-1">Search and select multiple instruments</p>
          </div>

          {/* Variables (Not used in Calculation) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Variables (Not used in Calculation)
            </label>
            <Select
              isMulti
              name="measurements"
              options={measurementOptions}
              value={getSelectedOptions(formData.measurements, measurementOptions)}
              onChange={(selected) => handleReactSelectChange(selected, 'measurements')}
              styles={customSelectStyles}
              className="react-select-container"
              classNamePrefix="react-select"
              placeholder="Select measurements..."
              isClearable
              isSearchable
              menuPortalTarget={document.body}
              menuPosition="fixed"
              menuShouldBlockScroll={true}
            />
            <div className="text-xs text-gray-500 mt-1">
              <p>Search and select multiple measurements</p>
              <p>Available measurements: {measurementOptions.length}</p>
            </div>
          </div>

          {/* Measurement Results */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Measurement Results
            </label>
            <Select
              isMulti
              name="results"
              options={getResultOptions()}
              value={getSelectedOptions(formData.results, getResultOptions())}
              onChange={(selected) => handleReactSelectChange(selected, 'results')}
              styles={customSelectStyles}
              className="react-select-container"
              classNamePrefix="react-select"
              placeholder="Select results..."
              isClearable
              isSearchable
              menuPortalTarget={document.body}
              menuPosition="fixed"
            />
            <p className="text-xs text-gray-500 mt-1">Search and select multiple results</p>
          </div>

          {/* Calculation Formula */}
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Calculation Formula
            </label>
            <textarea
              name="formula"
              value={formData.formula}
              onChange={handleChange}
              rows="3"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter formula"
            />
          </div>

          {/* No. of Cycles */}
          <div>
            <Input
              label="No. of Cycles"
              name="cycle"
              type="number"
              placeholder="Number of cycles"
              value={formData.cycle}
              onChange={handleChange}
            />
          </div>

          {/* Type of format: Other (standard) or one of the AAC formats - decides the readings required on Test Input and what the AAC report prints */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type of Format
            </label>
            <select
              name="formattype"
              value={formData.formattype ?? ""}
              onChange={handleChange}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Other</option>
              {formatOptions.map((f) => (
                <option key={f.code} value={f.code}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Visible */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Visible <span className="text-red-500">*</span>
            </label>
            <Select
              name="visible"
              options={getSelectOptions(dropdowns.choices)}
              value={getSelectedOptions(Number(formData.visible), getSelectOptions(dropdowns.choices))[0] || null}
              onChange={(selected) => {
                setFormData(prev => ({ ...prev, visible: selected ? selected.value.toString() : "" }));
                if (errors.visible) setErrors(prev => ({ ...prev, visible: "" }));
              }}
              styles={customSelectStyles}
              className="react-select-container"
              classNamePrefix="react-select"
              placeholder="Search and select..."
              isSearchable
              isClearable
              menuPortalTarget={document.body}
              menuPosition="fixed"
            />
            {errors.visible && <p className="text-red-500 text-sm mt-1">{errors.visible}</p>}
          </div>

          {/* Type of Result */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type of Result <span className="text-red-500">*</span>
            </label>
            <Select
              isMulti
              name="resultype"
              options={getSelectOptions(dropdowns.resultTypes)}
              value={getSelectedOptions(formData.resultype, getSelectOptions(dropdowns.resultTypes))}
              onChange={(selected) => handleReactSelectChange(selected, 'resultype')}
              styles={customSelectStyles}
              className="react-select-container"
              classNamePrefix="react-select"
              placeholder="Select result types..."
              isClearable
              isSearchable
              menuPortalTarget={document.body}
              menuPosition="fixed"
            />
            {errors.resultype && (
              <p className="text-red-500 text-sm mt-1">{errors.resultype}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Selected: {formData.resultype.length} type(s)
            </p>
          </div>

          {/* Unit of Result */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Unit of Result <span className="text-red-500">*</span>
            </label>
            <Select
              name="resultunit"
              options={getSelectOptions(dropdowns.units)}
              value={getSelectedOptions(Number(formData.resultunit), getSelectOptions(dropdowns.units))[0] || null}
              onChange={(selected) => {
                setFormData(prev => ({ ...prev, resultunit: selected ? selected.value.toString() : "" }));
                if (errors.resultunit) setErrors(prev => ({ ...prev, resultunit: "" }));
              }}
              styles={customSelectStyles}
              className="react-select-container"
              classNamePrefix="react-select"
              placeholder="Search and select result unit..."
              isSearchable
              isClearable
              menuPortalTarget={document.body}
              menuPosition="fixed"
            />
            {errors.resultunit && (
              <p className="text-red-500 text-sm mt-1">{errors.resultunit}</p>
            )}
          </div>

          {/* No. of Decimal Points */}
          <div>
            <Input
              label="No. of Decimal Points"
              name="decimal"
              type="number"
              placeholder="Digits after decimal"
              value={formData.decimal}
              onChange={handleChange}
            />
          </div>

          {/* NABL Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                label="Min NABL Range"
                name="minnabl"
                type="number"
                step="0.01"
                placeholder="Min NABL range"
                value={formData.minnabl}
                onChange={handleChange}
              />
            </div>

            <div>
              <Input
                label="Max NABL Range"
                name="maxnabl"
                type="number"
                step="0.01"
                placeholder="Max NABL range"
                value={formData.maxnabl}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* QAI Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                label="Min QAI Range"
                name="minqai"
                type="number"
                step="0.01"
                placeholder="Min QAI range"
                value={formData.minqai}
                onChange={handleChange}
              />
            </div>

            <div>
              <Input
                label="Max QAI Range"
                name="maxqai"
                type="number"
                step="0.01"
                placeholder="Max QAI range"
                value={formData.maxqai}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Remark */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Remark <span className="text-red-500">*</span>
            </label>
            <textarea
              name="remark"
              value={formData.remark}
              onChange={handleChange}
              rows="4"
              className={`w-full border rounded-lg px-3 py-2 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-blue-500
                       ${errors.remark ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
              placeholder="Enter remarks"
            />
            {errors.remark && <p className="text-red-500 text-sm mt-1">{errors.remark}</p>}
          </div>

          {/* Submit Button */}
          <Button type="submit" color="primary" disabled={loading}>
            {loading ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 000 8v4a8 8 0 01-8-8z"
                  />
                </svg>
                Saving...
              </div>
            ) : (
              "Insert Parameter"
            )}
          </Button>
        </form>
      </div>
    </Page>
  );
}