// Who may use the "Send Reports & Invoice" email dispatch (calibration inward screen, testing signed reports, other lists).
// The server enforces the same rule (EmailDispatchController::dispatchManagerGate, env DISPATCH_ALLOWED_USER_IDS) - keep both lists in sync.
// Management = directors, managers, deputy/assistant managers, HODs. Add dispatch / customer-care staff to EXTRA_DISPATCH_USER_IDS
// (and to DISPATCH_ALLOWED_USER_IDS on the server) once the user names them.
export const DISPATCH_MANAGEMENT_IDS = [31, 113, 65, 37, 32, 90, 97, 41, 34, 33, 110, 136];
export const EXTRA_DISPATCH_USER_IDS = [];

export function canSendDispatchEmail() {
  let userId = NaN;
  let role = null;
  try {
    userId = Number(localStorage.getItem("userId"));
    role = localStorage.getItem("userRole");
  } catch {
    return false;
  }
  return DISPATCH_MANAGEMENT_IDS.includes(userId) || EXTRA_DISPATCH_USER_IDS.includes(userId) || role === "admin" || role === "4";
}
