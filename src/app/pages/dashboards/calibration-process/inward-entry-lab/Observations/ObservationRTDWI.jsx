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

/**
 * Sensitivity coefficient (mV per degC) of the master thermocouple, derived from the
 * corrected master averages (mV) of the first two points and their set points (degC).
 * Returns null when it cannot be derived yet.
 */
export const deriveRTDWISensitivity = (t1, t2, v1, v2) => {
  const t1n = rtdwiNum(t1);
  const t2n = rtdwiNum(t2);
  if (isNaN(t1n) || isNaN(t2n) || !Number.isFinite(v1) || !Number.isFinite(v2)) return null;
  if (Math.abs(t2n - t1n) < 1) return null;
  if (Math.abs(v2 - v1) < 1e-9) return null;
  const s = (v2 - v1) / (t2n - t1n);
  return Number.isFinite(s) && s > 0 ? rtdwiFmt(Number(s.toFixed(6))) : null;
};

/**
 * Every calculated cell of the grid (UUC row, then Master row per point), keyed "row-col":
 *  Master: Sensitivity Coefficient (same for all points), Average, Average with corrected mV,
 *          Average (degC) = corrected mV / sensitivity coefficient
 *  UUC:    Average (degC), Deviation = UUC average - master Average (degC)
 * getCell(row, col) returns the current text of a cell.
 */
export const computeRTDWICells = (getCell, rowCount) => {
  const out = {};
  const points = Math.floor(rowCount / 2);
  const masterStats = [];

  for (let p = 0; p < points; p += 1) {
    const m = p * 2 + 1;
    const mean = rtdwiMean(getCell, m);
    const ambient = rtdwiNum(getCell(m, RTDWI_COLS.AMBIENT));
    const corrected = Number.isFinite(mean) ? mean + (isNaN(ambient) ? 0 : ambient) : NaN;
    masterStats.push({ mean, corrected });
    out[`${m}-${RTDWI_COLS.AVERAGE}`] = rtdwiFmt(mean);
    out[`${m}-${RTDWI_COLS.CORRECTED_AVERAGE}`] = rtdwiFmt(corrected);
  }

  const sensitivity = points >= 2
    ? deriveRTDWISensitivity(getCell(0, RTDWI_COLS.SET_POINT), getCell(2, RTDWI_COLS.SET_POINT), masterStats[0].corrected, masterStats[1].corrected)
    : null;
  const sNum = sensitivity === null ? NaN : Number(sensitivity);

  for (let p = 0; p < points; p += 1) {
    const u = p * 2;
    const m = u + 1;
    const uucMean = rtdwiMean(getCell, u);
    const converted = !isNaN(sNum) && Number.isFinite(masterStats[p].corrected) ? masterStats[p].corrected / sNum : NaN;
    out[`${m}-${RTDWI_COLS.SENSITIVITY}`] = sensitivity ?? '';
    out[`${m}-${RTDWI_COLS.CONVERTED_AVERAGE}`] = Number.isFinite(converted) ? converted.toFixed(3) : '';
    out[`${u}-${RTDWI_COLS.CONVERTED_AVERAGE}`] = Number.isFinite(uucMean) ? uucMean.toFixed(3) : '';
    out[`${u}-${RTDWI_COLS.DEVIATION}`] = Number.isFinite(uucMean) && Number.isFinite(converted) ? (uucMean - converted).toFixed(3) : '';
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
  });

  // Calculated cells are read-only: show them recalculated from the readings
  const calc = computeRTDWICells((r, c) => rows[r]?.[c], rows.length);
  Object.entries(calc).forEach(([key, val]) => {
    const [r, c] = key.split('-').map(Number);
    if (rows[r]) rows[r][c] = val;
  });

  return { rows, hiddenInputs: { calibrationPoints, types, repeatables, values } };
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
