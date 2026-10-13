import { useNavigate, useParams } from "react-router";
import { useEffect, useState } from "react";
import { Page } from "components/shared/Page";
import { Button } from "components/ui";
import axios from "utils/axios";
import { toast } from "sonner";

export default function ViewQuotation() {
  const { id } = useParams();
  const searchParams = new URLSearchParams(location.search);
  const caliblocation = searchParams.get("caliblocation") || "";
  const calibacc = searchParams.get("calibacc") || "";

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [quotationData, setQuotationData] = useState(null);

  // Fetch quotation data
  useEffect(() => {
    const fetchQuotation = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`/calibrationprocess/get-quotation-details?quotation_id=${id}`);
        if (response.data.success) {
          // Transform statutory_details array into an object
          const statutoryDetails = response.data.data.statutory_details.reduce((acc, item) => {
            acc[item.name.toLowerCase().replace(/\s+/g, "")] = item.description;
            return acc;
          }, {});
          setQuotationData({
            ...response.data.data,
            statutory_details: statutoryDetails,
          });
        } else {
          toast.error("Failed to load quotation details.");
        }
      } catch (err) {
        console.error(err);
        toast.error("Something went wrong.");
      } finally {
        setLoading(false);
      }
    };
    fetchQuotation();
  }, [id]);

  // Handle print button
  const handlePrint = () => {
    setPrintLoading(true);
    setTimeout(() => {
      window.print();
      setPrintLoading(false);
    }, 500);
  };

  // Format date helper
  const formatDate = (date, outputFormat = "d/m/Y") => {
    if (!date) return "N/A";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "N/A";
    if (outputFormat === "d/m/Y") {
      return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
    } else if (outputFormat === "d.m.Y") {
      return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getFullYear()}`;
    }
    return date;
  };

  // Handle navigation back to quotations
  // const handleBack = () => {
  //   navigate("/quotations");
  // };

  if (loading) {
    return (
      <Page title="Quotation Loading">
        <div className="flex h-[60vh] items-center justify-center text-gray-600">
          <svg className="animate-spin h-6 w-6 mr-2 text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 000 8v4a8 8 0 01-8-8z"></path>
          </svg>
          Loading quotation details...
        </div>
      </Page>
    );
  }

  if (!quotationData) {
    return (
      <Page title="Quotation Not Found">
        <div className="flex h-[60vh] items-center justify-center text-gray-600">
          No quotation data found.
        </div>
      </Page>
    );
  }

  const {
    company = {},
    customer = {},
    contact_person = {},
    created_by = {},
    items = [],
    totals = {},
    statutory_details = {},
    modes_of_communication = [],
    docNo = "N/A",
    refNo = "N/A",
    date,
    attention = contact_person.name,
   
    enquiry_date,
  } = quotationData;

  const isInterstate = customer.is_interstate;

  // Transform items to match expected structure
  const formattedItems = items.map((item, index) => ({
    ...item,
    sno: index + 1,
    quantity: item.qty,
  }));

  return (
    <Page title="View Quotation">
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto bg-white shadow-lg">
          {/* Header */}
          <div className="p-4 border-b bg-gray-50">
            <div className="flex justify-between items-start">
              <div className="text-lg font-medium text-gray-700">View Quotation</div>
                 <Button
                      variant="outline"
                      className="text-white bg-blue-600 hover:bg-blue-700"
                      onClick={() =>
                        navigate(
                          `/dashboards/calibration-process/inward-entry-lab?caliblocation=${encodeURIComponent(
                            caliblocation
                          )}&calibacc=${encodeURIComponent(calibacc)}`
                        )
                      }
                    >
                      Back to Inward Entry List
                  </Button>
            </div>
          </div>

          {/* Company Info */}
          <div className="p-6 border-b">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-4">
                <img
                  src="/images/logo.png"
                  alt="Kailtech Logo"
                  className="h-10 mb-2 w-auto object-contain"
                />
              </div>
              <div className="text-right text-xs">
                <div className="mb-1">Doc No. {docNo}</div>
                {company.accreditations?.length > 0 ? (
                  company.accreditations.map((acc, index) => (
                    <div key={index} className="text-blue-600 mb-1">{acc}</div>
                  ))
                ) : (
                  <>
                    <div className="text-blue-600 mb-1">NABL Accredited</div>
                    <div className="text-blue-600 mb-1">BIS Recognized</div>
                    <div className="text-blue-600">ISO 9001:2015 Certified Lab</div>
                  </>
                )}
              </div>
            </div>

            <div className="text-center mt-6">
              <h1 className="text-xl font-bold text-gray-800">
                {company.name || "Kailtech Test And Research Centre Pvt. Ltd."}
              </h1>
              <p className="text-xs text-gray-600 mt-1">
                {company.address || "Plot No 14-I-C, Electronic Complex, Industrial Area, Indore-452010 (MADHYA PRADESH) India"}
              </p>
              <p className="text-xs text-gray-600">
                Ph: {company.phone || "91-731-4787555 (30 lines), 91-731-4046055"}
              </p>
              <p className="text-xs text-gray-600">
                Email: {company.email || "contact@kailtech.net"}, Web: {company.website || "http://www.kailtech.net"}
              </p>
            </div>
          </div>

          {/* Customer Info */}
          <div className="p-6 border-b">
            <div className="text-right text-xs mb-4">
              <div className="mb-1">{refNo}</div>
              <div>{formatDate(date)}</div>
            </div>

            <div className="mb-4">
              <div className="font-semibold">{customer.name || "N/A"}</div>
              <div className="text-sm text-gray-600">{customer.address || "N/A"}</div>
              <div className="text-sm text-gray-600">Mobile: {contact_person.mobile || customer.mobile || "N/A"}</div>
              <div className="text-sm text-gray-600">Email: {contact_person.email || customer.email || "N/A"}</div>
              <div className="text-sm text-gray-600">GST No: {customer.gst_no || "N/A"}</div>
            </div>

            <div className="text-center font-semibold text-lg mb-4">
              Kind Attn: {attention || contact_person.name || "N/A"}
            </div>

            <div className="text-sm text-gray-700 mb-6">
              <p>Dear Sir/Madam,</p>
              <p>
                This is in reference to your {modes_of_communication[0] || "Email"} dated{" "}
                {formatDate(enquiry_date) || "N/A"} and your enquiry regarding your Calibration requirements.
                We thank you for your enquiry. We are offering you our rates for the product enquired by you as under:
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border border-gray-300 px-2 py-2 text-left">S.No</th>
                  <th className="border border-gray-300 px-2 py-2 text-left">Name</th>
                  <th className="border border-gray-300 px-2 py-2 text-left">Description</th>
                  <th className="border border-gray-300 px-2 py-2 text-left">Accreditation</th>
                  <th className="border border-gray-300 px-2 py-2 text-left">Quantity</th>
                  <th className="border border-gray-300 px-2 py-2 text-left">Rate</th>
                  <th className="border border-gray-300 px-2 py-2 text-left">Location</th>
                  <th className="border border-gray-300 px-2 py-2 text-left">Amount</th>
                </tr>
              </thead>
              <tbody>
                {formattedItems.length > 0 ? (
                  formattedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-2 py-2">{item.sno}</td>
                      <td className="border border-gray-300 px-2 py-2">{item.name || "N/A"}</td>
                      <td className="border border-gray-300 px-2 py-2">{item.description || "N/A"}</td>
                      <td className="border border-gray-300 px-2 py-2">{item.accreditation || "N/A"}</td>
                      <td className="border border-gray-300 px-2 py-2">{item.quantity || 0}</td>
                      <td className="border border-gray-300 px-2 py-2">{item.rate || 0}</td>
                      <td className="border border-gray-300 px-2 py-2">{item.location || "N/A"}</td>
                      <td className="border border-gray-300 px-2 py-2">{item.amount || 0}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="border border-gray-300 px-2 py-2 text-center">
                      No items available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="p-6">
            <div className="flex justify-end">
              <div className="w-96">
                <div className="flex justify-between py-1">
                  <span>Subtotal</span>
                  <span>{totals.subtotal || 0}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Discount</span>
                  <span>{totals.discount || 0}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Mobilization & Demobilization Charges</span>
                  <span>{totals.mobilization || 0}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Freight Charges</span>
                  <span>{totals.freight || 0}</span>
                </div>
                <div className="flex justify-between py-1 border-t">
                  <span>Subtotal 2</span>
                  <span>{totals.subtotal2 || 0}</span>
                </div>
                {isInterstate ? (
                  <div className="flex justify-between py-1">
                    <span>IGST {totals.igst_percentage || 18}%</span>
                    <span>{totals.igst_amount || 0}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between py-1">
                      <span>CGST {totals.cgst_percentage || 9}%</span>
                      <span>{totals.cgst_amount || 0}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>SGST {totals.sgst_percentage || 9}%</span>
                      <span>{totals.sgst_amount || 0}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between py-2 font-bold text-lg border-t">
                  <span>Total</span>
                  <span>{totals.total || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Terms */}
        <div className="p-6 border-t">
  <h3 className="font-semibold mb-2">Terms:</h3>
  <ol className="text-sm space-y-1 list-decimal list-inside">
    <li>
      Equipments which are possible to be calibrated at Site, will be done at
      site. Rest equipments will be calibrated at our Lab at Indore (M.P.).
    </li>
    <li>Payment terms: Advance.</li>
    <li>
      Cross Cheque/DD should be drawn in favor of Kailtech Test & Research
      Centre Pvt Ltd. Payable at Indore.
    </li>
    <li>
      Please attach bill details indicating Invoice No. & TDS deductions if any
      along with your payment.
    </li>
    <li>Subject to the exclusive jurisdiction of courts at INDORE only.</li>
    <li>Errors &amp; omissions accepted.</li>
  </ol>
</div>


          {/* Statutory Details */}
          <div className="p-6 border-t">
            <h3 className="font-semibold mb-4">Statutory Detail</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex">
                  <span className="w-40 font-medium">GST No.</span>
                  <span>{statutory_details.gstno || "N/A"}</span>
                </div>
                <div className="flex">
                  <span className="w-40 font-medium">Service Category</span>
                  <span>{statutory_details.servicecategory || "N/A"}</span>
                </div>
                <div className="flex">
                  <span className="w-40 font-medium">SAC Code</span>
                  <span>{statutory_details.saccode || "N/A"}</span>
                </div>
                <div className="flex">
                  <span className="w-40 font-medium">PAN</span>
                  <span>{statutory_details.pan || "N/A"}</span>
                </div>
                <div className="flex">
                  <span className="w-40 font-medium">Bank Account No.</span>
                  <span>{statutory_details.bankaccountno || "N/A"}</span>
                </div>
                <div className="flex">
                  <span className="w-40 font-medium">Bank Account Type</span>
                  <span>{statutory_details.bankaccounttype || "N/A"}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex">
                  <span className="w-40 font-medium">Bank Name</span>
                  <span>{statutory_details.bankname || "N/A"}</span>
                </div>
                <div className="flex">
                  <span className="w-40 font-medium">IFSC CODE</span>
                  <span>{statutory_details.ifsccode || "N/A"}</span>
                </div>
                <div className="flex">
                  <span className="w-40 font-medium">MICR CODE</span>
                  <span>{statutory_details.micrcode || "N/A"}</span>
                </div>
                <div className="flex">
                  <span className="w-40 font-medium">Udyam Registration No.</span>
                  <span>{statutory_details.udyamregistrationno || "N/A"}</span>
                </div>
                <div className="flex">
                  <span className="w-40 font-medium">CIN</span>
                  <span>{statutory_details.cin || "N/A"}</span>
                </div>
                <div className="flex">
                  <span className="w-40 font-medium">Type of MSME</span>
                  <span>{statutory_details.typeofmsme || "N/A"}</span>
                </div>
                <div className="flex">
                  <span className="w-40 font-medium">Beneficiary Name</span>
                  <span>{statutory_details.beneficiaryname || "N/A"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Signature Section */}
          <div className="p-6 border-t">
            <div className="text-sm mb-4">
              <p>Looking forward to receiving your valuable samples</p>
              <br />
              <p>Thanks and regards,</p>
              <div className="mt-4 text-xs">
                <p>Electronically Signed by</p>
                <p>{created_by.name || "N/A"}</p>
                <p>Designation: {created_by.designation || "N/A"}</p>
                <p>Date: {formatDate(date) || "N/A"}</p>
                <p>{created_by.mobile || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Download Button */}
          <div className="p-6 border-t bg-gray-50 text-right">
            <Button
              className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
              onClick={handlePrint}
              disabled={printLoading}
            >
              {printLoading ? "Preparing..." : "Download Quotation"}
            </Button>
          </div>

         
        </div>
      </div>
    </Page>
  );
}