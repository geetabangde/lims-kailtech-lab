// Import Dependencies
import { createColumnHelper } from "@tanstack/react-table";

// Local Imports
import { Badge } from "components/ui";
import { RowActions } from "./RowActions";

const columnHelper = createColumnHelper();

// Safe property access helpers for API response flexibility
const getVal = (val) => val || "";

const getBranchName = (row) => {
  if (row.branch && typeof row.branch === "object") return row.branch.name || "";
  return row.branch_name || row.branch || "";
};

const getCandidateName = (row) => {
  if (row.name) return row.name;
  const parts = [
    row.prefix,
    row.firstname,
    row.middlename,
    row.lastname,
  ].filter(Boolean);
  return parts.join(" ") || "—";
};

const getSalary = (row) => row.gross ?? row.stipend ?? row.salary ?? null;

const formatSalary = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return `₹${num.toLocaleString("en-IN")}`;
};

export const columns = [
  // Sr.no
  columnHelper.accessor((_row, index) => index + 1, {
    id: "s_no",
    header: "Sr.no",
    cell: (info) => info.row.index + 1,
  }),

  // Name
  columnHelper.accessor((row) => getCandidateName(row), {
    id: "name",
    header: "Name",
    cell: (info) => info.getValue(),
  }),

  // Mobile
  columnHelper.accessor("mobile", {
    id: "mobile",
    header: "Mobile",
    cell: (info) => getVal(info.getValue()),
  }),

  // Email
  columnHelper.accessor("email", {
    id: "email",
    header: "Email",
    cell: (info) => getVal(info.getValue()),
  }),

  // Branch
  columnHelper.accessor((row) => getBranchName(row), {
    id: "branch",
    header: "Branch",
    cell: (info) => info.getValue(),
  }),

  // Salary
  columnHelper.accessor((row) => getSalary(row), {
    id: "salary",
    header: "Salary",
    cell: (info) => formatSalary(info.getValue()),
  }),

  // Status
  columnHelper.accessor((row) => row.status_label || row.status, {
    id: "status",
    header: "Status",
    cell: (info) => {
      const label = String(info.getValue() || "").toLowerCase();

      if (label.includes("reject") || label.includes("cancel")) {
        return (
          <Badge className="rounded-full" color="error" variant="soft">
            {info.getValue() || "Rejected"}
          </Badge>
        );
      }
      if (!label || label === "0" || label === "pending") {
        return (
          <Badge className="rounded-full" color="warning" variant="soft">
            {info.getValue() || "Pending"}
          </Badge>
        );
      }
      return (
        <Badge className="rounded-full" color="success" variant="soft">
          {info.getValue()}
        </Badge>
      );
    },
  }),

  // Action
  columnHelper.display({
    id: "actions",
    header: () => <div className="text-center">Action</div>,
    cell: RowActions,
  }),
];
