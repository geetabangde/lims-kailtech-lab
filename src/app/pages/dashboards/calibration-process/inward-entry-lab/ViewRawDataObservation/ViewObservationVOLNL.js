import { VOLNL_MAX_REPEATABLE, createVOLNLRows } from '../Observations/ObservationVOLNL';

export const volnlTableConfig = {
  id: 'observationvolnl',
  name: 'Observation VOLNL',
  category: 'Volume',
  structure: {
    singleHeaders: ['Sr. No.', 'Nominal/ Set Value on UUC', 'Nominal/ Set Value on UUC'],
    subHeaders: {
      'Observation on Master': Array.from({ length: VOLNL_MAX_REPEATABLE }, (_, i) => `Observation ${i + 1}`),
    },
    remainingHeaders: ['Average', 'Zvalue', 'Converted Volume', 'Volume at V27', 'Error'],
  },
};

export const createVOLNLViewRows = (dataArray) => {
  const points = (Array.isArray(dataArray) ? dataArray : []).filter(Boolean);
  return createVOLNLRows(points).rows;
};
