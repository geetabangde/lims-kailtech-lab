import { renderToStaticMarkup } from "react-dom/server";
import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { toast } from "sonner";
import {
  getPdfImageUrl,
  HtmlCustomerLeft,
  HtmlInfoRows,
  HtmlSampleRows,
  HtmlResultsTable,
  HtmlRemarks,
  HtmlSignatories
} from "./ExportTestingReport";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d)
      .toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
      .replace(/\//g, ".");
  } catch { return d; }
}

const toArray = (val) => Array.isArray(val) ? val : (val && typeof val === 'object' ? Object.values(val) : []);

function extractDataTwoSign(report) {
  const {
    trf_product = {},
    nabl: nablObj = {},
    size,
    grade,
    batchno = "",
    report_status: rsObj = {},
    dates = {},
    customer = {},
    product = {},
    trf = {},
    received_items = [],
    test_results = [],
    remarks: remarksObj = {},
    signatories = [],
    meta = {},
  } = report;

  const { brn, ulr, condition_name, sealed_name, reportdate, lrn } = trf_product;
  const nablStatus = (typeof nablObj === "object" ? nablObj?.status : Number(nablObj)) ?? 0;
  const reportStatus = typeof rsObj === "object" ? (rsObj?.code ?? 0) : (Number(rsObj) || 0);
  // In PHP, it is $reportstatus < 10 for draft
  const isDraft = reportStatus < 10;

  const { start_date, end_date } = dates;

  const hodRemark = remarksObj?.hod_remark ?? "";
  const witnessVal = remarksObj?.witness ?? "";
  const witnessDetail = remarksObj?.witness_detail ?? "";
  const bdlRemark = remarksObj?.bdl_remark ?? "";
  const adlRemark = remarksObj?.adl_remark ?? "";

  const remarkLines = [];
  if (hodRemark?.trim()) remarkLines.push(hodRemark.trim());
  if (witnessVal === "1" && witnessDetail) remarkLines.push(`The test was witnessed by ${witnessDetail}`);
  if (bdlRemark) remarkLines.push(bdlRemark);
  if (adlRemark) remarkLines.push(adlRemark);

  const qtyStr = toArray(received_items)
    .filter((q) => (q.received ?? 0) > 0)
    .map((q) => {
      const name = q.quantity_name ?? "";
      if (name.toUpperCase().trim() === "NA") return "NA";
      return `${q.received} ${q.unit_name ?? ""}`.trim();
    })
    .join(", ") || "—";

  const hasSpecs = Number(trf_product?.specification_flag) === 2 ? false : (Number(trf_product?.specification_flag) === 1 || Number(trf_product?.specification) === 1 || toArray(test_results).some((r) => r.specification && r.specification !== "—" && r.specification !== "-"));

  const customerName = customer?.name ?? "—";
  const customerAddress = [customer?.address, customer?.city, customer?.pincode].filter(Boolean).join(", ");
  const contactPerson = customer?.contact_person ?? "";
  const showContact = Number(trf?.specificpurpose ?? customer?.specific_purpose) === 2;
  const customerRef = customer?.letterrefno ?? "";
  const productName = product?.name ?? "—";
  const productDesc = product?.description ?? size ?? "—";
  const displayLRN = lrn ?? brn ?? "—";
  const ktrcRef = meta?.ktrc_ref ?? "KTRC/QF/0708/01";
  const batchnoClean = batchno.replace(/<br\s*\/?>/gi, " ").trim();
  const receiptDate = fmtDate(trf?.date ?? dates?.receipt_date);

  // Use CUTOFF DATE logic for signatories as implemented in PHP
  const cutoffdate = new Date('2025-04-25T14:00:00');

  // Find max updated_on from signatures that are signed (status = 1)
  let maxUpdatedOn = null;
  const safeSignatories = toArray(signatories);
  safeSignatories.forEach(s => {
    if (s.is_signed && s.updated_on) {
      const d = new Date(s.updated_on);
      if (!maxUpdatedOn || d > maxUpdatedOn) {
        maxUpdatedOn = d;
      }
    }
  });

  const approvedate = maxUpdatedOn ? maxUpdatedOn : new Date('2025-04-25T14:00:00');
  let finalSignatories = [...safeSignatories];

  if (approvedate >= cutoffdate && finalSignatories.length > 0) {
    // array_unshift($signatories, array_pop($signatories))
    const lastElement = finalSignatories.pop();
    finalSignatories.unshift(lastElement);
  }

  // Add titles for Reviewed By / Authorized By
  finalSignatories = finalSignatories.map((s, i) => {
    let title = s.title;
    if (approvedate >= cutoffdate) {
      // PHP logic explicitly checks $i==0 for "Reviewed By", else "Authorized By"
      title = i === 0 ? "Reviewed By:" : "Authorized By:";
    }
    return { ...s, displayTitle: title };
  });

  const nablLogo = typeof nablObj === "object" ? nablObj?.logo : null;
  const isNabl = typeof nablObj === "object" ? Boolean(nablObj?.is_nabl) : false;
  const tid = trf_product?.id ?? report?.id ?? null; // For the End of Report check

  return {
    ulr, ktrcRef, displayLRN, receiptDate,
    condition_name, sealed_name, qtyStr,
    start_date, end_date, reportdate, dates,
    customerName, customerAddress, contactPerson, showContact, customerRef,
    productDesc, productName, grade, batchnoClean,
    hasSpecs, test_results: toArray(test_results), remarkLines, signatories: finalSignatories,
    nablStatus, nablLogo, isDraft, tid, isNabl
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// HTML WITHOUT LETTER HEAD (TWO SIGN)
// ─────────────────────────────────────────────────────────────────────────────
const S1 = {
  page: {
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: '12.5px',
    color: "#111",
    lineHeight: "1.3",
    position: 'relative',
    padding: "10px 0"
  },
  topRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "15px"
  },
  tcBlock: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  tcStamp: {
    width: "58px",
    height: "58px",
    objectFit: "contain"
  },
  pageRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "4px",
    fontSize: '12.5px'
  },
  title: {
    textAlign: "center",
    fontSize: '18.5px',
    fontWeight: "bold",
    textDecoration: "underline",
    marginBottom: "7px"
  },
  ulrRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "8px",
    fontSize: '13.5px'
  },
  isoSide: {
    position: "absolute",
    right: "-46px", bottom: "110px",
    fontSize: '10.5px', color: "#555",
    transform: "rotate(90deg)",
    width: "165px",
    transformOrigin: "bottom right",
  },
  draft: {
    position: "absolute",
    top: "32%", left: "8%",
    fontSize: "130.5px",
    fontWeight: "bold",
    color: "#cccccc",
    opacity: 0.28,
    transform: "rotate(-45deg)",
    zIndex: -1,
  },
};

const SS = {
  bold: { fontWeight: "bold" },
  infoWrap: { border: `1px solid #999`, marginBottom: '8px' },
  secTitle: { fontWeight: 'bold', fontSize: '13.5px', marginBottom: '4px', marginTop: '5px' },
  endOfReport: { textAlign: 'center', fontWeight: 'bold', margin: '12px 0', fontSize: '12.5px' },
};

// ─── Page-fit model for the "Without Letter Head" report (measured 12-Nov-2026) ───
// The signature block is fixed 15mm above the pre-printed letterhead footer and must never be overlapped.
// One "unit" = one compact single-line result row (~18px). Page 1 holds PAGE_1_UNITS units under the header/customer block,
// later pages hold PAGE_N_UNITS. Rows whose text wraps (long parameter / method names, grading tables) count for more units,
// and a long customer/sample block on page 1 reduces its capacity. The last page also reserves room for Remarks + **End of Report**.
const PAGE_1_UNITS = 13;
const PAGE_N_UNITS = 15;
const LAST_PAGE_RESERVE_UNITS = 2;
const WOLH_COMPACT_CSS = `
.wolh-compact thead th, .wolh-compact thead + tbody td { padding-top: 1.5px !important; padding-bottom: 1.5px !important; line-height: 1.2 !important; }
.wolh-compact div[style*="padding:4px"], .wolh-compact div[style*="padding:5px"] { padding-top: 1.5px !important; padding-bottom: 1.5px !important; line-height: 1.2 !important; }
`;

function rowUnits(r) {
  if (r && r.grading_table) return 4;
  const p = String(r?.parameter_name ?? '').length;
  const m = String(r?.method?.name ?? r?.method ?? '').length;
  return Math.max(1, Math.ceil(p / 34), Math.ceil(m / 34));
}

function page1InfoExtraUnits(data) {
  const lines = (txt, perLine) => Math.max(1, Math.ceil(String(txt || '').length / perLine));
  const sample = (lines(`Sample Identification: ${data.productDesc ?? ''}`, 125) - 1)
    + (data.customerRef && data.customerRef !== '-' ? lines(`Customer Reference :- ${data.customerRef}`, 125) - 1 : 0)
    + (lines(`Sample Particulars : ${data.productName ?? ''}, Grade: ${data.grade ?? ''}${data.brandValue ? ', ' + data.brandValue : ''}`, 125) - 1);
  const leftLines = 1 + lines(data.customerName, 48) + lines(data.customerAddress, 52) + (data.showContact && data.contactPerson ? 1 : 0);
  const leftExtra = Math.max(0, Math.ceil((leftLines * 14 + 12 - 150) / 18));
  return sample + leftExtra;
}

function paginateRows(rows, data) {
  const cap1 = Math.max(4, PAGE_1_UNITS - page1InfoExtraUnits(data));
  const pages = [];
  let cur = [];
  let used = 0;
  let cap = cap1;
  rows.forEach((r) => {
    const u = rowUnits(r);
    if (cur.length > 0 && used + u > cap) {
      pages.push(cur);
      cur = [];
      used = 0;
      cap = PAGE_N_UNITS;
    }
    cur.push(r);
    used += u;
  });
  const reserve = LAST_PAGE_RESERVE_UNITS + ((data.remarkLines && data.remarkLines.length) || 0);
  const carry = [];
  while (cur.length > 1 && used + reserve > cap + 1) { // +1: measured spare space above the signature block
    const moved = cur.pop();
    used -= rowUnits(moved);
    carry.unshift(moved);
  }
  pages.push(cur);
  if (carry.length) pages.push(carry);
  return pages;
}

function HtmlDocWithoutLHTwoSign({ report }) {
  const data = extractDataTwoSign(report);

  const rawTestResults = data.test_results || [];
  const testResults = rawTestResults.map((r, i) => ({
    ...r,
    sno: r.sno ?? (i + 1)
  }));

  const pageChunks = paginateRows(testResults, data);
  const totalPages = pageChunks.length || 1;

  return (
    <div style={S1.page} className="wolh-compact">
      <style dangerouslySetInnerHTML={{ __html: WOLH_COMPACT_CSS }} />
      {pageChunks.map((chunk, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const isLastPage = pageIndex === totalPages - 1;

        return (
          <div
            key={pageIndex}
            style={{
              boxSizing: 'border-box',
              minHeight: '270mm',
              position: 'relative',
              pageBreakAfter: isLastPage ? 'auto' : 'always',
              paddingBottom: '45mm', // Reserves 15mm clearance above pre-printed letterhead footer
              marginBottom: isLastPage ? '0px' : '20px'
            }}
          >
            {data.isDraft && <div style={S1.draft}>DRAFT</div>}

            {/* Iso side mark */}
            <div style={S1.isoSide}>An ISO 9001 : 2015 Certified Laboratory</div>

            {/* ── TOP HEADER (Without letter head, only NABL and LRN) ── */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginBottom: '10px' }}>
              <tbody>
                <tr>
                  <td style={{ width: '33%', textAlign: 'left', verticalAlign: 'top', border: 'none', padding: 0 }}>
                    <div style={{ width: '220px', height: '110px' }} />
                  </td>
                  <td style={{ width: '33%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                    {data.nablStatus === 1 && (
                      <>
                        {data.nablLogo ? (
                          <img src={getPdfImageUrl(data.nablLogo)} alt="" style={{ width: '135px', height: '115px', objectFit: 'contain' }} />
                        ) : (
                          <div style={{ width: '135px', height: '115px' }} />
                        )}
                      </>
                    )}
                  </td>
                  <td style={{ width: '33%', textAlign: 'right', verticalAlign: 'top', border: 'none', padding: 0 }}>
                    <div style={{ width: '210px', height: '110px' }} />
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '6px', fontSize: '12.5px', paddingTop: data.isNabl ? '0px' : '25px' }}>
              <div style={{ paddingBottom: '4px', position: 'relative', top: '-5mm' }}>
                {data.isNabl && (
                  <img src={`${window.location.origin}/images/nabl_qr.png`} alt="NABL QR" style={{ width: "50px", height: "50px", objectFit: "contain" }} />
                )}
              </div>
              <div style={{ display: 'flex', gap: '15px', fontWeight: 'bold' }}>
                <span>LRN: {data.displayLRN}</span>
                <span>Page {pageIndex + 1} of {totalPages}</span>
              </div>
            </div>

            {isFirstPage ? (
              <>
                <div style={S1.pageRow}>
                  <div> </div>
                  <div></div>
                </div>

                {data.nablStatus === 3 && (
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "4px" }}>
                    <img src={`${window.location.origin}/images/qai.jpeg`} alt="" style={{ width: "80px", height: "32px", objectFit: "contain" }} />
                  </div>
                )}

                <div style={S1.title}>TEST REPORT</div>

                <div style={S1.ulrRow}>
                  <div><span style={SS.bold}>ULR:</span>{data.nablStatus === 1 && data.ulr ? data.ulr : ""}</div>
                  <div style={SS.bold}>{data.ktrcRef}</div>
                </div>

                <div style={SS.infoWrap}>
                  <div style={{ display: "flex" }}>
                    <HtmlCustomerLeft data={data} />
                    <HtmlInfoRows data={data} />
                  </div>
                  <HtmlSampleRows data={data} />
                </div>

                <div style={SS.secTitle}>TEST RESULTS</div>
                <HtmlResultsTable data={{ ...data, test_results: chunk }} />
              </>
            ) : (
              <>
                <div style={S1.ulrRow}>
                  <div><span style={SS.bold}>ULR:</span>{data.nablStatus === 1 && data.ulr ? data.ulr : ""}</div>
                  <div style={SS.bold}>{data.ktrcRef}</div>
                </div>

                <div style={SS.secTitle}>TEST RESULTS (Contd.)</div>
                <HtmlResultsTable data={{ ...data, test_results: chunk }} />
              </>
            )}

            {isLastPage && (
              <>
                <HtmlRemarks remarkLines={data.remarkLines} />
                {String(data.tid) !== "1356" && (
                  <div style={SS.endOfReport}>**End of Report**</div>
                )}
              </>
            )}

            {/* Signature Block - Raised by 15mm above letterhead footer */}
            <div style={{
              position: 'absolute',
              bottom: '15mm',
              left: 0,
              right: 0
            }}>
              <HtmlSignatories signatories={data.signatories} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
HtmlDocWithoutLHTwoSign.propTypes = { report: PropTypes.object.isRequired };

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTED BUTTON
// ─────────────────────────────────────────────────────────────────────────────
export function printReportWOLHTwoSign(report, title) {
  const data = extractDataTwoSign(report);
  const safeTitle = data.ulr || data.ktrcRef || title || 'Test_Report';
  const bodyHtml = renderToStaticMarkup(<HtmlDocWithoutLHTwoSign report={report} />);

  const full = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    @page { size: A4; margin: 8mm 4mm; }
    body  { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; font-size: 10.5px; color: #111; background: #fff; }
    @media print { 
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      head { display: none; }
    }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`;

  const win = window.open(`/${safeTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.html`, '_blank');
  if (!win) { toast.error('Pop-up blocked — please allow pop-ups and try again.'); return; }

  // Write the HTML to the new window
  win.document.open();
  win.document.write(full);
  win.document.close();

  // Immediately stop the browser from completing the network request so it doesn't overwrite our HTML
  win.onload = () => {
    win.focus();
  };

}

export function PrintExportTestingReportWOLHTwoSignButton({ report, className }) {
  const btnClass = className ?? "rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:bg-blue-700 inline-block text-center cursor-pointer";
  const [blobUrl, setBlobUrl] = useState('#');

  useEffect(() => {
    if (!report) return;
    try {
      const data = extractDataTwoSign(report);
      const safeTitle = data.ulr || data.ktrcRef || 'Test_Report';
      const bodyHtml = renderToStaticMarkup(<HtmlDocWithoutLHTwoSign report={report} />);
      const full = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    @page { size: A4; margin: 8mm 4mm; }
    body  { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; font-size: 10.5px; color: #111; background: #fff; }
    @media print { 
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      head { display: none; }
    }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
      const blob = new Blob([full], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
      return () => URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to generate report blob', e);
    }
  }, [report]);

  return (
    <a href={blobUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => {
      if (blobUrl === '#' && e.button === 0) {
        e.preventDefault();
        printReportWOLHTwoSign(report, 'Test Report');
      }
    }} className={btnClass}>
      Print Report Without Letter Head (2 Signs)
    </a>
  );
}
PrintExportTestingReportWOLHTwoSignButton.propTypes = { report: PropTypes.object.isRequired, className: PropTypes.string };
