// "+" menu on the Perform column: Download as MS Word / Edit before print (approvers only).
// Both options work in the browser on the certificate HTML the app already loads (same endpoint as "View Certificate").
// NOTHING is saved or uploaded: no file on the server, never part of the e-mail dispatch. Only who/when is logged (no content).
import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import axios from "utils/axios";
import { toast } from "sonner";

// super admin, Shaheen Mave, Dharmendra Sharma, Hemant Ojha, Er. Sohail Khan, Pooja Agrawal (kept in step with CertificateController::logCertificateOption)
const NAMED_APPROVER_IDS = ["1", "32", "34", "110", "135", "136"];
const APPROVER_PERMISSIONS = [105, 115, 278];

export function canUseCertificateOptions() {
  if (typeof window === "undefined") return false;
  const uid = String(localStorage.getItem("userId") || "");
  const perms = (localStorage.getItem("userPermissions") || "").split(",").map(Number);
  return NAMED_APPROVER_IDS.includes(uid) || APPROVER_PERMISSIONS.some((p) => perms.includes(p));
}

const WORD_HEAD = `<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->
<style>
@page Section1 { size: 595.3pt 841.9pt; margin: 28pt; mso-header-margin: 14pt; mso-footer-margin: 14pt; mso-paper-source: 0; }
div.Section1 { page: Section1; }
body { font-family: Arial, sans-serif; }
table { border-collapse: collapse; }
</style>`;

async function inlineImages(doc) {
  const imgs = Array.from(doc.querySelectorAll("img"));
  await Promise.all(imgs.map(async (img) => {
    const src = img.getAttribute("src");
    if (!src || src.startsWith("data:")) return;
    try {
      const abs = new URL(src, window.location.origin).href;
      const blob = await (await fetch(abs)).blob();
      const data = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = reject;
        fr.readAsDataURL(blob);
      });
      img.setAttribute("src", String(data));
    } catch {
      /* leave the image link as it is */
    }
  }));
}

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

  // who / when only - the call must succeed before the option opens
  const record = async (option) => {
    await axios.post("/calibrationprocess/certificate-option-log", { inwardid: inwardId, instid: itemId, option });
  };

  const downloadWord = async () => {
    setBusy(true);
    try {
      await record("word");
      const html = await getHtml();
      const doc = new DOMParser().parseFromString(html, "text/html");
      await inlineImages(doc);
      const css = Array.from(doc.querySelectorAll("style")).map((s) => s.outerHTML).join("\n");
      const out = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Certificate</title>${WORD_HEAD}${css}</head><body><div class="Section1">${doc.body.innerHTML}</div></body></html>`;
      const blob = new Blob(["﻿", out], { type: "application/msword" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `Certificate_${inwardId}_${itemId}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      setOpen(false);
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not prepare the Word file.");
    } finally { setBusy(false); }
  };

  const editBeforePrint = async () => {
    // open the tab first (inside the click) so the pop-up blocker does not stop it
    const w = window.open("", "_blank", "width=1000,height=800");
    if (!w) { toast.error("Please allow pop-ups for this site."); return; }
    w.document.write("<p style='font-family:Arial;padding:20px'>Loading certificate...</p>");
    setBusy(true);
    try {
      await record("edit_print");
      const html = await getHtml();
      w.document.open();
      w.document.write(`<html><head><title>Certificate - edit before print</title><style>
        body { font-family: Arial, sans-serif; margin: 0; }
        .no-print { position: sticky; top: 0; z-index: 9; background: #fff7d6; border-bottom: 1px solid #e0c35a; padding: 8px 14px; font-size: 13px; display: flex; gap: 10px; align-items: center; }
        .no-print button { padding: 6px 16px; border: 1px solid #888; border-radius: 6px; background: #fff; cursor: pointer; font-weight: 600; }
        #cert { padding: 20px; outline: 1px dashed #94a3b8; outline-offset: -4px; }
        @media print { .no-print { display: none !important; } #cert { padding: 0; outline: none; } body { margin: 0; } }
      </style></head><body>
        <div class="no-print"><b>EDIT MODE</b> - click on the certificate text to change it. Temporary copy: not saved, not sent. Closing this tab discards the changes.
          <button onclick="window.print()">Print</button><button onclick="window.close()">Close</button></div>
        <div id="cert" contenteditable="true">${html}</div>
        <script>document.querySelectorAll('#cert img').forEach(function (i) { i.setAttribute('contenteditable', 'false'); });</script>
      </body></html>`);
      w.document.close();
      setOpen(false);
    } catch (e) {
      w.close();
      toast.error(e.response?.data?.message || "Could not open the edit view.");
    } finally { setBusy(false); }
  };

  const Item = ({ onClick, title }) => (
    <button type="button" disabled={busy} onClick={onClick} className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-dark-700 disabled:opacity-50">
      <span className="block text-xs font-semibold">{title}</span>
      <span className="block text-[10px] text-amber-700">Under testing - not final</span>
    </button>
  );
  Item.propTypes = { onClick: PropTypes.func.isRequired, title: PropTypes.string.isRequired };

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
        <div className="absolute right-0 bottom-9 z-30 w-56 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl dark:bg-dark-800 dark:border-dark-600 dark:text-dark-100">
          <Item onClick={downloadWord} title="Download as MS Word" />
          <Item onClick={editBeforePrint} title="Edit before print" />
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
