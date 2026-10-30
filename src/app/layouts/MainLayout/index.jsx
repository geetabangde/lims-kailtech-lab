// Import Dependencies
import clsx from "clsx";
import { Outlet } from "react-router";
import { useState, useEffect } from "react";
import axios from "utils/axios";

// Local Imports
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { AddTicketModal } from "components/modals/AddTicketModal";
import { AddEnvironmentalRecordModal } from "components/modals/AddEnvironmentalRecordModal";
import { AllotmentAckPopup } from "components/modals/AllotmentAckPopup";

// ----------------------------------------------------------------------

export default function MainLayout() {
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);

  const [envLabName, setEnvLabName] = useState("Processing");
  const [envFormFields, setEnvFormFields] = useState([]);

  useEffect(() => {
    // ---------------------------------------------------------
    // STEP 2: AUTO-POPUP LOGIC (Environmental Record)
    // ---------------------------------------------------------
    const checkEnvironmentalRecords = async () => {
      try {
        // We use ID 5 based on your example API, you may want to change this 
        // to loop over all allotted labs or call a generic /pending endpoint
        const response = await axios.get('/api/environmental/form-data/5');
        
        if (response.data?.success && response.data?.has_pending) {
          setEnvLabName(response.data.lab_name);
          setEnvFormFields(response.data.form_fields);
          setIsEnvModalOpen(true);
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
  }, []);

  return (
    <>
      <Header />
      <main
        className={clsx("main-content transition-content grid grid-cols-1")}
      >
        <Outlet />
      </main>
      <Sidebar />
      <AllotmentAckPopup />

      {/* --------------------------------------------------------- */}
      {/* STEP 1: GLOBAL SUPPORT BUTTON & MODALS                    */}
      {/* --------------------------------------------------------- */}
      
      {/* Floating Support Button pinned to the bottom right */}
      <button 
        onClick={() => setIsTicketModalOpen(true)}
        className="fixed bottom-4 right-4 z-[990] flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform hover:scale-110 hover:bg-red-700"
        title="Add Issue/Request"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </button>

      {/* The Modals */}
      <AddTicketModal 
        isOpen={isTicketModalOpen} 
        onClose={() => setIsTicketModalOpen(false)} 
      />
      
      <AddEnvironmentalRecordModal 
        isOpen={isEnvModalOpen} 
        onClose={() => setIsEnvModalOpen(false)} 
        labName={envLabName}
        labId={5} // Based on the API example
        formFields={envFormFields}
      />
    </>
  );
}
