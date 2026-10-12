import { createSTDFRows } from '../Observations/ObservationSTDF';

export const stdfTableConfig = {
  id: 'observationstdf',
  name: 'Observation STDF',
  category: 'Standard Foil',
  structure: {
    thermalCoeff: true,
    singleHeaders: ['Sr. No.', 'Nominal/ Set Value'],
    subHeaders: {
      'Observation on Master': ['Observation 1', 'Observation 2', 'Observation 3', 'Observation 4', 'Observation 5'],
    },
    remainingHeaders: ['Average', 'Error'],
  },
};

export const createSTDFViewRows = (dataArray) => {
  const points = (Array.isArray(dataArray) ? dataArray : []).filter(Boolean);
  return createSTDFRows(points).rows;
};
