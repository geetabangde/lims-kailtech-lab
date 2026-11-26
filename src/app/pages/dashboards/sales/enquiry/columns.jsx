// Import Dependencies
import { createColumnHelper } from "@tanstack/react-table";
import { StatusMenuCell, CustomerCell, DetailsCell } from "./StatusMenuCell";
import { valueText } from "./enquiryOptions";
import { DateCell, HighlightingCell } from "./rows";

const columnHelper = createColumnHelper();

// Search-only columns: not shown in the list (their data is in the customer cell / Details), but the quick search still finds them.
const searchOnly = (key, id) =>
  columnHelper.accessor(key, { id, header: id, enableHiding: false, enableSorting: false, cell: () => null });

// Slimmed 2026-11-26 (lab request). Order: Sr No, Date, BD (management only - see index.jsx), Customer (+ Address / Contact toggles),
// Status (+ actions), Vertical, City, Customer type, Enquiry value, Description, Follow-up date, Details "+".
export const columns = [
  columnHelper.accessor("id", { id: "id", header: "Enquiry No.", enableSorting: false, enableHiding: false, cell: () => null }),
  columnHelper.display({
    id: "sno",
    header: "Sr. No.",
    cell: ({ row, table }) => {
      const idx = table.getPrePaginationRowModel().rows.findIndex((r) => r.id === row.id);
      return (
        <div className="flex min-w-[50px] items-center gap-2 text-sm font-semibold text-gray-700 dark:text-dark-100" title={`Enquiry No. ${row.original.id}`}>
          {idx + 1}
        </div>
      );
    },
  }),
  columnHelper.accessor("added_on", {
    id: "added_on",
    header: "Date",
    cell: (info) => <div className="min-w-[100px]"><DateCell {...info} /></div>,
  }),
  columnHelper.accessor("addedbyname", {
    id: "addedbyname",
    header: "BD",
    cell: (info) => (
      <div className="min-w-[110px] whitespace-normal">
        {info.getValue() ? <HighlightingCell {...info} /> : <span className="text-gray-400">-</span>}
      </div>
    ),
  }),
  columnHelper.accessor("name", {
    id: "name",
    header: "Customer",
    cell: (info) => <CustomerCell {...info} />,
  }),
  columnHelper.accessor("status", {
    id: "status",
    header: "Status",
    cell: (info) => <StatusMenuCell {...info} />,
  }),
  columnHelper.accessor("vertical_name", {
    id: "vertical_name",
    header: "Vertical",
    cell: (info) => <div className="min-w-[110px] whitespace-normal"><HighlightingCell {...info} /></div>,
  }),
  // City only in the list (the form has City and Area separately); older enquiries fall back to the Area they carry
  columnHelper.accessor((r) => r.city || r.area || "", {
    id: "city",
    header: "City",
    cell: (info) => <div className="min-w-[90px]"><HighlightingCell {...info} /></div>,
  }),
  columnHelper.accessor("ctypename", {
    id: "ctypename",
    header: "Customer Type",
    cell: (info) => <div className="min-w-[130px] whitespace-normal"><HighlightingCell {...info} /></div>,
  }),
  columnHelper.accessor("approxvalue", {
    id: "approxvalue",
    header: "Enquiry Value",
    cell: (info) => <div className="min-w-[90px] text-sm font-medium text-gray-800 dark:text-dark-100">{valueText(info.row.original)}</div>,
  }),
  columnHelper.accessor("description", {
    id: "description",
    header: "Description",
    cell: (info) => (
      <div className="min-w-[250px] whitespace-normal leading-relaxed text-gray-600 dark:text-dark-300">
        {info.getValue() || "-"}
      </div>
    ),
  }),
  columnHelper.accessor("expecteddateforfinalization", {
    id: "expecteddateforfinalization",
    header: () => <div className="min-w-[160px] whitespace-normal">Follow-up: expected date of closing order</div>,
    cell: (info) => <div className="min-w-[120px]"><DateCell {...info} /></div>,
  }),
  columnHelper.display({
    id: "details",
    header: "Details",
    enableSorting: false,
    enableHiding: false,
    cell: (info) => <DetailsCell {...info} />,
  }),
  // quick-search only
  searchOnly("concernpersonname", "concernpersonname"),
  searchOnly("concernpersonmobile", "concernpersonmobile"),
  searchOnly("concernpersonemail", "concernpersonemail"),
  searchOnly("address", "address"),
  searchOnly("lead_source", "lead_source"),
  searchOnly("assigntoname", "assigntoname"),
  searchOnly("action", "action_taken"),
  searchOnly("area", "area"),
];
