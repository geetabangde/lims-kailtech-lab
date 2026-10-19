// Import Dependencies
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import axios from "utils/axios";
import { toast } from "sonner";

// Local Imports
import { Card, Button, ReactSelect as Select } from "components/ui";
import { Page } from "components/shared/Page";
import ReturnTRFInst from "./ReturnTRFInst";
import ReturnInwardInst from "./ReturnInwardInst";
import ReturnInsta from "./ReturnInsta";

function usePermissions() {
    const p = localStorage.getItem("userPermissions");
    try {
        return JSON.parse(p) || [];
    } catch {
        return p?.split(",").map(Number) || [];
    }
}

export default function ReturnInstrument() {
    const permissions = usePermissions();
    const navigate = useNavigate();
    const { control, handleSubmit, watch, register, setValue } = useForm({
        defaultValues: {
            purpose: "",
            returnby: "",
            inwarddinid: "",
            trfdinid: "",
            dinid: "",
        }
    });

    const [loading, setLoading] = useState(false);
    const [purposes, setPurposes] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [inwardDins, setInwardDins] = useState([]);
    const [trfDins, setTrfDins] = useState([]);
    const [masterDins, setMasterDins] = useState([]);

    // State for the loaded table data
    const [issueItems, setIssueItems] = useState([]);
    const [inwardItems, setInwardItems] = useState([]);
    const [trfItems, setTrfItems] = useState([]);

    const purpose = watch("purpose");

    useEffect(() => {
        setIssueItems([]);
        setInwardItems([]);
        setTrfItems([]);
    }, [purpose]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const response = await axios.get("inventory/get-add-dispatch-data");

            if (response.data.status && response.data.data) {
                const { purposes, employees, inward_din, trf_din, din_master } = response.data.data;

                if (purposes) {
                    setPurposes(purposes.filter(p => ![8, 9, 10, 11].includes(p.id)));
                }
                if (employees) {
                    setEmployees(employees);
                }
                if (inward_din) {
                    setInwardDins(inward_din);
                }
                if (trf_din) {
                    setTrfDins(trf_din);
                }
                if (din_master) {
                    setMasterDins(din_master);
                }
            }
        } catch (err) {
            console.error("Error fetching initial data:", err);
        }
    };

    const handleDinChange = async (dinId) => {
        if (!dinId) {
            setIssueItems([]);
            return;
        }
        try {
            const response = await axios.get(`inventory/return-inward-inst/${dinId}`);
            if (response.data.status && Array.isArray(response.data.data)) {
                setIssueItems(response.data.data);
            }
        } catch (err) {
            console.error("Error fetching issue items:", err);
        }
    };

    const handleInwardDinChange = async (dinId) => {
        if (!dinId) {
            setInwardItems([]);
            return;
        }
        try {
            const response = await axios.get(`inventory/return-inward-inst/${dinId}`);
            if (response.data.status && Array.isArray(response.data.data)) {
                setInwardItems(response.data.data);
            }
        } catch (err) {
            console.error("Error fetching inward items:", err);
        }
    };

    const handleTrfDinChange = async (dinId) => {
        if (!dinId) {
            setTrfItems([]);
            return;
        }
        try {
            const response = await axios.get(`inventory/return-trf-inst/${dinId}`);
            if (response.data.status && Array.isArray(response.data.data)) {
                setTrfItems(response.data.data);
            }
        } catch (err) {
            console.error("Error fetching TRF items:", err);
        }
    };

    const onSubmit = async (formData) => {
        // Extract native form data to handle identical name[] inputs correctly
        const formElement = document.getElementById("returninhouse");
        const nativeFormData = new FormData(formElement);

        // Validation checks
        if (['1', '2', '3', '4', '5'].includes(String(formData.purpose))) {
            const notfillreturn = document.querySelectorAll('.item-chklist').length;
            const totalmasterid = document.getElementById('totalmasterid')?.value;
            const items = document.querySelectorAll('.item-issue').length;

            if (items === 0 && notfillreturn === 0) {
                toast.error("No Item is Added");
                return;
            } else if (totalmasterid && notfillreturn === parseInt(totalmasterid)) {
                toast.error("Please Fill Atleast One Checklist Return");
                return;
            }
        } else if (String(formData.purpose) === "7") {
            const selectedIds = (formData.ids && formData.ids.length > 0)
                ? (Array.isArray(formData.ids) ? formData.ids : [formData.ids])
                : (nativeFormData.getAll('ids').length > 0 ? nativeFormData.getAll('ids') : nativeFormData.getAll('ids[]'));
            if (!selectedIds || selectedIds.length === 0) {
                toast.error("Please select at least one instrument to return");
                return;
            }
        }

        // Prepare payload exactly as requested by backend
        let activeDinId = formData.dinid;
        if (String(formData.purpose) === "7") activeDinId = formData.inwarddinid;
        if (String(formData.purpose) === "6") activeDinId = formData.trfdinid;

        let payload = {};

        if (['1', '2', '3', '4', '5'].includes(String(formData.purpose))) {
            const validItems = formData.items || [];

            payload = {
                purpose: Number(formData.purpose),
                dinid: Number(activeDinId),
                returnby: Number(formData.returnby),
                itemid: validItems.map(i => Number(i.itemid)),
                issuedto: validItems.map(i => Number(i.issuedto)),
                issueid: validItems.map(i => Number(i.issueid)),
                returnlocation: validItems.map(i => i.returnlocation),
                returnqty: validItems.map(i => Number(i.qty)),
                instissuetype: validItems.map(i => Number(i.instissuetype))
            };
        } else {
            const rawIds = (formData.ids && formData.ids.length > 0)
                ? (Array.isArray(formData.ids) ? formData.ids : [formData.ids])
                : (nativeFormData.getAll('ids').length > 0 ? nativeFormData.getAll('ids') : nativeFormData.getAll('ids[]'));

            payload = {
                ...formData,
                purpose: Number(formData.purpose),
                dinid: Number(activeDinId),
                returnqty: nativeFormData.getAll('qty[]').map(Number),
                itemid: nativeFormData.getAll('itemid[]').map(Number),
                issuedto: nativeFormData.getAll('issuedto[]').map(Number),
                issueid: nativeFormData.getAll('issueid[]').map(Number),
                returnlocation: nativeFormData.getAll('returnlocation[]'),
                instissuetype: nativeFormData.getAll('instissuetype[]').map(Number),
                ids: rawIds.map(Number),
            };

            // Clean up UI-specific or raw bracketed keys
            Object.keys(payload).forEach(key => {
                if (key.endsWith('[]')) {
                    delete payload[key];
                }
            });
            delete payload.qty;
            delete payload.inwarddinid;
            delete payload.trfdinid;
        }

        try {
            setLoading(true);
            const response = await axios.post("inventory/add-dispatch-return", payload);
            if (response.data.status) {
                toast.success(response.data.message || "Return submitted successfully");
                setTimeout(() => {
                    navigate("/dashboards/inventory/dispatch-return");
                }, 1500);
            } else {
                toast.error(response.data.message || "Failed to submit return");
            }
        } catch {
            toast.error("An error occurred while submitting the return");
        } finally {
            setLoading(false);
        }
    };

    if (!permissions.includes(316)) {
        return (
            <Page title="Dispatch Return">
                <div className="flex h-60 items-center justify-center rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">
                        Access Denied - Permission 316 required
                    </p>
                </div>
            </Page>
        );
    }

    return (
        <Page title="Dispatch Return">
            <Card className="flex flex-col">
                <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-dark-500 sm:p-5">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-dark-100">
                        Return
                    </h3>
                    <Button
                        component={Link}
                        to="/dashboards/inventory/dispatch-return"
                        color="info"
                        size="sm"
                    >
                        {"<< Back to Record List"}
                    </Button>
                </div>
                <div className="p-4 sm:p-5">
                    <form id="returninhouse" className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="flex flex-col gap-2">
                                <Controller
                                    name="purpose"
                                    control={control}
                                    rules={{ required: "Required" }}
                                    render={({ field, fieldState }) => (
                                        <Select
                                            {...field}
                                            id="purpose"
                                            label="Return From"
                                            options={purposes.map(p => ({ value: p.id, label: p.name }))}
                                            placeholder="Select"
                                            error={fieldState.error?.message}
                                        />
                                    )}
                                />
                            </div>

                            {[1, 2, 3, 4, 5].includes(Number(purpose)) && (
                                <div className="flex flex-col gap-2">
                                    <Controller
                                        name="returnby"
                                        control={control}
                                        rules={{ required: "Required" }}
                                        render={({ field, fieldState }) => (
                                            <Select
                                                {...field}
                                                id="returnby"
                                                label="Employee Name"
                                                options={employees.map(e => ({ value: e.id, label: e.employee_name }))}
                                                placeholder="Select"
                                                error={fieldState.error?.message}
                                            />
                                        )}
                                    />
                                </div>
                            )}
                        </div>

                        {String(purpose) === "7" && (
                            <div className="flex flex-col gap-2 max-w-md">
                                <Controller
                                    name="inwarddinid"
                                    control={control}
                                    rules={{ required: "Required" }}
                                    render={({ field, fieldState }) => (
                                        <Select
                                            {...field}
                                            id="inwarddinid"
                                            label="Inward Din"
                                            options={inwardDins.map(d => ({ value: d.id, label: `${d.id} ${d.customername} (${d.challanno})` }))}
                                            placeholder="Select"
                                            onChange={(val) => {
                                                field.onChange(val);
                                                handleInwardDinChange(val);
                                            }}
                                            error={fieldState.error?.message}
                                        />
                                    )}
                                />
                            </div>
                        )}

                        {String(purpose) === "6" && (
                            <div className="flex flex-col gap-2 max-w-md">
                                <Controller
                                    name="trfdinid"
                                    control={control}
                                    rules={{ required: "Required" }}
                                    render={({ field, fieldState }) => (
                                        <Select
                                            {...field}
                                            id="trfdinid"
                                            label="TRF Din"
                                            options={trfDins.map(d => ({ value: d.id, label: `${d.id} ${d.customername} (${d.challanno})` }))}
                                            placeholder="Select"
                                            onChange={(val) => {
                                                field.onChange(val);
                                                handleTrfDinChange(val);
                                            }}
                                            error={fieldState.error?.message}
                                        />
                                    )}
                                />
                            </div>
                        )}

                        {[1, 2, 3, 4, 5].includes(Number(purpose)) && (
                            <div className="flex flex-col gap-2 max-w-md">
                                <Controller
                                    name="dinid"
                                    control={control}
                                    rules={{ required: "Required" }}
                                    render={({ field, fieldState }) => (
                                        <Select
                                            {...field}
                                            id="dinid"
                                            label="Din"
                                            options={masterDins.map(d => ({ value: d.id, label: `${d.id} ${d.customername} (${d.challanno})` }))}
                                            placeholder="Select"
                                            onChange={(val) => {
                                                field.onChange(val);
                                                handleDinChange(val);
                                            }}
                                            error={fieldState.error?.message}
                                        />
                                    )}
                                />
                            </div>
                        )}

                        {/* Renders the correct child component based on loaded state arrays */}
                        {String(purpose) === "7" && inwardItems.length > 0 && (
                            <ReturnInwardInst
                                inwardItems={inwardItems}
                                setInwardItems={setInwardItems}
                                register={register}
                                setValue={setValue}
                                watch={watch}
                            />
                        )}

                        {String(purpose) === "6" && trfItems.length > 0 && (
                            <ReturnTRFInst
                                trfItems={trfItems}
                                setTrfItems={setTrfItems}
                                register={register}
                                setValue={setValue}
                            />
                        )}

                        {[1, 2, 3, 4, 5].includes(Number(purpose)) && issueItems.length > 0 && (
                            <ReturnInsta
                                issueItems={issueItems}
                                register={register}
                            />
                        )}

                    </form>
                </div>
                <div className="flex justify-end border-t border-gray-100 p-4 sm:p-5">
                    <Button
                        type="button"
                        color="success"
                        size="lg"
                        className="font-bold"
                        loading={loading}
                        onClick={handleSubmit(onSubmit)}
                    >
                        Submit
                    </Button>
                </div>
            </Card>
        </Page>
    );
}
