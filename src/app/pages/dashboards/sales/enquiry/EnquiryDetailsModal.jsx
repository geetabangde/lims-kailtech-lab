import PropTypes from "prop-types";
import ModalShell, { btnGhost } from "../shared/ModalShell";
import EnquiryDetailsPanel from "./EnquiryDetailsPanel";

// Dedicated pop-up with all the details of one enquiry (opened by the small "Details" button at the end of the row)
export default function EnquiryDetailsModal({ show, row, onClose }) {
  if (!show || !row) return null;
  return (
    <ModalShell
      show={show}
      onClose={onClose}
      widthClass="max-w-5xl"
      title="Enquiry Details"
      subtitle={`Enquiry #${row.original.id} - ${row.original.name || ""}`}
      footer={
        <button type="button" className={btnGhost} onClick={onClose}>
          Close
        </button>
      }
    >
      <EnquiryDetailsPanel row={row} />
    </ModalShell>
  );
}
EnquiryDetailsModal.propTypes = {
  show: PropTypes.bool,
  row: PropTypes.object,
  onClose: PropTypes.func.isRequired,
};
