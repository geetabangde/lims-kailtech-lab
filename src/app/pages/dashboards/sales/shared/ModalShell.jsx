import PropTypes from "prop-types";

// Small shared popup frame used by the lifecycle popups (matches the existing quotation modals).
export default function ModalShell({ show, title, subtitle, onClose, children, footer }) {
  if (!show) return null;
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white text-left shadow-xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div>
            <h4 className="text-base font-semibold text-gray-800 dark:text-white">{title}</h4>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="text-lg leading-none text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3 dark:border-gray-700">{footer}</div>
        )}
      </div>
    </div>
  );
}
ModalShell.propTypes = {
  show: PropTypes.bool,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node,
  footer: PropTypes.node,
};

export const fieldCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200";
export const btnGhost =
  "rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400";
export const btnPrimary =
  "rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60";
export const btnDanger =
  "rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60";
export const btnGreen =
  "rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60";
