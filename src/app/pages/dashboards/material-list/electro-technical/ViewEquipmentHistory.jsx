import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'utils/axios';
import toast, { Toaster } from 'react-hot-toast';

function ViewEquipmentHistory() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (id) {
      fetchEquipmentHistory();
    }
  }, [id]);

  const fetchEquipmentHistory = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/material/get-equipment-histroy/${id}`);

      console.log('✅ Equipment history loaded:', response.data);

      if (response.data.status) {
        setData(response.data.data);
        setError(null);
      } else {
        setError('Failed to load equipment history');
        toast.error('Failed to load equipment history');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch equipment history';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('❌ Error fetching equipment history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToList = () => {
    navigate(-1);
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Loading equipment history...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <div className="text-lg text-red-600 mb-4">{error}</div>
          <button
            onClick={handleBackToList}
            className="mt-4 bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded transition-colors"
          >
            Back to List
          </button>
        </div>
      </div>
    );
  }

  if (!data || !data.instrument) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600">No data available</div>
          <button
            onClick={handleBackToList}
            className="mt-4 bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded transition-colors"
          >
            Back to List
          </button>
        </div>
      </div>
    );
  }

  const { instrument, history } = data;

  return (
    <>
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            style: {
              background: '#10b981',
            },
          },
          error: {
            style: {
              background: '#ef4444',
            },
          },
        }}
      />

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h1 className="text-lg font-medium text-gray-900">INSTRUMENT HISTORY</h1>
          <button
            className="bg-indigo-500 hover:bg-fuchsia-500 text-white px-4 py-2 rounded text-sm transition-colors"
            onClick={handleBackToList}
          >
            Back
          </button>
        </div>

        <div className="p-6">
          {/* Main Content */}
          <div className="bg-white border border-gray-400">
            {/* Top Section - Logo and Header Info */}
            <div className="flex border-b border-gray-400">
              {/* Left - Logo and Company Info */}
              <div className="w-1/3 border-r border-gray-400 p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <img src="/images/logo.png" alt="KTRC Logo" className="w-40 h-30 object-contain" />
                  <div className="text-xs">
                    <div className="font-semibold">Quality Test And Training</div>
                    <div className="text-gray-700">kailtech Test and Research Centre Pvt. Ltd.</div>
                  </div>
                </div>
              </div>

              {/* Center - Instrument History Title */}
              <div className="w-1/3 border-r border-gray-400 flex items-center justify-center p-4">
                <h2 className="text-lg font-semibold underline">Instrument History</h2>
              </div>

              {/* Right - Document Info Table */}
              <div className="w-1/3 p-0">
                <table className="w-full text-xs">
                  <tbody>
                    <tr className="border-b border-gray-400">
                      <td className="px-3 py-2 font-medium border-r border-gray-400 bg-gray-100 w-24">QF. No.</td>
                      <td className="px-3 py-2">KTRCQF/0604/01</td>
                    </tr>
                    <tr className="border-b border-gray-400">
                      <td className="px-3 py-2 font-medium border-r border-gray-400 bg-gray-100">Issue No.</td>
                      <td className="px-3 py-2">01</td>
                    </tr>
                    <tr className="border-b border-gray-400">
                      <td className="px-3 py-2 font-medium border-r border-gray-400 bg-gray-100">Issue Date</td>
                      <td className="px-3 py-2">01/06/2019</td>
                    </tr>
                    <tr className="border-b border-gray-400">
                      <td className="px-3 py-2 font-medium border-r border-gray-400 bg-gray-100">Revision No.</td>
                      <td className="px-3 py-2">02</td>
                    </tr>
                    <tr className="border-b border-gray-400">
                      <td className="px-3 py-2 font-medium border-r border-gray-400 bg-gray-100">Revision Date</td>
                      <td className="px-3 py-2">01/06/2023</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-medium border-r border-gray-400 bg-gray-100">Page</td>
                      <td className="px-3 py-2">1 of 1</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4">
              <h2 className="text-lg font-medium text-center mb-4 underline">INSTRUMENT HISTORY</h2>

              {/* Basic Info Section */}
              <div className="border border-gray-400 mb-4">
                <div className="flex">
                  {/* Left Section - DEPARTMENT */}
                  <div className="w-1/2 border-r border-gray-400 flex flex-col">
                    <div className="border-b border-gray-400 px-3 py-2 bg-gray-200">
                      <span className="text-gray-800 font-medium text-sm">DEPARTMENT: {instrument.department}</span>
                    </div>

                    <div className="p-0 flex-1">
                      <table className="w-full text-sm h-full">
                        <tbody>
                          <tr className="border-b border-gray-400">
                            <td className="py-2 px-3 text-gray-700 w-52 border-r border-gray-400">Name of Instrument :</td>
                            <td className="py-2 px-3 text-gray-800">{instrument.name}</td>
                          </tr>
                          <tr className="border-b border-gray-400">
                            <td className="py-2 px-3 text-gray-700 border-r border-gray-400">Make :</td>
                            <td className="py-2 px-3 text-gray-800">{instrument.make}</td>
                          </tr>
                          <tr className="border-b border-gray-400">
                            <td className="py-2 px-3 text-gray-700 border-r border-gray-400">Model :</td>
                            <td className="py-2 px-3 text-gray-800">{instrument.model}</td>
                          </tr>
                          <tr className="border-b border-gray-400">
                            <td className="py-2 px-3 text-gray-700 border-r border-gray-400">S.No. :</td>
                            <td className="py-2 px-3 text-gray-800">{instrument.serial_no}</td>
                          </tr>
                          <tr className="border-b border-gray-400">
                            <td className="py-2 px-3 text-gray-700 border-r border-gray-400">Date of installation :</td>
                            <td className="py-2 px-3 text-gray-800">{instrument.installation_date}</td>
                          </tr>
                          <tr className="border-b border-gray-400">
                            <td className="py-2 px-3 text-gray-700 border-r border-gray-400">Location of Equipment :</td>
                            <td className="py-2 px-3 text-gray-800">{instrument.location}</td>
                          </tr>
                          <tr className="border-b border-gray-400">
                            <td className="py-2 px-3 text-gray-700 border-r border-gray-400">Name & Contact details of Service Provider :</td>
                            <td className="py-2 px-3 text-gray-800">{instrument.manufacturer}</td>
                          </tr>
                          <tr className="border-b border-gray-400">
                            <td className="py-2 px-3 text-gray-700 border-r border-gray-400">WI Reference :</td>
                            <td className="py-2 px-3 text-gray-800">{instrument.WIreference}</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 text-gray-700 border-r border-gray-400">Software / Firmware details :</td>
                            <td className="py-2 px-3 text-gray-800">{instrument.software}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Section - Equipment Details */}
                  <div className="w-1/2 flex flex-col">
                    <div className="border-b border-gray-400 px-3 py-2 bg-gray-200">
                      <span className="text-gray-800 font-medium text-sm">EQPT ID: {instrument.idno}</span>
                    </div>

                    <div className="p-0 flex-1">
                      <table className="w-full text-sm h-full">
                        <tbody>
                          <tr className="border-b border-gray-400">
                            <td className="py-2 px-3 text-gray-700 w-44 border-r border-gray-400" rowSpan="2">Range :</td>
                            <td className="py-2 px-3 text-gray-800" rowSpan="2">{instrument.range}</td>
                          </tr>
                          <tr className="border-b border-gray-400"></tr>
                          <tr className="border-b border-gray-400">
                            <td className="py-2 px-3 text-gray-700 border-r border-gray-400" rowSpan="2">L.C. :</td>
                            <td className="py-2 px-3 text-gray-800" rowSpan="2">{instrument.least_count}</td>
                          </tr>
                          <tr className="border-b border-gray-400"></tr>
                          <tr className="border-b border-gray-400">
                            <td className="py-2 px-3 text-gray-700 border-r border-gray-400">Accuracy :</td>
                            <td className="py-2 px-3 text-gray-800">{instrument.accuracy}</td>
                          </tr>
                          <tr className="border-b border-gray-400">
                            <td className="py-2 px-3 text-gray-700 border-r border-gray-400" rowSpan="3">
                              Acceptance Criteria :<br />
                              (KTRC/QF/0704/07)
                            </td>
                            <td className="py-2 px-3 text-gray-800" rowSpan="3">{instrument.Acceptance}</td>
                          </tr>
                          <tr className="border-b border-gray-400"></tr>
                          <tr className="border-b border-gray-400"></tr>
                          <tr>
                            <td className="py-2 px-3 text-gray-700 border-r border-gray-400">Equipment Conforms Specified Requirement</td>
                            <td className="py-2 px-3 text-gray-800">
                              Yes/<span style={{ textDecoration: 'line-through' }}>No</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Types Table */}
              <div className="mb-6">
                <table className="w-full border-collapse border border-gray-300 text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-3 py-2 text-left font-medium">CODE</th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-medium">TYPE OF SERVICE</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-3 py-2">1</td>
                      <td className="border border-gray-300 px-3 py-2">Maintenance (KTRC/QF/0604/18)</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-3 py-2">2</td>
                      <td className="border border-gray-300 px-3 py-2">Calibration (KTRC/QF/0604/01/06)</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-3 py-2">3</td>
                      <td className="border border-gray-300 px-3 py-2">Routine Maintenance</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-3 py-2">4</td>
                      <td className="border border-gray-300 px-3 py-2">Out of Order</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Calibration History Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-2 py-2 text-left font-medium">TYPE OF SERVICE</th>
                      <th className="border border-gray-300 px-2 py-2 text-left font-medium">IMPLEMENT DATE</th>
                      <th className="border border-gray-300 px-2 py-2 text-left font-medium">NEXT DUE DATE</th>
                      <th className="border border-gray-300 px-2 py-2 text-left font-medium">SERVICE PROVIDER</th>
                      <th className="border border-gray-300 px-2 py-2 text-left font-medium">RESULT OF CALIBRATION (Certificate No.)</th>
                      <th className="border border-gray-300 px-2 py-2 text-left font-medium">ADJUSTMENTS, IF ANY (YES/NO)</th>
                      <th className="border border-gray-300 px-2 py-2 text-left font-medium">MEETS ACCEPTANCE CRITERIA (YES/NO)</th>
                      <th className="border border-gray-300 px-2 py-2 text-left font-medium">SIGNED BY</th>
                      <th className="border border-gray-300 px-2 py-2 text-left font-medium">REMARKS</th>
                      <th className="border border-gray-300 px-2 py-2 text-left font-medium">DETAIL OF RECORD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history && history.length > 0 ? (
                      history.map((record, index) => {
                        const serviceTypeLower = (record.service_type || '').toLowerCase().trim();
                        const isOutOfOrder = serviceTypeLower === 'out of order';
                        const isRoutineMaint = serviceTypeLower === 'routine maintenance' || serviceTypeLower === 'repair/modification' || serviceTypeLower === 'repair' || serviceTypeLower === 'modification';
                        const isMaintenance = serviceTypeLower === 'maintenance';

                        return (
                          <tr key={index}>
                            <td className="border border-gray-300 px-2 py-2 font-medium">
                              {isOutOfOrder ? 'Out of Order' : (isRoutineMaint ? 'Routine Maintenance' : (record.service_type || '-'))}
                            </td>
                            <td className="border border-gray-300 px-2 py-2">{record.start_date || '-'}</td>
                            <td className="border border-gray-300 px-2 py-2">
                              {isOutOfOrder || (isRoutineMaint && record.end_date === record.start_date) ? '-' : (record.end_date || '-')}
                            </td>
                            <td className="border border-gray-300 px-2 py-2">
                              {isOutOfOrder ? '-' : (record.service_provider || '-')}
                            </td>
                            <td className="border border-gray-300 px-2 py-2">
                              {isOutOfOrder || isRoutineMaint || isMaintenance ? '-' : (record.certificate_no || '-')}
                            </td>
                            <td className="border border-gray-300 px-2 py-2">
                              {isOutOfOrder || isRoutineMaint || isMaintenance ? '-' : (
                                <>
                                  {record.adjustment || '-'}
                                  {record.adjustment_remark && record.adjustment_remark !== '-' && (
                                    <>
                                      <br />
                                      <span className="text-gray-500 text-xs">{record.adjustment_remark}</span>
                                    </>
                                  )}
                                </>
                              )}
                            </td>
                            <td className="border border-gray-300 px-2 py-2">
                              {isOutOfOrder || isMaintenance ? '-' : (record.meet_acceptance || '-')}
                            </td>
                            <td className="border border-gray-300 px-2 py-2 text-xs">
                              {record.watermark_url && (
                                <img
                                  src={record.watermark_url}
                                  alt="Signature"
                                  className="max-w-32 mb-2"
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              )}
                              <div className="font-medium">{record.signed_by || 'N/A'}</div>
                            </td>
                            <td className="border border-gray-300 px-2 py-2 whitespace-pre-wrap">
                              {record.remark || '-'}
                              {record.recalibration_required === 'Yes' && (
                                <span className="block mt-1 text-xs text-amber-800 font-medium bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  ⚠️ Recalibration Required: Yes
                                </span>
                              )}
                            </td>
                            <td className="border border-gray-300 px-2 py-2 text-center">
                              <div className="flex flex-col gap-1 items-center justify-center">
                                {record.document_url && (
                                  <a
                                    href={record.document_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1 font-medium text-xs bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded border border-blue-200"
                                  >
                                    📄 {isMaintenance ? 'Maintenance Record' : (isRoutineMaint ? 'Service Report' : 'View Document')}
                                  </a>
                                )}
                                {record.verification_url && (
                                  <a
                                    href={record.verification_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-700 hover:text-emerald-900 underline inline-flex items-center gap-1 font-medium text-xs bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded border border-emerald-200"
                                  >
                                    📋 Verification Details
                                  </a>
                                )}
                                {!record.document_url && !record.verification_url && '-'}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="10" className="border border-gray-300 px-2 py-4 text-center text-gray-500">
                          No history records available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Signature Section */}
              <div className="mt-8 flex justify-end space-x-16">
                <div className="text-center">
                  <div className="text-sm font-medium">DTM</div>
                  <div className="border-b border-gray-400 w-24 mt-8 mb-2"></div>
                  <div className="text-sm">Name</div>
                </div>
                <div className="text-center">
                  <div className="border-b border-gray-400 w-24 mt-12 mb-2"></div>
                  <div className="text-sm">Sign</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-100 text-center py-2 text-xs text-gray-500">
          Copyright © 2025. All rights reserved.
        </div>
      </div>
    </>
  );
}

export default ViewEquipmentHistory;