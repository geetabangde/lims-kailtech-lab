import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'utils/axios';
import toast, { Toaster } from 'react-hot-toast';
import { Button, Input } from 'components/ui';

const CloneCertificateDetails = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();


  const fid = searchParams.get('fid');
  const cid = searchParams.get('cid'); // certificate (validity) being cloned from
  const labId = searchParams.get('labId');


  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    serviceProvider: '',
    typeOfService: 'Calibration',
    certificateNo: '',
    startDate: '',
    endDate: '',
    certificateFile: null,
    idUse: '',
    adjustment: '',
    adjustmentRemark: '',
    meetsAcceptance: '',
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
      navigate(`/dashboards/material-list/electro-technical/maintenance-equipment-history?fid=${fid}&labId=${labId}`);
    } else {
      navigate("/dashboards/material-list/electro-technical/maintenance-equipment-history");
    }
  };


  const formatDateForAPI = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  // Function to handle form save
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
      // Prepare FormData for file upload
      const apiFormData = new FormData();

      // `id` = the certificate being cloned (the backend copies its matrix / uncertainty rows
      // into the new validity); `masterid` = the master. Old code sent the master id as `id`,
      // so nothing was ever cloned.
      if (fid) {
        apiFormData.append('id', cid || fid);
        apiFormData.append('masterid', fid);
      }

      // Add basic fields - EXACT field names from Postman
      apiFormData.append('serviceprovider', formData.serviceProvider);
      apiFormData.append('typeofservice', formData.typeOfService);
      apiFormData.append('certificateno', formData.certificateNo);
      // Convert dates to dd/mm/yyyy format
      apiFormData.append('startdate', formatDateForAPI(formData.startDate));
      apiFormData.append('enddate', formatDateForAPI(formData.endDate));
      apiFormData.append('iduse', formData.idUse || '');
      apiFormData.append('adjusment', formData.adjustment || '');
      apiFormData.append('adjustmentremark', formData.adjustmentRemark || '');
      apiFormData.append('meetacceptance', formData.meetsAcceptance || '');
      apiFormData.append('remark', formData.remark || '');


      if (formData.certificateFile) {
        apiFormData.append('file', formData.certificateFile);
      }


      const checklistMapping = {
        1: 'tracebilitycheck',
        2: 'comapnycheck',
        3: 'idcheck',
        4: 'makecheck',
        5: 'modelcheck',
        6: 'srnocheck',
        7: 'lccheck',
        8: 'calibdatecheck',
        9: 'duedatecheck',
        10: 'parametercheck',
        11: 'rangecheck',
        12: 'resultcheck',
        13: 'uncertaintycheck',
        14: 'mastercertnocheck',
        15: 'masterduedatecheck',
        16: 'kcheck',
        17: 'acceptablecheck'
      };

      const remarkMapping = {
        1: 'tracecheckremark',
        2: 'comapnycheckremark',
        3: 'idcheckremark',
        4: 'makecheckremark',
        5: 'modelcheckremark',
        6: 'srnocheckremark',
        7: 'lccheckremark',
        8: 'calibdatecheckremark',
        9: 'duedatecheckremark',
        10: 'parametercheckremark',
        11: 'rangecheckremark',
        12: 'resultcheckremark',
        13: 'uncertaintycheckremark',
        14: 'mastercertnocheckremark',
        15: 'masterduedatecheckremark',
        16: 'kcheckremark',
        17: 'acceptablecheckremark'
      };

      // Add checklist values
      Object.keys(formData.checklist).forEach(key => {
        const item = formData.checklist[key];
        const checkName = checklistMapping[parseInt(key)];
        const remarkName = remarkMapping[parseInt(key)];

        if (checkName && remarkName) {
          apiFormData.append(checkName, item.yes ? 'Yes' : 'No');
          apiFormData.append(remarkName, item.remark || '-');
        }
      });

      // Make API call
      const response = await axios.post('/material/add-master-validity', apiFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.status) {
        toast.success(response.data.message || 'New Validity has been Added');

        setTimeout(() => {
          if (fid && labId) {
            navigate(`/dashboards/material-list/electro-technical/maintenance-equipment-history?fid=${fid}&labId=${labId}`);
          } else {
            navigate("/dashboards/material-list/electro-technical/maintenance-equipment-history");
          }
        }, 1500);
      } else {
        toast.error(response.data.message || 'Failed to add validity');
      }
    } catch (error) {
      console.error('Error saving master validity:', error);
      toast.error(error.response?.data?.message || 'Failed to save. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 p-6">
      {/* Add Toaster component here */}
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
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-6 p-6 border-b">
          <div className="flex items-center gap-4">
            <span className="text-gray-700">Clone Certificate Details</span>
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

        {/* Top Form Section */}
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
            <select
              className="w-full border border-blue-400 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.typeOfService}
              onChange={(e) => setFormData({ ...formData, typeOfService: e.target.value })}
              disabled={isSubmitting}
            >
              <option>Calibration</option>
              <option value="Maintenance">Routine Maintenance</option>
              <option value="Repair/Modification">Repair / Modification</option>
            </select>
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
              Adjustment If Any
            </label>
            <select
              className="w-full border border-blue-400 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.idUse}
              onChange={(e) => setFormData({ ...formData, idUse: e.target.value })}
              disabled={isSubmitting}
            >
              <option value="">Select</option>
              <option value="newidno">New Id No</option>
              <option value="oldidno">Old Id No</option>
            </select>
          </div>

          <div className="grid grid-cols-[200px_1fr] gap-4 mb-4">
            <label className="text-sm font-medium text-gray-700 flex items-center">
              Adjustment If Any
            </label>
            <select
              className="w-full border border-blue-400 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.adjustment}
              onChange={(e) => setFormData({ ...formData, adjustment: e.target.value })}
              disabled={isSubmitting}
            >
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
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
            <select
              className="w-full border border-blue-400 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.meetsAcceptance}
              onChange={(e) => setFormData({ ...formData, meetsAcceptance: e.target.value })}
              disabled={isSubmitting}
            >
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
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

        {/* Checklist Table Section */}
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

        {/* Save Button */}
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

export default CloneCertificateDetails;