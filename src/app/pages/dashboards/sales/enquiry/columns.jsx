// Import Dependencies
import { createColumnHelper } from "@tanstack/react-table";
import { StatusMenuCell, AddressCell, ContactToggleCell } from "./StatusMenuCell";
import { TECH_BADGE } from "./enquiryOptions";
import { DateCell, HighlightingCell } from "./rows";

const columnHelper = createColumnHelper();

const userId = () => Number(localStorage.getItem("userId") || 0);

// Redesigned 2026-11-25. Order: Sr No, Date, BD person, Customer, Status (+actions), Address (+),
// Assigned BD, Contact person (+), Vertical, Lead source, Area, then the remaining detail columns.
export const columns = [
  // Hidden by default (see index.jsx) - kept only so the quick search still finds an enquiry number
  columnHelper.accessor("id", { id: "id", header: "Enquiry No.", enableSorting: false, cell: () => null }),
  columnHelper.display({
    id: "sno",
    header: "Sr. No.",
    cell: ({ row, table }) => {
      const idx = table.getPrePaginationRowModel().rows.findIndex((r) => r.id === row.id);
      const isResponsive = table.options.meta?.isResponsive;
      return (
        <div className="flex min-w-[50px] items-center gap-2 text-sm font-semibold text-gray-700 dark:text-dark-100" title={`Enquiry No. ${row.original.id}`}>
          {isResponsive && (
            <button
              type="button"
              onClick={row.getToggleExpandedHandler()}
              className="flex h-5 w-5 items-center justify-center rounded border border-green-500 bg-green-50 text-xs text-green-600"
            >
              {row.getIsExpanded() ? "-" : "+"}
            </button>
          )}
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
    header: "BD Person",
    cell: (info) => {
      // Viewing your own enquiry: no name needed
      const own = Number(info.row.original.added_by) === userId();
      return (
        <div className="min-w-[110px] whitespace-normal">
          {own || !info.getValue() ? <span className="text-gray-400">-</span> : <HighlightingCell {...info} />}
        </div>
      );
    },
  }),
  columnHelper.accessor("name", {
    id: "name",
    header: "Customer Name",
    cell: (info) => <div className="min-w-[180px] whitespace-normal"><HighlightingCell {...info} /></div>,
  }),
  columnHelper.accessor("status", {
    id: "status",
    header: "Status",
    cell: (info) => <StatusMenuCell {...info} />,
  }),
  columnHelper.accessor("assigntoname", {
    id: "assigntoname",
    header: "Assigned BD / Forwarded",
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
    header: () => <div className="min-w-[120px] whitespace-normal">Contact Person</div>,
    cell: (info) => <ContactToggleCell {...info} />,
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
  columnHelper.accessor("address", {
    id: "address",
    header: "Address",
    cell: (info) => <AddressCell {...info} />,
  }),
  columnHelper.accessor("ctypename", {
    id: "ctypename",
    header: "Customer Type",
    cell: (info) => <div className="min-w-[140px] whitespace-normal"><HighlightingCell {...info} /></div>,
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
    header: () => <div className="min-w-[180px] whitespace-normal">Follow-up: expected date of closing order</div>,
    cell: (info) => <div className="min-w-[120px]"><DateCell {...info} /></div>,
  }),
  columnHelper.accessor("action", {
    id: "action_taken",
    header: () => <div className="min-w-[180px] whitespace-normal">Details of the action taken</div>,
    cell: (info) => <div className="min-w-[200px] whitespace-normal"><HighlightingCell {...info} /></div>,
  }),
  // Below: still available from the column toggle, hidden by default (see index.jsx)
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
];
