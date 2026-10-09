// Import Dependencies
import { createColumnHelper } from "@tanstack/react-table";

// Local Imports
import { RowActions } from "./RowActions";

const columnHelper = createColumnHelper();

const statusMap = {
  0: { label: "Unverified", color: "bg-orange-100 text-orange-700" },
  1: { label: "Active", color: "bg-green-100 text-green-700" },
  10: { label: "In Training", color: "bg-blue-100 text-blue-700" },
  99: { label: "Suspended", color: "bg-red-100 text-red-700" },
};

export const columns = [
  // ✅ Serial Number
  columnHelper.accessor((_row, index) => index + 1, {
    id: "s_no",
    header: "Sr.no",
    cell: (info) => info.row.index + 1,
  }),

  // ✅ Name
  columnHelper.accessor("name", {
    id: "name",
    header: "Name",
    cell: (info) => {
        const { firstname, lastname } = info.row.original;
        return `${firstname} ${lastname}`;
    },
  }),

  // ✅ Employee ID
  columnHelper.accessor("empid", {
    id: "empid",
    header: "Employee id",
    cell: (info) => info.getValue(),
  }),

  // ✅ Mobile
  columnHelper.accessor("mobile", {
    id: "mobile",
    header: "Mobile",
    cell: (info) => info.getValue(),
  }),

  // ✅ Email
  columnHelper.accessor("email", {
    id: "email",
    header: "Email",
    cell: (info) => info.getValue(),
  }),

  // ✅ Department
  columnHelper.accessor("department_name", {
    id: "department",
    header: "Department",
    cell: (info) => info.getValue() || "-",
  }),

  // ✅ Status
  columnHelper.accessor("status", {
    id: "status",
    header: "Status",
    cell: (info) => {
      const status = statusMap[info.getValue()];
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${status?.color || "bg-gray-100 text-gray-700"}`}>
          {status?.label || "Unknown"}
        </span>
      );
    },
  }),

  // ✅ done  Actions
  columnHelper.display({
    id: "actions",
    header: () => <div className="text-center">Action</div>,
    cell: RowActions,
  }),
];
