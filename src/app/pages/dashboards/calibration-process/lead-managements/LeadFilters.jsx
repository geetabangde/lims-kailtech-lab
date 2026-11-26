// Import Dependencies
import PropTypes from "prop-types";
import Select from "react-select";
import clsx from "clsx";

// ----------------------------------------------------------------------

const inputCls =
  "h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-primary-500 focus:outline-none dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100";

const selectStyles = {
  control: (base) => ({ ...base, minHeight: "36px", height: "36px", borderRadius: "0.5rem", fontSize: "0.875rem" }),
  valueContainer: (base) => ({ ...base, padding: "0 8px" }),
  indicatorsContainer: (base) => ({ ...base, height: "34px" }),
  menu: (base) => ({ ...base, zIndex: 50 }),
};

// Filters of the Lead Managements list (2026-11-26): due-date range (calendar), BD, customer, inward entry number
export function LeadFilters({ filters, setFilters, options, onClear }) {
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const bdOpts = (options.bd || []).map((b) => ({ value: String(b.id), label: b.name }));
  const custOpts = (options.customers || []).map((c) => ({ value: String(c.id), label: c.name }));
  const active = !!(filters.from || filters.to || filters.bd || filters.customer || filters.inward);

  return (
    <div className="px-[var(--margin-x)] pb-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold text-gray-500">
          Due date from
          <input type="date" className={clsx(inputCls, "mt-1 block")} value={filters.from} onChange={(e) => set({ from: e.target.value })} />
        </label>
        <label className="text-xs font-semibold text-gray-500">
          Due date to
          <input type="date" className={clsx(inputCls, "mt-1 block")} value={filters.to} min={filters.from || undefined} onChange={(e) => set({ to: e.target.value })} />
        </label>
        <div className="w-56 text-xs font-semibold text-gray-500">
          Concern BD
          <div className="mt-1">
            <Select
              options={bdOpts}
              value={bdOpts.find((o) => o.value === String(filters.bd)) || null}
              onChange={(o) => set({ bd: o ? o.value : "" })}
              isClearable
              placeholder="All BDs"
              styles={selectStyles}
            />
          </div>
        </div>
        <div className="w-72 text-xs font-semibold text-gray-500">
          Customer
          <div className="mt-1">
            <Select
              options={custOpts}
              value={custOpts.find((o) => o.value === String(filters.customer)) || null}
              onChange={(o) => set({ customer: o ? o.value : "" })}
              isClearable
              isSearchable
              placeholder="All customers"
              styles={selectStyles}
            />
          </div>
        </div>
        <label className="text-xs font-semibold text-gray-500">
          Inward entry no.
          <input
            type="text"
            inputMode="numeric"
            className={clsx(inputCls, "mt-1 block w-36")}
            placeholder="e.g. 4234"
            value={filters.inward}
            onChange={(e) => set({ inward: e.target.value.replace(/\D/g, "") })}
          />
        </label>
        <button
          type="button"
          onClick={onClear}
          disabled={!active}
          className="h-9 rounded-lg border border-red-300 bg-red-50 px-4 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          Clear Filters
        </button>
      </div>
      <p className="mt-2 text-[11px] text-gray-500">
        {filters.from || filters.to
          ? `Showing items due ${filters.from ? `from ${filters.from.split("-").reverse().join("-")}` : ""}${filters.from && filters.to ? " " : ""}${filters.to ? `to ${filters.to.split("-").reverse().join("-")}` : ""}.`
          : "Showing items due from today for the next 4 months (pick a date range to see earlier or other periods)."}{" "}
        The Excel export uses the same filters.
      </p>
    </div>
  );
}

LeadFilters.propTypes = {
  filters: PropTypes.object.isRequired,
  setFilters: PropTypes.func.isRequired,
  options: PropTypes.object.isRequired,
  onClear: PropTypes.func.isRequired,
};
