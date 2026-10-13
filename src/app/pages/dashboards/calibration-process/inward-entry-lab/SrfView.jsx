import { useParams ,useSearchParams,useNavigate} from "react-router";
import { useEffect, useState } from "react";
import { Page } from "components/shared/Page";
import { Button } from "components/ui";
import axios from "utils/axios";
import { toast } from "sonner";


export default function ViewInwardEntrySrf() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const caliblocation = searchParams.get("caliblocation") || "";
  const calibacc = searchParams.get("calibacc") || "";
  const [loading, setLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [entryData, setEntryData] = useState(null);

  useEffect(() => {
    const fetchEntry = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`/calibrationprocess/view-inward-entry/${id}`);
        if (response.data.status === "success") {
          console.log(response.data.data);
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
      <Page title="SRF Loading">
        <div className="flex h-[60vh] items-center justify-center text-gray-600">
          <svg className="animate-spin h-6 w-6 mr-2 text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 000 8v4a8 8 0 01-8-8z"></path>
          </svg>
          Loading SRF details...
        </div>
      </Page>
    );
  }

  if (!entryData) return null;

  const {
    entry,
    customer_name,
    report_address,
    report_name,
    billing_name,
    billing_address,
    mode_of_receipt,
    reviewed_by,
    tech_accepted_by,
    added_by,
    transfer_by,
    technical_acceptance,
    samples,
    work_order_url,
    receipt_doc_url,
  } = entryData;

  const workOrderUrl = work_order_url || entry?.work_order_url || entry?.wupload_url || null;
  const receiptDocUrl = receipt_doc_url || entry?.receipt_doc_url || entry?.rupload_url || null;

  // Format date helper
  const formatDate = (date, inputFormat, outputFormat) => {
    if (!date || date === "0000-00-00" || date === "0000-00-00 00:00:00") return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    if (outputFormat === "d/m/Y") {
      return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
    }
    return date;
  };

  return (
    <Page title="View Inward Entry SRF">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 no-print">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">View SRF</h2>
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
          <div className="space-y-6 text-sm leading-relaxed print:text-black">
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
                <h2 className="text-sm font-bold uppercase text-center text-gray-800">
                  Sample Review And Entry Format
                </h2>
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
            <div>
              <h3 className="font-bold mb-2">REVIEW (Sample Section Acceptance)</h3>
              <table className="w-full border border-gray-300 text-sm text-gray-800 table-fixed">
                <thead className="bg-gray-100">
                  <tr>
                   <th className="p-1 border w-[50px] text-center">S. NO.</th>
                    <th className="p-2 border">CHECK LIST</th>
                    <th className="p-2 border" colSpan="3">DESCRIPTION</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Customer Name (If new then make the Customer code first)", value: customer_name ?? '-' },
                    { label: "Address (Factory Address for BIS Pertaining)", value: report_address ?? '-' },
                    {
                      label: "Work Order No./Date",
                      value: `${entry?.ponumber ?? '-'} / ${formatDate(entry?.inwarddate, "Y-m-d", "d/m/Y") || '-'}`,
                      link: workOrderUrl,
                      linkText: "View Work order"
                    },
                    {
                      label: "Mode of Receipt",
                      value: mode_of_receipt ?? '-',
                      rowspan: true,
                      receiptDocLink: receiptDocUrl,
                    },
                    { label: "Report in Whose Name", value: report_name ?? '-' },
                    { label: "Billing in Whose name", value: `${billing_name ?? '-'}<br>${billing_address ?? '-'}` },
                    { label: "Witness (Required/Not Required)", value: entry?.witness ?? '-' },
                    { label: "Packing of Sample (Sealed/Unsealed)", value: entry?.packingofsample ?? '-' },
                    { label: "Sample Condition", value: entry?.samplecondition ?? 'Satisfactory' },
                    { label: "Time Schedule (Clear or not)", value: entry?.timeschedule ?? '-' },
                    { label: "Payment (Received or Not)", value: entry?.payment ?? '-' },
                    { label: "GST No.", value: entry?.gstno ?? '-' },
                    { label: "Subcontracting", value: entry?.subcontracting ?? '-' },
                    { label: "Sample accepted", value: entry?.sampleaccepted ?? '-' },
                  ].map((item, idx) => (
                    item.rowspan ? (
                      <>
                        <tr key={idx}>
                          <td className="p-2 border">{idx + 1}</td>
                          <td className="p-2 border" rowSpan="2">{item.label}</td>
                          <td className="p-2 border" colSpan="3">
                            <span>{item.value}</span>
                            {item.receiptDocLink && (
                              <a
                                href={item.receiptDocLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block ml-3 px-2 py-0.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm align-middle no-print"
                              >
                                View Receipt Doc
                              </a>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2 border">{idx + 2}</td>
                          <td className="p-2 border" colSpan="3">
                            {entry?.modeofreciept !== "1" && (
                              <>
                                Courier name: {entry?.couriernamerec ?? '-'}<br />
                                Docket no: {entry?.docketnorec ?? '-'}<br />
                              </>
                            )}
                            Date: {formatDate(entry?.dateofdispatchrec, "Y-m-d", "d/m/Y") || '-'}<br />
                            Local Contact: {entry?.localcontactrec ?? '-'}
                          </td>
                        </tr>
                      </>
                    ) : (
                      <tr key={idx}>
                        <td className="p-2 border">{idx + 1}</td>
                        <td className="p-2 border">{item.label}</td>
                        <td className="p-2 border" colSpan="3">
                          <span dangerouslySetInnerHTML={{ __html: item.value }}></span>
                          {item.link && (
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block ml-3 px-2.5 py-0.5 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded shadow-sm align-middle no-print"
                            >
                              {item.linkText || "View Document"}
                            </a>
                          )}
                        </td>
                      </tr>
                    )
                  ))}
                  <tr>
                    <td className="p-2 border" colSpan="5">
                      <b>Remark:</b> {entry?.reviewremark ?? '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 border-t-0 text-right" colSpan="5">
                      <b>Signature:</b>
                    </td>
                  </tr>
                  <tr>
                    <th className="p-2 border" colSpan="2">Name</th>
                    <th className="p-2 border" colSpan="3">Designation</th>
                  </tr>
                  <tr>
                    <td className="p-2 border" colSpan="2">{reviewed_by?.name ?? '-'}</td>
                    <td className="p-2 border" colSpan="3">{reviewed_by?.designation ?? '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Technical Acceptance */}
            <div>
              <h3 className="font-bold mb-2">TECHNICAL ACCEPTANCE</h3>
              <table className="w-full border border-gray-300 text-sm text-gray-800 table-auto">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-1 border w-[50px] text-center">S. NO.</th>
                    <th className="p-2 border">CHECK LIST</th>
                    <th className="p-2 border">Mark</th>
                    <th className="p-2 border">DESCRIPTION</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Quantity of Samples Received", mark: technical_acceptance?.quantityofsampledesc ?? '-', desc: technical_acceptance?.quantityofsampledesc ?? '-' },
                    { label: "Specifications", mark: technical_acceptance?.specification ?? '-', desc: technical_acceptance?.specificationdesc ?? '-' },
                    { label: "Method of testing", mark: technical_acceptance?.methods ?? '-', desc: technical_acceptance?.methodsdesc ?? '-' },
                    { label: "Declaration if required", mark: technical_acceptance?.declaration ?? '-', desc: technical_acceptance?.declarationdesc ?? '-' },
                    { label: "Statement of conformity", mark: technical_acceptance?.statementofconfirmity ?? '-', desc: technical_acceptance?.statementofconfirmitydesc ?? '-' },
                    { label: "Sample accepted", mark: technical_acceptance?.sampleaccepted ?? '-', desc: technical_acceptance?.sampleaccepteddesc ?? '-' },
                  ].map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2 border">{idx + 1}</td>
                      <td className="p-2 border">{item.label}</td>
                      <td className="p-2 border">{item.mark}</td>
                      <td className="p-2 border">{item.desc}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="p-2 border" colSpan="4">
                      <b>Remark:</b> {technical_acceptance?.remark ?? '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 border-t-0 text-right" colSpan="4">
                      <b>Signature:</b>
                    </td>
                  </tr>
                  <tr>
                    <th className="p-2 border" colSpan="2">Name</th>
                    <th className="p-2 border" colSpan="2">Designation</th>
                  </tr>
                  <tr>
                    <td className="p-2 border" colSpan="2">{tech_accepted_by?.name ?? '-'}</td>
                    <td className="p-2 border" colSpan="2">{tech_accepted_by?.designation ?? '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Sample Entry */}
            <div>
              <h3 className="font-bold mb-2">Sample Entry</h3>
              <table className="w-full border border-gray-300 text-sm text-gray-800 table-fixed">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-1 border w-[50px] text-center">S. NO.</th>
                    <th className="p-2 border">Name</th>
                    <th className="p-2 border">Id no</th>
                    <th className="p-2 border">Serial no</th>
                    <th className="p-2 border">Make</th>
                    <th className="p-2 border">Booking Reference Number</th>
                    <th className="p-2 border">Laboratory Reference Number</th>
                  </tr>
                </thead>
                <tbody>
                  {(samples ?? []).map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2 border">{idx + 1}</td>
                      <td className="p-2 border">{item?.name ?? '-'}</td>
                      <td className="p-2 border">{item?.idno ?? '-'}</td>
                      <td className="p-2 border">{item?.serialno ?? '-'}</td>
                      <td className="p-2 border">{item?.make ?? '-'}</td>
                      <td className="p-2 border">{item?.bookingrefno ?? '-'}</td>
                      <td className="p-2 border">{item?.lrn ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2">
                <b>Entered by:</b> {added_by ?? '-'}
              </p>
            </div>

            {/* Sample Transfer */}
            <div>
              <h3 className="font-bold mb-2">SAMPLE TRANSFER</h3>
              <table className="w-full border border-gray-300 text-sm text-gray-800 table-fixed">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-1 border w-[50px] text-center">S. NO.</th>
                    <th className="p-2 border">Name</th>
                    <th className="p-2 border">Id no</th>
                    <th className="p-2 border">Serial no</th>
                    <th className="p-2 border">Booking Reference Number</th>
                    <th className="p-2 border">Laboratory Reference Number</th>
                    <th className="p-2 border">Lab</th>
                  </tr>
                </thead>
                <tbody>
                  {(samples ?? []).map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-1 border">{idx + 1}</td>
                      <td className="p-2 border">{item?.name ?? '-'}</td>
                      <td className="p-2 border">{item?.idno ?? '-'}</td>
                      <td className="p-2 border">{item?.serialno ?? '-'}</td>
                      <td className="p-2 border">{item?.bookingrefno ?? '-'}</td>
                      <td className="p-2 border">{item?.lrn ?? '-'}</td>
                      <td className="p-2 border">{item?.labname ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2">
                <b>TRANSFERED BY:</b> {transfer_by ?? '-'}
              </p>
            </div>

            {/* Notes */}
            <div>
              <b>Note:</b>
              <br />
              1. Use extra sheet / back for additional no. of samples /information if required.<br />
              2. Sample may have been received earlier but for such samples received with incomplete information viz not clear instructions/documents/payment terms etc, such samples shall be put on hold and may also be returned. In such case date of booking shall be considered as date of receipt of sample for all testing and records.<br />
              3. Coded Formats shall be sent to relevant department and then only the testing/Calibration will start.<br />
              4. For internal or routine customers, review of request can be performed in a simplified way. (As per IS 17025 : 2017)<br />
              {entry?.notes ?? '-'}
            </div>
          </div>
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
      </div>
    </Page>
  );
}
