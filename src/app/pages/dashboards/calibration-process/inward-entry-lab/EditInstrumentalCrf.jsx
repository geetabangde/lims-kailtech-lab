import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { Page } from "components/shared/Page";
import { Button, Input } from "components/ui";
import { toast } from "sonner";
import ReactSelect from "react-select";
import axios from "utils/axios";

// safeArray utility
const safeArray = (val) => (Array.isArray(val) ? val : []);

const EditInstrumentalCrf = () => {
  const navigate = useNavigate();
  const { id: inwardid, itemId: instid } = useParams();
  const searchParams = new URLSearchParams(window.location.search);
  const caliblocation = searchParams.get("caliblocation") || "Lab";
  const calibacc = searchParams.get("calibacc") || "Nabl";

  // Form state
  const [formData, setFormData] = useState({
    id: instid,
    inwardid,
    instid: "",
    name: "",
    equipmentrange: "",
    itemleastcount: "",
    make: "",
    model: "",
    serialno: "",
    idno: "",
    accuracy: "",
    location: caliblocation,
    instlocation: "",
    calibrationvalidity: "",
    sop: "",
    standard: [],
    letterref: "",
    accessories: "",
    duedate: "",
    adjustment: "No",
    adjustmentremark: "",
    conditiononrecieve: "",
    conformitystatement: "Yes",
    remark: "",
    caliblocation,
    calibacc,
  });

  // Error and loading states
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);

  // Dropdowns
  const [sopOptions, setSopOptions] = useState([]);
  const [standardOptions, setStandardOptions] = useState([]);

  // Fetch initial data and dropdowns
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [instrumentRes, sopRes, standardRes] = await Promise.all([
          axios.get(`/calibrationprocess/get-edit-instrument-details?inwardid=${inwardid}&instid=${instid}&caliblocation=${caliblocation}&calibacc=${calibacc}`),
          axios.get("/calibrationoperations/calibration-method-list"),
          axios.get("/calibrationoperations/calibration-standard-list"),
        ]);

        // Set form data from API response
        const instrumentData = instrumentRes.data.data.instrument;
        setFormData((prev) => ({
          ...prev,
          instid: instrumentData.instid.toString(),
          name: instrumentData.name,
          equipmentrange: instrumentData.equipmentrange,
          itemleastcount: instrumentData.itemleastcount || instrumentData.leastcount || "",
          make: instrumentData.make,
          model: instrumentData.model,
          serialno: instrumentData.serialno,
          idno: instrumentData.idno,
          accuracy: instrumentData.accuracy,
          location: instrumentData.location,
          instlocation: instrumentData.instlocation,
          calibrationvalidity: instrumentData.calibrationvalidity,
          sop: instrumentData.sop.toString(),
          standard: safeArray(instrumentData.standard.split(",")),
          letterref: instrumentData.letterref,
          accessories: instrumentData.accessories,
          duedate: instrumentData.duedate,
          adjustment: instrumentData.adjustment,
          adjustmentremark: instrumentData.adjustmentremark,
          conditiononrecieve: instrumentData.conditiononrecieve,
          conformitystatement: instrumentData.conformitystatement,
          remark: instrumentData.remark,
        }));

        // Set dropdown options
        setSopOptions(
          safeArray(sopRes.data.data).map((item) => ({
            label: item.name,
            value: item.id.toString(),
          }))
        );
        setStandardOptions(
          safeArray(standardRes.data.data).map((item) => ({
            label: item.name,
            value: item.id.toString(),
          }))
        );
      } catch (err) {
        console.error("Data fetch failed", err);
        toast.error("Failed to load instrument data!");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [inwardid, instid, caliblocation, calibacc]);

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

     const handleBackToPerformCalibration = () => {
        navigate(`/dashboards/calibration-process/inward-entry-lab/perform-calibration/${inwardid}?caliblocation=${caliblocation}&calibacc=${calibacc}`);
    };
  // Handle multi-select change
  const handleMultiSelectChange = (selected, field) => {
    setFormData((prev) => ({
      ...prev,
      [field]: safeArray(selected).map((opt) => opt.value),
    }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  // Validate form
  const validateForm = () => {
   const requiredFields = [
  "name",
  "instid",
  "equipmentrange",
  "make",
  "model",
  "serialno",
  "idno",
  "accuracy",
  "calibrationvalidity",
  "sop",
  "standard",
  "letterref",
  "location",
  "adjustmentremark",
  "instlocation", 
  "accessories",
];

    const newErrors = {};

    requiredFields.forEach((field) => {
      if (!formData[field] || (Array.isArray(formData[field]) && formData[field].length === 0)) {
        newErrors[field] = `${field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1').trim()} is required`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fill all required fields!");
      return;
    }

    try {
      setLoading(true);
      await axios.post("/calibrationprocess/update-crf-instrument", formData);
      toast.success("CRF updated successfully!");
      setTimeout(() => {
        navigate(
          `/dashboards/calibration-process/inward-entry-lab/perform-calibration/${inwardid}?caliblocation=${caliblocation}&calibacc=${calibacc}`
        );
      }, 1500);
    } catch (err) {
      console.error("Update failed:", err);
      toast.error("Failed to update CRF!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page title="Edit Instrumental CRF">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                    <h1 className="text-lg font-semibold text-gray-800">Edit Instrumental CRF</h1>
                    <Button
                        variant="outline"
                        onClick={handleBackToPerformCalibration}
                        className="bg-indigo-500  hover:bg-fuchsia-500 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                    >
                        ← Back to Perform Calibration
                    </Button>
                </div>
      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <Input
                label="Instrument Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                disabled={loading}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Calibration Standards
              </label>
              <ReactSelect
                isMulti
                options={standardOptions}
                value={standardOptions.filter((opt) => formData.standard.includes(opt.value))}
                onChange={(s) => handleMultiSelectChange(s, "standard")}
                isDisabled={loading}
              />
              {errors.standard && <p className="text-red-500 text-sm mt-1">{errors.standard}</p>}
            </div>
            <div>
              <Input
                label="Least Count To Show"
                name="itemleastcount"
                value={formData.itemleastcount}
                onChange={handleInputChange}
                disabled={loading}
              />
              {errors.itemleastcount && <p className="text-red-500 text-sm mt-1">{errors.itemleastcount}</p>}
            </div>
            <div>
              <Input
                label="Make"
                name="make"
                value={formData.make}
                onChange={handleInputChange}
                disabled={loading}
              />
              {errors.make && <p className="text-red-500 text-sm mt-1">{errors.make}</p>}
            </div>
            <div>
              <Input
                label="Model"
                name="model"
                value={formData.model}
                onChange={handleInputChange}
                disabled={loading}
              />
              {errors.model && <p className="text-red-500 text-sm mt-1">{errors.model}</p>}
            </div>
            <div>
              <Input
                label="Serial No."
                name="serialno"
                value={formData.serialno}
                onChange={handleInputChange}
                disabled={loading}
              />
              {errors.serialno && <p className="text-red-500 text-sm mt-1">{errors.serialno}</p>}
            </div>
            <div>
              <Input
                label="ID No."
                name="idno"
                value={formData.idno}
                onChange={handleInputChange}
                disabled={loading}
              />
              {errors.idno && <p className="text-red-500 text-sm mt-1">{errors.idno}</p>}
            </div>
            <div>
              <Input
                label="Accuracy"
                name="accuracy"
                value={formData.accuracy}
                onChange={handleInputChange}
                disabled={loading}
              />
              {errors.accuracy && <p className="text-red-500 text-sm mt-1">{errors.accuracy}</p>}
            </div>
            <div>
              <Input
                label="Calibration Validity"
                name="calibrationvalidity"
                value={formData.calibrationvalidity}
                onChange={handleInputChange}
                disabled={loading}
              />
              {errors.calibrationvalidity && (
                <p className="text-red-500 text-sm mt-1">{errors.calibrationvalidity}</p>
              )}
            </div>
            <div>
              <Input
                label="Accessories"
                name="accessories"
                value={formData.accessories}
                onChange={handleInputChange}
                disabled={loading}
              />
              {errors.accessories && (
                <p className="text-red-500 text-sm mt-1">{errors.accessories}</p>
              )}
            </div>
            <div>
              <Input
                label="Instrument Location"
                name="instlocation"
                value={formData.instlocation}
                onChange={handleInputChange}
                disabled={loading}
              />
              {errors.instlocation && (
                <p className="text-red-500 text-sm mt-1">{errors.instlocation}</p>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Calibration Instrument Category (InstID)
              </label>
              <select
                name="instid"
                value={formData.instid}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                disabled={loading}
              >
                <option value={formData.instid}>{formData.name}</option>
              </select>
              {errors.instid && <p className="text-red-500 text-sm mt-1">{errors.instid}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Calibration Methods (SOP)
              </label>
              <ReactSelect
                options={sopOptions}
                value={sopOptions.find((opt) => opt.value === formData.sop) || null}
                onChange={(s) => {
                  setFormData((prev) => ({ ...prev, sop: s?.value || "" }));
                  setErrors((prev) => ({ ...prev, sop: "" }));
                }}
                isDisabled={loading}
              />
              {errors.sop && <p className="text-red-500 text-sm mt-1">{errors.sop}</p>}
            </div>
            <div>
              <Input
                label="Calibration Performed At"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                disabled={loading}
              />
              {errors.location && (
                <p className="text-red-500 text-sm mt-1">{errors.location}</p>
              )}
            </div>
            <div>
              <Input
                label="Letter Ref/Date"
                name="letterref"
                value={formData.letterref}
                onChange={handleInputChange}
                disabled={loading}
              />
              {errors.letterref && (
                <p className="text-red-500 text-sm mt-1">{errors.letterref}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Conformity Statement
              </label>
              <select
                name="conformitystatement"
                value={formData.conformitystatement}
                onChange={handleInputChange}
                className="w-full border px-3 py-2 rounded"
                disabled={loading}
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <Input
                label="Range To Show"
                name="equipmentrange"
                value={formData.equipmentrange}
                onChange={handleInputChange}
                disabled={loading}
              />
              {errors.equipmentrange && (
                <p className="text-red-500 text-sm mt-1">{errors.equipmentrange}</p>
              )}
            </div>
            <div>
              <Input
                label="Remark"
                name="remark"
                value={formData.remark}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Adjustment</label>
              <select
                name="adjustment"
                value={formData.adjustment}
                onChange={handleInputChange}
                className="w-full border px-3 py-2 rounded"
                disabled={loading}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Adjustment Detail</label>
              <textarea
                name="adjustmentremark"
                value={formData.adjustmentremark}
                onChange={handleInputChange}
                rows={3}
                className="w-full border px-3 py-2 rounded"
                disabled={loading}
              />
              {errors.adjustmentremark && (
                <p className="text-red-500 text-sm mt-1">{errors.adjustmentremark}</p>
              )}
            </div>
            <div>
              <Input
                type="date"
                label="Suggested Due Date"
                name="duedate"
                value={formData.duedate}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-center mt-8 pt-6 border-t border-gray-200">
          <Button
            type="submit"
            className="bg-green-500 hover:bg-green-600 text-white px-12 py-3 rounded"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  viewBox="0 0 24 24"
                >
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
                Loading...
              </div>
            ) : (
              "Update"
            )}
          </Button>
        </div>
      </form>
    </Page>
  );
};

export default EditInstrumentalCrf;