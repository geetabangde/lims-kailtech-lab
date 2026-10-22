import { useState, useEffect } from 'react';
import { ChevronDown, ArrowLeft } from 'lucide-react';
import { Button } from 'components/ui';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'utils/axios';
import toast, { Toaster } from 'react-hot-toast';
import Select from 'react-select';

const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: '38px',
    borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 1px rgba(59, 130, 246, 0.5)' : 'none',
    '&:hover': {
      borderColor: '#3b82f6',
    },
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    color: '#374151',
    backgroundColor: 'white',
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

export default function EditMasterValidity() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get fid and cid from URL params
  const fid = searchParams.get('fid');
  const cid = searchParams.get('cid');
  const labId = searchParams.get('labId');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    masterid: '',
    serviceProvider: '',
    typeOfService: '',
    certificateNo: '',
    startDate: '',
    endDate: ''
  });

  // Fetch master validity data on component mount
  useEffect(() => {
    if (fid && cid) {
      fetchMasterValidityData();
    } else {
      toast.error('Missing required parameters (fid or cid)');
      handleBackNavigation();
    }
  }, [fid, cid]);

  // Function to fetch master validity data
  const fetchMasterValidityData = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`/material/get-mastervalidity-byid`, {
        params: {
          cid: cid,
          fid: fid
        }
      });

      if (response.data.status && response.data.data) {
        const data = response.data.data;
        
        // Convert date from YYYY-MM-DD to YYYY-MM-DD for date input
        const convertToInputDate = (dateString) => {
          if (!dateString) return '';
          // If date is in DD/MM/YYYY format, convert to YYYY-MM-DD
          if (dateString.includes('/')) {
            const [day, month, year] = dateString.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          // If already in YYYY-MM-DD format, return as is
          return dateString;
        };

        setFormData({
          id: data.id || '',
          masterid: data.masterid || '',
          serviceProvider: data.serviceprovider || '',
          typeOfService: data.typeofservice || '',
          certificateNo: data.certificateno || '',
          startDate: convertToInputDate(data.startdate),
          endDate: convertToInputDate(data.enddate)
        });
      } else {
        toast.error(response.data.message || 'Failed to fetch data');
        handleBackNavigation();
      }
    } catch (error) {
      console.error('Error fetching master validity data:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch data. Please try again.');
      handleBackNavigation();
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form input changes
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Function to handle back navigation with params
  const handleBackNavigation = () => {
    if (fid && labId) {
      navigate(`/dashboards/material-list/electro-technical/maintenance-equipment-history?fid=${fid}&labId=${labId}`);
    } else if (fid) {
      navigate(`/dashboards/material-list/electro-technical/maintenance-equipment-history?fid=${fid}`);
    } else {
      navigate('/dashboards/material-list/electro-technical/maintenance-equipment-history');
    }
  };

  // Convert date from YYYY-MM-DD to DD/MM/YYYY for API
  const formatDateForAPI = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  // Function to update master validity
  const handleUpdateValidity = async () => {
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
      toast.error('Please enter Start Date');
      return;
    }

    if (!formData.endDate) {
      toast.error('Please enter End Date');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare payload
      const payload = {
        id: formData.id,
        masterid: formData.masterid,
        serviceprovider: formData.serviceProvider,
        typeofservice: formData.typeOfService,
        certificateno: formData.certificateNo,
        startdate: formatDateForAPI(formData.startDate),
        enddate: formatDateForAPI(formData.endDate)
      };

      // Make API call
      const response = await axios.post('/material/update-mater-validity', payload);

      if (response.data.status) {
        toast.success(response.data.message || 'Validity has been Updated');
        
        // Navigate back after successful update
        setTimeout(() => {
          handleBackNavigation();
        }, 1500);
      } else {
        toast.error(response.data.message || 'Failed to update validity');
      }
    } catch (error) {
      console.error('Error updating master validity:', error);
      toast.error(error.response?.data?.message || 'Failed to update. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
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
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-96">
            <div className="flex flex-col items-center gap-3">
              <svg className="animate-spin h-10 w-10 text-blue-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-gray-600">Loading data...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Toast Notifications */}
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

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-normal text-gray-800">Edit master Validity</h1>
          <Button
            className="h-8 space-x-1.5 rounded-md px-3 text-xs"
            color="primary"
            onClick={handleBackNavigation}
            disabled={isSubmitting}
          >
            <ArrowLeft size={18} />
            Back to Master Validity List
          </Button>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* Service Provider */}
          <div className="border-b border-gray-200">
            <div className="grid grid-cols-12 items-start">
              <div className="col-span-3 p-4 bg-gray-50 border-r border-gray-200">
                <label className="text-sm font-medium text-gray-700">
                  Name and Address of Service Provider
                </label>
              </div>
              <div className="col-span-9 p-4 relative">
                <textarea
                  name="serviceProvider"
                  value={formData.serviceProvider}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-cyan-400 resize-none"
                  rows="3"
                  disabled={isSubmitting}
                  placeholder="Enter service provider name and address"
                />
                <ChevronDown className="absolute right-6 top-6 text-gray-400" size={20} />
              </div>
            </div>
          </div>

          {/* Type of Service */}
          <div className="border-b border-gray-200">
            <div className="grid grid-cols-12 items-center">
              <div className="col-span-3 p-4 bg-gray-50 border-r border-gray-200">
                <label className="text-sm font-medium text-gray-700">
                  Type Of Service
                </label>
              </div>
              <div className="col-span-9 p-4 relative">
                <Select
                  value={[
                    { value: 'Calibration', label: 'Calibration' },
                    { value: 'Maintenance', label: 'Routine Maintenance' },
                    { value: 'Repair', label: 'Repair' },
                    { value: 'Repair/Modification', label: 'Repair / Maintenance' },
                    { value: 'Inspection', label: 'Inspection' }
                  ].find(opt => opt.value === formData.typeOfService)}
                  onChange={(opt) => setFormData({ ...formData, typeOfService: opt ? opt.value : '' })}
                  options={[
                    { value: 'Calibration', label: 'Calibration' },
                    { value: 'Maintenance', label: 'Routine Maintenance' },
                    { value: 'Repair', label: 'Repair' },
                    { value: 'Repair/Modification', label: 'Repair / Maintenance' },
                    { value: 'Inspection', label: 'Inspection' }
                  ]}
                  placeholder="Select Type"
                  isClearable
                  styles={customSelectStyles}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Certificate No */}
          <div className="border-b border-gray-200">
            <div className="grid grid-cols-12 items-center">
              <div className="col-span-3 p-4 bg-gray-50 border-r border-gray-200">
                <label className="text-sm font-medium text-gray-700">
                  Certificate No
                </label>
              </div>
              <div className="col-span-9 p-4">
                <input
                  type="text"
                  name="certificateNo"
                  value={formData.certificateNo}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-cyan-400"
                  disabled={isSubmitting}
                  placeholder="Enter certificate number"
                />
              </div>
            </div>
          </div>

          {/* Start Date */}
          <div className="border-b border-gray-200">
            <div className="grid grid-cols-12 items-center">
              <div className="col-span-3 p-4 bg-gray-50 border-r border-gray-200">
                <label className="text-sm font-medium text-gray-700">
                  Start Date
                </label>
              </div>
              <div className="col-span-9 p-4">
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-cyan-400"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* End Date */}
          <div>
            <div className="grid grid-cols-12 items-center">
              <div className="col-span-3 p-4 bg-gray-50 border-r border-gray-200">
                <label className="text-sm font-medium text-gray-700">
                  End Date
                </label>
              </div>
              <div className="col-span-9 p-4">
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-cyan-400"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Progress Bar */}
        <div className="mt-6 flex items-center gap-4">
          <Button 
            className="h-8 space-x-1.5 rounded-md px-3 text-xs"
            color="primary"
            disabled={isSubmitting}
          >
            <ChevronDown className="rotate-90" size={24} />
          </Button>
          <div className="flex-1 bg-gray-300 h-2 rounded-full overflow-hidden">
            <div className="bg-gray-500 h-full w-full"></div>
          </div>
          <Button 
            className="h-8 space-x-1.5 rounded-md px-3 text-xs"
            color="primary"
            disabled={isSubmitting}
          >
            <ChevronDown className="-rotate-90" size={24} />
          </Button>
        </div>

        {/* Update Button */}
        <div className="flex justify-end mt-6">
          <Button 
            className="h-10 space-x-1.5 rounded-md px-6 text-sm"
            color="primary"
            onClick={handleUpdateValidity}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating...
              </span>
            ) : (
              'Update Master Validity'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}