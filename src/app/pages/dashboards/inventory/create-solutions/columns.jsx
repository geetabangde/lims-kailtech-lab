import { createColumnHelper } from "@tanstack/react-table";
import { Button } from "components/ui";

const columnHelper = createColumnHelper();

export const columns = [
  columnHelper.accessor("id", {
    header: "ID",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("name", {
    header: "Name",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("qty", {
    header: "Qty",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("uname", {
    header: "Unit",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("exp", {
    header: "Expiry",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("department", {
    header: "Department",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("added_on", {
    header: "Added on",
    cell: (info) => info.getValue(),
  }),
  // Preparation record: parents -> solution (works for old solutions too)
  columnHelper.display({
    id: "record",
    header: "Record",
    cell: ({ row, table }) => (
      <Button
        size="xs"
        color="primary"
        className="px-2 font-bold"
        onClick={() => table.options.meta?.openRecord?.(row.original.id)}
      >
        View record
      </Button>
    ),
  }),
];
