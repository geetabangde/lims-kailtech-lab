// Import Dependencies
import {
  flexRender,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import clsx from "clsx";
import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import axios from "utils/axios";
import { toast } from "sonner";

// Local Imports
import { Table, Card, THead, TBody, Th, Tr, Td } from "components/ui";
import { TableSortIcon } from "components/shared/table/TableSortIcon";
import { Page } from "components/shared/Page";
import { useLockScrollbar, useDidUpdate, useLocalStorage } from "hooks";
import { fuzzyFilter } from "utils/react-table/fuzzyFilter";
import { useSkipper } from "utils/react-table/useSkipper";
import { PaginationSection } from "components/shared/table/PaginationSection";
import { useThemeContext } from "app/contexts/theme/context";

import { columns } from "./columns";
import { SOURCE_PILLS, enquiryTone, setHolidays } from "./enquiryOptions";
import { Toolbar } from "./Toolbar";
import { tableConfig } from "./TableConfig";
import { SelectedRowsActions } from "./SelectedRowsActions";

// ----------------------------------------------------------------------

export default function EnquiryList() {
  const { cardSkin } = useThemeContext();
  const navigate = useNavigate();
  const permissions = JSON.parse(localStorage.getItem("userPermissions") || "[]");

  useEffect(() => {
    if (!permissions.includes(91)) {
      navigate("/dashboards");
    }
  }, [navigate, permissions]);

  const [rawData, setRawData] = useState([]);
  const [sourceFilter, setSourceFilter] = useState("");
  const [cardFilter, setCardFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // Source quick-filter (client side, by lead_source text) - the list below works on `data`
  const sourceRows = useMemo(() => {
    if (!sourceFilter) return rawData;
    return rawData.filter((r) =>
      String(r.lead_source || "").toLowerCase().includes(sourceFilter.toLowerCase()) ||
      (sourceFilter === "Repeat" && String(r.lead_source || "").toLowerCase().includes("existing")),
    );
  }, [rawData, sourceFilter]);
  // an enquiry whose order was received (marked on the enquiry or its quotation converted) is no longer "pending"
  const isOrderDone = (r) => Number(r.closed) === 1 || r.quote_state === "order_received";
  const isDue = (r) => {
    const d = String(r.nextconactdate || "").split("/");
    return (
      String(r.status) === "0" && !isOrderDone(r) &&
      d.length === 3 &&
      `${d[2]}-${d[1]}-${d[0]}` <= new Date().toISOString().slice(0, 10)
    );
  };
  // The top cards are clickable: a card filters the table, clicking it again (or "Total") clears it
  const data = useMemo(() => {
    switch (cardFilter) {
      case "pending": return sourceRows.filter((r) => String(r.status) === "0" && !isOrderDone(r));
      case "tech": return sourceRows.filter((r) => r.tech_verification_status === "Under Technical Verification");
      case "quoted": return sourceRows.filter((r) => String(r.status) === "1");
      case "regretted": return sourceRows.filter((r) => String(r.status) === "91");
      case "due": return sourceRows.filter(isDue);
      default: return sourceRows;
    }
  }, [sourceRows, cardFilter]);
  const setData = setRawData;

  const kpi = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const sum = (rows) => rows.reduce((a, r) => a + (Number(r.approxvalue) || 0), 0);
    const quoted = sourceRows.filter((r) => String(r.status) === "1");
    const pending = sourceRows.filter((r) => String(r.status) === "0" && !isOrderDone(r));
    const due = pending.filter((r) => {
      const d = String(r.nextconactdate || "").split("/");
      return d.length === 3 && `${d[2]}-${d[1]}-${d[0]}` <= today;
    });
    return {
      total: sourceRows.length,
      pending: pending.length,
      tech: sourceRows.filter((r) => r.tech_verification_status === "Under Technical Verification").length,
      quoted: quoted.length,
      quotedValue: sum(quoted),
      ready: quoted.filter((r) => r.quote_state === "ready_to_send").length,
      sent: quoted.filter((r) => r.quote_state === "sent" || r.quote_state === "order_received").length,
      regretted: sourceRows.filter((r) => String(r.status) === "91").length,
      due: due.length,
    };
  }, [sourceRows]);

  const [tableSettings, setTableSettings] = useState(tableConfig);
  const [globalFilter, setGlobalFilter] = useState("");
  const [admins, setAdmins] = useState([]);
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [minDate, setMinDate] = useState("");
  const [maxDate, setMaxDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sorting, setSorting] = useState([{ id: "added_on", desc: true }]);
  const [columnVisibility, setColumnVisibility] = useLocalStorage(
    "col-vis-enquiry",
    {},
  );
  const [columnPinning, setColumnPinning] = useLocalStorage(
    "col-pin-enquiry",
    {},
  );
  const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper();
  const [isResponsive, setIsResponsive] = useLocalStorage("enquiry-responsive", false);
  const [expanded, setExpanded] = useState({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get("/sales/get-enquiry-list", {
        params: {
          searchByFromdate: minDate,
          searchByTodate: maxDate,
          assignto: selectedAssignee,
          status: statusFilter,
        }
      });
      if (
        (res.data.status === true || res.data.status === "true") &&
        Array.isArray(res.data.data)
      ) {
        setHolidays(res.data.holidays);
        let fetchedData = res.data.data;
        if (statusFilter !== "") {
          fetchedData = fetchedData.filter(item => String(item.status) === String(statusFilter));
        }
        setRawData(fetchedData);
      } else {
        setRawData([]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load enquiries");
    } finally {
      setLoading(false);
    }
  }, [minDate, maxDate, selectedAssignee, statusFilter]);

  useEffect(() => {
    fetchData();
    // Fetch staff/BD for the filter
    axios.get("/people/get-customer-bd").then((res) => {
      if (res.data?.data) {
        setAdmins(res.data.data);
      }
    });
  }, [fetchData]);

  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter,
      sorting,
      columnVisibility: {
        // Redesign 2026-11-25: these stay available in the column toggle but start hidden
        enquirybyname: false,
        payment_status: false,
        sample_arrived: false,
        approxqty: false,
        nextconactdate: false,
        ...columnVisibility,
        id: false,
        ...(isResponsive ? {
          assigntoname: false,
        } : {})
      },
      // The old Action column is gone (actions live behind the + button in Status)
      columnPinning: {
        ...columnPinning,
        right: (columnPinning?.right || []).filter((c) => c !== "actions"),
      },
      expanded,
    },
    meta: {
      updateData: (rowIndex, columnId, value) => {
        skipAutoResetPageIndex();
        setData((old) =>
          old.map((row, i) =>
            i === rowIndex ? { ...old[rowIndex], [columnId]: value } : row,
          ),
        );
      },
      deleteRow: (row) => {
        skipAutoResetPageIndex();
        setData((old) => old.filter((r) => r.id !== row.original.id));
      },
      deleteRows: (rows) => {
        skipAutoResetPageIndex();
        const idsToDelete = rows.map((r) => r.original.id);
        setData((old) => old.filter((r) => !idsToDelete.includes(r.id)));
        toast.success(`${rows.length} rows deleted locally`);
      },
      refetch: fetchData,
      setTableSettings,
      isResponsive, // Pass to columns
    },
    onExpandedChange: setExpanded,
    getRowCanExpand: () => isResponsive,
    getExpandedRowModel: getExpandedRowModel(),
    filterFns: { fuzzy: fuzzyFilter },
    globalFilterFn: fuzzyFilter,
    enableSorting: tableSettings.enableSorting,
    enableColumnFilters: tableSettings.enableColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onColumnPinningChange: setColumnPinning,
    autoResetPageIndex,
  });

  const activeFilterCount =
    [globalFilter, selectedAssignee, minDate, maxDate, statusFilter, sourceFilter, cardFilter].filter(
      (v) => v !== "" && v !== null && v !== undefined,
    ).length + table.getState().columnFilters.length;

  const clearAllFilters = () => {
    setGlobalFilter("");
    setSelectedAssignee("");
    setMinDate("");
    setMaxDate("");
    setStatusFilter("");
    setSourceFilter("");
    setCardFilter("");
    table.resetColumnFilters();
    table.setPageIndex(0);
  };

  useDidUpdate(() => table.resetRowSelection(), [data]);
  useLockScrollbar(tableSettings.enableFullScreen);

  if (loading) {
    return (
      <Page title="Manage Enquiry">
        <div className="flex h-[60vh] items-center justify-center text-gray-600">
          <svg
            className="mr-2 h-6 w-6 animate-spin text-blue-600"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 000 8v4a8 8 0 01-8-8z"
            />
          </svg>
          Loading Enquiries...
        </div>
      </Page>
    );
  }

  return (
    <Page title="Manage Enquiry">
      <div className="transition-content w-full pb-5">
        <div
          className={clsx(
            "flex h-full w-full flex-col",
            tableSettings.enableFullScreen &&
              "dark:bg-dark-900 fixed inset-0 z-61 bg-white pt-3",
          )}
        >
          {/* ── Toolbar ── */}
          <Toolbar
            table={table}
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
            admins={admins}
            selectedAssignee={selectedAssignee}
            setSelectedAssignee={setSelectedAssignee}
            minDate={minDate}
            setMinDate={setMinDate}
            maxDate={maxDate}
            setMaxDate={setMaxDate}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            isResponsive={isResponsive}
            setIsResponsive={setIsResponsive}
            onClearAll={clearAllFilters}
            activeFilterCount={activeFilterCount}
          />

          {!tableSettings.enableFullScreen && (
            <div className="px-[var(--margin-x)] pt-2">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                {[
                  ["", "Total Enquiries", kpi.total, "text-gray-800 dark:text-dark-100"],
                  ["pending", "Pending", kpi.pending, "text-amber-600"],
                  ["tech", "Under Technical Verification", kpi.tech, "text-purple-600"],
                  ["quoted", "Quotations Created", `${kpi.quoted} (₹${kpi.quotedValue.toLocaleString("en-IN")})`, "text-blue-600", `Ready to send: ${kpi.ready} · Sent: ${kpi.sent}`],
                  ["regretted", "Regretted", kpi.regretted, "text-rose-600"],
                  ["due", "Follow-up Due", kpi.due, "text-orange-600"],
                ].map(([key, label, value, color, sub]) => (
                  <button
                    type="button"
                    key={label}
                    onClick={() => setCardFilter(cardFilter === key ? "" : key)}
                    title={key ? "Click to filter the list (click again to clear)" : "Show all"}
                    className={clsx(
                      "rounded-xl border bg-white px-4 py-3 text-left shadow-sm transition hover:shadow-md dark:bg-dark-800",
                      cardFilter === key && key !== ""
                        ? "border-primary-500 ring-2 ring-primary-500/40"
                        : "border-gray-200 dark:border-dark-500",
                    )}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">{label}</p>
                    <p className={clsx("mt-1 text-lg font-bold", color)}>{value}</p>
                    {sub && <p className="mt-0.5 text-[11px] font-medium text-gray-500 dark:text-dark-300">{sub}</p>}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {SOURCE_PILLS.map((p) => (
                  <button
                    key={p.key || "all"}
                    type="button"
                    onClick={() => setSourceFilter(p.key)}
                    className={clsx(
                      "rounded-full border px-3 py-1 text-xs font-semibold transition",
                      sourceFilter === p.key
                        ? "border-primary-600 bg-primary-600 text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            className={clsx(
              "transition-content flex grow flex-col pt-1",
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
                  className="w-full text-left"
                >
                  <THead>
                    {table.getHeaderGroups().map((hg) => (
                      <Tr key={hg.id}>
                        {hg.headers.map((header) => (
                          <Th
                            key={header.id}
                            className={clsx(
                              "dark:bg-dark-800 dark:text-dark-100 bg-gray-200 font-semibold text-gray-800 uppercase first:ltr:rounded-tl-lg last:ltr:rounded-tr-lg",
                              header.column.getIsPinned() && "sticky right-0 z-10 bg-gray-200 dark:bg-dark-800 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]",
                            )}
                          >
                            {header.column.getCanSort() ? (
                              <div
                                className="flex cursor-pointer items-center space-x-3 select-none"
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
                    {table.getRowModel().rows.length > 0 ? (
                      table.getRowModel().rows.map((row) => (
                        <Fragment key={row.id}>
                          <Tr
                            className={clsx(
                              "dark:border-b-dark-500 relative border-y border-transparent border-b-gray-200",
                              row.getIsSelected() && "row-selected bg-primary-50 dark:bg-primary-900/10",
                            )}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <Td
                                key={cell.id}
                                className={clsx(
                                  "relative text-sm",
                                  // late = red, order lost = maroon, on time = no colour
                                  enquiryTone(row.original) === "late"
                                    ? "!bg-red-100 dark:!bg-red-900/30"
                                    : enquiryTone(row.original) === "overdue"
                                      ? "!bg-[#d9a199] dark:!bg-[#5a2a24]"
                                    : enquiryTone(row.original) === "lost"
                                      ? "!bg-[#e9d3d3] dark:!bg-[#4a1f1f]"
                                      : clsx(
                                          "bg-white",
                                          cardSkin === "shadow" ? "dark:bg-dark-700" : "dark:bg-dark-900",
                                        ),
                                  cell.column.getIsPinned() && "sticky right-0 z-10 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]",
                                )}
                              >
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext(),
                                )}
                              </Td>
                            ))}
                          </Tr>
                          {/* Expanded Row Content */}
                          {row.getIsExpanded() && (
                            <Tr className="bg-gray-50/50 dark:bg-dark-800/50 border-b border-gray-100 dark:border-dark-600">
                              <Td colSpan={row.getVisibleCells().length}>
                                <div className="p-4 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                    <span className="text-sm font-bold text-gray-800 dark:text-dark-100 w-44 shrink-0">
                                      Enquiry Recieved By:
                                    </span>
                                    <span className="text-sm text-gray-600 dark:text-dark-300">
                                      {row.original.enquirybyname || "-"}
                                    </span>
                                  </div>
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                    <span className="text-sm font-bold text-gray-800 dark:text-dark-100 w-44 shrink-0">
                                      Assign To:
                                    </span>
                                    <span className="text-sm text-gray-600 dark:text-dark-300">
                                      {row.original.assigntoname || "-"}
                                    </span>
                                  </div>
                                </div>
                              </Td>
                            </Tr>
                          )}
                        </Fragment>
                      ))
                    ) : (
                      <Tr>
                        <Td
                          colSpan={table.getVisibleFlatColumns().length}
                          className="dark:text-dark-400 py-10 text-center text-sm text-gray-500"
                        >
                          No enquiries found.
                        </Td>
                      </Tr>
                    )}
                  </TBody>
                </Table>
              </div>

              {table.getCoreRowModel().rows.length > 0 && (
                <div className="px-4 pt-4 pb-4 sm:px-5">
                  <PaginationSection table={table} />
                </div>
              )}
            </Card>
          </div>
          <SelectedRowsActions table={table} />
        </div>
      </div>
    </Page>
  );
}
