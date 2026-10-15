// columns.js — Unbilled Item Calibration
// PHP columns: Sr no, BRN, LRN, Inward No, Name, Id no, Serial no,
//              Calibration Method, Customer, Status

import { createColumnHelper } from "@tanstack/react-table";

const columnHelper = createColumnHelper();

export const columns = [
  // Sr. No
  columnHelper.display({
    id: "s_no",
    header: "Sr No",
    cell: (info) => info.row.index + 1,
  }),

  // BRN — API: brn
  columnHelper.accessor("brn", {
    id: "brn",
    header: "BRN",
    cell: (info) => (
      <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">
        {info.getValue() || "—"}
      </span>
    ),
  }),

  // LRN — API: lrn
  columnHelper.accessor("lrn", {
    id: "lrn",
    header: "LRN",
    cell: (info) => (
      <span className="font-mono text-xs font-semibold text-indigo-700 dark:text-indigo-400">
        {info.getValue() || "—"}
      </span>
    ),
  }),

  // Inward No — API: inward_no
  columnHelper.accessor("inward_no", {
    id: "inward_no",
    header: "Inward No",
    cell: (info) => (
      <span className="dark:text-dark-300 font-mono text-xs text-gray-600">
        {info.getValue() || "—"}
      </span>
    ),
  }),

  // Name — API: name
  columnHelper.accessor("name", {
    id: "name",
    header: "Name",
    cell: (info) => info.getValue() || "—",
  }),

  // Id No — API: id_no
  columnHelper.accessor("id_no", {
    id: "id_no",
    header: "Id No",
    cell: (info) => info.getValue() || "—",
  }),

  // Serial No — API: serial_no
  columnHelper.accessor("serial_no", {
    id: "serial_no",
    header: "Serial No",
    cell: (info) => info.getValue() || "—",
  }),

  // Calibration Method — API: calibration_method
  columnHelper.accessor("calibration_method", {
    id: "calibration_method",
    header: "Calibration Method",
    cell: (info) => (
      <span className="dark:text-dark-200 block max-w-xs text-sm leading-snug text-gray-700">
        {info.getValue() || "—"}
      </span>
    ),
  }),

  // Customer — API: customer
  columnHelper.accessor("customer", {
    id: "customer",
    header: "Customer",
    cell: (info) => info.getValue() || "—",
  }),

  // Status — API: status ("Pending" | "Billed")
  columnHelper.accessor("status", {
    id: "status",
    header: "Status",
    cell: (info) => {
      const val = info.getValue();
      const isPending = String(val || "").toLowerCase() !== "billed";
      return isPending ? (
        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
          Pending
        </span>
      ) : (
        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
          Billed
        </span>
      );
    },
  }),
];
