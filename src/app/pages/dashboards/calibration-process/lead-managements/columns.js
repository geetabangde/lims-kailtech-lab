// Import Dependencies
import { createColumnHelper } from "@tanstack/react-table";
import { createElement } from "react";

// Local Imports
import { RowActions } from "./RowActions";

const columnHelper = createColumnHelper();

export const columns = [
  // ✅ Serial number column
  columnHelper.accessor((_row, index) => index + 1, {
    id: "serialNumber",
    header: "S.No.",
    cell: (info) => info.row.index + 1,
  }),

  // ✅ Customer Name (mapped from API's "customername")
  columnHelper.accessor("customerName", {
    id: "customerName",
    header: "Customer Name",
    cell: (info) => info.getValue() || "-",
  }),

  // Concern BD (BD person of the customer's due inward entries)
  columnHelper.accessor("bdName", {
    id: "bdName",
    header: "Concern BD",
    cell: (info) => info.getValue() || "-",
  }),

  // Ref Entry No. (inward numbers of the due items)
  columnHelper.accessor("refEntryNo", {
    id: "refEntryNo",
    header: "Ref Entry No.",
    cell: (info) => {
      const value = info.getValue();
      if (!value) return "-";
      // Show at most 6 entry numbers per line and wrap the rest onto new lines
      const nos = String(value).split(",").map((n) => n.trim()).filter(Boolean);
      const lines = [];
      for (let i = 0; i < nos.length; i += 6) {
        lines.push(nos.slice(i, i + 6).join(", "));
      }
      return createElement(
        "div",
        { className: "min-w-[17rem]" },
        lines.map((line, idx) =>
          createElement("div", { key: idx }, idx < lines.length - 1 ? `${line},` : line),
        ),
      );
    },
  }),

  // No. of Equipment due
  columnHelper.accessor("equipmentCount", {
    id: "equipmentCount",
    header: "No. of Equipment",
    cell: (info) => info.getValue() ?? "-",
  }),

  // Invoice Amount (distinct invoices of the due items, incl. GST)
  columnHelper.accessor("invoiceAmount", {
    id: "invoiceAmount",
    header: "Invoice Amount",
    cell: (info) => {
      const v = Number(info.getValue());
      return Number.isFinite(v) && v > 0
        ? v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : "-";
    },
  }),

  // ✅ Due Date (mapped from API's "duedate")
  columnHelper.accessor("dueDate", {
    id: "dueDate",
    header: "Due Date",
    cell: (info) => {
      const value = info.getValue();
      if (!value) return "-";
      
      // Format date if needed (currently API returns YYYY-MM-DD)
      try {
        const date = new Date(value);
        return date.toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      } catch {
        return value;
      }
    },
  }),

  // ✅ Actions
  columnHelper.display({
    id: "actions",
    header: "Actions",
    cell: RowActions,
  }),
];