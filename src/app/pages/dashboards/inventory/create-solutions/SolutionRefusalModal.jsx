// Import Dependencies
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import PropTypes from "prop-types";
import { ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";

// Local Imports
import { Button } from "components/ui";

// ----------------------------------------------------------------------

// Detailed pop-up shown when a solution cannot be saved (management rules: expiry limit, expired parent, stock balance).
// It stays on the screen until the user closes it with the X button (or Close): no timer, and a click outside does not close it.
export default function SolutionRefusalModal({ show, onClose, message, errors }) {
  const list = Array.isArray(errors) ? errors : [];

  return (
    <Transition
      appear
      show={show}
      as={Dialog}
      static
      onClose={() => {}}
      className="fixed inset-0 z-100 flex flex-col items-center justify-center overflow-hidden px-4 py-6 sm:px-5"
    >
      <TransitionChild
        as="div"
        enter="ease-out duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-200"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
        className="absolute inset-0 bg-gray-900/50 transition-opacity dark:bg-black/40"
      />

      <TransitionChild
        as={DialogPanel}
        enter="ease-out duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-200"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white transition-opacity duration-300 dark:bg-dark-700"
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-4 dark:border-dark-500 sm:px-5">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="text-error size-8 shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-100">
                This solution cannot be saved
              </h3>
              <p className="mt-0.5 text-sm text-gray-600 dark:text-dark-300">
                {message || "Please read the reason(s) below, correct them and try again."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            aria-label="Close"
            className="rounded p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:text-dark-300 dark:hover:bg-dark-600"
          >
            <XMarkIcon className="size-6" />
          </button>
        </div>

        <div className="scrollbar-sm space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
          {list.map((e, i) => (
            <div key={i} className="rounded-lg border border-gray-200 p-3 dark:border-dark-500">
              <p className="text-sm font-semibold text-gray-800 dark:text-dark-100">
                {i + 1}. {e.title}
              </p>
              <dl className="mt-2 grid grid-cols-[9rem_1fr] gap-x-3 gap-y-1 text-sm">
                {e.rule === "expiry" ? (
                  <>
                    <dt className="text-gray-500 dark:text-dark-300">Parent</dt>
                    <dd className="text-gray-800 dark:text-dark-100">{e.product}</dd>
                    {e.batch ? (
                      <>
                        <dt className="text-gray-500 dark:text-dark-300">Parent batch</dt>
                        <dd className="text-gray-800 dark:text-dark-100">{e.batch}</dd>
                      </>
                    ) : null}
                    <dt className="text-gray-500 dark:text-dark-300">Latest allowed expiry</dt>
                    <dd className="text-gray-800 dark:text-dark-100">{e.limit}</dd>
                    <dt className="text-gray-500 dark:text-dark-300">Your expiry</dt>
                    <dd className="text-gray-800 dark:text-dark-100">{e.own_expiry}</dd>
                  </>
                ) : (
                  <>
                    <dt className="text-gray-500 dark:text-dark-300">Item</dt>
                    <dd className="text-gray-800 dark:text-dark-100">{e.product}</dd>
                    {e.batch ? (
                      <>
                        <dt className="text-gray-500 dark:text-dark-300">Batch</dt>
                        <dd className="text-gray-800 dark:text-dark-100">{e.batch}</dd>
                      </>
                    ) : null}
                    <dt className="text-gray-500 dark:text-dark-300">Expiry</dt>
                    <dd className="text-gray-800 dark:text-dark-100">{e.expiry || "No expiry date"}</dd>
                    {e.available !== null && e.available !== undefined ? (
                      <>
                        <dt className="text-gray-500 dark:text-dark-300">Available</dt>
                        <dd className="text-gray-800 dark:text-dark-100">
                          {e.available} {e.unit || ""}
                        </dd>
                      </>
                    ) : null}
                    {e.requested !== null && e.requested !== undefined ? (
                      <>
                        <dt className="text-gray-500 dark:text-dark-300">Quantity asked</dt>
                        <dd className="text-gray-800 dark:text-dark-100">
                          {e.requested} {e.unit || ""}
                        </dd>
                      </>
                    ) : null}
                  </>
                )}
              </dl>
              <p className="mt-2 text-sm text-gray-700 dark:text-dark-200">
                <span className="font-semibold">What to do: </span>
                {e.advice}
              </p>
            </div>
          ))}
        </div>

        <div className="flex justify-end border-t border-gray-200 px-4 py-3 dark:border-dark-500 sm:px-5">
          <Button onClick={onClose} color="primary" className="h-9 min-w-[7rem]">
            Close
          </Button>
        </div>
      </TransitionChild>
    </Transition>
  );
}

SolutionRefusalModal.propTypes = {
  show: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  message: PropTypes.string,
  errors: PropTypes.array,
};
