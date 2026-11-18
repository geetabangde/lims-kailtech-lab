import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { JWT_HOST_API } from "configs/auth.config";

function ViewSticker() {
    const navigate = useNavigate();
    const location = useLocation();
    const { inwardId, instId } = useParams();

    const [instruments, setInstruments] = useState([]);
    const [inwardEntry, setInwardEntry] = useState(null);
    const [companyInfo, setCompanyInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Extract other parameters from location state
    const caliblocation = location.state?.caliblocation || "Lab";
    const calibacc = location.state?.calibacc || "Nabl";

    // Function to get auth token
    const getAuthToken = () => {
        const token = localStorage.getItem('token') ||
            localStorage.getItem('authToken') ||
            localStorage.getItem('access_token') ||
            sessionStorage.getItem('token') ||
            sessionStorage.getItem('authToken');
        return token;
    };

    // Format date to d/m/Y (DD/MM/YYYY) matching PHP changedateformatespecito
    const formatDate = (dateString) => {
        if (!dateString) return '';

        if (typeof dateString === 'string') {
            const trimmed = dateString.trim();
            // Check YYYY-MM-DD or YYYY-MM-DD HH:mm:ss
            const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
            if (isoMatch) {
                const year = isoMatch[1];
                const month = isoMatch[2].padStart(2, '0');
                const day = isoMatch[3].padStart(2, '0');
                return `${day}/${month}/${year}`;
            }
            // Check DD/MM/YYYY
            const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
            if (dmyMatch) {
                const day = dmyMatch[1].padStart(2, '0');
                const month = dmyMatch[2].padStart(2, '0');
                const year = dmyMatch[3];
                return `${day}/${month}/${year}`;
            }
        }

        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString;
        }

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    // API call to fetch sticker data using the Laravel getInstrumentLabels endpoint
    useEffect(() => {
        const fetchStickersData = async () => {
            try {
                setLoading(true);
                setError(null);

                const token = getAuthToken();
                if (!token) {
                    setError('Authentication token not found. Please login again.');
                    setLoading(false);
                    return;
                }

                const headers = {
                    'Content-Type': 'application/json',
                    'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`
                };

                // The Laravel getInstrumentLabels accepts comma-separated instid directly
                const response = await fetch(
                    `${JWT_HOST_API}/calibrationprocess/view-sticker`,
                    {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify({
                            inwardid: inwardId,
                            instid: instId
                        }),
                    }
                );

                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error('Authentication failed. Please login again.');
                    }
                    if (response.status === 404) {
                        throw new Error('No instruments found with the given criteria.');
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();

                if (result.status === "true" || result.status === true || result.success === true) {
                    const data = result.data;
                    if (data?.instruments) {
                        setInstruments(data.instruments || []);
                        setInwardEntry(data.inward_entry || null);
                        setCompanyInfo(Array.isArray(data.company_info) ? data.company_info[0] : data.company_info);
                    } else if (Array.isArray(data)) {
                        // Fallback in case old array format is returned
                        const allInstruments = [];
                        data.forEach(item => {
                            if (item.instruments) {
                                allInstruments.push(...item.instruments);
                            }
                        });
                        setInstruments(allInstruments);
                        setCompanyInfo(data[0]?.company_info?.[0] || null);
                        setInwardEntry(data[0]?.inward_info?.[0] || null);
                    }
                } else {
                    throw new Error(result.message || 'Failed to fetch sticker data');
                }
            } catch (err) {
                console.error('API Error:', err);
                setError(err.message || 'Failed to fetch sticker data');
            } finally {
                setLoading(false);
            }
        };

        if (inwardId && instId) {
            fetchStickersData();
        } else {
            setError('Missing required parameters (inwardId and instId)');
            setLoading(false);
        }
    }, [inwardId, instId]);

    const handleBack = () => {
        navigate(`/dashboards/calibration-process/inward-entry-lab/perform-calibration/${inwardId}`, {
            state: {
                caliblocation,
                calibacc
            }
        });
    };

    // Print CSS — hides the app sidebar/navbar, shows only sticker cards
    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
            @media print {
                .noprint { display: none !important; }
                body * { visibility: hidden; }
                * { position: static !important; box-shadow: none !important; }
                .print-container, .print-container * { visibility: visible; }
                .print-container {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 8.71in !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background-color: white !important;
                }
            }
        `;
        document.head.appendChild(style);
        return () => {
            if (document.head.contains(style)) {
                document.head.removeChild(style);
            }
        };
    }, []);

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center text-gray-600">
                <svg className="animate-spin h-6 w-6 mr-2 text-blue-600" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 000 8v4a8 8 0 01-8-8z"></path>
                </svg>
                Loading Stickers...
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-xl font-semibold text-gray-800">View Stickers</h1>
                        <button
                            onClick={handleBack}
                            className="bg-indigo-500 hover:bg-fuchsia-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                            ← Back to Perform Calibration
                        </button>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                        <p className="text-red-700">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    const companyname = companyInfo?.name || 'Kailtech Test And Research Centre Pvt. Ltd.';
    const companyaddress = companyInfo?.address || 'Plot No.141-C, Electronic Complex, Industrial Area, Indore-452010 (MADHYA PRADESH) India';
    const companyphone = companyInfo?.phone || 'Ph: 91-731-4787555 (30 lines)';
    const companylogo = companyInfo?.logo || '';

    return (
        <div className="min-h-screen bg-gray-100 py-6">
            {/* Print button — exact PHP: position:fixed;top:50;right:50 + zIndex to clear app navbar */}
            <input
                type="button"
                onClick={() => window.print()}
                className="noprint"
                style={{ position: 'fixed', top: '65px', right: '160px', zIndex: 9999, cursor: 'pointer', padding: '6px 14px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 600, fontSize: '14px' }}
                value="Print"
            />
            {/* Back button — for React navigation */}
            <button
                onClick={handleBack}
                className="noprint"
                style={{ position: 'fixed', top: '65px', right: '60px', zIndex: 9999, cursor: 'pointer', padding: '6px 14px', background: '#374151', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 600, fontSize: '14px' }}
            >
                ← Back
            </button>

            {/* Exact PHP: <div style="width: 8.71in;"> — no padding */}
            <div
                className="print-container bg-white shadow-sm mx-auto"
                style={{
                    width: '8.71in'
                }}
            >
                {instruments.map((rowitem, index) => {
                    const inwarddate = rowitem.inward_date || inwardEntry?.inwarddate || '';

                    return (
                        <div
                            key={rowitem.id || index}
                            style={{
                                pageBreakInside: 'avoid',
                                float: 'left',
                                marginLeft: '1%',
                                marginBottom: '1%',
                                width: '26%',
                                border: '1px solid black',
                                padding: '4px',
                                fontFamily: 'Times New Roman, serif',
                                boxSizing: 'content-box',
                                overflow: 'hidden',
                                color: '#000'
                            }}
                        >
                            {/* Logo logic matching PHP */}
                            {rowitem.accreditation === 'Nabl' && inwarddate < '2022-08-01' ? (
                                <div style={{ float: 'left' }}>
                                    <img src="/images/nabl2348.png" style={{ width: '35px' }} alt="NABL" />
                                </div>
                            ) : (
                                <div style={{ float: 'left' }}>
                                    {companylogo ? (
                                        <img
                                            src={companylogo}
                                            style={{ width: '60px', filter: 'grayscale(100%)' }}
                                            alt="Logo"
                                        />
                                    ) : (
                                        <div style={{ width: '60px', textAlign: 'center', fontSize: '10px', fontWeight: 'bold' }}>ktrc</div>
                                    )}
                                </div>
                            )}

                            <div style={{ margin: 'auto' }}>
                                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px', lineHeight: '1.2' }}>
                                    {companyname}
                                </div>
                                <div style={{ textAlign: 'center', fontSize: '8px', lineHeight: '10px' }}>
                                    {companyaddress} {companyphone}
                                </div>

                                {inwarddate > '2022-08-01' && (
                                    <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px', lineHeight: '1.2' }}>
                                        Calibration Status Tag
                                    </div>
                                )}

                                {/* 18-Nov-2026: long unbroken ID/Sr. values (e.g. CHLHI/PICU/NICU/PHOTOTHERAPY/06/SG26310006PA) ran out of the tag box and overlapped the next tag -> wrap inside the box */}
                                <div style={{ textAlign: 'left', fontSize: '10px', lineHeight: '12px', paddingTop: '8px', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                                    <b>Inst. Name:- </b>{rowitem.name || ''}
                                </div>

                                <div style={{ textAlign: 'left', fontSize: '10px', lineHeight: '12px', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                                    <b>Location:- </b>{rowitem.instlocation || 'NA'}
                                </div>

                                <div style={{ textAlign: 'left', fontSize: '10px', lineHeight: '12px', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                                    <b>ID/Sr.: - </b>{(rowitem.idno ?? '') + '/' + (rowitem.serialno ?? '')}
                                </div>

                                {inwarddate < '2022-08-01' ? (
                                    <div style={{ textAlign: 'left', fontSize: '10px', lineHeight: '12px' }}>
                                        <b>Certificate No: -  </b>{rowitem.bookingrefno || ''}
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'left', fontSize: '10px', lineHeight: '12px' }}>
                                        <b>BRN No: -  </b>{rowitem.bookingrefno || ''}
                                    </div>
                                )}

                                <div style={{ textAlign: 'left', fontSize: '10px', lineHeight: '12px' }}>
                                    <b>Cal. Date: -  </b>{formatDate(rowitem.calibratedon)}
                                </div>

                                <div style={{ textAlign: 'left', fontSize: '10px', lineHeight: '12px' }}>
                                    <b>Due. Date No: -  </b>{formatDate(rowitem.duedate)}
                                    {/* PHP uses class="float:right" (not inline style) — replicated exactly */}
                                    {inwarddate < '2022-08-01' && (
                                        <span className="float:right"> Cal. By: -</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {/* Clear floats */}
                <div style={{ clear: 'both' }}></div>
            </div>
        </div>
    );
}

export default ViewSticker;