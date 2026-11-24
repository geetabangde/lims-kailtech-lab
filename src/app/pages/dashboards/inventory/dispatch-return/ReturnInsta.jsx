import { useState, useEffect } from "react";
import axios from "utils/axios";

export default function ReturnInsta({ issueItems, register }) {
    const [fetchedData, setFetchedData] = useState({});

    // Load the challan-linked quantity for every row as soon as the list is shown (it used to load only after "Issued To" was changed,
    // so the Quantity box stayed empty). Additive: same endpoint, same handler.
    useEffect(() => {
        (issueItems || []).forEach((it) => {
            const id = it.issue_id || it.id;
            if (id && !it.checklist_not_filled) handleIssuedToChange(id);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [issueItems]);

    if (!issueItems || issueItems.length === 0) return null;

    const totalid = issueItems.length;

    const handleIssuedToChange = async (issueId) => {
        if (!issueId) return;
        try {
            const response = await axios.get(`inventory/get-return-quantity/${issueId}`);
            if (response.data && response.data.status) {
                setFetchedData(prev => ({
                    ...prev,
                    [issueId]: {
                        qty: response.data.issued_qty ?? response.data.return_qty,
                        type: response.data.type_of_use
                    }
                }));
            }
        } catch (err) {
            console.error("Error fetching return quantity", err);
        }
    };

    return (
        <div className="mt-6 border-t border-gray-100 pt-6">
            <h4 className="mb-4 text-lg font-semibold text-gray-800 dark:text-dark-100">Master Calibration Instrument Details</h4>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-dark-500">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-500">
                    <thead className="bg-gray-50 dark:bg-dark-800">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase dark:text-dark-200">ID Number</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase dark:text-dark-200">Name Of The Item And Spares</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase dark:text-dark-200">Issued To</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase dark:text-dark-200">Return To:</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase dark:text-dark-200">Quantity</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase dark:text-dark-200">Remark</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white dark:divide-dark-500 dark:bg-dark-700">
                        {issueItems.map((item, index) => {
                            // Render Checklist Error Row if checklist_not_filled is true
                            if (item.checklist_not_filled) {
                                return (
                                    <tr key={item.issue_id || item.id || index} className="item-chklist">
                                        <td colSpan="6" className="px-4 py-3 text-sm text-red-500 font-medium">
                                            {item.checklist_error_msg || `${item.instrument_name || item.name} ${item.instrument_code || item.idno} Return Check List Not Filled`}
                                        </td>
                                    </tr>
                                );
                            }

                            // Regular Row
                            const issueId = item.issue_id || item.id;
                            const currentQty = fetchedData[issueId]?.qty ?? item.qty;
                            const currentType = fetchedData[issueId]?.type ?? item.inst_issue_type ?? item.instissuetype;

                            return (
                                <tr key={issueId} className="item-issue">
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 dark:text-dark-100">{item.instrument_code || item.idno}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 dark:text-dark-100">{item.instrument_name || item.name}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                                        <select
                                            className="w-full min-w-[180px] rounded border border-gray-300 dark:border-dark-500 bg-white dark:bg-dark-700 p-2 text-sm"
                                            {...register(`items.${index}.issuedto`, {
                                                onChange: () => {
                                                    handleIssuedToChange(issueId);
                                                }
                                            })}
                                            defaultValue=""
                                        >
                                            <option value="">Select</option>
                                            {/* Support both new structure (issued_to object) and old structure */}
                                            {(item.issued_to?.id || item.id) && (
                                                <option value={item.issued_to?.id || item.id}>
                                                    {item.issued_to?.name || item.issuedtoname}
                                                </option>
                                            )}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                                        <select
                                            className="w-full min-w-[180px] rounded border border-gray-300 dark:border-dark-500 bg-white dark:bg-dark-700 p-2 text-sm"
                                            {...register(`items.${index}.returnlocation`, {
                                                required: "Return Location is required"
                                            })}
                                            defaultValue=""
                                        >
                                            <option value="">choose one..</option>
                                            {item.return_locations && item.return_locations.length > 0 ? (
                                                item.return_locations.map(loc => (
                                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                                ))
                                            ) : (
                                                <option value="24">Store</option>
                                            )}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                                        <div className="locqty flex gap-2">
                                            {fetchedData[issueId] ? (
                                                String(currentType) === "1" ? (
                                                    <>
                                                        <input
                                                            type="text"
                                                            disabled
                                                            value={currentQty || ""}
                                                            className="w-1/2 rounded border border-gray-300 dark:border-dark-500 bg-gray-100 dark:bg-dark-800 p-2 text-sm cursor-not-allowed"
                                                        />
                                                        <input
                                                            type="number"
                                                            className="w-1/2 rounded border border-gray-300 dark:border-dark-500 bg-white dark:bg-dark-700 p-2 text-sm"
                                                            {...register(`items.${index}.qty`, {
                                                                required: true,
                                                                min: 1,
                                                                max: Number(currentQty || 0)
                                                            })}
                                                            placeholder="Qty"
                                                            defaultValue={currentQty || ""}
                                                        />
                                                    </>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        className="w-full rounded border border-gray-300 dark:border-dark-500 bg-gray-100 dark:bg-dark-800 p-2 text-sm cursor-not-allowed"
                                                        {...register(`items.${index}.qty`)}
                                                        value="1"
                                                    />
                                                )
                                            ) : null}
                                        </div>
                                        {fetchedData[issueId] && String(currentType) === "1" && (
                                            <div className="mt-1 text-xs text-gray-500">Challan quantity: {currentQty}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 dark:text-dark-100">{item.remark}</td>

                                    {/* Hidden fields just like PHP logic */}
                                    <td className="hidden">
                                        <input type="hidden" {...register(`items.${index}.instissuetype`)} value={currentType} />
                                        <input type="hidden" {...register(`items.${index}.itemid`)} value={item.instrument_id || item.instrumentid} />
                                        <input type="hidden" {...register(`items.${index}.issueid`)} value={issueId} />

                                        {/* Added a hidden checkbox so the "Please select at least one instrument" validation passes if this row exists */}
                                        <input type="checkbox" defaultChecked className="hidden" />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {/* Hidden totalmasterid needed for checklist validation logic in onSubmit */}
                <input type="hidden" id="totalmasterid" value={totalid} />
            </div>
        </div>
    );
}