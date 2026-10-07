import { useState } from 'react';

const ObservationVC = ({
  selectedTableData,
  tableInputValues,
  setTableInputValues,
  observations,
  handleObservationBlur,
  validateDecimalPlaces,
}) => {
  const [inputErrors, setInputErrors] = useState({});

  // Also used for observationsrf / observationstdf (same grid: Sr. No., Nominal, 5 observations, Average, Error)
  if (!['observationvc', 'observationsrf', 'observationstdf'].includes(selectedTableData?.id)) return null;

  const formatValueByLc = (val, decimals, leastCount) => {
    if (val === null || val === undefined || val === '') return '';
    if (typeof val === 'string' && val.includes('/')) return val;

    const strVal = String(val).trim();
    const n = parseFloat(strVal);
    if (isNaN(n)) return val;

    let d = null;
    if (decimals != null && decimals !== 'NA' && decimals !== '') {
      const p = parseInt(decimals, 10);
      if (!isNaN(p)) d = p;
    }
    if (d === null && leastCount != null && leastCount !== 'NA' && leastCount !== '') {
      const s = String(leastCount).trim();
      if (s.includes('.')) d = s.split('.')[1].length;
    }

    if (leastCount != null && leastCount !== 'NA' && leastCount !== '') {
      const lc = parseFloat(String(leastCount).trim());
      if (!isNaN(lc) && lc > 0) {
        const quotient = n / lc;
        const floored = Math.floor(quotient);
        const remainder = quotient - floored;

        let rounded;
        if (remainder < 0.499999) {
          rounded = floored;
        } else if (remainder > 0.500001) {
          rounded = floored + 1;
        } else {
          rounded = (floored % 2 === 0) ? floored : floored + 1;
        }

        const result = rounded * lc;
        if (d !== null) {
          return result.toFixed(d);
        }
        return String(result);
      }
    }

    if (d !== null) {
      return n.toFixed(d);
    }
    return strVal;
  };

  const calculateAverage = (readings, lc_decimals, leastCount) => {
    const values = readings
      .filter(r => r !== '' && r !== null && r !== undefined)
      .map(r => parseFloat(r))
      .filter(r => !isNaN(r));

    if (values.length === 0) return '';

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return formatValueByLc(avg, lc_decimals, leastCount);
  };

  const calculateError = (avgUuc, masterReading, decimals) => {
    if (avgUuc === '' || masterReading === '' || avgUuc === null || masterReading === null) return '';
    const avg = parseFloat(avgUuc);
    const master = parseFloat(masterReading);
    if (isNaN(avg) || isNaN(master)) return '';

    const error = avg - master;
    const decimalPlaces = decimals ?? 2;
    return error.toFixed(decimalPlaces);
  };

  const getDecimalPlaces = (leastCount) => {
    if (!leastCount || leastCount === 'NA') return 2;
    const s = String(leastCount).trim();
    if (s.includes('.')) return s.split('.')[1].length;
    return 2;
  };

  const handleInputChangeWithValidation = (key, val, leastCount) => {
    const lcStr = String(leastCount || '0.01').trim();
    const maxDecimals = lcStr.includes('.') ? lcStr.split('.')[1].length : 2;

    if (val && val.includes('.')) {
      const decimals = val.split('.')[1].length;
      if (decimals > maxDecimals) {
        setInputErrors((prev) => ({
          ...prev,
          [key]: `Max ${maxDecimals} decimal places allowed for least count ${leastCount}`
        }));
      } else {
        setInputErrors((prev) => ({ ...prev, [key]: null }));
      }
    } else {
      setInputErrors((prev) => ({ ...prev, [key]: null }));
    }

    setTableInputValues((prev) => ({
      ...prev,
      [key]: val
    }));

    if (validateDecimalPlaces) {
      validateDecimalPlaces(val, leastCount);
    }
  };

  // Group staticRows or observations by matrix_type
  const groupedRows = {};
  if (selectedTableData?.staticRows && selectedTableData.staticRows.length > 0) {
    selectedTableData.staticRows.forEach((row, rowIndex) => {
      const point = (observations && observations[rowIndex]) ||
                    (selectedTableData?.calibration_points && selectedTableData.calibration_points[rowIndex]) ||
                    {};
      const matrixType = point.matrix_type || point.matrixtype || (selectedTableData?.id === 'observationsrf' ? 'SRF Measurement' : selectedTableData?.id === 'observationstdf' ? 'STDF Measurement' : 'Vernier Caliper Measurement');
      if (!groupedRows[matrixType]) {
        groupedRows[matrixType] = [];
      }
      groupedRows[matrixType].push({ row, rowIndex, point });
    });
  }

  if (Object.keys(groupedRows).length === 0 && Array.isArray(observations) && observations.length > 0) {
    observations.forEach((point, rowIndex) => {
      const matrixType = point.matrix_type || point.matrixtype || (selectedTableData?.id === 'observationsrf' ? 'SRF Measurement' : selectedTableData?.id === 'observationstdf' ? 'STDF Measurement' : 'Vernier Caliper Measurement');
      if (!groupedRows[matrixType]) {
        groupedRows[matrixType] = [];
      }
      const obsArr = point.observations || [];
      const row = [
        point.least_count || '0.01',
        point.nominal_value ?? point.master_value ?? '',
        obsArr[0] ?? '',
        obsArr[1] ?? '',
        obsArr[2] ?? '',
        obsArr[3] ?? '',
        obsArr[4] ?? '',
        point.average ?? '',
        point.error ?? ''
      ];
      groupedRows[matrixType].push({ row, rowIndex, point });
    });
  }

  if (Object.keys(groupedRows).length === 0) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded mb-6">
        <p className="text-yellow-800 dark:text-yellow-200 font-medium">No observation points available for Vernier Caliper (VC)</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 mb-8">
      {Object.entries(groupedRows).map(([matrixType, groupItems]) => {
        const samplePoint = groupItems[0]?.point || {};
        const unit = samplePoint.unit_description || (samplePoint.unit === '7' ? 'mm' : samplePoint.unit) || 'mm';

        return (
          <div key={matrixType} className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4 uppercase bg-blue-50 dark:bg-blue-900 p-2 rounded">
              {matrixType} {unit ? `(in ${unit})` : ''}
            </h3>
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-600 rounded">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600">
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase border-r border-gray-300 dark:border-gray-600">Sr. No.</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase border-r border-gray-300 dark:border-gray-600">Nominal / Set Value</th>
                    <th colSpan="5" className="px-3 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-200 uppercase border-r border-gray-300 dark:border-gray-600">Observation on UUC</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase border-r border-gray-300 dark:border-gray-600">Average</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase">Error</th>
                  </tr>
                  <tr className="bg-gray-50 dark:bg-gray-600 border-b border-gray-300 dark:border-gray-600">
                    <th colSpan="2" className="border-r border-gray-300 dark:border-gray-600"></th>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <th key={i} className="px-3 py-1 text-center text-xs font-medium text-gray-600 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600">
                        Obs {i}
                      </th>
                    ))}
                    <th colSpan="2" className="border-r border-gray-300 dark:border-gray-600"></th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800">
                  {groupItems.map(({ row, rowIndex, point }, itemIdx) => {
                    const isLastRowInGroup = itemIdx === groupItems.length - 1;
                    const pointSrNo = point.sr_no || (itemIdx + 1);
                    const leastCount = point.least_count || row[0]?.least_count || row[0] || '0.01';
                    const lc_dec = getDecimalPlaces(leastCount);

                    const masterReading = tableInputValues[`${rowIndex}-1`] ?? row[1] ?? point.nominal_value ?? point.master_value ?? '';
                    const readings = [2, 3, 4, 5, 6].map((colIdx, i) => tableInputValues[`${rowIndex}-${colIdx}`] ?? point.observations?.[i] ?? row[colIdx] ?? '');

                    const calculatedAvg = calculateAverage(readings, lc_dec, leastCount);
                    const avgUuc = calculatedAvg !== '' ? calculatedAvg : (tableInputValues[`${rowIndex}-7`] ?? point.average ?? '');

                    const calculatedErr = calculateError(avgUuc, masterReading, lc_dec);
                    const error = calculatedErr !== '' ? calculatedErr : (tableInputValues[`${rowIndex}-8`] ?? point.error ?? '');

                    return (
                      <tr key={rowIndex} className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-3 py-2 text-sm border-r border-gray-200 dark:border-gray-600 dark:text-white bg-gray-50 dark:bg-gray-700 text-center font-medium">
                          {pointSrNo}
                        </td>
                        <td className="px-3 py-2 text-sm border-r border-gray-200 dark:border-gray-600 dark:text-white bg-gray-50 dark:bg-gray-700">
                          <input
                            type="text"
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
                            value={masterReading}
                            readOnly
                          />
                        </td>
                        {[2, 3, 4, 5, 6].map((colIndex) => {
                          const isObs4or5 = colIndex === 5 || colIndex === 6;
                          const showInput = !isObs4or5 || isLastRowInGroup || (point.observations && point.observations.length >= 5) || (point.repeatable_cycle >= 5);
                          const fieldKey = `${rowIndex}-${colIndex}`;
                          const hasError = !!inputErrors[fieldKey];
                          const obsIndex = colIndex - 2;
                          const inputValue = tableInputValues[fieldKey] ?? point.observations?.[obsIndex] ?? row[colIndex] ?? '';

                          return (
                            <td key={colIndex} className="px-3 py-2 text-sm border-r border-gray-200 dark:border-gray-600 dark:text-white bg-white dark:bg-gray-800">
                              {showInput ? (
                                <div>
                                  <input
                                    type="number"
                                    step="any"
                                    className={`w-full px-2 py-1 border ${hasError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'} rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2`}
                                    value={inputValue}
                                    onChange={(e) => handleInputChangeWithValidation(fieldKey, e.target.value, leastCount)}
                                    onBlur={(e) => {
                                      if (handleObservationBlur) {
                                        handleObservationBlur(rowIndex, colIndex, e.target.value);
                                      }
                                    }}
                                  />
                                  {hasError && (
                                    <span className="text-xs text-red-500 block mt-1 font-normal">
                                      {inputErrors[fieldKey]}
                                    </span>
                                  )}
                                </div>
                              ) : null}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-sm border-r border-gray-200 dark:border-gray-600 dark:text-white bg-gray-50 dark:bg-gray-700">
                          <input
                            type="text"
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
                            value={avgUuc}
                            readOnly
                          />
                        </td>
                        <td className="px-3 py-2 text-sm dark:text-white bg-gray-50 dark:bg-gray-700">
                          <input
                            type="text"
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
                            value={error}
                            readOnly
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const calculateVCValues = (rowData, rowIndex, selectedTableData, leastCountData, observations) => {
  const result = { average: '', error: '' };
  if (!rowData || !Array.isArray(rowData)) return result;

  const validReadings = rowData.slice(2, 7).filter((val) => val !== '' && val !== null && val !== undefined && !isNaN(parseFloat(val)));
  const obsNumbers = validReadings.map((val) => parseFloat(val));

  if (obsNumbers.length > 0) {
    const avg = obsNumbers.reduce((sum, val) => sum + val, 0) / obsNumbers.length;
    const point = observations?.[rowIndex] || {};
    const leastCount = point.least_count || '0.01';
    let decimals = 2;
    if (leastCount && String(leastCount).includes('.')) {
      decimals = String(leastCount).split('.')[1].length;
    }
    result.average = avg.toFixed(decimals);

    const nominalValue = parseFloat(rowData[1]);
    if (!isNaN(nominalValue)) {
      result.error = (avg - nominalValue).toFixed(decimals);
    }
  }

  return result;
};

export default ObservationVC;
