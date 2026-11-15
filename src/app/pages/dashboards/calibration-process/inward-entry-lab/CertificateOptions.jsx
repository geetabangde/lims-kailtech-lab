// "+" menu on the Perform column: Download as MS Word / Edit before print, each without or with letterhead (approvers only).
// Both options work in the browser on the certificate HTML the app already loads (same endpoint as "View Certificate").
// NOTHING is saved or uploaded: no file on the server, never part of the e-mail dispatch. Only who/when is logged (no content).
import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import axios from "utils/axios";
import { toast } from "sonner";

// super admin, Shaheen Mave, Dharmendra Sharma, Hemant Ojha, Er. Sohail Khan, Pooja Agrawal (kept in step with CertificateController::canUseCertOptions)
const NAMED_APPROVER_IDS = ["1", "32", "34", "110", "135", "136"];
const APPROVER_PERMISSIONS = [105, 115, 278];

export function canUseCertificateOptions() {
  if (typeof window === "undefined") return false;
  const uid = String(localStorage.getItem("userId") || "");
  const perms = (localStorage.getItem("userPermissions") || "").split(",").map(Number);
  return NAMED_APPROVER_IDS.includes(uid) || APPROVER_PERMISSIONS.some((p) => perms.includes(p));
}

const imgSize = (src) => new Promise((resolve) => {
  const i = new Image();
  i.onload = () => resolve({ w: i.naturalWidth || 820, h: i.naturalHeight || 90 });
  i.onerror = () => resolve({ w: 820, h: 90 });
  i.src = src;
});

const wrap76 = (s) => s.replace(/(.{76})/g, "$1\r\n");

// Word does not read data: images from HTML. Build a single-file web page (MHTML) where every image is its own MIME part.
function buildMht(html) {
  const parts = [];
  let n = 0;
  const body = html.replace(/(src=["'])(data:(image\/[a-zA-Z+.-]+);base64,([^"']+))(["'])/g, (m, p1, uri, mime, b64, q) => {
    n += 1;
    const ext = mime.split("/")[1].replace("jpeg", "jpg").replace("svg+xml", "svg");
    const loc = `file:///C:/certificate/image${String(n).padStart(3, "0")}.${ext}`;
    parts.push({ loc, mime, b64: b64.replace(/\s+/g, "") });
    return `${p1}${loc}${q}`;
  });
  const bnd = `----=_NextPart_cert_${Date.now()}`;
  const htmlB64 = btoa(unescape(encodeURIComponent(body)));
  let out = `MIME-Version: 1.0\r\nContent-Type: multipart/related; boundary="${bnd}"; type="text/html"\r\n\r\n`;
  out += `--${bnd}\r\nContent-Type: text/html; charset="utf-8"\r\nContent-Transfer-Encoding: base64\r\nContent-Location: file:///C:/certificate/certificate.htm\r\n\r\n${wrap76(htmlB64)}\r\n\r\n`;
  parts.forEach((p) => {
    out += `--${bnd}\r\nContent-Type: ${p.mime}\r\nContent-Transfer-Encoding: base64\r\nContent-Location: ${p.loc}\r\n\r\n${wrap76(p.b64)}\r\n\r\n`;
  });
  return `${out}--${bnd}--\r\n`;
}

const OPTIONS = [
  { key: "word", title: "Download as MS Word", lh: false, kind: "word" },
  { key: "word_lh", title: "Download as MS Word (with letterhead)", lh: true, kind: "word" },
  { key: "edit_print", title: "Edit before print", lh: false, kind: "edit" },
  { key: "edit_print_lh", title: "Edit before print (with letterhead)", lh: true, kind: "edit" },
];

export default function CertificateOptions({ inwardId, itemId, caliblocation, calibacc }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const getHtml = async () => {
    const res = await axios.get(`/calibrationprocess/view-certificate?inwardid=${inwardId}&instid=${itemId}&caliblocation=${encodeURIComponent(caliblocation)}&calibacc=${encodeURIComponent(calibacc)}`);
    return String(res.data || "");
  };
  const getLetterhead = async () => (await axios.get("/calibrationprocess/certificate-letterhead-assets")).data;
  // who / when only - the call must succeed before the option opens
  const record = (option) => axios.post("/calibrationprocess/certificate-option-log", { inwardid: inwardId, instid: itemId, option });

  const downloadWord = async (opt) => {
    setBusy(true);
    try {
      await record(opt.key);
      const html = await getHtml();
      const lh = opt.lh ? await getLetterhead() : null;
      const doc = new DOMParser().parseFromString(html, "text/html");
      // same look as the printed certificate: full-width page, small print size
      Array.from(doc.body.children).forEach((el) => {
        if (el.tagName === "DIV") { el.style.width = "100%"; el.style.fontSize = "8.5px"; el.style.lineHeight = "1.18"; el.style.padding = "0"; }
      });
      const css = Array.from(doc.querySelectorAll("style")).map((s) => s.outerHTML).join("\n");
      let hf = "";
      let margins = "28pt";
      if (lh) {
        const hs = await imgSize(lh.header);
        const fs = await imgSize(lh.footer);
        const hw = 595; const hh = Math.round((hw * hs.h) / hs.w);
        const fw = 540; const fh = Math.round((fw * fs.h) / fs.w);
        hf = `<div style="mso-element:header" id="h1"><p class="MsoHeader" style="margin:0"><img src="${lh.header}" width="${hw}" height="${hh}"></p></div>
<div style="mso-element:footer" id="f1"><p class="MsoFooter" style="margin:0;text-align:center"><img src="${lh.footer}" width="${fw}" height="${fh}"></p></div>`;
        margins = `${Math.max(hh + 20, 70)}pt 28pt ${Math.max(fh + 20, 60)}pt 28pt`;
      }
      const style = `<style>
@page Section1 { size: 595.3pt 841.9pt; margin: ${margins}; mso-header-margin: 8pt; mso-footer-margin: 8pt; mso-header: h1; mso-footer: f1; }
div.Section1 { page: Section1; }
body { font-family: Arial, sans-serif; }
* { font-size: 8.5px; line-height: 1.18; }
table { border-collapse: collapse; width: 100%; }
td, th { padding: 1px 3px; }
</style>`;
      const out = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Certificate</title><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->${css}${style}</head><body><div class="Section1">${doc.body.innerHTML}${hf}</div></body></html>`;
      const blob = new Blob([buildMht(out)], { type: "application/msword" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `Certificate_${inwardId}_${itemId}${lh ? "_letterhead" : ""}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      setOpen(false);
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not prepare the Word file.");
    } finally { setBusy(false); }
  };

  const editBeforePrint = async (opt) => {
    // open the tab first (inside the click) so the pop-up blocker does not stop it
    const w = window.open("", "_blank", "width=1000,height=800");
    if (!w) { toast.error("Please allow pop-ups for this site."); return; }
    w.document.write("<p style='font-family:Arial;padding:20px'>Loading certificate...</p>");
    setBusy(true);
    try {
      await record(opt.key);
      const html = await getHtml();
      const lh = opt.lh ? await getLetterhead() : null;
      w.document.open();
      // Same page set-up as the normal Print of "View Certificate" (body margin 20px / 0 when printing); the certificate sits directly in the body
      // so its own print rules (body > div) apply exactly as in the original. Only the yellow bar (hidden when printing) is added.
      w.document.write(`<html><head><title>Certificate - edit before print</title><style>
        body { font-family: Arial, sans-serif; margin: 20px; padding: 0; padding-top: 48px; }
        .eb-bar { position: fixed; top: 0; left: 0; right: 0; z-index: 99; background: #fff7d6; border-bottom: 1px solid #e0c35a; padding: 8px 14px; font: 13px Arial, sans-serif; display: flex; gap: 10px; align-items: center; }
        .eb-bar button { padding: 6px 16px; border: 1px solid #888; border-radius: 6px; background: #fff; cursor: pointer; font-weight: 600; }
        .lh-head { position: absolute; top: calc(5mm + 48px); left: 0; width: 210mm; z-index: 1; pointer-events: none; }
        .lh-foot { position: absolute; left: 8mm; top: calc(283mm + 48px); width: 200mm; z-index: 1; pointer-events: none; }
        @media print { body { margin: 0 !important; padding-top: 0 !important; } .eb-bar { display: none !important; }
          .lh-head { position: fixed; top: 5mm; } .lh-foot { position: fixed; top: 283mm; } }
      </style></head><body>
        <div class="eb-bar" contenteditable="false"><b>EDIT MODE</b> - click on the certificate text to change it. Temporary copy: not saved, not sent. Closing this tab discards the changes.
          <button onclick="window.print()">Print</button><button onclick="window.close()">Close</button></div>
        ${html}
        ${lh ? `<img class="lh-head" src="${lh.header}"><img class="lh-foot" src="${lh.footer}">` : ""}
        <script>
          document.body.setAttribute('contenteditable', 'true');
          document.querySelectorAll('img').forEach(function (i) { i.setAttribute('contenteditable', 'false'); });
        </script>
      </body></html>`);
      w.document.close();
      setOpen(false);
    } catch (e) {
      w.close();
      toast.error(e.response?.data?.message || "Could not open the edit view.");
    } finally { setBusy(false); }
  };

  const run = (opt) => (opt.kind === "word" ? downloadWord(opt) : editBeforePrint(opt));

  return (
    <div ref={box} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title="More: Download as MS Word / Edit before print"
        className="btn-base btn h-7 w-7 rounded border border-slate-300 bg-slate-100 text-sm font-bold text-slate-700 hover:bg-slate-200 inline-flex items-center justify-center"
      >
        +
      </button>
      {open ? (
        <div className="absolute right-0 bottom-9 z-30 w-64 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl dark:bg-dark-800 dark:border-dark-600 dark:text-dark-100">
          {OPTIONS.map((o) => (
            <button key={o.key} type="button" disabled={busy} onClick={() => run(o)} className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-dark-700 disabled:opacity-50">
              <span className="block text-xs font-semibold">{o.title}</span>
              <span className="block text-[10px] text-amber-700">Under testing - not final</span>
            </button>
          ))}
          <div className="px-3 pt-1 pb-1 text-[10px] text-gray-500 border-t mt-1">Nothing is saved or e-mailed. Only who opened it and when is recorded.</div>
        </div>
      ) : null}
    </div>
  );
}

CertificateOptions.propTypes = {
  inwardId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  caliblocation: PropTypes.string,
  calibacc: PropTypes.string,
};
