import {
  InboxArrowDownIcon,
  DocumentTextIcon,
  ArrowRightOnRectangleIcon,
  UserIcon,
  DocumentCheckIcon,
  WrenchScrewdriverIcon,
  UserGroupIcon,
  BeakerIcon,
  ShieldCheckIcon,
  QrCodeIcon,
  ArchiveBoxIcon,
  PencilSquareIcon,
  CurrencyRupeeIcon,
  BriefcaseIcon
} from '@heroicons/react/24/outline';
import { getStoredPermissions } from "app/navigation/dashboards";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "utils/axios";

function InfoBox({ icon: Icon, colorClass, items }) {
  const [primary, ...secondaries] = items;

  // Create a very subtle icon background based on the color string passed in
  const getColorClasses = (cls) => {
    if (cls.includes('red')) return { bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-500', hover: 'hover:text-red-600', groupHover: 'group-hover:text-red-600' };
    if (cls.includes('cyan')) return { bg: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-500', hover: 'hover:text-cyan-600', groupHover: 'group-hover:text-cyan-600' };
    if (cls.includes('indigo')) return { bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-500', hover: 'hover:text-indigo-600', groupHover: 'group-hover:text-indigo-600' };
    if (cls.includes('amber')) return { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-500', hover: 'hover:text-amber-600', groupHover: 'group-hover:text-amber-600' };
    if (cls.includes('emerald')) return { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-500', hover: 'hover:text-emerald-600', groupHover: 'group-hover:text-emerald-600' };
    return { bg: 'bg-primary-50 dark:bg-primary-500/10', text: 'text-primary-500', hover: 'hover:text-primary-600', groupHover: 'group-hover:text-primary-600' };
  };

  const colors = getColorClasses(colorClass || '');

  return (
    <div className="col-span-12 sm:col-span-6 md:col-span-4 xl:col-span-3">
      <div className="flex h-full w-full flex-col overflow-hidden rounded-lg bg-white border border-gray-200 transition-all hover:border-gray-300 dark:border-dark-600 dark:bg-dark-800 dark:hover:border-dark-500 shadow-sm hover:shadow">
        <div className="p-4 flex flex-col grow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider line-clamp-2">
              {primary.label}
            </h3>
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${colors.bg}`}>
              <Icon className={`h-6 w-6 ${colors.text}`} />
            </div>
          </div>

          {primary.href ? (
            <Link to={primary.href} className="group mb-6 flex items-end transition-colors cursor-pointer">
              <span className={`text-2xl font-bold text-gray-900 dark:text-white ${colors.groupHover} transition-colors leading-none tracking-tight`}>
                {primary.value}
              </span>
              {primary.unit && (
                <span className={`ml-1.5 mb-[2px] text-sm font-medium text-gray-500 dark:text-gray-400 ${colors.groupHover} transition-colors`}>
                  {primary.unit}
                </span>
              )}
            </Link>
          ) : (
            <div className="mb-6 flex items-end">
              <span className="text-2xl font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                {primary.value}
              </span>
              {primary.unit && (
                <span className="ml-1.5 mb-[2px] text-sm font-medium text-gray-500 dark:text-gray-400">
                  {primary.unit}
                </span>
              )}
            </div>
          )}

          {secondaries.length > 0 && (
            <div className="mt-auto space-y-0.5 pb-2">
              {secondaries.map((item, idx) => {
                if (item.href) {
                  return (
                    <Link
                      key={idx}
                      to={item.href}
                      className="group flex items-center justify-between py-2 border-t border-gray-100 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700/50 -mx-2 px-2 rounded transition-colors"
                    >
                      <span className={`text-[13px] font-medium text-gray-600 dark:text-gray-400 ${colors.groupHover} transition-colors`}>
                        {item.label}
                      </span>
                      <span className={`text-[13px] font-semibold text-gray-900 dark:text-gray-100 ${colors.groupHover} transition-colors`}>
                        {item.value}
                      </span>
                    </Link>
                  );
                }
                return (
                  <div key={idx} className="flex items-center justify-between py-2 border-t border-gray-100 dark:border-dark-700 mx-2">
                    <span className="text-[13px] font-medium text-gray-600 dark:text-gray-400">
                      {item.label}
                    </span>
                    <span className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">
                      {item.value}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, boxes }) {
  return (
    <div className="mb-8">
      <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
      <div className="grid grid-cols-12 gap-4">
        {boxes.map((box, idx) => (
          <InfoBox key={idx} {...box} />
        ))}
      </div>
    </div>
  );
}

// Additive: gate arrivals with no LRN yet, aged. Management/reporting only (server answers 403 for others -> renders nothing).
function GateAgeingBox() {
  const [sum, setSum] = useState(null);
  useEffect(() => {
    let live = true;
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const to = new Date();
    const from = new Date(); from.setDate(from.getDate() - 30);
    axios.get("/mis/gate-pending", { params: { from: iso(from), to: iso(to) } }).then((r) => { if (live) setSum(r.data?.data?.summary || null); }).catch(() => {});
    return () => { live = false; };
  }, []);
  if (!sum) return null;
  return (
    <Section
      title="Gate Arrivals Without LRN"
      boxes={[{
        colorClass: "bg-red-500",
        icon: ArrowRightOnRectangleIcon,
        items: [
          { label: "Unbooked (last 30 days)", value: sum.total ?? 0, href: "/dashboards/mis" },
          { label: "Under 1 day", value: sum.green ?? 0 },
          { label: "1-3 days", value: sum.amber ?? 0 },
          { label: "Over 3 days", value: sum.red ?? 0 },
        ],
      }]}
    />
  );
}

export function TaskStatistics({ data }) {
  if (!data) return null;

  const permissions = getStoredPermissions();
  const hasPerm = (id) => permissions.includes(id) || localStorage.getItem("bypassPermissions") === "true";

  const ind = data.individual_tasks || {};
  const dep = data.department_tasks || {};
  const lab = data.lab_head_tasks || {};
  const cal = data.calibration_tasks || {};

  const individualTasks = [
    {
      show: hasPerm(91),
      colorClass: "bg-indigo-500",
      icon: InboxArrowDownIcon,
      items: [
        { label: "Enquiry received", value: ind.enquiry?.received ?? 0 },
        { label: "Enquiry Pending", value: ind.enquiry?.pending ?? 0, href: "/dashboards/sales/enquiry" },
        { label: "Enquiry Quote Submitted", value: ind.enquiry?.quote_submitted ?? 0 },
        { label: "Converted", value: ind.enquiry?.converted ?? 0 },
        { label: "Enquiry Regretted", value: ind.enquiry?.regretted ?? 0 },
      ]
    },
    {
      show: hasPerm(93),
      colorClass: "bg-amber-500",
      icon: DocumentTextIcon,
      items: [
        { label: "Calibration Quotation", value: ind.calibration_quotation?.total ?? 0 },
        { label: "Pending Quotation", value: ind.calibration_quotation?.pending ?? 0, href: "/dashboards/sales/calibration-quotations" },
        { label: "Crf Punched", value: ind.calibration_quotation?.crf_punched ?? 0 },
        { label: "Marked Converted", value: ind.calibration_quotation?.converted ?? 0 },
        { label: "Quotation Lost", value: ind.calibration_quotation?.lost ?? 0 },
      ]
    },
    {
      show: hasPerm(141),
      colorClass: "bg-emerald-500",
      icon: DocumentTextIcon,
      items: [
        { label: "Testing Quotation", value: ind.testing_quotation?.total ?? 0 },
        { label: "Pending Quotation", value: ind.testing_quotation?.pending ?? 0, href: "/dashboards/sales/testing-quotations" },
        { label: "TRF Punched", value: ind.testing_quotation?.trf_punched ?? 0 },
        { label: "Marked Converted", value: ind.testing_quotation?.converted ?? 0 },
        { label: "Quotation Lost", value: ind.testing_quotation?.lost ?? 0 },
      ]
    },
    {
      show: hasPerm(289) || hasPerm(296),
      colorClass: "bg-cyan-500",
      icon: ArrowRightOnRectangleIcon,
      items: [
        { label: "Gate Entries", value: ind.gate_entries?.total ?? 0 },
        { label: "Pending for Issue", value: ind.gate_entries?.pending_issue ?? 0, href: "/dashboards/gate-entry" },
        { label: "Pending For Lrn", value: ind.gate_entries?.pending_lrn ?? 0, href: "/dashboards/gate-entry/issued-entry" },
      ]
    },
    {
      show: true,
      colorClass: "bg-indigo-500",
      icon: UserIcon,
      items: [
        { label: "Issued To Me", value: ind.issued_to_me?.total ?? 0 },
        { label: "Pending For Lrn/Accept", value: ind.issued_to_me?.pending_lrn ?? 0, href: "/dashboards/gate-entry/issued-to-me" },
      ]
    },
    {
      show: hasPerm(392) || hasPerm(403),
      colorClass: "bg-red-500",
      icon: DocumentCheckIcon,
      items: [
        { label: "TRF Pending For Approval", value: (ind.trf_approval?.payment_approval ?? 0) + (ind.trf_approval?.priority_approval ?? 0) + (ind.trf_approval?.witness_approval ?? 0) + (ind.trf_approval?.payment_approval_2 ?? 0) },
        { label: "Payment Approval", value: ind.trf_approval?.payment_approval ?? 0, href: "/dashboards/approvals/payment-approval-testing" },
        { label: "Priority Approval", value: ind.trf_approval?.priority_approval ?? 0, href: "/dashboards/approvals/priority-approval" },
        { label: "Witness Approval", value: ind.trf_approval?.witness_approval ?? 0, href: "/dashboards/approvals/witness-approval" },
        { label: "Payment Approval 2", value: ind.trf_approval?.payment_approval_2 ?? 0, href: "/dashboards/approvals/payment-approval-2" },
      ]
    },
    {
      show: hasPerm(125),
      colorClass: "bg-red-500",
      icon: DocumentCheckIcon,
      items: [
        { label: "TRF Pending For Review", value: (ind.trf_review?.pending_submit ?? 0) + (ind.trf_review?.pending_review ?? 0), unit: "Reports" },
        { label: "To submit for review", value: ind.trf_review?.pending_submit ?? 0, href: "/dashboards/testing/trfs-starts-jobs" },
        { label: "Pending For Review", value: ind.trf_review?.pending_review ?? 0, href: "/dashboards/testing/trfs-starts-jobs" },
      ]
    },
    {
      show: hasPerm(126),
      colorClass: "bg-emerald-500",
      icon: WrenchScrewdriverIcon,
      items: [
        { label: "Pending Technical Acceptance", value: ind.technical_acceptance?.pending_lrns ?? 0, href: "/dashboards/action-items/pending-technical-acceptance", unit: "Samples" },
      ]
    },
    {
      show: hasPerm(128),
      colorClass: "bg-amber-500",
      icon: UserGroupIcon,
      items: [
        { label: "Pending For Allotment", value: ind.pending_allotment?.samples ?? 0, href: "/dashboards/action-items/allot-sample", unit: "Samples" },
      ]
    },
    {
      show: hasPerm(7),
      colorClass: "bg-cyan-500",
      icon: BeakerIcon,
      items: [
        { label: "Pending LRN Testing", value: ind.lrn_testing?.assigned ?? 0, unit: "LRN Assigned" },
        { label: "Pending", value: ind.lrn_testing?.pending ?? 0, href: "/dashboards/action-items/perform-testing" },
      ]
    },
    {
      show: hasPerm(181),
      colorClass: "bg-indigo-500",
      icon: ShieldCheckIcon,
      items: [
        { label: "Pending For QA Review", value: ind.qa_review?.reports ?? 0, href: "/dashboards/action-items/review-by-qa", unit: "Reports" },
      ]
    },
    {
      show: hasPerm(137),
      colorClass: "bg-emerald-500",
      icon: QrCodeIcon,
      items: [
        { label: "Pending For ULR", value: ind.ulr_pending?.samples ?? 0, href: "/dashboards/action-items/generate-ulr", unit: "Samples" },
      ]
    },
    {
      show: hasPerm(333),
      colorClass: "bg-red-500",
      icon: DocumentTextIcon,
      items: [
        { label: "Pending For Upload Report", value: ind.upload_report?.reports ?? 0, href: "/dashboards/action-items/pending-upload-reports", unit: "Reports" },
      ]
    },
    {
      show: hasPerm(150) || hasPerm(400),
      colorClass: "bg-cyan-500",
      icon: ArchiveBoxIcon,
      items: [
        { label: "Total indent", value: ind.indent?.total ?? 0, href: "/dashboards/inventory/purchase-requisition" },
        { label: "Pending Approval", value: ind.indent?.pending_approval ?? 0, href: "/dashboards/inventory/purchase-requisition" },
        { label: "Pending Transfer", value: ind.indent?.approved_pending_transfer ?? 0, href: "/dashboards/inventory/purchase-requisition" },
        { label: "Completed Indent", value: ind.indent?.completed ?? 0 },
      ]
    },
    {
      show: true,
      colorClass: "bg-indigo-500",
      icon: PencilSquareIcon,
      items: [
        { label: "Pending Esignature", value: ind.esignature?.pending ?? 0, href: "/dashboards/approvals/approve-signature", unit: "Pending" },
      ]
    },
    {
      show: hasPerm(143),
      colorClass: "bg-amber-500",
      icon: CurrencyRupeeIcon,
      items: [
        { label: "Testing Unbilled Lrn", value: ind.testing_unbilled?.pending ?? 0, href: "/dashboards/accounts/testing-unbilled-items", unit: "Pending" },
      ]
    },
    {
      show: hasPerm(146),
      colorClass: "bg-emerald-500",
      icon: CurrencyRupeeIcon,
      items: [
        { label: "Calibration Unbilled Lrn", value: ind.calibration_unbilled?.pending ?? 0, href: "/dashboards/accounts/calibration-unbilled-items", unit: "Pending" },
      ]
    },
  ];

  const departmentTasks = [
    {
      show: hasPerm(288),
      colorClass: "bg-emerald-500",
      icon: WrenchScrewdriverIcon,
      items: [
        { label: "Pending Acceptance", value: dep.pending_acceptance?.samples ?? 0, href: "/dashboards/action-items/accept-sample", unit: "Samples" },
      ]
    },
    {
      show: hasPerm(6),
      colorClass: "bg-amber-500",
      icon: UserGroupIcon,
      items: [
        { label: "Pending Assignment", value: dep.pending_assignment?.samples ?? 0, href: "/dashboards/action-items/assign-chemist", unit: "Samples" },
      ]
    },
    {
      show: true, // within department
      colorClass: "bg-cyan-500",
      icon: BeakerIcon,
      items: [
        { label: "Pending LRN Testing", value: dep.lrn_testing_hod?.pending ?? 0, href: "/dashboards/notifications?category=Pending+LRN+Testing", unit: "Pending" },
      ]
    },
    {
      show: hasPerm(180),
      colorClass: "bg-indigo-500",
      icon: DocumentCheckIcon,
      items: [
        { label: "Pending For HOD Review", value: dep.hod_review?.reports ?? 0, href: "/dashboards/action-items/review-by-hod", unit: "Reports" },
      ]
    },
    {
      show: hasPerm(181),
      colorClass: "bg-red-500",
      icon: ShieldCheckIcon,
      items: [
        { label: "Pending For QA Review", value: dep.qa_review_hod?.reports ?? 0, href: "/dashboards/action-items/review-by-qa", unit: "Reports" },
      ]
    }
  ];

  const labHeadTasks = [
    {
      show: true,
      colorClass: "bg-indigo-500",
      icon: InboxArrowDownIcon,
      items: [
        { label: "Enquiry received", value: lab.enquiry_lab?.received ?? 0 },
        { label: "Enquiry Pending", value: lab.enquiry_lab?.pending ?? 0, href: "/dashboards/sales/enquiry" },
        { label: "Enquiry Converted", value: lab.enquiry_lab?.converted ?? 0 },
        { label: "Enquiry Lost", value: lab.enquiry_lab?.lost ?? 0 },
      ]
    },
    {
      show: true,
      colorClass: "bg-amber-500",
      icon: DocumentTextIcon,
      items: [
        { label: "Calibration Quotation", value: lab.calibration_quotation_lab?.total ?? 0 },
        { label: "Pending Quotation", value: lab.calibration_quotation_lab?.pending ?? 0, href: "/dashboards/sales/calibration-quotations" },
        { label: "Quotation Converted", value: lab.calibration_quotation_lab?.converted ?? 0 },
        { label: "Quotation Lost", value: lab.calibration_quotation_lab?.lost ?? 0 },
      ]
    },
    {
      show: true,
      colorClass: "bg-emerald-500",
      icon: DocumentTextIcon,
      items: [
        { label: "Testing Quotation", value: lab.testing_quotation_lab?.total ?? 0 },
        { label: "Pending Quotation", value: lab.testing_quotation_lab?.pending ?? 0, href: "/dashboards/sales/testing-quotations" },
        { label: "Quotation Converted", value: lab.testing_quotation_lab?.converted ?? 0 },
        { label: "Quotation Lost", value: lab.testing_quotation_lab?.lost ?? 0 },
      ]
    },
    {
      show: true,
      colorClass: "bg-cyan-500",
      icon: ArrowRightOnRectangleIcon,
      items: [
        { label: "Gate Entry", value: lab.gate_entry_lab?.total ?? 0 },
        { label: "Pending", value: lab.gate_entry_lab?.pending ?? 0, href: "/dashboards/gate-entry" },
        { label: "Allotted", value: lab.gate_entry_lab?.allotted ?? 0, href: "/dashboards/gate-entry/issued-entry" },
      ]
    },
    {
      show: hasPerm(128),
      colorClass: "bg-amber-500",
      icon: UserGroupIcon,
      items: [
        { label: "Pending For Allotment", value: lab.pending_allotment_lab?.samples ?? 0, href: "/dashboards/action-items/allot-sample", unit: "Samples" },
      ]
    },
    {
      show: hasPerm(288),
      colorClass: "bg-emerald-500",
      icon: WrenchScrewdriverIcon,
      items: [
        { label: "Pending Acceptance", value: lab.pending_acceptance_lab?.samples ?? 0, unit: "Samples" },
      ]
    },
    {
      show: hasPerm(6),
      colorClass: "bg-amber-500",
      icon: UserGroupIcon,
      items: [
        { label: "Pending For Assignment", value: lab.pending_assignment_lab?.samples ?? 0, unit: "Samples" },
      ]
    },
    {
      show: true,
      colorClass: "bg-cyan-500",
      icon: BeakerIcon,
      items: [
        { label: "Pending For Testing", value: lab.pending_testing_lab?.parameters ?? 0, unit: "Parameters" },
        { label: "Assigned To You", value: lab.pending_testing_lab?.assigned_to_you ?? 0, href: "/dashboards/action-items/perform-testing" },
      ]
    },
    {
      show: true,
      colorClass: "bg-indigo-500",
      icon: DocumentCheckIcon,
      items: [
        { label: "Pending For HOD Review", value: lab.hod_review_lab?.reports ?? 0, unit: "Reports" },
      ]
    },
    {
      show: true,
      colorClass: "bg-red-500",
      icon: ShieldCheckIcon,
      items: [
        { label: "Pending For QA Review", value: lab.qa_review_lab?.reports ?? 0, unit: "Reports" },
      ]
    },
    {
      show: true,
      colorClass: "bg-emerald-500",
      icon: QrCodeIcon,
      items: [
        { label: "Pending For ULR", value: lab.ulr_pending_lab?.samples ?? 0, unit: "Samples" },
      ]
    },
    {
      show: true,
      colorClass: "bg-indigo-500",
      icon: PencilSquareIcon,
      items: [
        { label: "Pending Esignature", value: lab.esignature_lab?.requests ?? 0, unit: "Requests" },
        { label: "Issued To You", value: lab.esignature_lab?.issued_to_you ?? 0, href: "/dashboards/approvals/approve-signature" },
      ]
    },
    {
      show: true,
      colorClass: "bg-cyan-500",
      icon: ArrowRightOnRectangleIcon,
      items: [
        { label: "Items On Gate", value: lab.items_on_gate?.items ?? 0, unit: "Items" },
      ]
    }
  ];

  const calibrationTasks = [
    {
      show: hasPerm(270),
      colorClass: "bg-amber-500",
      icon: BriefcaseIcon,
      items: [
        { label: "Calibration Invoice Pending For Approval", value: cal.calibration_invoice_pending?.items ?? 0, href: "/dashboards/accounts/calibration-invoice-approval", unit: "Items" },
      ]
    },
    {
      show: hasPerm(270),
      colorClass: "bg-emerald-500",
      icon: BriefcaseIcon,
      items: [
        { label: "Testing Invoice Pending", value: cal.testing_invoice_pending?.items ?? 0, href: "/dashboards/notifications?category=Approve+Testing+Invoice", unit: "Items" },
      ]
    },
    {
      show: hasPerm(346) || hasPerm(203),
      colorClass: "bg-indigo-500",
      icon: DocumentCheckIcon,
      items: [
        { label: "Pending Lrn Cancel Request", value: cal.lrn_cancel_request?.items ?? 0, href: "/dashboards/notifications?category=Pending+Lrn+Cancel+Request", unit: "Items" },
      ]
    },
    {
      show: true,
      colorClass: "bg-red-500",
      icon: PencilSquareIcon,
      items: [
        { label: "Revision Request", value: cal.revision_request?.items ?? 0, href: "/dashboards/notifications?category=Revision+Request", unit: "Items" },
      ]
    },
    {
      show: true,
      colorClass: "bg-cyan-500",
      icon: DocumentTextIcon,
      items: [
        { label: "CRF Pending Review", value: cal.crf_pending_review?.crf ?? 0, href: "/dashboards/notifications?category=CRF+Pending+Review", unit: "CRF" },
      ]
    },
    {
      show: true,
      colorClass: "bg-amber-500",
      icon: WrenchScrewdriverIcon,
      items: [
        { label: "CRF Tech Acceptance", value: cal.crf_technical_acceptance?.crf ?? 0, href: "/dashboards/notifications?category=CRF+Tech+Acceptance", unit: "CRF" },
      ]
    },
    {
      show: true,
      colorClass: "bg-emerald-500",
      icon: ArrowRightOnRectangleIcon,
      items: [
        { label: "Transfer Item to Lab", value: cal.transfer_item_to_lab?.items ?? 0, href: "/dashboards/notifications?category=Transfer+Item+to+Lab", unit: "Items" },
      ]
    },
    {
      show: true,
      colorClass: "bg-indigo-500",
      icon: UserGroupIcon,
      items: [
        { label: "Allot User To Item", value: cal.allot_user_to_item?.items ?? 0, href: "/dashboards/notifications?category=Allot+User+To+Item", unit: "Items" },
      ]
    },
    {
      show: true,
      colorClass: "bg-red-500",
      icon: DocumentTextIcon,
      items: [
        { label: "Fill Raw Data", value: cal.fill_raw_data?.items ?? 0, href: "/dashboards/notifications?category=Fill+Raw+Data", unit: "Items" },
      ]
    },
    {
      show: true,
      colorClass: "bg-cyan-500",
      icon: ShieldCheckIcon,
      items: [
        { label: "Review Certificate", value: cal.review_certificate?.items ?? 0, href: "/dashboards/notifications?category=Review+Certificate", unit: "Items" },
      ]
    },
    {
      show: true,
      colorClass: "bg-amber-500",
      icon: DocumentCheckIcon,
      items: [
        { label: "Approve Certificate", value: cal.approve_certificate?.items ?? 0, href: "/dashboards/notifications?category=Approve+Certificate", unit: "Items" },
      ]
    },
  ];

  const filteredIndividual = individualTasks.filter((t) => t.show !== false);
  const filteredDepartment = departmentTasks.filter((t) => t.show !== false);
  const filteredLabHead = labHeadTasks.filter((t) => t.show !== false);
  const filteredCalibration = calibrationTasks.filter((t) => t.show !== false);

  const showDeptSection = hasPerm(379) && filteredDepartment.length > 0;
  const showLabHeadSection = hasPerm(346) && filteredLabHead.length > 0;
  // Calibration section will show if any contained item has permission
  const showCalibrationSection = filteredCalibration.length > 0;

  return (
    <div className="w-full mt-6 px-4 sm:px-4">
      {filteredIndividual.length > 0 && <Section title="Individual Task" boxes={filteredIndividual} />}
      {showDeptSection && <Section title="Department Task" boxes={filteredDepartment} />}
      {showLabHeadSection && <Section title="Lab head Dashboard" boxes={filteredLabHead} />}
      {showCalibrationSection && <Section title="Calibration" boxes={filteredCalibration} />}
      <GateAgeingBox />
    </div>
  );
}
