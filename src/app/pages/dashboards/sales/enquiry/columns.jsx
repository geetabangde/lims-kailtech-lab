// Import Dependencies
import { createColumnHelper } from "@tanstack/react-table";
import clsx from "clsx";
import { RowActions } from "./RowActions";
import { TECH_BADGE } from "./enquiryOptions";
import { DateCell, HighlightingCell, StatusCell, ContactPersonCell } from "./rows";

const columnHelper = createColumnHelper();

export const columns = [
  columnHelper.accessor("id", {
    id: "id",
    header: "Enquiry No.",
    cell: ({ row, table, ...info }) => {
      const isResponsive = table.options.meta?.isResponsive;
      return (
        <div className="flex items-center gap-2 min-w-[100px]">
          {isResponsive && (
            <button
              onClick={row.getToggleExpandedHandler()}
              className={clsx(
                "flex h-5 w-5 items-center justify-center rounded border transition-colors",
                row.getIsExpanded()
                  ? "border-red-500 bg-red-50 text-red-600 dark:bg-red-900/20"
                  : "border-green-500 bg-green-50 text-green-600 dark:bg-green-900/20"
              )}
            >
              {row.getIsExpanded() ? (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                </svg>
              ) : (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                </svg>
              )}
            </button>
          )}
          <HighlightingCell row={row} table={table} {...info} />
        </div>
      );
    },
  }),
  columnHelper.accessor("added_on", {
    id: "added_on",
    header: "Date",
    cell: (info) => <div className="min-w-[100px]"><DateCell {...info} /></div>,
  }),
  columnHelper.accessor("status", {
    id: "status",
    header: "Status",
    cell: (info) => <div className="min-w-[100px]"><StatusCell {...info} /></div>,
  }),
  columnHelper.accessor("ctypename", {
    id: "ctypename",
    header: "Customer Type",
    cell: (info) => <div className="min-w-[140px] whitespace-normal"><HighlightingCell {...info} /></div>,
  }),
  columnHelper.accessor("name", {
    id: "name_address",
    header: "Name And Address",
    cell: (info) => {
      const address = info.row.original.address;
      return (
        <div className="flex flex-col min-w-[200px] whitespace-normal">
          <HighlightingCell {...info} />
          {address && (
            <p className="text-gray-400 mt-1 italic font-normal line-clamp-3">
              {address}
            </p>
          )}
        </div>
      );
    },
  }),
  columnHelper.accessor("assigntoname", {
    id: "assigntoname",
    header: "Assigned BD / Staff",
    cell: (info) => (
      <div className="min-w-[140px] whitespace-normal">
        {info.getValue() ? (
          <span className="inline-block rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
            {info.getValue()}
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </div>
    ),
  }),
  columnHelper.display({
    id: "concernperson_all",
    header: () => <div className="min-w-[180px] whitespace-normal">Name of the <br />contact <br />person/User</div>,
    cell: (info) => <div className="min-w-[180px] whitespace-normal"><ContactPersonCell {...info} /></div>,
  }),
  columnHelper.accessor("vertical_name", {
    id: "vertical_name",
    header: "Vertical",
    cell: (info) => <div className="min-w-[120px] whitespace-normal"><HighlightingCell {...info} /></div>,
  }),
  columnHelper.accessor("lead_source", {
    id: "lead_source",
    header: "Lead Source",
    cell: (info) => <div className="min-w-[140px] whitespace-normal"><HighlightingCell {...info} /></div>,
  }),
  columnHelper.accessor("area", {
    id: "area",
    header: "City / Area",
    cell: (info) => <div className="min-w-[100px]"><HighlightingCell {...info} /></div>,
  }),
  columnHelper.accessor("tech_verification_status", {
    id: "tech_verification_status",
    header: "Technical Verification",
    cell: (info) => {
      const v = info.getValue();
      if (!v || v === "Not Required") return <span className="text-gray-400">-</span>;
      return (
        <span className={`inline-block min-w-[120px] rounded-full px-2.5 py-0.5 text-center text-[10px] font-bold uppercase tracking-wide ${TECH_BADGE[v] || ""}`}>
          {v}
        </span>
      );
    },
  }),
  columnHelper.accessor("payment_status", {
    id: "payment_status",
    header: "Payment",
    cell: (info) => <div className="min-w-[90px]"><HighlightingCell {...info} /></div>,
  }),
  columnHelper.accessor("sample_arrived", {
    id: "sample_arrived",
    header: "Sample Arrived",
    cell: (info) => <div className="min-w-[70px] text-center"><HighlightingCell {...info} /></div>,
  }),
  columnHelper.accessor("approxqty", {
    id: "approxqty",
    header: "Approx qty",
    cell: (info) => <div className="min-w-[80px] text-center"><HighlightingCell {...info} /></div>,
  }),
  columnHelper.accessor("approxvalue", {
    id: "approxvalue",
    header: "Approx Enquiry value",
    cell: (info) => <div className="min-w-[100px] text-center"><HighlightingCell {...info} /></div>,
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
    header: () => <div className="min-w-[180px] whitespace-normal">Expected date of finalization/closure</div>,
    cell: (info) => <div className="min-w-[120px]"><DateCell {...info} /></div>,
  }),
  columnHelper.accessor("action", {
    id: "action_taken",
    header: () => <div className="min-w-[180px] whitespace-normal">Details of the action taken</div>,
    cell: (info) => <div className="min-w-[200px] whitespace-normal"><HighlightingCell {...info} /></div>,
  }),
  columnHelper.accessor("nextconactdate", {
    id: "nextconactdate",
    header: "Next Calling Time",
    cell: (info) => <div className="min-w-[120px]"><DateCell {...info} /></div>,
  }),
  columnHelper.accessor("enquirybyname", {
    id: "enquirybyname",
    header: "Enquiry Recieved By",
    cell: (info) => <div className="min-w-[140px] whitespace-normal"><HighlightingCell {...info} /></div>,
  }),
  columnHelper.display({
    id: "actions",
    header: "Action",
    cell: (info) => <div className="min-w-[100px] text-center"><RowActions {...info} /></div>,
  }),
];
