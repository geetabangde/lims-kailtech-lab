import { hasGrade } from "utils/gradeDisplay";
import { renderToStaticMarkup } from "react-dom/server";
import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { toast } from "sonner";
import {
  extractData,
  getPdfImageUrl,
  HtmlCustomerLeft,
  HtmlInfoRows,
  HtmlSampleRows,
  HtmlResultsTable,
  HtmlRemarks
} from "./ExportTestingReport";

// ─────────────────────────────────────────────────────────────────────────────
// HTML WITHOUT LETTER HEAD
// ─────────────────────────────────────────────────────────────────────────────
const S1 = {
  page: {
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: '9.5px',
    color: "#111",
    lineHeight: "1.3",
    position: 'relative',
    paddingLeft: "0px",
    paddingRight: "0px",
    paddingTop: "10px",
    paddingBottom: "10px",
  },
  topRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px"
  },
  tcBlock: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  tcStamp: {
    width: "145px",
    height: "125px",
    objectFit: "contain"
  },
  pageRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "4px",
    fontSize: '9.5px'
  },
  title: {
    textAlign: "center",
    fontSize: '16px',
    fontWeight: "bold",
    textDecoration: "underline",
    marginBottom: "7px"
  },
  ulrRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "8px",
    fontSize: '11.5px'
  },
  isoSide: {
    position: "absolute",
    right: "-30px", bottom: "110px",
    fontSize: '9.5px', color: "#555",
    transform: "rotate(90deg)",
    width: "165px",
    transformOrigin: "bottom right",
  },
  draft: {
    position: "absolute",
    top: "32%", left: "8%",
    fontSize: "130px",
    fontWeight: "bold",
    color: "#cccccc",
    opacity: 0.28,
    transform: "rotate(-45deg)",
    zIndex: -1,
  },
  // Signature overrides — same look as letter head version
  sigRow: { display: 'flex', flexWrap: 'wrap', marginTop: '25px', marginBottom: '8px', justifyContent: 'space-between' },
  sigRowSingle: { display: 'flex', flexWrap: 'wrap', marginTop: '25px', marginBottom: '8px', justifyContent: 'flex-start' },
  sigBox: { minWidth: '150px', fontSize: '9.5px', flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  sigBoxSingle: { minWidth: '150px', fontSize: '9.5px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  sigImg: { width: '135px', height: '46px', objectFit: 'contain', marginBottom: '2px' },
  sigDig: { width: '155px', height: '62px', objectFit: 'contain' },
  sigElec: { fontSize: '9px', color: '#444', marginTop: '1px', textAlign: 'center' },
  sigTit: { fontSize: '10px', color: '#111', fontWeight: 'bold', marginBottom: '5px' },
  sigName: { fontWeight: 'bold', fontSize: '9.5px' },
  sigAuth: { fontSize: '9px', color: '#666' },
};

const SS = {
  bold: { fontWeight: "bold" },
  infoWrap: { border: `1px solid #999`, marginBottom: '8px' },
  secTitle: { fontWeight: 'bold', fontSize: '11px', marginBottom: '4px', marginTop: '5px' },
  endOfReport: { textAlign: 'center', fontWeight: 'bold', margin: '8px 0 0 0', fontSize: '9.5px' },
};

// Local signatories renderer — uses larger NABL-style logo sizing & 8.5px text
function HtmlSignatoriesWOLH({ signatories, isLastPage }) {
  if (!signatories.length) return null;
  const isSingle = signatories.length === 1;

  const baseRow = isSingle ? S1.sigRowSingle : S1.sigRow;
  const rowStyle = isLastPage ? { ...baseRow, marginTop: '0px' } : baseRow;

  return (
    <div style={rowStyle}>
      {signatories.map((s, i) => (
        <div key={i} style={isSingle ? S1.sigBoxSingle : S1.sigBox}>
          {s.displayTitle ? <div style={S1.sigTit}>{s.displayTitle}</div> : null}
          {s.is_signed ? (
            <>
              {s.sign_image_url ? <img src={getPdfImageUrl(s.sign_image_url)} alt="" style={S1.sigImg} /> : null}
              {s.digital_signature_url ? <img src={getPdfImageUrl(s.digital_signature_url)} alt="" style={S1.sigDig} /> : null}
            </>
          ) : (
            <>
              <div style={S1.sigName}>{s.display_name ?? s.name ?? ''}</div>
              <div style={S1.sigAuth}>{s.authorizefor ?? ''}</div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
HtmlSignatoriesWOLH.propTypes = { signatories: PropTypes.array.isRequired, isLastPage: PropTypes.bool };

// ─── Page-fit model for the "Without Letter Head" report (measured 12-Nov-2026) ───
// The signature block is fixed 15mm above the pre-printed letterhead footer and must never be overlapped.
// One "unit" = one compact single-line result row (~18px). Page 1 holds PAGE_1_UNITS units under the header/customer block,
// later pages hold PAGE_N_UNITS. Rows whose text wraps (long parameter / method names, grading tables) count for more units,
// and a long customer/sample block on page 1 reduces its capacity. The last page also reserves room for Remarks + **End of Report**.
// 2026-11-17 (lab request): signatures 2cm lower, QR up 2mm, TEST REPORT up 1mm, Page-of line up 3mm => ~24mm (~5 units) reclaimed: 14 -> 18 (page N 26 -> 29, keeps ~1 unit spare)
const PAGE_1_UNITS = 18;
const PAGE_N_UNITS = 29;
const LAST_PAGE_RESERVE_UNITS = 2;
const WOLH_COMPACT_CSS = `
.wolh-compact thead th, .wolh-compact thead + tbody td { padding-top: 1.5px !important; padding-bottom: 1.5px !important; line-height: 1.2 !important; }
.wolh-compact div[style*="padding:4px"], .wolh-compact div[style*="padding:5px"] { padding-top: 1.5px !important; padding-bottom: 1.5px !important; line-height: 1.2 !important; }
@media print {
  .wolh-page-last { min-height: auto !important; padding-bottom: 0mm !important; }
}
`;

function rowUnits(r) {
  if (r && r.grading_table) return 4;
  const p = String(r?.parameter_name ?? '').length;
  const m = String(r?.method?.name ?? r?.method ?? '').length;
  return Math.max(1, Math.ceil(p / 34), Math.ceil(m / 34));
}

function page1InfoExtraUnits(data) {
  const lines = (txt, perLine) => Math.max(1, Math.ceil(String(txt || '').length / perLine));
  const sampleLines = (lines(`Sample Identification: ${data.productDesc ?? ''}`, 135) - 1)
    + (data.customerRef && data.customerRef !== '-' ? lines(`Customer Reference :- ${data.customerRef}`, 135) - 1 : 0)
    + (lines(`Sample Particulars : ${data.productName ?? ''}${hasGrade(data.grade) ? ', Grade: ' + data.grade : ''}${data.brandValue ? ', ' + data.brandValue : ''}`, 135) - 1);
  const leftLines = 1 + lines(data.customerName, 48) + lines(data.customerAddress, 52) + (data.showContact && data.contactPerson ? 1 : 0);
  const leftExtra = Math.max(0, Math.ceil((leftLines * 14 + 12 - 150) / 18));
  // An extra info text line is ~13px high vs ~18px for a table row unit (~0.6 penalty)
  const sampleExtra = Math.ceil(sampleLines * 0.6);
  return sampleExtra + leftExtra;
}

function paginateRows(rows, data) {
  const extraInfo = page1InfoExtraUnits(data);
  const cap1 = Math.max(4, PAGE_1_UNITS - extraInfo);

  // Single-page rule (lab standard): reports with up to 18 units fit on page 1
  // because signature on the last page flows naturally 10mm after the table rather than being pinned to the bottom.
  const totalUnits = rows.reduce((sum, r) => sum + rowUnits(r), 0);
  const remarkLinesCount = (data.remarkLines && data.remarkLines.length) || 0;
  if (totalUnits <= PAGE_1_UNITS && (totalUnits + extraInfo + Math.ceil(remarkLinesCount / 2)) <= 21) {
    return [rows];
  }

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
  const reserve = LAST_PAGE_RESERVE_UNITS + remarkLinesCount;
  const carry = [];
  // 2026-11-16 (lab, BRN KTRC/2611000810): page 1 as the LAST page now gets the same +1 spare unit as later pages.
  const lastLimit = cap + 1;
  while (cur.length > 1 && used + reserve > lastLimit) {
    const moved = cur.pop();
    used -= rowUnits(moved);
    carry.unshift(moved);
  }
  pages.push(cur);
  if (carry.length) pages.push(carry);
  return pages;
}

function HtmlDocWithoutLH({ report }) {
  const data = extractData(report);

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
            className={`wolh-page ${isLastPage ? 'wolh-page-last' : ''}`}
            style={{
              boxSizing: 'border-box',
              minHeight: isLastPage ? 'auto' : '270mm',
              position: 'relative',
              pageBreakAfter: isLastPage ? 'auto' : 'always',
              pageBreakInside: 'avoid',
              paddingBottom: isLastPage ? '0mm' : '25mm',
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '6px', marginTop: '-3mm', fontSize: '9.5px', paddingTop: data.isNabl ? '0px' : '25px' }}>
              <div style={{ paddingBottom: '4px', position: 'relative', top: '-4mm' }}>
                {data.isNabl && (
                  <img src={`${window.location.origin}/images/nabl_qr.png`} alt="NABL QR" style={{ width: "60px", height: "60px", objectFit: "contain" }} />
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

                <div style={{ ...S1.title, marginTop: '-1mm' }}>TEST REPORT</div>

                <div style={S1.ulrRow}>
                  <div><span style={SS.bold}>ULR:</span>{data.nablStatus === 1 && data.ulr ? data.ulr : ""}</div>
                  <div style={SS.bold}>{data.ktrcRef || 'KTRC/QF/0708/01'}</div>
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
                  <div style={SS.bold}>{data.ktrcRef || 'KTRC/QF/0708/01'}</div>
                </div>

                <div style={SS.secTitle}>TEST RESULTS (Contd.)</div>
                <HtmlResultsTable data={{ ...data, test_results: chunk }} />
              </>
            )}

            {isLastPage && (
              <>
                <HtmlRemarks remarkLines={data.remarkLines} />
                <div style={{ ...SS.endOfReport, marginBottom: '0px' }}>**End of Report**</div>
              </>
            )}

            {/* Signature Block - 2026-11-17: on last page, signature flows ~1cm (8mm) after table/text to prevent blank space misuse; intermediate pages anchor to bottom */}
            <div style={isLastPage ? {
              position: 'relative',
              marginTop: '8mm',
              left: 0,
              right: 0,
              pageBreakInside: 'avoid'
            } : {
              position: 'absolute',
              bottom: '-5mm', // 2026-11-17: was 15mm (lab asked 2cm lower)
              left: 0,
              right: 0
            }}>
              <HtmlSignatoriesWOLH signatories={data.signatories} isLastPage={isLastPage} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
HtmlDocWithoutLH.propTypes = { report: PropTypes.object.isRequired };

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTED BUTTON
// ─────────────────────────────────────────────────────────────────────────────
export function printReportWOLH(report, title) {
  const data = extractData(report);
  const safeTitle = data.ulr || data.ktrcRef || title || 'Test_Report';
  const bodyHtml = renderToStaticMarkup(<HtmlDocWithoutLH report={report} />);

  const full = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    @page { size: A4; margin: 8mm 6mm; }
    body  { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; font-size: 8px; color: #111; background: #fff; }
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

  win.document.open();
  win.document.write(full);
  win.document.close();

  win.onload = () => {
    win.focus();
  };

}

export function PrintExportTestingReportWOLHButton({ report, className }) {
  const btnClass = className ?? "rounded bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:bg-orange-600 inline-block text-center cursor-pointer";
  const [blobUrl, setBlobUrl] = useState('#');

  useEffect(() => {
    if (!report) return;
    try {
      const data = extractData(report);
      const safeTitle = data.ulr || data.ktrcRef || 'Test_Report';
      const bodyHtml = renderToStaticMarkup(<HtmlDocWithoutLH report={report} />);
      const full = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    @page { size: A4; margin: 8mm 6mm; }
    body  { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; font-size: 8px; color: #111; background: #fff; }
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
        printReportWOLH(report, 'Test Report');
      }
    }} className={btnClass}>
      Print Report Without Letter Head
    </a>
  );
}
PrintExportTestingReportWOLHButton.propTypes = { report: PropTypes.object.isRequired, className: PropTypes.string };