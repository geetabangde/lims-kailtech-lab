import { safeGetArray, safeGetValue, formatValueByLc } from './viewRawDataUtils';

export const itTableConfig = {
  id: 'observationit',
  name: 'Observation IT',
  category: 'Internal Thread',
  structure: {
    thermalCoeff: true,
    singleHeaders: ['Sr. No.', 'Nominal/ Set Value'],
    subHeaders: {
      'Observation on UUC': [
        'Observation 1',
        'Observation 2',
        'Observation 3',
        'Observation 4',
        'Observation 5',
      ],
    },
    remainingHeaders: ['Average', 'Error'],
  },
};

export const createITRows = (dataArray) => {
  const rows = [];
  dataArray.forEach((point) => {
    if (!point) return;
    const observations = safeGetArray(point.observations, 5);
    const lc = point.least_count_value || point.least_count_uuc ;
    // 2026-11-20 (lab, Inward 5371 / Item 73385): Nominal 3 dp (UUC least count, 3 when NA),
    // Average 2 dp (master least count), Error = printed Average - Nominal at the Nominal's dp.
    // Display-only; same rule as the certificate (resulttableit.blade.php). Used by Raw Data only.
    const decOf = (v) => {
      const m = String(v ?? '').match(/^\s*[0-9]*\.([0-9]+)/);
      if (m) return m[1].replace(/0+$/, '').length;
      return /^\s*[0-9]+\s*$/.test(String(v ?? '')) ? 0 : null;
    };
    const nomDec = decOf(point.least_count) ?? 3;
    const avgDec = decOf(point.master_least_count);
    const nomRaw = point.nominal_value || point.test_point;
    const nomNum = parseFloat(safeGetValue(nomRaw));
    const avgNum = parseFloat(safeGetValue(point.average));
    const nominalText = isNaN(nomNum) ? safeGetValue(nomRaw) : nomNum.toFixed(nomDec);
    let averageText = formatValueByLc(point.average, null, lc);
    let errorText = formatValueByLc(point.error, null, lc);
    if (avgDec !== null && !isNaN(avgNum)) {
      averageText = avgNum.toFixed(avgDec);
      if (!isNaN(nomNum)) {
        const err = parseFloat(averageText) - nomNum;
        errorText = (Math.abs(err) < 0.0000005 ? 0 : err).toFixed(nomDec);
      }
    }
    const row = [
      point.sequence_number?.toString() || point.sr_no?.toString() || '',
      nominalText,
      ...observations.slice(0, 5).map((obs) => formatValueByLc(obs, null, lc)),
      averageText,
      errorText,
    ];
    while (row.length < 9) {
      row.push('');
    }
    rows.push(row);
  });
  return rows;
};

export const parseITDynamicData = (observationData, setThermalCoeff) => {

  const itData =
    observationData?.data?.data || ''       // most common case
  observationData?.data || ''
  observationData;
  if (itData?.calibration_points) {
    if (itData.thermal_coefficients && setThermalCoeff) {
      setThermalCoeff((prev) => ({
        uuc: itData.thermal_coefficients.uuc_coefficient || '',
        master: itData.thermal_coefficients.master_coefficient || '',
        thickness_of_graduation: prev.thickness_of_graduation || '',
      }));
    }
    return itData.calibration_points;
  }
  return [];
};

