export const statusOptions = [
  { value: "", label: "All" },
  { value: "0", label: "Pending" },
  { value: "1", label: "Approved" },
  { value: "2", label: "Rejected" },
];

export const leaveTypeOptions = [
  { value: "", label: "All" },
  { value: "CL", label: "Casual Leave (CL)" },
  { value: "HCL", label: "Half Day (HCL)" },
  { value: "SL", label: "Sick Leave (SL)" },
  { value: "EL", label: "Earned Leave (EL)" },
  { value: "CO", label: "Comp Off" },
];

export const LEAVE_TYPE_MAP = {
  "1": "Casual Leave (CL)",
  "2": "Sick Leave (SL)",
  "3": "Earned Leave (EL)",
  "4": "Comp Off",
  "CL": "Casual Leave (CL)",
  "HCL": "Half Day (HCL)",
  "SL": "Sick Leave (SL)",
  "EL": "Earned Leave (EL)",
  "CO": "Comp Off",
  "Compoff": "Comp Off",
  "compoff": "Comp Off",
  "UPHL": "Unpaid Half Leave (UPHL)",
  "UPL": "Unpaid Leave (UPL)",
};
