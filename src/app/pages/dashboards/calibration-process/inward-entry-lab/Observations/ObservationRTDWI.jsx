import { safeGetValue, safeGetArray } from './observationUtils';

/**
 * Calculation logic for RTD with Indicator (RTDWI) Observation
 */
export const calculateRTDWIValues = (rowData) => {
  const result = {};
  if (!rowData || !Array.isArray(rowData)) return result;

  const parsedValues = rowData.map((val) => (val === '' || val === null || val === undefined ? 0 : parseFloat(val) || 0));
  const rowType = rowData[2]; // 'UUC' or 'Master'

  if (rowType === 'UUC') {
    const observations = parsedValues.slice(5, 10).filter((val) => val !== 0);
    result.average = observations.length
      ? (observations.reduce((sum, val) => sum + val, 0) / observations.length).toFixed(3)
      : '';
    result.error = '';
  } else if (rowType === 'Master') {
    const observations = parsedValues.slice(5, 10).filter((val) => val !== 0);
    const ambient = parsedValues[11] ? parseFloat(parsedValues[11]) : 0;

    result.average = observations.length
      ? (observations.reduce((sum, val) => sum + val, 0) / observations.length).toFixed(3)
      : '';

    if (result.average) {
      result.correctedAverage = (parseFloat(result.average) + ambient).toFixed(3);
    } else {
      result.correctedAverage = '';
    }
  }

  return result;
};

export const RTDWI_COLS = {
  SET_POINT: 1,
  VALUE_OF: 2,
  UNIT: 3,
  SENSITIVITY: 4,
  OBS_START: 5,
  OBS_END: 9,
  AVERAGE: 10,
  AMBIENT: 11,
  CORRECTED_AVERAGE: 12,
  CONVERTED_AVERAGE: 13,
  DEVIATION: 14,
};

const rtdwiNum = (val) => {
  if (val === undefined || val === null || String(val).trim() === '' || String(val).trim() === '-') return NaN;
  return Number(String(val).trim());
};

// Unrounded, without float noise (0.1 + 0.2 -> "0.3")
const rtdwiFmt = (num) => (Number.isFinite(num) ? String(Number(num.toFixed(10))) : '');

const rtdwiMean = (getCell, row) => {
  const readings = [];
  for (let c = RTDWI_COLS.OBS_START; c <= RTDWI_COLS.OBS_END; c += 1) {
    const n = rtdwiNum(getCell(row, c));
    if (!isNaN(n)) readings.push(n);
  }
  return readings.length ? readings.reduce((a, b) => a + b, 0) / readings.length : NaN;
};

// Unit ids of the units master (units table): 12 degC, 20 Volt, 29 Millivolt, 35 Ohm
const RTDWI_UNIT_ID_KIND = { 12: 'degc', 29: 'mv', 35: 'ohm' };

/**
 * What the master reading is: 'ohm' (Pt100 / RTD master), 'mv' (thermocouple master) or 'degc' (reads in degC).
 * Accepts the unit label shown in the dropdown (e.g. "Ohm", "Millivolt", "Degree Centigrade") or the saved unit id.
 */
export const rtdwiUnitKind = (labelOrId) => {
  const raw = String(labelOrId ?? '').trim();
  if (!raw || raw === 'UNIT_SELECT' || raw === '-') return null;
  if (/^\d+$/.test(raw)) return RTDWI_UNIT_ID_KIND[Number(raw)] || null;
  const s = raw.toLowerCase();
  if (s === 'ohm' || s === 'ohms' || raw === 'Ω') return 'ohm';
  if (s === 'millivolt' || s === 'milli volt' || s === 'mv') return 'mv';
  if (s.includes('centigrade') || s.includes('celsius') || raw === '˚C' || raw === '°C') return 'degc';
  return null;
};

// IEC 60751 Callendar-Van Dusen for Pt100 (R0 = 100 ohm): resistance (ohm) -> degC, Newton iteration
export const rtdwiPt100OhmToC = (ohm) => {
  const R0 = 100;
  const A = 3.9083e-3;
  const B = -5.775e-7;
  const C = -4.183e-12;
  if (!Number.isFinite(ohm) || ohm <= 0) return NaN;
  const r = (t) => R0 * (1 + A * t + B * t * t + (t < 0 ? C * (t - 100) * t * t * t : 0));
  let t = (ohm / R0 - 1) / A;
  for (let i = 0; i < 50; i += 1) {
    const f = r(t) - ohm;
    const h = 1e-6;
    const d = (r(t + h) - r(t - h)) / (2 * h);
    const step = f / d;
    t -= step;
    if (Math.abs(step) < 1e-10) break;
  }
  return t;
};

// NIST ITS-90 / IEC 60584-1 inverse polynomials for an S-type thermocouple: mV (reference junction 0 degC) -> degC
const S_TYPE_INVERSE = [
  { max: 1.874, d: [0, 1.84949460e2, -8.00504062e1, 1.02237430e2, -1.52248592e2, 1.88821343e2, -1.59085941e2, 8.23027880e1, -2.34181944e1, 2.79786260e0] },
  { max: 11.95, d: [1.291507177e1, 1.466298863e2, -1.534713402e1, 3.145945973e0, -4.163257839e-1, 3.187963771e-2, -1.2916375e-3, 2.183475087e-5, -1.447379511e-7, 8.211272125e-9] },
  { max: 17.536, d: [-8.087801117e1, 1.621573104e2, -8.536869453e0, 4.719686976e-1, -1.441693666e-2, 2.08161889e-4] },
];
export const rtdwiSTypeMvToC = (mv) => {
  if (!Number.isFinite(mv) || mv < -0.235 || mv > 17.536) return NaN;
  const range = S_TYPE_INVERSE.find((rg) => mv <= rg.max);
  return range.d.reduce((sum, coef, i) => sum + coef * (mv ** i), 0);
};

/**
 * Master reading -> degC according to the master's unit (the unit dropdown of the Master row).
 * mV readings are corrected with the ambient (reference junction) mV first.
 */
export const rtdwiMasterToC = (kind, mean, ambient) => {
  if (!Number.isFinite(mean)) return NaN;
  if (kind === 'ohm') return rtdwiPt100OhmToC(mean);
  if (kind === 'mv') return rtdwiSTypeMvToC(mean + (Number.isFinite(ambient) ? ambient : 0));
  if (kind === 'degc') return mean;
  return NaN;
};

/**
 * Every calculated cell of the grid (UUC row, then Master row per point), keyed "row-col":
 *  Master: Average, Average with corrected mV (mV masters only), Average (degC) = master reading converted to degC
 *          by its unit (Ohm -> Pt100 IEC 60751, Millivolt -> S-type IEC 60584, degC -> as is)
 *          Sensitivity Coefficient is fixed at 1 (readings are converted by the standard, kept so the saved
 *          value the uncertainty step multiplies by stays neutral)
 *  UUC:    Average (degC), Deviation = UUC average - master Average (degC)
 * getCell(row, col) returns the current text of a cell; getMasterUnitId(row) the saved unit id (optional fallback).
 */
export const computeRTDWICells = (getCell, rowCount, getMasterUnitId) => {
  const out = {};
  const points = Math.floor(rowCount / 2);

  for (let p = 0; p < points; p += 1) {
    const u = p * 2;
    const m = u + 1;
    const mean = rtdwiMean(getCell, m);
    const kind = rtdwiUnitKind(getCell(m, RTDWI_COLS.UNIT)) || rtdwiUnitKind(getMasterUnitId ? getMasterUnitId(m) : '');
    const ambientRaw = rtdwiNum(getCell(m, RTDWI_COLS.AMBIENT));
    const ambient = kind === 'mv' && !isNaN(ambientRaw) ? ambientRaw : 0;
    const corrected = Number.isFinite(mean) ? mean + ambient : NaN;
    const masterC = rtdwiMasterToC(kind, mean, ambient);
    const uucMean = rtdwiMean(getCell, u);

    out[`${m}-${RTDWI_COLS.AVERAGE}`] = rtdwiFmt(mean);
    out[`${m}-${RTDWI_COLS.CORRECTED_AVERAGE}`] = rtdwiFmt(corrected);
    out[`${m}-${RTDWI_COLS.SENSITIVITY}`] = '1';
    out[`${m}-${RTDWI_COLS.CONVERTED_AVERAGE}`] = Number.isFinite(masterC) ? masterC.toFixed(3) : '';
    out[`${u}-${RTDWI_COLS.CONVERTED_AVERAGE}`] = Number.isFinite(uucMean) ? uucMean.toFixed(3) : '';
    out[`${u}-${RTDWI_COLS.DEVIATION}`] = Number.isFinite(uucMean) && Number.isFinite(masterC) ? (uucMean - masterC).toFixed(3) : '';
  }

  return out;
};

/**
 * Row generator for RTDWI Observation
 */
export const createRTDWIRows = (dataArray, observationData) => {
  const rows = [];
  const calibrationPoints = [];
  const types = [];
  const repeatables = [];
  const values = [];
  const masterUnits = [];

  let pointsToProcess = [];
  if (observationData && observationData.calibration_points && Array.isArray(observationData.calibration_points)) {
    pointsToProcess = observationData.calibration_points;
  } else if (dataArray && dataArray.length > 0) {
    pointsToProcess = dataArray;
  }

  pointsToProcess.forEach((point) => {
    if (!point) return;

    const srNo = point.sr_no?.toString() || '';
    const setPoint = safeGetValue(point.set_point);

    // UUC Row
    const uucReadings = safeGetArray(point.uuc_values, 5);
    const uucRow = [
      srNo,                                           // 0: Sr. No.
      setPoint,                                       // 1: Set Point
      'UUC',                                         // 2: Value Of
      safeGetValue(point.unit),                      // 3: Unit
      '-',                                           // 4: Sensitivity Coefficient
      ...uucReadings.slice(0, 5).map(val => safeGetValue(val)), // 5-9: Observations 1-5
      '-',                                            // 10: Average (dash for UUC)
      '-',                                            // 11: mV generated On ambient (dash for UUC)
      '-',                                            // 12: Average with corrected mv (dash for UUC)
      safeGetValue(point.average_uuc),               // 13: Average (°C) - CALCULATED
      safeGetValue(point.error),                     // 14: Deviation (°C) - EDITABLE
    ];
    rows.push(uucRow);
    calibrationPoints.push(point.point_id?.toString() || "1");
    types.push('uuc');
    repeatables.push('1');
    values.push(setPoint || "0");
    masterUnits.push('');

    // Master Row
    const masterReadings = safeGetArray(point.master_values, 5);
    const masterRow = [
      '-',                                           // 0: Sr. No.
      '-',                                           // 1: Set Point
      'Master',                                      // 2: Value Of
      'UNIT_SELECT',                                 // 3: Unit (ReactSelect marker)
      safeGetValue(point.sensitivity_coefficient),   // 4: Sensitivity Coefficient
      ...masterReadings.slice(0, 5).map(val => safeGetValue(val)), // 5-9: Observations 1-5
      safeGetValue(point.average_master),            // 10: Average (mV) - EDITABLE
      safeGetValue(point.ambient_master),            // 11: mV generated On ambient (EDITABLE)
      safeGetValue(point.s_average_master),          // 12: Average with corrected mv (CALCULATED)
      safeGetValue(point.c_average_master),          // 13: Average (°C) - MOVED HERE
      '-',                                           // 14: Deviation (°C) (dash for Master)
    ];
    rows.push(masterRow);
    calibrationPoints.push(point.point_id?.toString() || "1");
    types.push('master');
    repeatables.push('1');
    values.push(setPoint || "0");
    masterUnits.push(point.master_unit ? String(point.master_unit) : '');
  });

  // Calculated cells are read-only: show them recalculated from the readings
  const calc = computeRTDWICells((r, c) => rows[r]?.[c], rows.length, (r) => masterUnits[r]);
  Object.entries(calc).forEach(([key, val]) => {
    const [r, c] = key.split('-').map(Number);
    if (rows[r]) rows[r][c] = val;
  });

  return { rows, hiddenInputs: { calibrationPoints, types, repeatables, values, masterUnits } };
};

/**
 * Table config for RTDWI Observation
 */
export const getRTDWITableConfig = (observations) => {
  const { rows, hiddenInputs } = createRTDWIRows(observations, observations);
  return {
    id: 'observationrtdwi',
    name: 'Observation RTD WI',
    category: 'RTD',
    structure: {
      singleHeaders: ['Sr. No.', 'Set Point (°C)', 'Value Of', 'Unit', 'Sensitivity Coefficient'],
      subHeaders: {
        'Observation': ['Observation 1', 'Observation 2', 'Observation 3', 'Observation 4', 'Observation 5']
      },
      remainingHeaders: ['Average', 'mV generated On ambient', 'Average with corrected mv', 'Average (°C)', 'Deviation (°C)']
    },
    staticRows: rows,
    hiddenInputs: hiddenInputs
  };
};

const ObservationRTDWI = () => null;
export default ObservationRTDWI;
