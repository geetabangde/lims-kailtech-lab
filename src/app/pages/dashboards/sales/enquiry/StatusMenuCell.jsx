import { useState, useRef } from "react";
import axios from "utils/axios";
import { Highlight } from "components/shared/Highlight";
import { ensureString } from "utils/ensureString";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { StatusCell, ContactPersonCell } from "./rows";
import { RowActions } from "./RowActions";
import { enquiryTone, effectiveStatus, sinceText, LAB_STATUS_STYLE } from "./enquiryOptions";

const plusBtn =
  "flex h-5 w-5 shrink-0 items-center justify-center rounded border border-green-500 bg-green-50 text-green-600 transition hover:bg-green-100 dark:bg-green-900/20";
const minusBtn =
  "flex h-5 w-5 shrink-0 items-center justify-center rounded border border-red-500 bg-red-50 text-red-600 transition hover:bg-red-100 dark:bg-red-900/20";

function PlusMinus({ open }) {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d={open ? "M20 12H4" : "M12 4v16m8-8H4"} />
    </svg>
  );
}
PlusMinus.propTypes = { open: PropTypes.bool };

// Status badge + "+" button that opens the action menu (replaces the old Action column)
export function StatusMenuCell({ row, table, getValue }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const btnRef = useRef(null);
  const tone = enquiryTone(row.original);

  const toggle = () => {
    if (!open && btnRef.current) setRect(btnRef.current.getBoundingClientRect());
    setOpen((v) => !v);
  };

  return (
    <div className="flex min-w-[150px] flex-col items-stretch">
      <div className="flex items-center gap-2">
      <div className="flex flex-col items-start gap-1">
        <LabStatusBadge row={row} getValue={getValue} />
        {tone === "overdue" && (
          <span className="rounded bg-[#7a2e24] px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">Closure overdue</span>
        )}
        {tone === "late" && (
          <span className="rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">Late - TAT crossed</span>
        )}
      </div>
      <button
        ref={btnRef}
        type="button"
        data-enquiry-menu-btn
        onClick={toggle}
        title={open ? "Hide actions" : "Show actions"}
        className={open ? minusBtn : plusBtn}
      >
        <PlusMinus open={open} />
      </button>
      </div>
      {/* "+" expands the row with the actions (like Contact Person); "-" collapses it back */}
      <RowActions row={row} table={table} open={open} onClose={() => {}} anchorRect={rect} inline />
    </div>
  );
}
StatusMenuCell.propTypes = { row: PropTypes.object, table: PropTypes.object, getValue: PropTypes.func };

// Address: collapsed, "+" to show
export function AddressCell({ row }) {
  const [open, setOpen] = useState(false);
  const address = row.original.address;
  if (!address) return <span className="text-gray-400">-</span>;
  return (
    <div className="flex min-w-[180px] items-start gap-2 whitespace-normal">
      <button type="button" onClick={() => setOpen((v) => !v)} className={open ? minusBtn : plusBtn} title="Show address">
        <PlusMinus open={open} />
      </button>
      {open && <p className="text-xs italic text-gray-500">{address}</p>}
    </div>
  );
}
AddressCell.propTypes = { row: PropTypes.object };

// Contact person: hidden until "+", then details and a shortcut to edit (add directly)
export function ContactToggleCell({ row, table }) {
  const [open, setOpen] = useState(false);
  const name = row.original.concernpersonname;
  return (
    <div className="flex min-w-[120px] items-start gap-2 whitespace-normal">
      <button type="button" onClick={() => setOpen((v) => !v)} className={open ? minusBtn : plusBtn} title="View contact person">
        <PlusMinus open={open} />
      </button>
      {open && (
        <div className="flex flex-col gap-1">
          {name ? <ContactPersonCell row={row} table={table} /> : <span className="text-xs text-gray-400">No contact person</span>}
          <Link
            to={`/dashboards/sales/enquiry/edit/${row.original.id}`}
            className="w-fit rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-blue-700"
          >
            {name ? "Edit contact" : "Add contact"}
          </Link>
        </div>
      )}
    </div>
  );
}
ContactToggleCell.propTypes = { row: PropTypes.object, table: PropTypes.object };

// Status badge: the lab status in force + since when (Pending since ..., Quotation Sent since ...)
function LabStatusBadge({ row, getValue }) {
  const e = row.original;
  if (!e.lab_status_effective) return <StatusCell getValue={getValue} row={row} />;
  const label = effectiveStatus(e);
  const cls = LAB_STATUS_STYLE[label] || LAB_STATUS_STYLE.Pending;
  const since = sinceText(e);
  return (
    <div className="flex flex-col items-start gap-0.5">
      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm ${cls}`}>{label}</span>
      {since && <span className="text-[10px] text-gray-500 dark:text-dark-300">{since}</span>}
    </div>
  );
}
LabStatusBadge.propTypes = { row: PropTypes.object, getValue: PropTypes.func };

const chipOpen = "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20";
const chipClosed = "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20";

function ToggleChip({ label, open, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={open ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold transition hover:opacity-80 ${open ? chipOpen : chipClosed}`}
    >
      <span className="text-xs leading-none">{open ? "-" : "+"}</span>
      {label}
    </button>
  );
}
ToggleChip.propTypes = { label: PropTypes.string, open: PropTypes.bool, onClick: PropTypes.func };

// Customer: name + small Address / Contact toggles (collapsed). Address shows every address of the customer (loaded when opened).
export function CustomerCell({ row, table }) {
  const e = row.original;
  const globalQuery = ensureString(table.getState().globalFilter);
  const [showAddr, setShowAddr] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [addrs, setAddrs] = useState(null);

  const toggleAddr = async () => {
    const next = !showAddr;
    setShowAddr(next);
    if (next && addrs === null) {
      const cid = Number(e.customerid);
      if (!cid) {
        setAddrs([]);
        return;
      }
      try {
        const res = await axios.get(`/people/get-customers-address/${cid}`);
        const list = res.data?.data || res.data?.Data || [];
        setAddrs(Array.isArray(list) ? list : []);
      } catch {
        setAddrs([]);
      }
    }
  };

  const lines = [];
  if (e.address && String(e.address).trim() && e.address !== "-") lines.push({ text: String(e.address).trim(), own: true });
  (addrs || []).forEach((a) => {
    const t = `${a.address || ""} ${a.city || ""} ${a.pincode || ""}`.replace(/\s+/g, " ").trim();
    if (t && !lines.some((l) => l.text.replace(/\s+/g, " ") === t)) lines.push({ text: t, own: false });
  });
  const hasContact = !!e.concernpersonname;

  return (
    <div className="min-w-[190px] whitespace-normal">
      <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
        <Highlight query={globalQuery}>{ensureString(e.name) || "-"}</Highlight>
      </p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        <ToggleChip label="Address" open={showAddr} onClick={toggleAddr} />
        <ToggleChip label="Contact" open={showContact} onClick={() => setShowContact((v) => !v)} />
      </div>
      {showAddr && (
        <div className="mt-1.5 space-y-1 text-xs text-gray-600 dark:text-dark-300">
          {addrs === null && <p className="text-gray-400">Loading...</p>}
          {addrs !== null && lines.length === 0 && <p className="text-gray-400">No address</p>}
          {lines.map((l, i) => (
            <p key={i} className="italic">
              {l.own && lines.length > 1 && <span className="mr-1 not-italic font-semibold text-gray-500">On enquiry:</span>}
              {l.text}
            </p>
          ))}
        </div>
      )}
      {showContact && (
        <div className="mt-1.5 flex flex-col gap-1">
          {hasContact ? <ContactPersonCell row={row} table={table} /> : <span className="text-xs text-gray-400">No contact person</span>}
          <Link
            to={`/dashboards/sales/enquiry/edit/${e.id}`}
            className="w-fit rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-blue-700"
          >
            {hasContact ? "Edit contact" : "Add contact"}
          </Link>
        </div>
      )}
    </div>
  );
}
CustomerCell.propTypes = { row: PropTypes.object, table: PropTypes.object };

// Last column: "+" opens the Details row under the enquiry, "-" closes it
export function DetailsCell({ row }) {
  const open = row.getIsExpanded();
  return (
    <button type="button" onClick={row.getToggleExpandedHandler()} title={open ? "Hide details" : "Show details"} className={open ? minusBtn : plusBtn}>
      <PlusMinus open={open} />
    </button>
  );
}
DetailsCell.propTypes = { row: PropTypes.object };
