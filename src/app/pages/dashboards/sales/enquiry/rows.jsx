// Import Dependencies
import dayjs from "dayjs";
import PropTypes from "prop-types";
import { Highlight } from "components/shared/Highlight";
import { useLocaleContext } from "app/contexts/locale/context";
import { ensureString } from "utils/ensureString";
import { whatsappLink } from "./enquiryOptions";

// ----------------------------------------------------------------------

export function DateCell({ getValue }) {
  const { locale } = useLocaleContext();
  const timestamp = getValue();
  
  if (!timestamp || timestamp === "0000-00-00 00:00:00" || timestamp === "30/11/-0001") {
    return <p className="text-gray-400">-</p>;
  }

  const date = dayjs(timestamp).locale(locale).format("DD-MM-YYYY");
  const time = dayjs(timestamp).locale(locale).format("hh:mm A");
  
  return (
    <>
      <p className="text-sm font-medium text-gray-700 dark:text-dark-100">{date}</p>
      {time !== "12:00 AM" && (
        <p className="mt-0.5 text-[10px] text-gray-400 dark:text-dark-400 uppercase tracking-tight">{time}</p>
      )}
    </>
  );
}

export function HighlightingCell({ getValue, column, table }) {
  const globalQuery = ensureString(table.getState().globalFilter);
  const columnQuery = ensureString(column.getFilterValue());
  const val = ensureString(getValue());

  if (!val || val === "null") return <span className="text-gray-400">-</span>;

  return (
    <span className="text-sm font-medium text-gray-800 dark:text-dark-100">
      <Highlight query={[globalQuery, columnQuery]}>{val}</Highlight>
    </span>
  );
}

export function ContactPersonCell({ row, table }) {
    const globalQuery = ensureString(table.getState().globalFilter);
    const { 
        concernpersonname: name, 
        concernpersondesignation: designation, 
        concernpersonemail: email, 
        concernpersonmobile: mobile 
    } = row.original;
    const waLink = whatsappLink(row.original.whatsapp_number || mobile, name);

    return (
        <div className="flex flex-col gap-0.5 text-sm text-gray-600 dark:text-dark-300">
            <p className="font-semibold text-gray-800 dark:text-dark-100">
                <Highlight query={globalQuery}>{ensureString(name) || "-"}</Highlight>
            </p>
            {designation && (
                 <p className="text-gray-500 italic">
                    <Highlight query={globalQuery}>{ensureString(designation)}</Highlight>
                 </p>
            )}
            {email && (
                 <p className="text-blue-600 dark:text-blue-400 break-all font-medium">
                    <Highlight query={globalQuery}>{ensureString(email)}</Highlight>
                 </p>
            )}
            {mobile && (
                 <p className="text-gray-700 dark:text-dark-200 font-mono">
                    <Highlight query={globalQuery}>{ensureString(mobile)}</Highlight>
                 </p>
            )}
            {waLink && (
                 <a href={waLink} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex w-fit items-center rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-emerald-700">
                    WhatsApp
                 </a>
            )}
        </div>
    );
}

// Status labels (2026-11-25): "Quotation Submitted" was only "quotation created". quote_state comes from the list API.
const QUOTE_STATES = {
    pending: ["Pending", "bg-warning-100 text-warning-700 border-warning-200 dark:bg-warning-500/10 dark:text-warning-400 dark:border-warning-500/20"],
    created: ["Quotation Created", "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/20"],
    in_preparation: ["Quotation In Preparation", "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20"],
    ready_to_send: ["Quotation Ready to Send", "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20"],
    sent: ["Quotation Sent", "bg-success-100 text-success-700 border-success-200 dark:bg-success-500/10 dark:text-success-400 dark:border-success-500/20"],
    order_received: ["Order Received", "bg-emerald-200 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30"],
    regretted: ["Regretted", "bg-error-100 text-error-700 border-error-200 dark:bg-error-500/10 dark:text-error-400 dark:border-error-500/20"],
};

export function StatusCell({ getValue, row }) {
    const qs = row?.original?.quote_state;
    if (qs && QUOTE_STATES[qs]) {
        const [text, cls] = QUOTE_STATES[qs];
        return (
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm ${cls}`}>
                {text}
            </span>
        );
    }
    const val = String(getValue());
    let label = "Unknown";
    let color = "info";

    if (val === "1") {
        label = "Quotation Submitted";
        color = "success";
    } else if (val === "0") {
        label = "Pending";
        color = "warning";
    } else if (val === "91") {
        label = "Regretted";
        color = "error";
    }
    
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-${color}-100 text-${color}-700 dark:bg-${color}-500/10 dark:text-${color}-400 border border-${color}-200 dark:border-${color}-500/20 shadow-sm`}>
            {label}
        </span>
    );
}

DateCell.propTypes = {
  getValue: PropTypes.func,
};

HighlightingCell.propTypes = {
  getValue: PropTypes.func,
  column: PropTypes.object,
  table: PropTypes.object,
};

ContactPersonCell.propTypes = {
    row: PropTypes.object,
    table: PropTypes.object
};

StatusCell.propTypes = {
    getValue: PropTypes.func,
    row: PropTypes.object
};
