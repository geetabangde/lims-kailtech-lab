// Import Dependencies
import {
  flexRender,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedUniqueValues,
  getExpandedRowModel,
  getFilteredRowModel,
  getGroupedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import clsx from "clsx";
import { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router";
import axios from "utils/axios";

// Local Imports
import { Table, Card, THead, TBody, Th, Tr, Td } from "components/ui";
import { TableSortIcon } from "components/shared/table/TableSortIcon";
import { Page } from "components/shared/Page";
import { useLockScrollbar, useDidUpdate, useLocalStorage } from "hooks";
import { fuzzyFilter } from "utils/react-table/fuzzyFilter";
import { useSkipper } from "utils/react-table/useSkipper";
import { Toolbar } from "./Toolbar";
import { columns } from "./columns";
import EditModal from "./EditModal";
import { PaginationSection } from "components/shared/table/PaginationSection";
import { SelectedRowsActions } from "components/shared/table/SelectedRowsActions";
import { useThemeContext } from "app/contexts/theme/context";
import { getUserAgentBrowser } from "utils/dom/getUserAgentBrowser";

// ----------------------------------------------------------------------

const isSafari = getUserAgentBrowser() === "Safari";

// PHP: $permissions → stored in localStorage after login
function usePermissions() {
  return localStorage.getItem("userPermissions")?.split(",").map(Number) || [];
}

// ── Product (group) row: totals of all its batches ──────────────────────────────
const toDate = (d) => {
  const m = String(d || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? new Date(`${m[3]}-${m[2]}-${m[1]}`).getTime() : null;
};

function renderGroupCell(row, leaves, cell, colId) {
  const first = leaves[0];
  const items = leaves.map((l) => l.original);
  const n = items.length;
  if (colId === "s_no") return <div className="text-center">{row.index + 1}</div>;
  if (colId === "name") {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={row.getToggleExpandedHandler()}
          title={row.getIsExpanded() ? "Hide batches" : "Show batches"}
          className={clsx(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold",
            row.getIsExpanded()
              ? "border-red-500 bg-red-50 text-red-600"
              : "border-green-500 bg-green-50 text-green-600",
          )}
        >
          {row.getIsExpanded() ? "-" : "+"}
        </button>
        <span>{first.original.name ?? "—"}</span>
      </div>
    );
  }
  if (colId === "batchno") return <span className="text-xs text-gray-500">{n} {n === 1 ? "batch" : "batches"}</span>;
  if (colId === "location") {
    const locs = [...new Set(items.map((i) => i.location).filter(Boolean))];
    return locs.length > 1 ? `${locs.length} locations` : locs[0] ?? "—";
  }
  if (colId === "expdate") {
    // nearest expiry among batches that still have stock (all batches if none has)
    const inStock = items.filter((i) => Number(i.qty) > 0);
    const pool = (inStock.length ? inStock : items).map((i) => toDate(i.expdate)).filter((t) => t !== null);
    if (!pool.length) return "—";
    const t = Math.min(...pool);
    return <span title="Nearest expiry among batches in stock">{new Date(t).toLocaleDateString("en-GB")}</span>;
  }
  if (colId === "qty_with_unit") {
    const total = items.reduce((a, i) => a + (Number(i.qty) || 0), 0);
    const units = [...new Set(items.map((i) => i.units).filter(Boolean))];
    return <span title="Total of all batches">{`${parseFloat(total.toFixed(3))} ${units.length === 1 ? units[0] : ""}`.trim()}</span>;
  }
  if (colId === "edit") return null;
  // type / idno / category / critical: same for every batch of the product
  const leafCell = first.getVisibleCells().find((c) => c.column.id === colId);
  return leafCell ? flexRender(leafCell.column.columnDef.cell, leafCell.getContext()) : null;
}

export default function MyDepartmentStock() {
  const { cardSkin } = useThemeContext();
  const permissions = usePermissions();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [editModal, setEditModal] = useState({ show: false, id: null });

  // PHP: "ajax": "ownstockdata.php" → GET /profile/department-stock-report
  const fetchStock = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get("profile/department-stock-report", {
        params: { length: 10000 },
      });

      if (response.data.status && Array.isArray(response.data.data)) {
        setOrders(response.data.data);
      } else if (Array.isArray(response.data)) {
        setOrders(response.data);
      } else {
        console.warn("Unexpected response structure:", response.data);
        setOrders([]);
      }
    } catch (err) {
      console.error("Error fetching department stock:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStock(); }, [fetchStock]);


  const [tableSettings, setTableSettings] = useState({
    enableFullScreen: false,
    enableRowDense: false,
  });

  const [globalFilter, setGlobalFilter] = useState("");

  // Products are shown once (grouped by ID no); "+" opens the batch / location list of that product
  const [expanded, setExpanded] = useState({});
  const [sorting, setSorting] = useState([]);

  // PHP: hide Edit column if permission 348 is absent
  const [columnVisibility, setColumnVisibility] = useLocalStorage(
    "column-visibility-dept-stock-1",
    { edit: permissions.includes(348) },
  );

  // Keep edit column visibility in sync with runtime permission
  useEffect(() => {
    setColumnVisibility((prev) => ({ ...prev, edit: permissions.includes(348) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [columnPinning, setColumnPinning] = useLocalStorage(
    "column-pinning-dept-stock-1",
    {},
  );

  const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper();

  const table = useReactTable({
    data: orders,
    columns: columns,
    initialState: {
      pagination: {
        pageSize: 25,
      },
    },
    state: {
      globalFilter,
      sorting,
      columnVisibility,
      columnPinning,
      tableSettings,
      grouping: ["idno"],
      // while searching, open every product so the matching batch is visible
      expanded: globalFilter ? true : expanded,
    },
    onExpandedChange: setExpanded,
    groupedColumnMode: false,
    paginateExpandedRows: false,
    autoResetExpanded: false,
    defaultColumn: { aggregationFn: (colId, leafRows) => leafRows[0]?.getValue(colId) },
    meta: {
      openEditModal: (id) => setEditModal({ show: true, id }),
      updateData: (rowIndex, columnId, value) => {
        skipAutoResetPageIndex();
        setOrders((old) =>
          old.map((row, index) => {
            if (index === rowIndex) {
              return {
                ...old[rowIndex],
                [columnId]: value,
              };
            }
            return row;
          })
        );
      },
      deleteRow: (row) => {
        skipAutoResetPageIndex();
        setOrders((old) =>
          old.filter((oldRow) => oldRow.id !== row.original.id)
        );
      },
      deleteRows: (rows) => {
        skipAutoResetPageIndex();
        const rowIds = rows.map((row) => row.original.id);
        setOrders((old) => old.filter((row) => !rowIds.includes(row.id)));
      },
      setTableSettings
    },
    filterFns: {
      fuzzy: fuzzyFilter,
    },
    enableSorting: tableSettings.enableSorting,
    enableColumnFilters: tableSettings.enableColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    globalFilterFn: fuzzyFilter,
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),

    getPaginationRowModel: getPaginationRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onColumnPinningChange: setColumnPinning,

    autoResetPageIndex,
  });

  useDidUpdate(() => table.resetRowSelection(), [orders]);
  useLockScrollbar(tableSettings.enableFullScreen);

  // PHP: if(!in_array(347, $permissions)) { header("location:index.php"); }
  if (!permissions.includes(347)) {
    return <Navigate to="/dashboards/home" replace />;
  }

  // ✅ Loading UI
  if (loading) {
    return (
      <Page title="Stock Report">
        <div className="flex h-[60vh] items-center justify-center gap-3 text-gray-500">
          <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 000 8v4a8 8 0 01-8-8z" />
          </svg>
          Loading Stock...
        </div>
      </Page>
    );
  }

  return (
    <Page title="Stock Report">
      <div className="transition-content w-full pb-5">
        <div
          className={clsx(
            "flex h-full w-full flex-col",
            tableSettings.enableFullScreen &&
            "fixed inset-0 z-61 bg-white pt-3 dark:bg-dark-900",
          )}
        >
          <Toolbar table={table} />
          <div
            className={clsx(
              "transition-content flex grow flex-col pt-3",
              tableSettings.enableFullScreen
                ? "overflow-hidden"
                : "px-[var(--margin-x)]",
            )}
          >
            <Card
              className={clsx(
                "relative flex grow flex-col",
                tableSettings.enableFullScreen && "overflow-hidden",
              )}
            >
              <div className="table-wrapper min-w-full grow overflow-x-auto">
                <Table
                  hoverable
                  dense={tableSettings.enableRowDense}
                  sticky={tableSettings.enableFullScreen}
                  className="w-full text-left rtl:text-right"
                >
                  <THead>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <Tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <Th
                            key={header.id}
                            className={clsx(
                              "bg-gray-200 font-semibold uppercase text-gray-800 dark:bg-dark-800 dark:text-dark-100 first:ltr:rounded-tl-lg last:ltr:rounded-tr-lg first:rtl:rounded-tr-lg last:rtl:rounded-tl-lg",
                              header.column.getCanPin() && [
                                header.column.getIsPinned() === "left" &&
                                "sticky z-2 ltr:left-0 rtl:right-0",
                                header.column.getIsPinned() === "right" &&
                                "sticky z-2 ltr:right-0 rtl:left-0",
                              ],
                            )}
                          >
                            {header.column.getCanSort() ? (
                              <div
                                className="flex cursor-pointer select-none items-center space-x-3 "
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                <span className="flex-1">
                                  {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                      header.column.columnDef.header,
                                      header.getContext(),
                                    )}
                                </span>
                                <TableSortIcon
                                  sorted={header.column.getIsSorted()}
                                />
                              </div>
                            ) : header.isPlaceholder ? null : (
                              flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )
                            )}
                          </Th>
                        ))}
                      </Tr>
                    ))}
                  </THead>
                  <TBody>
                    {table.getRowModel().rows.map((row) => {
                      const isGroup = row.getIsGrouped();
                      const leaves = isGroup ? row.getLeafRows() : [];
                      return (
                        <Tr
                          key={row.id}
                          className={clsx(
                            "relative border-y border-transparent border-b-gray-200 dark:border-b-dark-500",
                            isGroup && "font-semibold",
                            row.getIsSelected() && !isSafari &&
                            "row-selected after:pointer-events-none after:absolute after:inset-0 after:z-2 after:h-full after:w-full after:border-3 after:border-transparent after:bg-primary-500/10 ltr:after:border-l-primary-500 rtl:after:border-r-primary-500",
                          )}
                        >
                          {row.getVisibleCells().map((cell) => {
                            const colId = cell.column.id;
                            let content;
                            if (isGroup) {
                              content = renderGroupCell(row, leaves, cell, colId);
                            } else if (colId === "s_no") {
                              content = <div className="pl-4 text-center text-gray-500">{(row.getParentRow()?.subRows.indexOf(row) ?? row.index) + 1}</div>;
                            } else {
                              content = flexRender(cell.column.columnDef.cell, cell.getContext());
                            }
                            return (
                              <Td
                                key={cell.id}
                                className={clsx(
                                  "relative",
                                  isGroup
                                    ? "bg-gray-50 dark:bg-dark-800"
                                    : clsx("bg-white", cardSkin === "shadow" ? "dark:bg-dark-700" : "dark:bg-dark-900"),
                                  cell.column.getCanPin() && [
                                    cell.column.getIsPinned() === "left" &&
                                    "sticky z-2 ltr:left-0 rtl:right-0",
                                    cell.column.getIsPinned() === "right" &&
                                    "sticky z-2 ltr:right-0 rtl:left-0",
                                  ],
                                )}
                              >
                                {cell.column.getIsPinned() && (
                                  <div
                                    className={clsx(
                                      "pointer-events-none absolute inset-0 border-gray-200 dark:border-dark-500",
                                      cell.column.getIsPinned() === "left"
                                        ? "ltr:border-r rtl:border-l"
                                        : "ltr:border-l rtl:border-r",
                                    )}
                                  ></div>
                                )}
                                {content}
                              </Td>
                            );
                          })}
                        </Tr>
                      );
                    })}
                  </TBody>
                </Table>
              </div>
              <SelectedRowsActions table={table} title="Department Stock" showDelete={false} />
              {table.getRowModel().rows.length === 0 && !loading && (
                <div className="py-12 text-center text-sm text-gray-400">
                  No stock items found for your department.
                </div>
              )}
              {table.getCoreRowModel().rows.length > 0 && (
                <div
                  className={clsx(
                    "px-4 pb-4 sm:px-5 sm:pt-4",
                    tableSettings.enableFullScreen &&
                    "bg-gray-50 dark:bg-dark-800",
                    !(
                      table.getIsSomeRowsSelected() ||
                      table.getIsAllRowsSelected()
                    ) && "pt-4",
                  )}
                >
                  <PaginationSection table={table} />
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      <EditModal
        show={editModal.show}
        id={editModal.id}
        onClose={() => setEditModal({ show: false, id: null })}
        onSuccess={fetchStock}
      />
    </Page>
  );
}
