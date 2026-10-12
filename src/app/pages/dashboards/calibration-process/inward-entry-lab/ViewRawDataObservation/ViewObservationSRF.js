import { createSRFRows } from '../Observations/ObservationSRF';

export const srfTableConfig = {
  id: 'observationsrf',
  name: 'Observation SRF',
  category: 'Surface Roughness',
  structure: {
    thermalCoeff: true,
    singleHeaders: ['Sr. No.', 'Nominal/ Set Value'],
    subHeaders: {
      'Observation on UUC': ['Observation 1', 'Observation 2', 'Observation 3', 'Observation 4', 'Observation 5'],
    },
    remainingHeaders: ['Average', 'Error'],
  },
};

export const createSRFViewRows = (dataArray) => {
  const points = (Array.isArray(dataArray) ? dataArray : []).filter(Boolean);
  return createSRFRows(points).rows;
};
