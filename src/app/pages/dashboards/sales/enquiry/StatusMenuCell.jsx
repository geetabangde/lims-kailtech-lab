import { useState, useRef } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { StatusCell, ContactPersonCell } from "./rows";
import { RowActions } from "./RowActions";
import { enquiryTone } from "./enquiryOptions";

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
        <StatusCell getValue={getValue} row={row} />
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
