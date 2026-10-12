import { VOL_MAX_REPEATABLE, createVOLRows } from '../Observations/ObservationVOL';

export const volTableConfig = {
  id: 'observationvol',
  name: 'Observation VOL',
  category: 'Volume',
  structure: {
    singleHeaders: ['Sr. No.', 'Nominal/ Set Value on UUC', 'Nominal/ Set Value on UUC'],
    subHeaders: {
      'Observation on Master': Array.from({ length: VOL_MAX_REPEATABLE }, (_, i) => `Observation ${i + 1}`),
    },
    remainingHeaders: ['Average', 'Zvalue', 'Converted Average', 'Error'],
  },
};

export const createVOLViewRows = (dataArray) => {
  const points = (Array.isArray(dataArray) ? dataArray : []).filter(Boolean);
  return createVOLRows(points).rows;
};
