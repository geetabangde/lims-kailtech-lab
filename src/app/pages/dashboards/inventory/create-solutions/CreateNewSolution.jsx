// Import Dependencies
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import axios from "utils/axios";
import { toast } from "react-hot-toast";
import { Plus, X } from "lucide-react";

// Local Imports
import {
  Card,
  Button,
  ReactSelect as Select,
} from "components/ui";
import { Page } from "components/shared/Page";
import SolutionRefusalModal from "./SolutionRefusalModal";

// ----------------------------------------------------------------------

const validDate = (d) => !!d && String(d).slice(0, 4) >= "1900";
const fmtDate = (d) => (validDate(d) ? `${String(d).slice(8, 10)}-${String(d).slice(5, 7)}-${String(d).slice(0, 4)}` : null);
const toIso = (dmy) => (dmy ? dmy.split("-").reverse().join("-") : "");
const num = (v) => parseFloat(Number(v).toFixed(4));

// Stock line text in the picker: item, id no, location + balance, batch, expiry (EXPIRED flag)
const itemLabel = (m) =>
  `${m.name} (${m.newidno || ""}) (${m.department} ${m.qty}${m.udescription || ""}) | Batch ${m.batchno || "-"} | Exp ${m.expdate_fmt || "no expiry"}${m.expired ? " | EXPIRED" : ""}`;

export default function CreateNewSolution() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [masterInstruments, setMasterInstruments] = useState([]);
  const [extraItems, setExtraItems] = useState([]);
  const [preparedList, setPreparedList] = useState([]);
  const [preparedType, setPreparedType] = useState("");
  const [lineNotes, setLineNotes] = useState({});
  const [configLoading, setConfigLoading] = useState(false);
  const [refusal, setRefusal] = useState({ show: false, message: "", errors: [] });

  const { control, handleSubmit, watch, setValue, getValues } = useForm({
    defaultValues: {
      category: "",
      type: "",
      quantity: "",
      exp: "",
      department: "",
      mixedSolutions: [
        { subcatid: "", qty: "" }
      ]
    }
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "mixedSolutions"
  });

  const categoryId = watch("category");
  const watchedLines = watch("mixedSolutions");

  // All stock lines the picker can show (list from the server + lines proposed by "Use same configuration")
  const itemById = useMemo(() => {
    const map = {};
    [...masterInstruments, ...extraItems].forEach((m) => {
      map[String(m.id)] = m;
    });
    return map;
  }, [masterInstruments, extraItems]);

  const itemOptions = useMemo(
    () => Object.values(itemById).map((m) => ({ value: m.id, label: itemLabel(m) })),
    [itemById],
  );

  // Earliest expiry among the selected parents = latest expiry the new solution may have
  const earliestParentExp = useMemo(() => {
    let min = null;
    (watchedLines || []).forEach((l) => {
      const it = itemById[String(l?.subcatid?.value ?? l?.subcatid)];
      if (it && validDate(it.expdate)) {
        const d = String(it.expdate).slice(0, 10);
        if (min === null || d < min) min = d;
      }
    });
    return min;
  }, [watchedLines, itemById]);

  const fetchInitialData = useCallback(async () => {
    try {
      const [catRes, depRes, mixedRes, prepRes] = await Promise.all([
        axios.get("/inventory/category-list").catch(() => ({ data: {} })),
        axios.get("/master/list-lab").catch(() => ({ data: {} })),
        axios.get("/inventory/get-mixed-solution").catch(() => ({ data: {} })),
        axios.get("/inventory/get-prepared-solution-list").catch(() => ({ data: {} })),
      ]);

      if (catRes.data?.data) {
        setCategories(catRes.data.data);
      }

      if (depRes.data?.data) {
        setDepartments(depRes.data.data);
      }

      if (mixedRes.data?.status || mixedRes.data?.data) {
        setMasterInstruments(mixedRes.data.data || []);
      }

      if (prepRes.data?.data) {
        setPreparedList(prepRes.data.data);
      }
    } catch (err) {
      console.error("Error fetching solution initial data:", err);
    }
  }, []);

  const fetchSubcategories = useCallback(async (cid) => {
    try {
      const response = await axios.get("/inventory/subcategory-list", {
        params: { category: cid }
      });
      if (response.data?.data) {
        setSubcategories(response.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching subcategories:", err);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (categoryId) {
      fetchSubcategories(categoryId);
    } else {
      setSubcategories([]);
    }
  }, [categoryId, fetchSubcategories]);

  // "Prepare again": choose a solution that was prepared before; category / type / department / last quantity are filled in
  const handlePrepared = (type) => {
    setPreparedType(type || "");
    if (!type) return;
    const p = preparedList.find((x) => String(x.type) === String(type));
    if (!p) return;
    setValue("category", p.category);
    setValue("type", p.type);
    setValue("department", p.department);
    setValue("quantity", p.last_qty);
  };

  // "Use same configuration": ingredients of the last preparation, scaled to the quantity typed, proposed from today's stock
  const loadSameConfig = async () => {
    if (!preparedType) {
      toast.error("Select a prepared solution first");
      return;
    }
    try {
      setConfigLoading(true);
      const res = await axios.get("/inventory/get-solution-last-config", {
        params: {
          type: preparedType,
          quantity: Number(getValues("quantity")) || undefined,
          department: getValues("department") || undefined,
        },
      });
      const ings = res.data?.ingredients || [];
      const extras = [];
      const notes = {};
      const rows = ings.map((ing, i) => {
        (ing.candidates || []).forEach((c) =>
          extras.push({
            id: c.id,
            name: ing.name,
            newidno: ing.newidno,
            department: c.location,
            qty: c.qty,
            udescription: ing.unit,
            batchno: c.batchno,
            expdate: toIso(c.expdate),
            expdate_fmt: c.expdate,
            expired: 0,
          }),
        );
        if (!ing.ok) notes[i] = ing.reason;
        return { subcatid: ing.proposal ? ing.proposal.id : "", qty: String(ing.needed) };
      });
      setExtraItems((prev) => [...prev, ...extras]);
      setLineNotes(notes);
      replace(rows.length ? rows : [{ subcatid: "", qty: "" }]);
      toast.success(`Loaded ${rows.length} ingredient(s) from the last preparation (x${res.data?.scale ?? 1})`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load the last preparation");
    } finally {
      setConfigLoading(false);
    }
  };

  // The three management rules, checked on the screen before anything is sent (the server checks them again)
  const checkRules = (formData) => {
    const problems = [];
    const today = new Date().toISOString().slice(0, 10);
    const used = {};
    let earliest = null;
    let earliestInfo = null;
    const ownExp = formData.exp; // YYYY-MM-DD
    formData.mixedSolutions.forEach((l) => {
      const id = String(l.subcatid?.value ?? l.subcatid);
      const it = itemById[id];
      if (!it) return;
      const requested = Number(l.qty);
      const balance = Number(it.qty);
      const unit = it.udescription || "";
      const product = `${it.name}${it.newidno ? ` (${it.newidno})` : ""}`;
      const batch = it.batchno || "";
      const expF = fmtDate(it.expdate);
      used[id] = (used[id] || 0) + (requested || 0);
      if (!(requested > 0)) {
        problems.push({
          rule: "quantity", title: "Quantity must be more than zero", product, batch, expiry: expF,
          available: balance, requested, unit, advice: "Enter a quantity greater than zero for this ingredient.",
        });
      } else if (used[id] > balance + 0.0005) {
        problems.push({
          rule: "quantity", title: "Quantity is more than the stock available", product, batch, expiry: expF,
          available: balance, requested: num(used[id]), unit,
          advice: `Only ${num(balance)} ${unit} is available in this stock line, but ${num(used[id])} ${unit} was asked for. Reduce the quantity or use another batch.`,
        });
      }
      if (validDate(it.expdate)) {
        const e = String(it.expdate).slice(0, 10);
        if (e < today) {
          problems.push({
            rule: "expired", title: "This ingredient is expired", product, batch, expiry: expF,
            available: balance, requested, unit,
            advice: `This stock line expired on ${expF}. A new solution cannot be prepared from an expired item. Select another batch that has not expired.`,
          });
        }
        if (earliest === null || e < earliest) {
          earliest = e;
          earliestInfo = { product, batch };
        }
      }
    });
    if (earliest !== null && ownExp && ownExp > earliest) {
      const limit = fmtDate(earliest);
      const own = fmtDate(ownExp);
      problems.push({
        rule: "expiry", title: "Expiry date is later than the parent's expiry",
        product: earliestInfo.product, batch: earliestInfo.batch, expiry: limit, limit, own_expiry: own,
        advice: `The expiry you entered (${own}) is later than the expiry of the parent ${earliestInfo.product}${earliestInfo.batch ? ` (batch ${earliestInfo.batch})` : ""}, which expires on ${limit}. A prepared solution cannot outlive its parent. Choose ${limit} or an earlier date.`,
      });
    }
    return problems;
  };

  const onSubmit = async (formData) => {
    const problems = checkRules(formData);
    if (problems.length) {
      setRefusal({ show: true, message: "Please read the reason(s) below, correct them and try again.", errors: problems });
      return;
    }
    try {
      setLoading(true);

      // Format expiry date from YYYY-MM-DD to DD/MM/YYYY
      let formattedExp = formData.exp;
      if (formData.exp && formData.exp.includes("-")) {
        const [year, month, day] = formData.exp.split("-");
        formattedExp = `${day}/${month}/${year}`;
      }

      const payload = {
        category: formData.category?.value || formData.category,
        type: formData.type?.value || formData.type,
        quantity: Number(formData.quantity),
        exp: formattedExp,
        department: formData.department?.value || formData.department,
        subcatid: formData.mixedSolutions.map(item => item.subcatid?.value || item.subcatid),
        qty: formData.mixedSolutions.map(item => Number(item.qty))
      };

      const response = await axios.post("inventory/add-solution", payload);

      if (response.data.success || response.data.status) {
        toast.success(response.data.message || "Solution Created Successfully");
        navigate("/dashboards/inventory/create-solutions");
      } else {
        toast.error(response.data.message || "Failed to add solution");
      }
    } catch (err) {
      const d = err?.response?.data;
      if (err?.response?.status === 422 && Array.isArray(d?.errors) && d.errors[0]?.rule) {
        // refused by the server rules: same detailed pop-up
        setRefusal({ show: true, message: d.message, errors: d.errors });
      } else {
        toast.error(d?.message || "An error occurred during submission");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page title="Add New Solution">
      <div className="transition-content w-full pb-5">
        <Card className="flex flex-col border-none shadow-soft dark:bg-dark-700">
          <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-dark-500 sm:p-5">
            <h3 className="text-lg font-bold text-gray-800 dark:text-dark-100">
              Add New Solution
            </h3>
            <Button
              component={Link}
              to="/dashboards/inventory/create-solutions"
              color="info"
              variant="outline"
              size="sm"
            >
              {"<< Back to Solution creation List"}
            </Button>
          </div>

          <div className="p-4 sm:p-5">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
              {/* Prepare again: a solution that was prepared before */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-dark-500">
                <h4 className="text-md mb-3 font-bold text-gray-700 dark:text-gray-200">
                  Prepare again (optional)
                </h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end">
                  <Select
                    id="prepared"
                    label="Solution prepared before"
                    placeholder="Select a prepared solution"
                    value={preparedType}
                    onChange={handlePrepared}
                    options={preparedList.map((p) => ({
                      value: p.type,
                      label: `${p.name} - last ${p.last_qty} ${p.unit || ""} on ${p.last_prepared || "-"} (prepared ${p.times_prepared}x)`,
                    }))}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    color="primary"
                    className="h-10 font-bold"
                    loading={configLoading}
                    onClick={loadSameConfig}
                  >
                    Use same configuration
                  </Button>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-dark-300">
                  Fills in the solution and loads the ingredients of its last preparation for the quantity entered below, taken from today&apos;s stock. You can change any line before saving.
                </p>
              </div>

              {/* Main Info */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Controller
                  name="category"
                  control={control}
                  rules={{ required: "Required" }}
                  render={({ field, fieldState }) => (
                    <Select
                      {...field}
                      id="category"
                      label="Category"
                      placeholder="Select Category"
                      options={categories.map(c => ({ value: c.id, label: c.name }))}
                      error={fieldState.error?.message}
                    />
                  )}
                />

                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      id="type"
                      label="Product Type / Subcategory"
                      placeholder="Select Type"
                      options={subcategories.map(s => ({ value: s.id, label: s.name }))}
                    />
                  )}
                />

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Qty
                  </label>
                  <Controller
                    name="quantity"
                    control={control}
                    rules={{ required: "Required" }}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100"
                      />
                    )}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Expiry Date
                  </label>
                  <Controller
                    name="exp"
                    control={control}
                    rules={{ required: "Required" }}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="date"
                        max={earliestParentExp || undefined}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100"
                      />
                    )}
                  />
                  {earliestParentExp && (
                    <span className="text-xs text-gray-500 dark:text-dark-300">
                      Latest allowed expiry: {fmtDate(earliestParentExp)} (earliest expiry of the selected parents)
                    </span>
                  )}
                </div>

                <Controller
                  name="department"
                  control={control}
                  rules={{ required: "Required" }}
                  render={({ field, fieldState }) => (
                    <Select
                      {...field}
                      id="department"
                      label="Department"
                      placeholder="Select Department"
                      options={departments.map(d => ({ value: d.id, label: d.name }))}
                      error={fieldState.error?.message}
                    />
                  )}
                />
              </div>

              {/* Mixed Solutions Section */}
              <div className="mt-8 space-y-4">
                <h4 className="text-md font-bold text-gray-700 dark:text-gray-200 border-b pb-2">
                  Mixed Solution
                </h4>

                {fields.map((field, index) => (
                  <div key={field.id} className="flex flex-col gap-4 p-4 bg-gray-50 dark:bg-dark-800 rounded-lg relative md:flex-row md:items-end">
                    <div className="flex-1">
                      <Controller
                        name={`mixedSolutions.${index}.subcatid`}
                        control={control}
                        rules={{ required: "Required" }}
                        render={({ field, fieldState }) => (
                          <Select
                            {...field}
                            label={index === 0 ? "Select Item" : ""}
                            placeholder="Select"
                            options={itemOptions}
                            onChange={(val) => {
                              field.onChange(val);
                              setLineNotes((prev) => {
                                const next = { ...prev };
                                delete next[index];
                                return next;
                              });
                            }}
                            error={fieldState.error?.message}
                          />
                        )}
                      />
                      {lineNotes[index] && (
                        <p className="text-error mt-1 text-xs">{lineNotes[index]}</p>
                      )}
                    </div>

                    <div className="w-full md:w-32">
                      <Controller
                        name={`mixedSolutions.${index}.qty`}
                        control={control}
                        rules={{ required: "Required" }}
                        render={({ field, fieldState }) => (
                          <div className="flex flex-col gap-1">
                            <input
                              {...field}
                              type="number"
                              step="any"
                              placeholder="Qty"
                              className={`w-full rounded-lg border px-4 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100 ${
                                fieldState.error ? "border-red-500" : "border-gray-300"
                              }`}
                            />
                            {fieldState.error && (
                              <span className="text-xs text-red-500">
                                {fieldState.error.message}
                              </span>
                            )}
                          </div>
                        )}
                      />
                    </div>

                    {index > 0 && (
                      <Button
                        type="button"
                        color="error"
                        variant="soft"
                        size="sm"
                        className="h-10 w-10 p-0"
                        onClick={() => remove(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}

                <Button
                  type="button"
                  size="sm"
                  className="flex items-center gap-2 !bg-blue-600 !text-white hover:!bg-blue-700 font-bold shadow-sm"
                  onClick={() => append({ subcatid: "", qty: "" })}
                >
                  <Plus className="h-4 w-4" /> Add Button
                </Button>
              </div>

              <div className="flex justify-end pt-6 border-t border-gray-100 dark:border-dark-600">
                <Button
                  type="submit"
                  color="success"
                  size="lg"
                  loading={loading}
                  className="px-10 font-bold"
                >
                  Add Solution
                </Button>
              </div>
            </form>
          </div>
        </Card>
      </div>

      <SolutionRefusalModal
        show={refusal.show}
        message={refusal.message}
        errors={refusal.errors}
        onClose={() => setRefusal((r) => ({ ...r, show: false }))}
      />
    </Page>
  );
}
