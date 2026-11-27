import { safeGetValue } from './viewRawDataUtils';
import { RTDWOI_COLS, createRTDWOIRows, extractRTDWOIPoints, unitSymbol } from '../Observations/ObservationRTDWOI';

export const rtdwoiTableConfig = {
  id: 'observationrtdwoi',
  name: 'Observation RTDWOI',
  category: 'Temperature',
  structure: {
    singleHeaders: ['Sr. No.', 'Set Point (UUC Unit)', 'Value Of', 'Unit', 'Sensitivity Coefficient'],
    subHeaders: {
      'Observation': ['1', '2', '3', '4', '5'],
    },
    // 2026-11-27: Ambient / Corrected Average removed; both averages show their unit beside the value
    remainingHeaders: ['Average', 'Average (\u00b0C)', 'Deviation (\u00b0C)'],
  },
};

// view rows have 13 cells (Ambient and Corrected Average dropped): ... 10 Average, 11 Average (degC), 12 Deviation
export const RTDWOI_VIEW_DEVIATION_COL = 12;
export const RTDWOI_ROWSPAN_COLUMNS = [RTDWOI_COLS.SR_NO, RTDWOI_COLS.SET_POINT, RTDWOI_VIEW_DEVIATION_COL];

const getUnitDescription = (point, side) => {
  const sideObj = point?.[side] && typeof point[side] === 'object' && !Array.isArray(point[side]) ? point[side] : {};
  // the API sends { selected: '35', options: { 35: { name: 'Ohm', description: 'ohm sign' } } }: show the unit's name, like the Step 3 grid
  const unitObj = point?.[`${side}_unit`];
  const chosen = unitObj && typeof unitObj === 'object' ? unitObj.options?.[unitObj.selected] : null;
  const candidates = side === 'uuc'
    ? [chosen?.name, sideObj.unit_description, point?.uucunit_description, point?.uuc_unit_description, sideObj.unit?.description]
    : [chosen?.name, sideObj.unit_description, point?.masterunit_description, point?.master_unit_description, sideObj.unit?.description];
  return candidates.map(safeGetValue).find((val) => val !== '') || '';
};

export const createRTDWOIViewRows = (dataArray) => {
  const points = (Array.isArray(dataArray) ? dataArray : []).filter(Boolean);
  // preferStored: the raw data page shows what was SAVED for the item (calculates only what is blank)
  const { rows } = createRTDWOIRows(points, { preferStored: true });

  points.forEach((point, pointIndex) => {
    const uucRow = rows[pointIndex * 2];
    const masterRow = rows[pointIndex * 2 + 1];
    const uucUnit = getUnitDescription(point, 'uuc');
    const masterUnit = getUnitDescription(point, 'master');
    if (uucRow && uucUnit) uucRow[RTDWOI_COLS.UNIT] = uucUnit;
    if (masterRow && masterUnit) masterRow[RTDWOI_COLS.UNIT] = masterUnit;
  });

  const withUnit = (value, symbol) => (value && value !== '-' && symbol ? `${value} ${symbol}` : value);
  return rows.map((row) => [
    ...row.slice(0, RTDWOI_COLS.AVERAGE),
    withUnit(row[RTDWOI_COLS.AVERAGE], unitSymbol(row[RTDWOI_COLS.UNIT])),
    withUnit(row[RTDWOI_COLS.CONVERTED_AVERAGE], '\u00b0C'),
    row[RTDWOI_COLS.DEVIATION],
  ]);
};

export const parseRTDWOIDynamicData = (observationData) => (extractRTDWOIPoints(observationData) || []).map((point) => (
  point && typeof point === 'object' && !point.unit_description && point.unit_label
    ? { ...point, unit_description: point.unit_label }
    : point
));
