import { useParams ,useNavigate,useSearchParams} from "react-router";
import { useEffect, useState } from "react";
import { Page } from "components/shared/Page";
import { Button } from "components/ui";
import axios from "utils/axios";
import { toast } from "sonner";

export default function ViewInwardEntryCrf() {
    const navigate = useNavigate();
      const [searchParams] = useSearchParams();
  const caliblocation = searchParams.get("caliblocation") || "";
  const calibacc = searchParams.get("calibacc") || "";
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [entryData, setEntryData] = useState(null);

  useEffect(() => {
    const fetchEntry = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`/calibrationprocess/view-inward-entry-crf/${id}`);
        if (response.data.status === true) {
          setEntryData(response.data.data);
        } else {
          toast.error("Failed to load data.");
        }
      } catch (err) {
        console.error(err);
        toast.error("Something went wrong.");
      } finally {
        setLoading(false);
      }
    };
    fetchEntry();
  }, [id]);

  const handlePrint = () => {
    setPrintLoading(true);
    setTimeout(() => {
      window.print();
      setPrintLoading(false);
    }, 500);
  };

  if (loading) {
    return (
      <Page title="CRF Loading">
        <div className="flex h-[60vh] items-center justify-center text-gray-600">
          <svg className="animate-spin h-6 w-6 mr-2 text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 000 8v4a8 8 0 01-8-8z"></path>
          </svg>
          Loading CRF details...
        </div>
      </Page>
    );
  }

  if (!entryData) return null;

  // Safe destructuring with fallback {} to avoid crash
  const { inward = {}, technical = {}, quotation = {}, items = [], signature = {} } = entryData;

  return (
    <Page title="View Inward Entry CRF">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">CRF View</h2>
           <Button
        variant="outline"
        className="text-white bg-blue-600 hover:bg-blue-700"
        onClick={() => navigate(
                
            `/dashboards/calibration-process/inward-entry-lab?caliblocation=${encodeURIComponent(
              caliblocation
            )}&calibacc=${encodeURIComponent(calibacc)}`
          )}
      >
        Go Back
      </Button>
        </div>

        <div className="printable-area">
          {/* ------------------------------------------------------------------------------------- */}

          {/* Header Section */}
          <div className="flex border border-gray-300 bg-white shadow-sm">
            <div className="w-1/3 p-4">
              <img
                src="/images/logo.png"
                alt="Kailtech Logo"
                className="h-10 mb-2 w-auto object-contain"
              />
              <p className="font-semibold text-sm text-gray-800">
                Kailtech Test & Research Centre Pvt. Ltd.
              </p>
            </div>
            <div className="w-1/3 p-4 border-l border-gray-300 flex items-center justify-center">
              <h3 className="text-base font-bold uppercase text-center text-gray-800">
                Calibration Request Form
              </h3>
            </div>
            <div className="w-1/3 p-0 border-l border-gray-300 flex">
              <table className="w-full h-full text-xs text-gray-800 border-l border-gray-300 border-collapse">
                <tbody>
                  {[
                    ["Q.F. No.", "KTRCQF/0701/03"],
                    ["Issue No.", "01"],
                    ["Issue Date", "03/10/2019"],
                    ["Revision No.", "2"],
                    ["Revision Date", "28/08/2023"],
                    ["Page", "1 of 1"],
                  ].map(([label, value]) => (
                    <tr key={label} className="border-b border-gray-300">
                      <td className="p-1 font-semibold border-r border-gray-300">{label}</td>
                      <td className="p-1">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Customer Details */}
          <table className="w-full border border-gray-300 text-sm text-gray-800 table-fixed">
            <tbody>
              <tr className="border-b border-gray-300 align-top">
                <td className="p-2 font-semibold w-1/2 border-r border-gray-300">
                  Name & Address of Customer
                </td>
                <td className="p-2 whitespace-pre-line">
                  {inward?.customername ?? ""}
                  <br />
                  {inward?.customer_address ?? ""}
                </td>
              </tr>
              <tr className="border-b border-gray-300 align-top">
                <td className="p-2 font-semibold border-r border-gray-300">
                  Contact Person Name, Dept. & Designation
                </td>
                <td className="p-2 whitespace-pre-line">
                  {inward?.contact_person_name ?? ""}
                  <br />
                  {inward?.contact_department ?? ""}
                  <br />
                  {inward?.contact_designation ?? ""}
                </td>
              </tr>
              <tr className="border-b border-gray-300 align-top">
                <td className="p-2 font-semibold border-r border-gray-300">E-mail/ Tele/Fax Number</td>
                <td className="p-2 whitespace-pre-line">
                  {inward?.concernpersonemail ?? ""}
                  <br />
                  {inward?.concernpersonmobile ?? ""}
                </td>
              </tr>
              <tr className="border-b border-gray-300 align-top">
                <td className="p-2 font-semibold border-r border-gray-300">
                  Name & Address to be printed on Calibration certificates
                </td>
                <td className="p-2 flex gap-6">
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" readOnly checked={inward?.billingname === inward?.customername} />
                    Same
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" readOnly checked={inward?.billingname !== inward?.customername} />
                    Different
                  </label>
                </td>
              </tr>
              <tr className="border-b border-gray-300 align-top">
                <td className="p-2 font-semibold border-r border-gray-300">GST No.</td>
                <td className="p-2">{inward?.gstno ?? ""}</td>
              </tr>
              <tr className="border-b border-gray-300 align-top">
                <td className="p-2 font-semibold border-r border-gray-300">
                  Whether Conformity of statement is required
                </td>
                <td className="p-2">No</td>
              </tr>
              <tr>
                <td className="p-2 font-semibold border-r border-gray-300">Decision Rule</td>
                <td className="p-2">Not Applicable</td>
              </tr>
            </tbody>
          </table>

          {/* Instruments Table */}
          <div className="overflow-x-auto">
            <table className="w-full border text-xs text-gray-800 mb-4">
              <thead className="bg-gray-100">
                <tr>
                  {[
                    "S. No.",
                    "UUC NAME, MAKE/MODEL",
                    "SR/ID.NO.",
                    "PARAMETER",
                    "RANGE, LEAST COUNT",
                    "INSTRUMENT LOCATION",
                    "VALIDITY, IF REQUIRED",
                    "REMARK",
                  ].map((head) => (
                    <th key={head} className="p-2 border">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items?.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-2 border">{idx + 1}</td>
                    <td className="p-2 border">{item?.name ?? ""}</td>
                    <td className="p-2 border">{item?.idno ?? ""}</td>
                    <td className="p-2 border">{item?.parameter ?? ""}</td>
                    <td className="p-2 border">{item?.range_leastcount ?? ""}</td>
                    <td className="p-2 border">{item?.location ?? ""}</td>
                    <td className="p-2 border">{item?.validity ?? ""}</td>
                    <td className="p-2 border">{item?.remark ?? ""}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan="8" className="p-2 border text-left font-medium">
                    Additional Remark if Any: -
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
  {/* Terms & Conditions */}
          <div>
            <h3 className="font-semibold mb-2">Terms & Conditions:</h3>
            <ol className="list-decimal pl-5 space-y-1 text-gray-700">
              <li>
                All the terms & conditions agreed as per Our Quotation no-{" "}
                {quotation?.quotationno || "N/A"} / Your PO No- {inward.ponumber}
              </li>
              {/* Other terms as in original code... */}
             
              <li>
                Above customer information will be entered into final certificates and no
                changes will be entertained at a later date.
              </li>
              <li>
                Delivery: Billed customer to kindly collect duly calibrated instruments in
                3 working days.
              </li>
              <li>
                Payment: Customer to kindly release the payment within 7 working days
                from the date of Invoice. Payment through Cheque/NEFT in favour of
                &quot;Kailtech Test & Research Centre Pvt Ltd.&quot;
              </li>
              <li>
                Conformity will be given based on above input. If the detail of Reference
                standard / customer specification is not given, then conformity statement
                will not be given in the certificate.
              </li>
              <li>
                The Validity will be provided in Certificate, only if required.
              </li>
              <li>
                Please refer our Scope of Accreditation & method used for calibration of
                each Instruments.
              </li>
              <li>
                If equipment&apos;s are more than the given space, please attach separate
                sheet for details. If equipment needs any accessories, please provide.
              </li>
              <li>
                Please note that calibration certificate issued by laboratory is/are
                electronically signed by Authorized Signatory approved by NABL, hence
                does not require signature by ink.
              </li>
              <li>
                Calibration is meant for scientific and industrial purpose only.
              </li>
              <li>
                All information provided, except name of customer, shared shall be
                maintained confidential.
              </li>
              <li>
                All disputes, subject to jurisdiction of the courts of Indore (India)
                only.
              </li>
            </ol>
          </div>
          {/* Kailtech Use Only */}
          <div>
            <h3 className="text-center font-bold mb-2">For use of Kailtech only</h3>
            <table className="w-full border text-sm mb-4">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Sr. No.</th>
                  <th className="p-2 border">Review Remarks</th>
                  <th className="p-2 border">Yes</th>
                  <th className="p-2 border">No</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Is the condition of DUC ok for Calibration?", technical?.DUCCalibration ?? "N/A"],
                  ["Is the capability & resources available?", technical?.resourcesavailable ?? "N/A"],
                  ["Is all the terms & conditions discussed with the customer?", technical?.discussedcustomer ?? "N/A"],
                  ["Is there any specific requirement?", technical?.specificrequirement ?? "N/A"],
                  ["Accessories, if any?", technical?.Accessories ?? "N/A"],
                ].map(([q, v], idx) => (
                  <tr key={idx}>
                    <td className="p-2 border">{idx + 1}</td>
                    <td className="p-2 border">{q}</td>
                    <td className="p-2 border text-center">{v === "Yes" ? "✓" : ""}</td>
                    <td className="p-2 border text-center">{v === "No" ? "✓" : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="font-semibold">Remark: {technical?.remark ?? ""}</p>
          </div>

          {/* Signature */}
          <table className="w-full border border-gray-300 text-sm mt-8">
            <thead>
              <tr>
                <th colSpan={2} className="text-center p-2 border-b text-base font-medium">
                  Customer Requirement Form Reviewed & Accepted by
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th className="p-2 text-left border-r border-gray-300">Signature</th>
                <td className="p-2">
                  {signature?.image ? (
                    <img src={signature.image} alt="Signature" className="h-10 w-auto" />
                  ) : (
                    "N/A"
                  )}
                </td>
              </tr>
              <tr>
                <th className="p-2 text-left border-r border-gray-300">Name</th>
                <td className="p-2 font-semibold">{signature?.name ?? "N/A"}</td>
              </tr>
              <tr>
                <th className="p-2 text-left border-r border-gray-300">Date</th>
                <td className="p-2 text-black-800">{signature?.date ?? "N/A"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* --------------------------------------------------------------------------------------------- */}

        {/* Download Button */}
        <div className="flex justify-end mt-6 no-print">
          <Button onClick={handlePrint} color="success" disabled={printLoading}>
            {printLoading ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 000 8v4a8 8 0 01-8-8z"></path>
                </svg>
                Preparing...
              </div>
            ) : (
              "Download CRF"
            )}
          </Button>
        </div>
      </div>
    </Page>
  );
}
