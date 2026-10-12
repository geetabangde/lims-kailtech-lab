import { getEXTENMatrices, getEXTENPointValues } from '../Observations/ObservationEXTEN';

export const extenTableConfig = {
  id: 'observationexten',
  name: 'Observation EXTEN',
  category: 'Extensometer',
  structure: {
    singleHeaders: ['Sr. No.', 'Nominal/ Set Value'],
    subHeaders: {
      'Observation on Master': ['Set I', 'Set II'],
      'Error': ['Set I', 'Set II'],
      '% Error': ['Set I', 'Set II'],
    },
    remainingHeaders: [],
  },
};

export const createEXTENViewRows = (dataArray) => {
  const matrices = getEXTENMatrices(dataArray);
  const rows = [];
  matrices.forEach((m) => {
    (m.points || []).forEach((p, idx) => {
      const pv = getEXTENPointValues(p);
      rows.push([
        p.srNo || String(idx + 1),
        p.uuc,
        pv.masters?.[0] || '',
        pv.masters?.[1] || '',
        pv.errors?.[0] || '',
        pv.errors?.[1] || '',
        pv.percentErrors?.[0] || '',
        pv.percentErrors?.[1] || '',
      ]);
    });
  });
  return rows;
};
