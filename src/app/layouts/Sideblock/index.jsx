// Import Dependencies
import { Outlet, useLocation } from "react-router";
import { useState, useEffect, useRef } from "react";
import axios from "utils/axios";

// Local Imports
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { AddTicketModal } from "components/modals/AddTicketModal";
import { AddEnvironmentalRecordModal } from "components/modals/AddEnvironmentalRecordModal";
import { useLabsContext } from "app/contexts/labs/context";

// ----------------------------------------------------------------------

export default function Sideblock() {
  const { labs } = useLabsContext();
  const { pathname } = useLocation();
  const onMis = pathname.startsWith("/dashboards/mis");
  const envCheckedRef = useRef(false);

  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);

  const [envLabName, setEnvLabName] = useState("Processing");
  const [envFormFields, setEnvFormFields] = useState([]);
  const [currentLabId, setCurrentLabId] = useState(null);

  useEffect(() => {
    // 18-Nov-2026: no Environmental Record pop-up on the MIS page (it covered the tracker). The check runs on the first other page instead, once per session.
    if (onMis || envCheckedRef.current) return undefined;
    // ---------------------------------------------------------
    // STEP 2: AUTO-POPUP LOGIC (Environmental Record)
    // ---------------------------------------------------------
    const checkEnvironmentalRecords = async () => {
      try {
        const userId = Number(localStorage.getItem("userId"));
        if (!userId || !labs || labs.length === 0) return;
        envCheckedRef.current = true;

        // Find all labs allotted to this specific user
        const allottedLabs = labs.filter(lab => lab.users.includes(userId));

        // Sequentially check each allotted lab for pending records
        for (const lab of allottedLabs) {
          const response = await axios.get(`/environmental/form-data/${lab.id}`);

          if (response.data?.success && response.data?.has_pending) {
            setEnvLabName(response.data.lab_name || lab.name);
            setEnvFormFields(response.data.form_fields);
            setCurrentLabId(lab.id);
            setIsEnvModalOpen(true);

            // Break early so we only show one popup at a time! 
            // Once they submit this one and the page reloads, it will check again and catch the next one.
            break;
          }
        }
      } catch (error) {
        console.error("Error fetching environmental records status:", error);
      }
    };

    // Check after a short delay to not block initial render
    const timer = setTimeout(() => {
      checkEnvironmentalRecords();
    }, 2000);

    return () => clearTimeout(timer);
  }, [labs, onMis]);

  return (
    <>
      <Header />
      <main className="main-content transition-content grid grid-cols-1">
        <Outlet />
      </main>
      <Sidebar />

      {/* Floating Support Button pinned to the bottom right */}
      <button
        onClick={() => setIsTicketModalOpen(true)}
        className="fixed bottom-1 right-1 z-[990] flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform hover:scale-110 hover:bg-red-700"
        title="Add Issue/Request"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </button>

      {/* The Modals */}
      <AddTicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
      />

      <AddEnvironmentalRecordModal
        isOpen={isEnvModalOpen && !onMis}
        onClose={() => setIsEnvModalOpen(false)}
        labName={envLabName}
        labId={currentLabId}
        formFields={envFormFields}
      />
    </>
  );
}
