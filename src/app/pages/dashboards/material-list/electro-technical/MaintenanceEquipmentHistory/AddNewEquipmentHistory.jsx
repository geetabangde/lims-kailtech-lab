import { useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import axios from 'utils/axios';
import toast, { Toaster } from 'react-hot-toast';
import { Button, Input } from 'components/ui';
import Select from 'react-select';

const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: "42px",
    borderColor: state.isFocused ? "#3b82f6" : "#60a5fa", // Matches blue-400
    boxShadow: state.isFocused ? "0 0 0 1px rgba(59, 130, 246, 0.5)" : "none",
    "&:hover": {
      borderColor: "#3b82f6",
    },
    borderRadius: "0.25rem",
    fontSize: "0.875rem",
    color: "#374151",
    backgroundColor: "white",
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "0 8px",
  }),
  menu: (base) => ({
    ...base,
    zIndex: 9999,
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
  }),
};

const AddNewEquipmentHistory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const fid = searchParams.get('fid');
  const labId = searchParams.get('labId');

  // Dynamically determine the lab slug (e.g. plastic, electro-technical, mechanical)
  const pathParts = location.pathname.split('/');
  const matListIndex = pathParts.indexOf('material-list');
  const labSlug = (matListIndex !== -1 && pathParts[matListIndex + 1]) ? pathParts[matListIndex + 1] : 'electro-technical';

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    serviceProvider: '',
    typeOfService: 'Calibration',
    certificateNo: '',
    startDate: '',
    endDate: '',
    certificateFile: null,
    idUse: 'idno',
    adjustment: 'No',
    adjustmentRemark: '',
    meetsAcceptance: 'Yes',
    remark: '',
    checklist: {
      1: { yes: true, no: false, remark: '' },
      2: { yes: true, no: false, remark: '' },
      3: { yes: true, no: false, remark: '' },
      4: { yes: true, no: false, remark: '' },
      5: { yes: true, no: false, remark: '' },
      6: { yes: true, no: false, remark: '' },
      7: { yes: true, no: false, remark: '' },
      8: { yes: true, no: false, remark: '' },
      9: { yes: true, no: false, remark: '' },
      10: { yes: true, no: false, remark: '' },
      11: { yes: true, no: false, remark: '' },
      12: { yes: true, no: false, remark: '' },
      13: { yes: true, no: false, remark: '' },
      14: { yes: true, no: false, remark: '' },
      15: { yes: true, no: false, remark: '' },
      16: { yes: true, no: false, remark: '' },
      17: { yes: true, no: false, remark: '' },
    }
  });

  const checklistItems = [
    { id: 1, text: 'Certificate Traceable to National or International Standards (NABL/NPL/ILAC/PTB etc.)' },
    { id: 2, text: 'Company Name and Address' },
    { id: 3, text: 'Our Instrument ID' },
    { id: 4, text: 'Make' },
    { id: 5, text: 'Model' },
    { id: 6, text: 'Serial Number' },
    { id: 7, text: 'Least Count' },
    { id: 8, text: 'Date of Calibration' },
    { id: 9, text: 'Suggested/Due Date of Calibration' },
    { id: 10, text: 'Required Parameter' },
    { id: 11, text: 'Required Range' },
    { id: 12, text: 'Review of Calibration Result (Error of our Equipment within relevant referred std. or manual)' },
    { id: 13, text: 'Measurement Uncertainty' },
    { id: 14, text: 'Master Instrument Calibration Certificate No.' },
    { id: 15, text: 'Master Instrument Calibration Due Date' },
    { id: 16, text: 'Coverage Factor k' },
    { id: 17, text: 'Certificate Acceptable (if above points are satisfactory)' },
  ];

  const handleRadioChange = (itemId, field) => {
    setFormData(prev => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        [itemId]: {
          ...prev.checklist[itemId],
          yes: field === 'yes',
          no: field === 'no'
        }
      }
    }));
  };

  const handleRemarkChange = (itemId, value) => {
    setFormData(prev => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        [itemId]: {
          ...prev.checklist[itemId],
          remark: value
        }
      }
    }));
  };

  const handleBackClick = () => {
    if (fid && labId) {
      navigate(`/dashboards/material-list/${labSlug}/maintenance-equipment-history?fid=${fid}&labId=${labId}`);
    } else {
      navigate(`/dashboards/material-list/${labSlug}/maintenance-equipment-history`);
    }
  };

  const formatDateForAPI = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleSave = async () => {
    // Validation
    if (!formData.serviceProvider.trim()) {
      toast.error('Please enter Service Provider name');
      return;
    }

    if (!formData.certificateNo.trim()) {
      toast.error('Please enter Certificate No');
      return;
    }

    if (!formData.startDate) {
      toast.error('Please select Start Date');
      return;
    }

    if (!formData.endDate) {
      toast.error('Please select End Date');
      return;
    }

    setIsSubmitting(true);

    try {
      const apiFormData = new FormData();

      if (fid) {
        apiFormData.append('id', fid);
        apiFormData.append('masterid', fid);
      }

      apiFormData.append('serviceprovider', formData.serviceProvider);
      apiFormData.append('typeofservice', formData.typeOfService);
      apiFormData.append('certificateno', formData.certificateNo);
      apiFormData.append('startdate', formatDateForAPI(formData.startDate));
      apiFormData.append('enddate', formatDateForAPI(formData.endDate));
      apiFormData.append('iduse', formData.idUse || 'idno');
      apiFormData.append('adjusment', formData.adjustment || 'No');
      apiFormData.append('adjustmentremark', formData.adjustmentRemark || '-');
      apiFormData.append('meetacceptance', formData.meetsAcceptance || 'Yes');
      apiFormData.append('remark', formData.remark || '-');

      if (formData.certificateFile) {
        apiFormData.append('file', formData.certificateFile);
      }

      const checklistMapping = {
        1: 'tracebilitycheck', 2: 'comapnycheck', 3: 'idcheck', 4: 'makecheck',
        5: 'modelcheck', 6: 'srnocheck', 7: 'lccheck', 8: 'calibdatecheck',
        9: 'duedatecheck', 10: 'parametercheck', 11: 'rangecheck', 12: 'resultcheck',
        13: 'uncertaintycheck', 14: 'mastercertnocheck', 15: 'masterduedatecheck',
        16: 'kcheck', 17: 'acceptablecheck'
      };

      const remarkMapping = {
        1: 'tracecheckremark', 2: 'comapnycheckremark', 3: 'idcheckremark', 4: 'makecheckremark',
        5: 'modelcheckremark', 6: 'srnocheckremark', 7: 'lccheckremark', 8: 'calibdatecheckremark',
        9: 'duedatecheckremark', 10: 'parametercheckremark', 11: 'rangecheckremark', 12: 'resultcheckremark',
        13: 'uncertaintycheckremark', 14: 'mastercertnocheckremark', 15: 'masterduedatecheckremark',
        16: 'kcheckremark', 17: 'acceptablecheckremark'
      };

      if (formData.typeOfService === 'Calibration') {
        Object.keys(formData.checklist).forEach(key => {
          const item = formData.checklist[key];
          const checkName = checklistMapping[parseInt(key)];
          const remarkName = remarkMapping[parseInt(key)];

          if (checkName && remarkName) {
            apiFormData.append(checkName, item.yes ? 'Yes' : 'No');
            apiFormData.append(remarkName, item.remark || '-');
          }
        });
      } else {
        // For non-calibration (Maintenance, Repair/Modification), checklist is not shown on UI.
        // Send safe standard defaults to satisfy database NOT NULL constraints.
        for (let i = 1; i <= 17; i++) {
          const checkName = checklistMapping[i];
          const remarkName = remarkMapping[i];
          if (checkName && remarkName) {
            apiFormData.append(checkName, 'Yes');
            apiFormData.append(remarkName, '-');
          }
        }
      }

      const response = await axios.post('/material/add-master-validity', apiFormData);

      if (response && response.data && response.data.status) {
        toast.success(response.data.message || 'New Validity has been Added');

        setTimeout(() => {
          if (fid && labId) {
            navigate(`/dashboards/material-list/${labSlug}/maintenance-equipment-history?fid=${fid}&labId=${labId}`);
          } else {
            navigate(`/dashboards/material-list/${labSlug}/maintenance-equipment-history`);
          }
        }, 1500);
      } else {
        toast.error((response && response.data && response.data.message) || 'Failed to add validity');
      }
    } catch (error) {
      console.error('Error saving master validity:', error);
      const errorMsg =
        (typeof error === 'string' && error) ||
        error?.message ||
        error?.error ||
        error?.response?.data?.message ||
        'Failed to save. Please try again.';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 p-6">
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />

      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow">
        <div className="flex items-center justify-between mb-6 p-6 border-b">
          <div className="flex items-center gap-4">
            <span className="text-gray-700">Add New Instrument</span>
          </div>
          <Button
            className="h-8 space-x-1.5 rounded-md px-3 text-xs"
            color="primary"
            onClick={handleBackClick}
            disabled={isSubmitting}
          >
            ← Back to Master Validity List
          </Button>
        </div>

        <div className="p-6 border-b">
          <div className="grid grid-cols-[200px_1fr] gap-4 mb-4">
            <label className="text-sm font-medium text-gray-700 flex items-center">
              Name and Address of Service Provider <span className="text-red-500 ml-1">*</span>
            </label>
            <Input
              type="text"
              className="w-full border border-blue-400 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.serviceProvider}
              onChange={(e) => setFormData({ ...formData, serviceProvider: e.target.value })}
              placeholder="Enter service provider name"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-[200px_1fr] gap-4 mb-4">
            <label className="text-sm font-medium text-gray-700 flex items-center">
              Type of Service
            </label>
            <Select
              styles={customSelectStyles}
              options={[
                { value: 'Calibration', label: 'Calibration' },
                { value: 'Maintenance', label: 'Maintenance' },
                { value: 'Repair/Modification', label: 'Repair/Modification' },
              ]}
              value={{ value: formData.typeOfService, label: formData.typeOfService }}
              onChange={(opt) => setFormData({ ...formData, typeOfService: opt.value })}
              isLoading={isSubmitting}
              isDisabled={isSubmitting}
              isSearchable={false}
              menuPortalTarget={document.body}
              menuPosition="fixed"
            />
          </div>

          <div className="grid grid-cols-[200px_1fr] gap-4 mb-4">
            <label className="text-sm font-medium text-gray-700 flex items-center">
              Certificate No <span className="text-red-500 ml-1">*</span>
            </label>
            <Input
              type="text"
              placeholder="Enter certificate number"
              className="w-full border border-blue-400 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.certificateNo}
              onChange={(e) => setFormData({ ...formData, certificateNo: e.target.value })}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-[200px_1fr] gap-4 mb-4">
            <label className="text-sm font-medium text-gray-700 flex items-center">
              Start Date <span className="text-red-500 ml-1">*</span>
            </label>
            <Input
              type="date"
              className="w-full border border-blue-400 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-[200px_1fr] gap-4 mb-4">
            <label className="text-sm font-medium text-gray-700 flex items-center">
              End Date <span className="text-red-500 ml-1">*</span>
            </label>
            <Input
              type="date"
              className="w-full border border-blue-400 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-[200px_1fr] gap-4 mb-4">
            <label className="text-sm font-medium text-gray-700 flex items-center">
              Certificate File
            </label>
            <div className="flex items-center">
              <input
                type="file"
                id="certificateFile"
                className="hidden"
                onChange={(e) => setFormData({ ...formData, certificateFile: e.target.files[0] })}
                accept=".pdf,.jpg,.jpeg,.png"
                disabled={isSubmitting}
              />
              <label
                htmlFor="certificateFile"
                className={`px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm mr-2 ${isSubmitting ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-200'}`}
              >
                Choose File
              </label>
              <span className="text-sm text-gray-500">
                {formData.certificateFile ? formData.certificateFile.name : 'No file chosen'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-[200px_1fr] gap-4 mb-4">
            <label className="text-sm font-medium text-gray-700 flex items-center">
              ID Use
            </label>
            <Select
              styles={customSelectStyles}
              options={[
                { value: 'newidno', label: 'New Id No' },
                { value: 'idno', label: 'Old Id No' },
              ]}
              value={[
                { value: 'newidno', label: 'New Id No' },
                { value: 'idno', label: 'Old Id No' },
              ].find(opt => opt.value === formData.idUse) || null}
              onChange={(opt) => setFormData({ ...formData, idUse: opt ? opt.value : 'idno' })}
              placeholder="Select"
              isLoading={isSubmitting}
              isDisabled={isSubmitting}
              isSearchable={false}
              menuPortalTarget={document.body}
              menuPosition="fixed"
            />
          </div>

          <div className="grid grid-cols-[200px_1fr] gap-4 mb-4">
            <label className="text-sm font-medium text-gray-700 flex items-center">
              Adjustment If Any
            </label>
            <Select
              styles={customSelectStyles}
              options={[
                { value: 'Yes', label: 'Yes' },
                { value: 'No', label: 'No' },
              ]}
              value={[
                { value: 'Yes', label: 'Yes' },
                { value: 'No', label: 'No' },
              ].find(opt => opt.value === formData.adjustment) || null}
              onChange={(opt) => setFormData({ ...formData, adjustment: opt ? opt.value : 'No' })}
              placeholder="Select"
              isLoading={isSubmitting}
              isDisabled={isSubmitting}
              isSearchable={false}
              menuPortalTarget={document.body}
              menuPosition="fixed"
            />
          </div>

          <div className="grid grid-cols-[200px_1fr] gap-4 mb-4">
            <label className="text-sm font-medium text-gray-700 flex items-center">
              Adjustment Details
            </label>
            <Input
              type="text"
              className="w-full border border-blue-400 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.adjustmentRemark}
              onChange={(e) => setFormData({ ...formData, adjustmentRemark: e.target.value })}
              placeholder="Enter adjustment remark"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-[200px_1fr] gap-4 mb-4">
            <label className="text-sm font-medium text-gray-700 flex items-center">
              MEETS ACCEPTANCE CRITERIA
            </label>
            <Select
              styles={customSelectStyles}
              options={[
                { value: 'Yes', label: 'Yes' },
                { value: 'No', label: 'No' },
              ]}
              value={[
                { value: 'Yes', label: 'Yes' },
                { value: 'No', label: 'No' },
              ].find(opt => opt.value === formData.meetsAcceptance) || null}
              onChange={(opt) => setFormData({ ...formData, meetsAcceptance: opt ? opt.value : 'Yes' })}
              placeholder="Select"
              isLoading={isSubmitting}
              isDisabled={isSubmitting}
              isSearchable={false}
              menuPortalTarget={document.body}
              menuPosition="fixed"
            />
          </div>

          <div className="grid grid-cols-[200px_1fr] gap-4">
            <label className="text-sm font-medium text-gray-700 flex items-center">
              Remark
            </label>
            <Input
              type="text"
              className="w-full border border-blue-400 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              placeholder="Enter remark"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {formData.typeOfService === 'Calibration' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 border-r">
                    S.NO.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 border-r">
                    CHECK LIST
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 border-r w-32">
                    Yes or No
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 w-96">
                    REMARK,IF ANY
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {checklistItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 border-r">
                      {item.id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-r">
                      {item.text}
                    </td>
                    <td className="px-4 py-3 text-center border-r">
                      <div className="flex items-center justify-center gap-3">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name={`checklist-${item.id}`}
                            checked={formData.checklist[item.id].yes}
                            onChange={() => handleRadioChange(item.id, 'yes')}
                            className="w-4 h-4 text-blue-600"
                            disabled={isSubmitting}
                          />
                          <span className="ml-1 text-sm">Yes</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name={`checklist-${item.id}`}
                            checked={formData.checklist[item.id].no}
                            onChange={() => handleRadioChange(item.id, 'no')}
                            className="w-4 h-4 text-blue-600"
                            disabled={isSubmitting}
                          />
                          <span className="ml-1 text-sm">No</span>
                        </label>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <textarea
                        rows="2"
                        className="w-full border border-blue-400 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.checklist[item.id].remark}
                        onChange={(e) => handleRemarkChange(item.id, e.target.value)}
                        placeholder="Enter remark if any"
                        disabled={isSubmitting}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 bg-blue-50 border-t border-b border-blue-100 flex items-center gap-3">
            <div className="text-blue-500 flex-shrink-0">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm text-blue-800">
              Calibration checklist verification is not required for <strong>{formData.typeOfService}</strong>. Standard service history record will be saved.
            </p>
          </div>
        )}

        <div className="p-6 border-t flex justify-end">
          <Button
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              'Save Master Validity'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddNewEquipmentHistory;