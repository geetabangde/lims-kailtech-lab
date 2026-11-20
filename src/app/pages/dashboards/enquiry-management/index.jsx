import { useState, useEffect, useCallback } from "react";
import axios from "utils/axios";
import { toast } from "sonner";
import { Page } from "components/shared/Page";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowPathIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  FunnelIcon,
  PhoneIcon
} from "@heroicons/react/24/outline";

import {
  SERVICES,
  TYPES,
  AREAS,
  STATUSES,
  STATUS_STYLES,
  fmtDate,
  isoDate,
  formatCurrency
} from "./config";
import EnquiryFormModal from "./EnquiryFormModal";

// Allowed users for Phase 1 restricted access
const ALLOWED_USERS = [31, 41, 160]; // Ruby (31), Sushil (41), Manish Rathore (160)

export default function EnquiryManagement() {
  const currentUserId = Number(localStorage.getItem("userId") || 0);
  const isAuthorized = ALLOWED_USERS.includes(currentUserId);

  // Filters State
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedService, setSelectedService] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedArea, setSelectedArea] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Data & State
  const [enquiries, setEnquiries] = useState([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    order_received: 0,
    order_received_val: 0,
    quotation_sent: 0,
    negotiation: 0,
    contacted: 0,
    no_action: 0,
    lost: 0,
    shifted: 0,
    facility_na: 0,
    due_overdue: 0
  });
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);

  // Month Options for quick tab switching (Aug 2026 - Dec 2026 + All)
  const monthOptions = [
    { label: "November 2026", value: "2026-11" },
    { label: "October 2026", value: "2026-10" },
    { label: "September 2026", value: "2026-09" },
    { label: "August 2026", value: "2026-08" },
    { label: "All Months", value: "" }
  ];

  // Fetch Options (Staff list, etc.)
  const fetchOptions = useCallback(async () => {
    try {
      const res = await axios.get("/enquiry-tracker/options");
      if (res.data.status && res.data.data) {
        setStaffList(res.data.data.staff || []);
      }
    } catch (err) {
      console.error("Failed to load options", err);
    }
  }, []);

  // Fetch Enquiries List
  const fetchEnquiries = useCallback(async () => {
    if (!isAuthorized) return;
    setLoading(true);
    try {
      const params = {};
      if (selectedMonth) params.month = selectedMonth;
      if (selectedService !== "All") params.service = selectedService;
      if (selectedType !== "All") params.enq_type = selectedType;
      if (selectedArea !== "All") params.area = selectedArea;
      if (selectedStatus !== "All") params.status = selectedStatus;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await axios.get("/enquiry-tracker/list", { params });
      if (res.data.status) {
        setEnquiries(res.data.data || []);
        if (res.data.metrics) {
          setMetrics(res.data.metrics);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load enquiries list.");
    } finally {
      setLoading(false);
    }
  }, [isAuthorized, selectedMonth, selectedService, selectedType, selectedArea, selectedStatus, searchQuery]);

  useEffect(() => {
    if (isAuthorized) {
      fetchOptions();
      fetchEnquiries();
    }
  }, [isAuthorized, fetchOptions, fetchEnquiries]);

  // Inline Quick Status Change
  const handleStatusChange = async (item, newStatus) => {
    if (item.status === newStatus) return;

    try {
      const res = await axios.patch(`/enquiry-tracker/status/${item.id}`, { status: newStatus });
      toast.success(res.data.message || `Status updated to ${newStatus}`);
      // Optimistic update
      setEnquiries((prev) =>
        prev.map((e) => (e.id === item.id ? { ...e, status: newStatus } : e))
      );
      // Refresh metrics
      fetchEnquiries();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status.");
    }
  };

  // Delete Action
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this enquiry?")) return;

    try {
      const res = await axios.delete(`/enquiry-tracker/delete/${id}`);
      toast.success(res.data.message || "Enquiry deleted.");
      setEnquiries((prev) => prev.filter((e) => e.id !== id));
      fetchEnquiries();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete enquiry.");
    }
  };

  // Filter Clear Action
  const handleClearFilters = () => {
    setSelectedService("All");
    setSelectedType("All");
    setSelectedArea("All");
    setSelectedStatus("All");
    setSearchQuery("");
  };

  const isFilterActive =
    selectedService !== "All" ||
    selectedType !== "All" ||
    selectedArea !== "All" ||
    selectedStatus !== "All" ||
    searchQuery.trim() !== "";

  // Check Overdue Status
  const todayStr = isoDate(new Date());
  const isOverdue = (dueDate, status) => {
    if (!dueDate) return false;
    if (["Order received", "Lost", "facility Not Available"].includes(status)) return false;
    return dueDate < todayStr;
  };

  // Unauthorized Screen Guard
  if (!isAuthorized) {
    return (
      <Page title="Enquiry Management">
        <div className="flex h-96 flex-col items-center justify-center rounded-xl bg-white p-8 text-center shadow dark:bg-dark-700">
          <div className="rounded-full bg-amber-100 p-3 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
            <FunnelIcon className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-gray-900 dark:text-dark-50">
            Restricted Access (Phase 1 Testing)
          </h2>
          <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-dark-300">
            The Enquiry Management module is currently in pilot testing and accessible only to
            Er. Sushil Malhotra, Er. Ruby S. Malhotra, and Manish Rathore.
          </p>
        </div>
      </Page>
    );
  }

  return (
    <Page title="Enquiry Management">
      <div className="space-y-4">
        {/* TOP BAR: Title, Month Selector & Add Button */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-dark-50">
              📋 Enquiry Management
            </h1>
            <p className="text-xs text-gray-500 dark:text-dark-300">
              Customer enquiry register & pipeline tracker — Aligned with lab Excel format.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Month Quick Tabs */}
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm dark:border-dark-600 dark:bg-dark-800">
              {monthOptions.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setSelectedMonth(m.value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedMonth === m.value
                      ? "bg-primary-600 text-white shadow"
                      : "text-gray-600 hover:text-gray-900 dark:text-dark-300 dark:hover:text-dark-100"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={fetchEnquiries}
              disabled={loading}
              title="Refresh"
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white p-2 text-gray-600 shadow-sm hover:bg-gray-50 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-200"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin text-primary-600" : ""}`} />
            </button>

            {/* + Add Enquiry */}
            <button
              type="button"
              onClick={() => {
                setEditRecord(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <PlusIcon className="h-4 w-4" />
              <span>+ Add Enquiry</span>
            </button>
          </div>
        </div>

        {/* STATUS METRIC CHIPS STRIP */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {/* Total */}
          <button
            type="button"
            onClick={() => setSelectedStatus("All")}
            className={`flex flex-col rounded-xl border p-2.5 text-left transition-all ${
              selectedStatus === "All"
                ? "border-primary-600 bg-primary-50 shadow dark:bg-primary-950/30"
                : "border-gray-200 bg-white hover:border-gray-300 dark:border-dark-600 dark:bg-dark-800"
            }`}
          >
            <span className="text-[11px] font-semibold text-gray-500 dark:text-dark-300">Total Enquiries</span>
            <span className="mt-0.5 text-lg font-bold text-gray-900 dark:text-dark-50">{metrics.total}</span>
          </button>

          {/* Order Received (Won) */}
          <button
            type="button"
            onClick={() => setSelectedStatus("Order received")}
            className={`flex flex-col rounded-xl border p-2.5 text-left transition-all ${
              selectedStatus === "Order received"
                ? "border-emerald-600 bg-emerald-50 shadow dark:bg-emerald-950/40"
                : "border-emerald-200 bg-emerald-50/40 hover:border-emerald-300 dark:border-emerald-900 dark:bg-emerald-950/20"
            }`}
          >
            <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">🟢 Won / Received</span>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-emerald-900 dark:text-emerald-200">{metrics.order_received}</span>
              {metrics.order_received_val > 0 && (
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(metrics.order_received_val)}
                </span>
              )}
            </div>
          </button>

          {/* Quotation Sent */}
          <button
            type="button"
            onClick={() => setSelectedStatus("Quotation Sent")}
            className={`flex flex-col rounded-xl border p-2.5 text-left transition-all ${
              selectedStatus === "Quotation Sent"
                ? "border-amber-600 bg-amber-50 shadow dark:bg-amber-950/40"
                : "border-amber-200 bg-amber-50/40 hover:border-amber-300 dark:border-amber-900 dark:bg-amber-950/20"
            }`}
          >
            <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">🟡 Quotation Sent</span>
            <span className="mt-0.5 text-lg font-bold text-amber-900 dark:text-amber-200">{metrics.quotation_sent}</span>
          </button>

          {/* Negotiation */}
          <button
            type="button"
            onClick={() => setSelectedStatus("Negotiation")}
            className={`flex flex-col rounded-xl border p-2.5 text-left transition-all ${
              selectedStatus === "Negotiation"
                ? "border-orange-600 bg-orange-50 shadow dark:bg-orange-950/40"
                : "border-orange-200 bg-orange-50/40 hover:border-orange-300 dark:border-orange-900 dark:bg-orange-950/20"
            }`}
          >
            <span className="text-[11px] font-semibold text-orange-800 dark:text-orange-300">🟠 Negotiation</span>
            <span className="mt-0.5 text-lg font-bold text-orange-900 dark:text-orange-200">{metrics.negotiation}</span>
          </button>

          {/* Contacted */}
          <button
            type="button"
            onClick={() => setSelectedStatus("Contacted")}
            className={`flex flex-col rounded-xl border p-2.5 text-left transition-all ${
              selectedStatus === "Contacted"
                ? "border-sky-600 bg-sky-50 shadow dark:bg-sky-950/40"
                : "border-sky-200 bg-sky-50/40 hover:border-sky-300 dark:border-sky-900 dark:bg-sky-950/20"
            }`}
          >
            <span className="text-[11px] font-semibold text-sky-800 dark:text-sky-300">🔵 Contacted</span>
            <span className="mt-0.5 text-lg font-bold text-sky-900 dark:text-sky-200">{metrics.contacted}</span>
          </button>

          {/* Lost */}
          <button
            type="button"
            onClick={() => setSelectedStatus("Lost")}
            className={`flex flex-col rounded-xl border p-2.5 text-left transition-all ${
              selectedStatus === "Lost"
                ? "border-rose-600 bg-rose-50 shadow dark:bg-rose-950/40"
                : "border-rose-200 bg-rose-50/40 hover:border-rose-300 dark:border-rose-900 dark:bg-rose-950/20"
            }`}
          >
            <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-300">🔴 Lost</span>
            <span className="mt-0.5 text-lg font-bold text-rose-900 dark:text-rose-200">{metrics.lost}</span>
          </button>

          {/* Due Today / Overdue */}
          <div className="flex flex-col justify-center rounded-xl border border-red-300 bg-red-50/50 p-2.5 dark:border-red-900 dark:bg-red-950/20">
            <span className="text-[11px] font-bold text-red-700 dark:text-red-300">⚠️ Due / Overdue</span>
            <span className="mt-0.5 text-lg font-bold text-red-800 dark:text-red-200">{metrics.due_overdue}</span>
          </div>
        </div>

        {/* FILTER BAR & SEARCH */}
        <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-dark-600 dark:bg-dark-800">
          {/* Universal Search */}
          <div className="relative min-w-[200px] flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search client, contact, mobile, remark..."
              className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-9 pr-3 text-xs text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
            />
          </div>

          {/* Service Filter */}
          <div className="min-w-[130px]">
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-1.5 px-2.5 text-xs text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
            >
              <option value="All">All Services</option>
              {SERVICES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="min-w-[100px]">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-1.5 px-2.5 text-xs text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
            >
              <option value="All">All Types</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Area Filter */}
          <div className="min-w-[110px]">
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-1.5 px-2.5 text-xs text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
            >
              <option value="All">All Areas</option>
              {AREAS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="min-w-[130px]">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-1.5 px-2.5 text-xs font-medium text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100"
            >
              <option value="All">All Statuses</option>
              {STATUSES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Clear Filter Button */}
          {isFilterActive && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:border-dark-600 dark:bg-dark-700 dark:text-dark-200"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* MAIN DATA TABLE: Exact Excel Column Sequence */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-dark-600 dark:bg-dark-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-xs dark:divide-dark-600">
              <thead className="bg-[#18457c] text-white">
                <tr>
                  <th className="py-3 px-2.5 font-bold text-center w-12">S.No.</th>
                  <th className="py-3 px-3 font-bold w-24">Date</th>
                  <th className="py-3 px-3 font-bold min-w-[180px]">Client Name</th>
                  <th className="py-3 px-2.5 font-bold w-28">Service</th>
                  <th className="py-3 px-2 font-bold w-20">Type</th>
                  <th className="py-3 px-2.5 font-bold w-24">Area</th>
                  <th className="py-3 px-3 font-bold min-w-[140px]">Contact Person</th>
                  <th className="py-3 px-2.5 font-bold w-28">Mob.</th>
                  <th className="py-3 px-3 font-bold min-w-[150px]">Email ID</th>
                  <th className="py-3 px-3 font-bold text-right w-28">Order Value</th>
                  <th className="py-3 px-3 font-bold min-w-[160px]">Status</th>
                  <th className="py-3 px-2.5 font-bold w-28 text-center">Payment</th>
                  <th className="py-3 px-2 font-bold w-20 text-center">Reported</th>
                  <th className="py-3 px-3 font-bold min-w-[200px]">Remark</th>
                  <th className="py-3 px-2.5 font-bold w-24">Due date</th>
                  <th className="py-3 px-2 font-bold text-center w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-dark-600">
                {loading ? (
                  <tr>
                    <td colSpan={16} className="py-12 text-center text-gray-500 dark:text-dark-300">
                      <div className="flex items-center justify-center gap-2">
                        <ArrowPathIcon className="h-5 w-5 animate-spin text-primary-600" />
                        <span>Loading enquiries...</span>
                      </div>
                    </td>
                  </tr>
                ) : enquiries.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="py-12 text-center text-gray-500 dark:text-dark-300">
                      No enquiries found for the selected month or filters.
                    </td>
                  </tr>
                ) : (
                  enquiries.map((item, idx) => {
                    const rowStyle = STATUS_STYLES[item.status]?.row || "bg-white hover:bg-gray-50 dark:bg-dark-700";
                    const badgeStyle = STATUS_STYLES[item.status]?.badge || "bg-gray-100 text-gray-700";
                    const overdue = isOverdue(item.due_date, item.status);

                    return (
                      <tr key={item.id} className={`transition-colors ${rowStyle}`}>
                        {/* 1. S.No. (running) */}
                        <td className="py-2.5 px-2.5 text-center font-semibold text-gray-600 dark:text-dark-300">
                          #{idx + 1}
                        </td>

                        {/* 2. Date */}
                        <td className="py-2.5 px-3 font-medium whitespace-nowrap text-gray-900 dark:text-dark-100">
                          {fmtDate(item.enq_date)}
                        </td>

                        {/* 3. Client Name */}
                        <td className="py-2.5 px-3 font-bold text-gray-900 dark:text-dark-50">
                          {item.client_name}
                        </td>

                        {/* 4. Service */}
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          <span className="inline-block rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                            {item.service}
                          </span>
                        </td>

                        {/* 5. Type */}
                        <td className="py-2.5 px-2 whitespace-nowrap">
                          <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:bg-dark-600 dark:text-dark-200">
                            {item.enq_type}
                          </span>
                        </td>

                        {/* 6. Area */}
                        <td className="py-2.5 px-2.5 whitespace-nowrap text-gray-800 dark:text-dark-200">
                          {item.area || "-"}
                        </td>

                        {/* 7. Contact Person */}
                        <td className="py-2.5 px-3 text-gray-800 dark:text-dark-200">
                          {item.contact_person || "-"}
                        </td>

                        {/* 8. Mobile / WhatsApp */}
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          {item.mobile ? (
                            <a
                              href={`https://wa.me/91${String(item.mobile).replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Chat on WhatsApp"
                              className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                            >
                              <span>{item.mobile}</span>
                              <PhoneIcon className="h-3 w-3 text-emerald-500" />
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>

                        {/* 9. Email */}
                        <td className="py-2.5 px-3 text-gray-600 dark:text-dark-300">
                          {item.email ? (
                            <a href={`mailto:${item.email}`} className="text-primary-600 hover:underline">
                              {item.email}
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>

                        {/* 10. Order Value */}
                        <td className="py-2.5 px-3 text-right font-semibold text-gray-900 dark:text-dark-100 whitespace-nowrap">
                          {formatCurrency(item.order_value)}
                        </td>

                        {/* 11. Status (Interactive Dropdown) */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <select
                            value={item.status}
                            onChange={(e) => handleStatusChange(item, e.target.value)}
                            className={`rounded-lg border px-2 py-1 text-xs font-semibold shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 ${badgeStyle}`}
                          >
                            {STATUSES.map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </td>

                        {/* 12. Payment Status */}
                        <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              item.payment_status === "Received"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                                : "bg-gray-100 text-gray-600 dark:bg-dark-600 dark:text-dark-300"
                            }`}
                          >
                            {item.payment_status || "Not received"}
                          </span>
                        </td>

                        {/* 13. Reported */}
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              item.reported === "Yes"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                                : "bg-gray-100 text-gray-600 dark:bg-dark-600 dark:text-dark-300"
                            }`}
                          >
                            {item.reported || "No"}
                          </span>
                        </td>

                        {/* 14. Remark */}
                        <td className="py-2.5 px-3 text-gray-700 dark:text-dark-300">
                          <span className="line-clamp-2" title={item.remark || ""}>
                            {item.remark || "-"}
                          </span>
                        </td>

                        {/* 15. Due Date */}
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          {item.due_date ? (
                            <span
                              className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${
                                overdue
                                  ? "bg-red-100 text-red-800 animate-pulse dark:bg-red-950/50 dark:text-red-300"
                                  : "text-gray-800 dark:text-dark-200"
                              }`}
                            >
                              {fmtDate(item.due_date)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>

                        {/* 16. Actions */}
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditRecord(item);
                                setIsModalOpen(true);
                              }}
                              title="Edit Enquiry"
                              className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-primary-600 dark:text-dark-300 dark:hover:bg-dark-600"
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              title="Delete Enquiry"
                              className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Total Summary Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-dark-300">
          <span>Showing {enquiries.length} enquiry record(s)</span>
          <span>Access Restricted: Er. Sushil Malhotra, Er. Ruby S. Malhotra, Manish Rathore</span>
        </div>

        {/* ADD / EDIT MODAL */}
        <EnquiryFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditRecord(null);
          }}
          onSuccess={fetchEnquiries}
          editRecord={editRecord}
          staffList={staffList}
        />
      </div>
    </Page>
  );
}
