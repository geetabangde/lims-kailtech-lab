const isYes = (val) => String(val || '').trim().toLowerCase() === 'yes';

const ObservationBiomedical = ({
  selectedTableData,
  tableInputValues = {},
  observations = [],
  isBiomedical,
  isVisualTestVisible,
  isBasicSafetyVisible,
  isElectricalSafetyVisible,
  isPerformanceVisible,
  visualTests = [],
  visualTestInputs = {},
  setVisualTestInputs,
  safetyTests = [],
  safetyTestInputs = {},
  setSafetyTestInputs,
  handleBiomedicalInputChange,
  handleBiomedicalInputBlur,
  validateDecimalPlaces,
}) => {
  const config = selectedTableData?.config;
  const isBioActive = config?.biomedical !== undefined ? isYes(config.biomedical) : isBiomedical;

  if (!isBioActive) return null;

  // Calculate average from current readings (both state and initial data)
  const calculateAverage = (pointId, readingType, count, point) => {
    const readings = [];
    const isMasterReadOnly = point.mode === 'Measure';
    const isUucReadOnly = point.mode === 'Source';
    const setPointRaw = (point.set_point ?? point.point ?? '').toString().trim();

    for (let i = 0; i < count; i++) {
      const stateKey = `${pointId}-${readingType}-${i}`;
      let value = tableInputValues[stateKey];

      if (value === undefined) {
        if (readingType === 'master') {
          value = point.master_readings?.[i]?.value ?? (isMasterReadOnly ? setPointRaw : '');
        } else if (readingType === 'uuc') {
          value = point.uuc_readings?.[i]?.value ?? (isUucReadOnly ? setPointRaw : '');
        }
      }

      if (value !== '' && value !== null && value !== undefined) {
        readings.push(String(value));
      }
    }

    if (readings.length === 0) return '';

    let sum = 0;
    let validCount = 0;
    let maxReadingDec = 0;

    readings.forEach(val => {
      const s = String(val).trim();
      if (s.includes('.')) {
        const dec = s.split('.')[1].length;
        if (dec > maxReadingDec) maxReadingDec = dec;
      }
      const num = parseFloat(s);
      if (!isNaN(num)) {
        sum += num;
        validCount++;
      }
    });

    if (validCount === 0) return '';

    const raw = sum / validCount;
    let targetDec = 0;

    const lc = readingType === 'master' ? point.master_least_count : point.least_count;
    const lcDec = readingType === 'master' ? point.mlc_decimals : point.lc_decimals;

    if (lcDec != null && lcDec !== 'NA' && lcDec !== '') {
      const p = parseInt(lcDec, 10);
      if (!isNaN(p)) targetDec = p;
    }

    if (targetDec === 0 && (!lcDec || lcDec === 'NA' || lcDec === '')) {
      if (lc != null && lc !== 'NA' && lc !== '') {
        const s = String(lc).trim();
        if (s.includes('.')) targetDec = s.split('.')[1].length;
      }
    }

    targetDec = Math.max(targetDec, maxReadingDec);

    if (targetDec === 0 && raw % 1 !== 0) {
      return String(parseFloat(raw.toFixed(4)));
    }

    return raw.toFixed(targetDec);
  };

  // Determine least count directly from point object (matching ViewRawData logic)
  const getEffectiveLeastCount = (value, point, isMaster) => {
    return isMaster
      ? (point?.master_least_count ?? point?.masterleastcount ?? '1')
      : (point?.least_count ?? point?.leastcount ?? '0.1');
  };

  // Least count validation function (checks decimal places and divisibility)
  const validateLeastCount = (value, leastCount) => {
    if (value === '' || value === null || value === undefined) {
      return { isValid: true, error: null };
    }
    const strVal = String(value).trim();
    if (strVal.endsWith('.') || strVal === '-' || strVal === 'NA' || strVal === 'N.A') {
      return { isValid: true, error: null };
    }

    const numValue = parseFloat(strVal);
    if (isNaN(numValue) || !leastCount || leastCount === 'NA' || isNaN(parseFloat(leastCount))) {
      return { isValid: true, error: null };
    }

    const lcValue = parseFloat(leastCount);
    if (lcValue <= 0) return { isValid: true, error: null };

    // Also trigger validateDecimalPlaces if provided as prop
    if (typeof validateDecimalPlaces === 'function') {
      validateDecimalPlaces(value, leastCount);
    }

    // 1. Decimal places check
    const lcStr = String(leastCount).trim();
    const lcDecimals = lcStr.includes('.') ? lcStr.split('.')[1].length : 0;
    const valueDecimals = strVal.includes('.') ? strVal.split('.')[1].length : 0;

    if (valueDecimals > lcDecimals) {
      return {
        isValid: false,
        error: `Max ${lcDecimals} decimal(s) allowed (LC: ${leastCount})`
      };
    }

    // 2. Divisibility check
    const factor = 1000000;
    const scaledValue = Math.round(numValue * factor);
    const scaledLc = Math.round(lcValue * factor);
    const remainder = scaledValue % scaledLc;

    if (remainder !== 0) {
      return {
        isValid: false,
        error: `Must be a multiple of least count ${leastCount}`
      };
    }

    return { isValid: true, error: null };
  };

  // PHP checksafety function exact logic
  const checksafety = (value, minrange, maxrange) => {
    if (value === null || value === undefined || value === '') return '';
    const strVal = String(value).trim();
    if (strVal === '' || strVal.toUpperCase() === 'N.A') return 'N.A';

    const numVal = parseFloat(strVal);
    if (isNaN(numVal)) return '';

    const strMin = String(minrange ?? '').trim();
    const strMax = String(maxrange ?? '').trim();

    if (strMin === '>') {
      const maxVal = parseFloat(strMax);
      return !isNaN(maxVal) ? (numVal > maxVal ? 'Pass' : 'Fail') : '';
    } else if (strMin === '<') {
      const maxVal = parseFloat(strMax);
      return !isNaN(maxVal) ? (numVal < maxVal ? 'Pass' : 'Fail') : '';
    } else if (strMin === '=') {
      const maxVal = parseFloat(strMax);
      return !isNaN(maxVal) ? (numVal === maxVal ? 'Pass' : 'Fail') : '';
    } else {
      const minVal = parseFloat(strMin);
      const maxVal = parseFloat(strMax);
      if (!isNaN(minVal) && !isNaN(maxVal)) {
        return (numVal >= minVal && numVal <= maxVal) ? 'Pass' : 'Fail';
      } else if (!isNaN(maxVal) && (strMin === '' || strMin === 'NA')) {
        return numVal <= maxVal ? 'Pass' : 'Fail';
      } else if (!isNaN(minVal) && (strMax === '' || strMax === 'NA')) {
        return numVal >= minVal ? 'Pass' : 'Fail';
      }
    }
    return '';
  };

  const getPointRemark = (point, deviationVal) => {
    if (deviationVal === null || deviationVal === undefined || deviationVal === '') {
      return point.remark || '';
    }

    let min = point.tolerance_min;
    let max = point.tolerance_max;

    if (min == null || max == null) {
      const tolType = (point.tolerance_type || '').trim();
      const tolVal = parseFloat(point.tolerance_value ?? point.tolerance);
      const setPointVal = parseFloat(point.set_point ?? point.point);

      if (!isNaN(tolVal)) {
        if (tolType === '%') {
          if (!isNaN(setPointVal)) {
            const limit = Math.abs((tolVal / 100) * setPointVal);
            min = -limit;
            max = limit;
          }
        } else if (tolType === 'Fixed') {
          min = -tolVal;
          max = tolVal;
        }
      }
    }

    if (min != null && max != null) {
      const res = checksafety(deviationVal, min, max);
      if (res === 'Pass') return 'Satisfactory';
      if (res === 'Fail') return 'Not Satisfactory';
      return res;
    }

    if (point.tolerance && String(point.tolerance).includes('<')) {
      const parts = String(point.tolerance).split('<');
      const maxVal = parseFloat(parts[1]);
      if (!isNaN(maxVal)) {
        const res = checksafety(deviationVal, '<', maxVal);
        if (res === 'Pass') return 'Satisfactory';
        if (res === 'Fail') return 'Not Satisfactory';
      }
    }

    return point.remark || '';
  };

  const formatValueByLc = (val, decimals, leastCount) => {
    if (val === null || val === undefined || val === '') return '';
    if (typeof val === 'string' && val.includes('/')) return val;

    const strVal = String(val).trim();
    if (strVal.endsWith('.')) return strVal;

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
        if (remainder < 0.5) {
          rounded = floored;
        } else if (remainder > 0.5) {
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
      const multiplier = Math.pow(10, d);
      const scaled = n * multiplier;
      const floored = Math.floor(scaled);
      const remainder = scaled - floored;

      let rounded;
      if (remainder < 0.5) {
        rounded = floored;
      } else if (remainder > 0.5) {
        rounded = floored + 1;
      } else {
        rounded = (floored % 2 === 0) ? floored : floored + 1;
      }

      return (rounded / multiplier).toFixed(d);
    }
    return strVal;
  };

  const renderVisualInspection = () => {
    const list = (selectedTableData?.visual_test && selectedTableData.visual_test.length > 0)
      ? selectedTableData.visual_test
      : visualTests;

    const showVisual = config
      ? (isYes(config.biomedical) && isYes(config.show_visual_test))
      : isVisualTestVisible;

    if (!showVisual || !list || list.length === 0) return null;

    return (
      <div className="mb-8">
        <h2 className="text-md font-semibold text-gray-800 dark:text-white mb-4">1. VISUAL INSPECTION</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse border border-gray-300 dark:border-gray-600">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="p-2 border border-gray-300 dark:border-gray-600 font-medium text-gray-800 dark:text-white text-left">Description</th>
                <th className="p-2 border border-gray-300 dark:border-gray-600 font-medium text-gray-800 dark:text-white text-left">Remark</th>
              </tr>
            </thead>
            <tbody>
              {list.map((test, index) => {
                const testKey = (test.id !== undefined && test.id !== null) ? test.id : index;
                const val = visualTestInputs[testKey] ?? (test.value ?? test.remark ?? '');
                return (
                  <tr key={`visual-${testKey}`} className="dark:bg-gray-800">
                    <td className="p-2 border border-gray-300 dark:border-gray-600 dark:text-white bg-gray-50 dark:bg-gray-700">
                      {test.description || test.name || ''}
                    </td>
                    <td className="p-2 border border-gray-300 dark:border-gray-600 dark:text-white">
                      <input type="hidden" name="calibrationpoint[]" value={test.instid || test.id} />
                      <input type="hidden" name="type[]" value={test.type || `visualtest${test.id || index + 1}`} />
                      <input type="hidden" name="repeatable[]" value="0" />
                      <input
                        type="text"
                        name="value[]"
                        id={`visualtest${test.id || index + 1}`}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={val}
                        onChange={(e) => {
                          const newString = e.target.value;
                          if (setVisualTestInputs) {
                            setVisualTestInputs(prev => ({
                              ...prev,
                              [testKey]: newString
                            }));
                          }
                        }}
                        placeholder="Enter observation / remark"
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
  };

  const renderBasicSafetyTest = () => {
    const list = (selectedTableData?.basic_safety && selectedTableData.basic_safety.length > 0)
      ? selectedTableData.basic_safety
      : safetyTests;

    const showBasic = config
      ? (isYes(config.biomedical) && isYes(config.show_basic_safety))
      : isBasicSafetyVisible;

    if (!showBasic || !list || list.length === 0) return null;

    const thCls = 'p-2 border border-gray-300 dark:border-gray-600 font-medium text-gray-800 dark:text-white text-left';
    const tdCls = 'p-2 border border-gray-300 dark:border-gray-600 dark:text-white';

    return (
      <div className="mb-8">
        <h2 className="text-md font-semibold text-gray-800 dark:text-white mb-4">2. BASIC SAFETY TEST</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse border border-gray-300 dark:border-gray-600">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className={thCls}>Description</th>
                <th className={thCls}>Observed Value</th>
              </tr>
            </thead>
            <tbody>
              {list.map((test, index) => {
                const testKey = (test.id !== undefined && test.id !== null) ? test.id : index;
                const val = safetyTestInputs[testKey] ?? (test.value ?? '');

                return (
                  <tr key={`safety-${testKey}`} className="dark:bg-gray-800">
                    <td className={`${tdCls} bg-gray-50 dark:bg-gray-700`}>
                      {test.description || test.name || ''}
                    </td>
                    <td className={tdCls}>
                      <input type="hidden" name="calibrationpoint[]" value={test.instid || test.id} />
                      <input type="hidden" name="type[]" value={test.type || `electricalsafety${test.id || index + 1}`} />
                      <input type="hidden" name="repeatable[]" value="0" />
                      <input
                        type="text"
                        name="value[]"
                        id={`electricalsafety${test.id || index + 1}`}
                        className="w-32 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={val}
                        onChange={(e) => {
                          const newString = e.target.value;
                          if (setSafetyTestInputs) {
                            setSafetyTestInputs(prev => ({
                              ...prev,
                              [testKey]: newString
                            }));
                          }
                        }}
                        placeholder="Enter value"
                      />
                      <span className="ml-1 text-xs text-gray-500">{test.unit || ''}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderBiomedicalTables = () => {
    let measureSafety = [];
    let sourceSafety = [];
    let measurePerf = [];
    let sourcePerf = [];

    if (selectedTableData) {
      if (selectedTableData.electrical_safety) {
        measureSafety = selectedTableData.electrical_safety.measure || [];
        sourceSafety = selectedTableData.electrical_safety.source || [];
      }
      if (selectedTableData.performance_test) {
        measurePerf = selectedTableData.performance_test.measure || [];
        sourcePerf = selectedTableData.performance_test.source || [];
      }

      if (selectedTableData.calibration_points && Array.isArray(selectedTableData.calibration_points)) {
        const points = selectedTableData.calibration_points;
        if (measureSafety.length === 0) measureSafety = points.filter(p => p.mode === 'Measure' && p.is_electrical_safety);
        if (sourceSafety.length === 0) sourceSafety = points.filter(p => p.mode === 'Source' && p.is_electrical_safety);
        if (measurePerf.length === 0) measurePerf = points.filter(p => p.mode === 'Measure' && !p.is_electrical_safety);
        if (sourcePerf.length === 0) sourcePerf = points.filter(p => p.mode === 'Source' && !p.is_electrical_safety);
      }
    }

    if (measureSafety.length === 0 && sourceSafety.length === 0 && measurePerf.length === 0 && sourcePerf.length === 0 && observations && observations.length > 0) {
      measurePerf = observations.filter(p => p.mode === 'Measure' && !p.is_electrical_safety);
      sourcePerf = observations.filter(p => p.mode === 'Source' && !p.is_electrical_safety);
      measureSafety = observations.filter(p => p.mode === 'Measure' && p.is_electrical_safety);
      sourceSafety = observations.filter(p => p.mode === 'Source' && p.is_electrical_safety);
    }

    // PAT-BIO-UNITCONV-01: Source performance points whose UUC unit differs from the master unit (backend sends unit_conversion) get their own table: 3 master readings in the master unit.
    const sourcePerfConv = sourcePerf.filter(p => p && p.unit_conversion);
    const sourcePerfPlain = sourcePerf.filter(p => !(p && p.unit_conversion));

    const renderTable = (sectionTitle, tablePoints, defaultMasterCount, defaultUucCount, showDevAndUnc, isSource = false, showRemark = true) => {
      if (!tablePoints || tablePoints.length === 0) return null;

      const masterCount = defaultMasterCount;
      const uucCount = defaultUucCount;
      // Suction machine (231) mmHg UUC / bar master table: DPG-style columns in bar, no Tolerance column (Prateek 2026-11-05)
      const isConv = tablePoints.some(p => p && p.unit_conversion);

      const thCls = 'p-2 border border-gray-300 dark:border-gray-600 font-medium text-gray-800 dark:text-white text-center';
      const tdCls = 'p-2 border border-gray-300 dark:border-gray-600 dark:text-white';

      const renderMasterCells = (point, pointId) => {
        const isMasterReadOnly = point.mode === 'Measure';
        return Array.from({ length: masterCount }).map((_, i) => {
          const rawState = tableInputValues[`${pointId}-master-${i}`];
          const initialVal = point.master_readings?.[i]?.value ?? (isMasterReadOnly ? (point.set_point ?? point.point ?? '') : '');
          const displayValue = rawState !== undefined ? rawState : initialVal;
          const effectiveLc = getEffectiveLeastCount(displayValue, point, true);
          const lcCheck = validateLeastCount(displayValue, effectiveLc);

          return (
            <td key={`master-${i}`} className={tdCls}>
              <input type="hidden" name="calibrationpoint[]" value={pointId} />
              <input type="hidden" name="type[]" value="master" />
              <input type="hidden" name="repeatable[]" value={i} />
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    name="value[]"
                    className={`w-20 px-2 py-1 border rounded-md focus:outline-none focus:ring-2 text-gray-900 dark:text-white ${
                      !lcCheck.isValid
                        ? 'border-red-500 bg-red-50 dark:bg-red-950/40 focus:ring-red-500'
                        : isMasterReadOnly
                        ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 focus:ring-blue-500'
                    }`}
                    value={displayValue}
                    readOnly={isMasterReadOnly}
                    title={!lcCheck.isValid ? lcCheck.error : undefined}
                    placeholder={!isMasterReadOnly ? String(point.unit_conversion?.converted_set_point ?? point.set_point ?? point.point ?? '') : ''}
                    onChange={!isMasterReadOnly ? (e) => handleBiomedicalInputChange(pointId, 'master', i, e.target.value, masterCount, uucCount) : undefined}
                    onBlur={!isMasterReadOnly ? (e) => handleBiomedicalInputBlur(pointId, 'master', i, e.target.value, masterCount, uucCount) : undefined}
                  />

                  <span className="text-xs text-gray-500">{point.master_readings?.[i]?.unit || point.set_point_unit || point.unit || ''}</span>
                </div>
                {!lcCheck.isValid && (
                  <span className="text-[10px] text-red-500 leading-none">{lcCheck.error}</span>
                )}
              </div>
            </td>
          );
        });
      };

      const renderUucCells = (point, pointId) => {
        const isUucReadOnly = point.mode === 'Source';
        return Array.from({ length: uucCount }).map((_, i) => {
          const rawState = tableInputValues[`${pointId}-uuc-${i}`];
          const initialVal = point.uuc_readings?.[i]?.value ?? (isUucReadOnly ? (point.set_point ?? point.point ?? '') : '');
          const displayValue = rawState !== undefined ? rawState : initialVal;
          const effectiveLc = getEffectiveLeastCount(displayValue, point, false);
          const lcCheck = validateLeastCount(displayValue, effectiveLc);

          return (
            <td key={`uuc-${i}`} className={tdCls}>
              <input type="hidden" name="calibrationpoint[]" value={pointId} />
              <input type="hidden" name="type[]" value="uuc" />
              <input type="hidden" name="repeatable[]" value={i} />
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    name="value[]"
                    className={`w-20 px-2 py-1 border rounded-md focus:outline-none focus:ring-2 text-gray-900 dark:text-white ${
                      !lcCheck.isValid
                        ? 'border-red-500 bg-red-50 dark:bg-red-950/40 focus:ring-red-500'
                        : isUucReadOnly
                        ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 focus:ring-blue-500'
                    }`}
                    value={displayValue}
                    readOnly={isUucReadOnly}
                    title={!lcCheck.isValid ? lcCheck.error : undefined}
                    placeholder={!isUucReadOnly ? String(point.set_point ?? point.point ?? '') : ''}
                    onChange={!isUucReadOnly ? (e) => handleBiomedicalInputChange(pointId, 'uuc', i, e.target.value, masterCount, uucCount) : undefined}
                    onBlur={!isUucReadOnly ? (e) => handleBiomedicalInputBlur(pointId, 'uuc', i, e.target.value, masterCount, uucCount) : undefined}
                  />

                  <span className="text-xs text-gray-500">{point.uuc_readings?.[i]?.unit || point.set_point_unit || point.unit || ''}</span>
                </div>
                {!lcCheck.isValid && (
                  <span className="text-[10px] text-red-500 leading-none">{lcCheck.error}</span>
                )}
              </div>
            </td>
          );
        });
      };

      return (
        <div className="mb-6">
          <h3 className="text-md font-semibold text-gray-800 dark:text-white mb-2">{sectionTitle}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse border border-gray-300 dark:border-gray-600">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className={thCls}>Parameter</th>
                  {showDevAndUnc && <th className={thCls}>Set Point</th>}
                  {isSource ? (
                    <>
                      {uucCount > 0 && <th colSpan={uucCount} className={thCls}>Reading on UUC</th>}
                      {uucCount > 1 && <th className={thCls}>Average On UUC</th>}
                      {masterCount > 0 && <th colSpan={masterCount} className={thCls}>Reading on Master</th>}
                      {masterCount > 1 && <th className={thCls}>Average On Master</th>}
                    </>
                  ) : (
                    <>
                      {masterCount > 0 && <th colSpan={masterCount} className={thCls}>Reading on Master</th>}
                      {masterCount > 1 && <th className={thCls}>Average On Master</th>}
                      {uucCount > 0 && <th colSpan={uucCount} className={thCls}>Reading on UUC</th>}
                      {uucCount > 1 && <th className={thCls}>Average On UUC</th>}
                    </>
                  )}
                  {showDevAndUnc && <th className={thCls}>{isConv ? 'Deviation (bar)' : 'Deviation'}</th>}
                  {isConv && <th className={thCls}>Repeatability (bar)</th>}
                  {isConv && <th className={thCls}>Hysteresis (bar)</th>}
                  {!isConv && <th className={thCls}>Tolerance</th>}
                  {showDevAndUnc && showRemark && <th className={thCls}>Remark</th>}
                </tr>
              </thead>
              <tbody>
                {tablePoints.map((point) => {
                  const pointId = point.calibration_point_id || point.id;
                  const devVal = tableInputValues[`${pointId}-error`] ?? point.deviation;
                  const currentRemark = getPointRemark(point, devVal);

                  return (
                    <tr key={`bio-${pointId}`} className="dark:bg-gray-800">
                      {/* Parameter */}
                      <td className={`${tdCls} min-w-[180px]`}>
                        <input type="hidden" name="calibrationpoint[]" value={pointId} />
                        <input type="hidden" name="type[]" value="parameter" />
                        <input type="hidden" name="repeatable[]" value="0" />
                        <input
                          type="text"
                          name="value[]"
                          id={`parameter${pointId}`}
                          title={tableInputValues[`${pointId}-parameter`] ?? (point.parameter || point.unittype || '')}
                          className="w-full min-w-[160px] px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                          value={tableInputValues[`${pointId}-parameter`] ?? (point.parameter || point.unittype || '')}
                          readOnly
                        />
                      </td>

                      {/* Set Point */}
                      {showDevAndUnc && (
                        <td className={tdCls}>
                          <input type="hidden" name="calibrationpoint[]" value={pointId} />
                          <input type="hidden" name="type[]" value="setpoint" />
                          <input type="hidden" name="repeatable[]" value="0" />
                          <input
                            type="text"
                            name="value[]"
                            id={`setpoint${pointId}`}
                            className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                            value={point.set_point ?? point.point ?? ''}
                            readOnly
                          /> {point.set_point_unit ?? point.unit ?? ''}
                          {point.unit_conversion && (
                            <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                              = {point.unit_conversion.converted_set_point} {point.unit_conversion.master_unit}
                            </div>
                          )}
                        </td>
                      )}

                      {/* Readings */}
                      {isSource ? (
                        <>
                          {uucCount > 0 && renderUucCells(point, pointId)}
                          {uucCount > 1 && (() => {
                            const isWaveform = (point.parameter || point.unittype || '').toLowerCase().includes('waveform');
                            const calculatedAvg = isWaveform ? '' : calculateAverage(pointId, 'uuc', uucCount, point);
                            const uucVal = tableInputValues[`${pointId}-averageuuc`] || calculatedAvg || (point.average_uuc ?? '');
                            return (
                              <td className={tdCls}>
                                <input type="hidden" name="calibrationpoint[]" value={pointId} />
                                <input type="hidden" name="type[]" value="averageuuc" />
                                <input type="hidden" name="repeatable[]" value="0" />
                                <input
                                  type="text"
                                  name="value[]"
                                  id={`averageuuc${pointId}`}
                                  className={`w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white ${isWaveform ? 'bg-white dark:bg-gray-600' : 'bg-gray-50 dark:bg-gray-700'}`}
                                  value={isWaveform ? uucVal : formatValueByLc(uucVal, point.lc_decimals, null)}
                                  readOnly={!isWaveform}
                                  onChange={isWaveform ? (e) => handleBiomedicalInputChange(pointId, 'averageuuc', 0, e.target.value, masterCount, uucCount) : undefined}
                                  onBlur={isWaveform ? (e) => handleBiomedicalInputBlur(pointId, 'averageuuc', 0, e.target.value, masterCount, uucCount) : undefined}
                                />
                                <span className="ml-1 text-xs text-gray-500">{point.unit || point.set_point_unit || ''}</span>
                              </td>
                            );
                          })()}
                          {masterCount > 0 && renderMasterCells(point, pointId)}
                          {masterCount > 1 && (() => {
                            const calculatedAvg = calculateAverage(pointId, 'master', masterCount, point);
                            const displayAvg = tableInputValues[`${pointId}-averagemaster`] || calculatedAvg || point.average_master;
                            return (
                              <td className={tdCls}>
                                <input type="hidden" name="calibrationpoint[]" value={pointId} />
                                <input type="hidden" name="type[]" value="averagemaster" />
                                <input type="hidden" name="repeatable[]" value="0" />
                                <input
                                  type="text"
                                  name="value[]"
                                  id={`averagemaster${pointId}`}
                                  className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                  value={formatValueByLc(displayAvg, point.mlc_decimals, null)}
                                  readOnly
                                />
                                <span className="ml-1 text-xs text-gray-500">{point.unit_conversion?.master_unit || point.masterunit || point.set_point_unit || point.unit || ''}</span>
                              </td>
                            );
                          })()}
                        </>
                      ) : (
                        <>
                          {masterCount > 0 && renderMasterCells(point, pointId)}
                          {masterCount > 1 && (() => {
                            const calculatedAvg = calculateAverage(pointId, 'master', masterCount, point);
                            const displayAvg = tableInputValues[`${pointId}-averagemaster`] || calculatedAvg || point.average_master;
                            return (
                              <td className={tdCls}>
                                <input type="hidden" name="calibrationpoint[]" value={pointId} />
                                <input type="hidden" name="type[]" value="averagemaster" />
                                <input type="hidden" name="repeatable[]" value="0" />
                                <input
                                  type="text"
                                  name="value[]"
                                  id={`averagemaster${pointId}`}
                                  className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                  value={formatValueByLc(displayAvg, point.mlc_decimals, null)}
                                  readOnly
                                />
                                <span className="ml-1 text-xs text-gray-500">{point.unit_conversion?.master_unit || point.masterunit || point.set_point_unit || point.unit || ''}</span>
                                {point.unit_conversion && displayAvg !== '' && displayAvg != null && !isNaN(parseFloat(displayAvg)) && Number(point.unit_conversion.factor) !== 0 && (
                                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                                    = {(parseFloat(displayAvg) / Number(point.unit_conversion.factor)).toFixed(3)} {point.unit_conversion.uuc_unit}
                                  </div>
                                )}
                              </td>
                            );
                          })()}
                          {uucCount > 0 && renderUucCells(point, pointId)}
                          {uucCount > 1 && (() => {
                            const isWaveform = (point.parameter || point.unittype || '').toLowerCase().includes('waveform');
                            const calculatedAvg = isWaveform ? '' : calculateAverage(pointId, 'uuc', uucCount, point);
                            const uucVal = tableInputValues[`${pointId}-averageuuc`] || calculatedAvg || (point.average_uuc ?? '');
                            return (
                              <td className={tdCls}>
                                <input type="hidden" name="calibrationpoint[]" value={pointId} />
                                <input type="hidden" name="type[]" value="averageuuc" />
                                <input type="hidden" name="repeatable[]" value="0" />
                                <input
                                  type="text"
                                  name="value[]"
                                  id={`averageuuc${pointId}`}
                                  className={`w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white ${isWaveform ? 'bg-white dark:bg-gray-600' : 'bg-gray-50 dark:bg-gray-700'}`}
                                  value={isWaveform ? uucVal : formatValueByLc(uucVal, point.lc_decimals, null)}
                                  readOnly={!isWaveform}
                                  onChange={isWaveform ? (e) => handleBiomedicalInputChange(pointId, 'averageuuc', 0, e.target.value, masterCount, uucCount) : undefined}
                                  onBlur={isWaveform ? (e) => handleBiomedicalInputBlur(pointId, 'averageuuc', 0, e.target.value, masterCount, uucCount) : undefined}
                                />
                                <span className="ml-1 text-xs text-gray-500">{point.unit || point.set_point_unit || ''}</span>
                              </td>
                            );
                          })()}
                        </>
                      )}

                      {/* Deviation */}
                      {showDevAndUnc && (() => {
                        const pLcDec = (point.lc_decimals != null && point.lc_decimals !== 'NA') ? parseInt(point.lc_decimals, 10) : 0;
                        const pMlcDec = (point.mlc_decimals != null && point.mlc_decimals !== 'NA') ? parseInt(point.mlc_decimals, 10) : 0;
                        const countDec = (v) => {
                          if (v == null || v === '') return 0;
                          const s = String(v).trim();
                          return s.includes('.') ? s.split('.')[1].length : 0;
                        };
                        const devDecimals = Math.max(pLcDec, pMlcDec, countDec(devVal));
                        if (isConv) {
                          // Display in bar; the saved 'error' value (mmHg) is unchanged and kept as a hidden input.
                          const mlcD = Number.isFinite(pMlcDec) ? pMlcDec : 3;
                          const mv = (i) => {
                            const raw = tableInputValues[`${pointId}-master-${i}`];
                            return parseFloat(raw !== undefined ? raw : point.master_readings?.[i]?.value);
                          };
                          const m1 = mv(0), m2 = mv(1), m3 = mv(2);
                          const avgBar = parseFloat(tableInputValues[`${pointId}-averagemaster`] || calculateAverage(pointId, 'master', masterCount, point) || point.average_master);
                          const setBar = parseFloat(point.unit_conversion.converted_set_point);
                          const devBar = (!isNaN(avgBar) && !isNaN(setBar)) ? (setBar - avgBar).toFixed(mlcD) : '';
                          const repBar = (!isNaN(m1) && !isNaN(m3)) ? Math.abs(m3 - m1).toFixed(mlcD) : '';
                          const hysBar = (!isNaN(m1) && !isNaN(m2)) ? Math.abs(m2 - m1).toFixed(mlcD) : '';
                          const roBox = 'w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white';
                          return (
                            <>
                              <td className={tdCls}>
                                <input type="hidden" name="calibrationpoint[]" value={pointId} />
                                <input type="hidden" name="type[]" value="error" />
                                <input type="hidden" name="repeatable[]" value="0" />
                                <input type="hidden" name="value[]" id={`error${pointId}`} value={formatValueByLc(devVal, devDecimals)} />
                                <input type="text" className={`${roBox} font-medium`} value={devBar} readOnly />
                                <span className="ml-1 text-xs text-gray-500">{point.unit_conversion.master_unit}</span>
                              </td>
                              <td className={tdCls}>
                                <input type="text" className={roBox} value={repBar} readOnly />
                                <span className="ml-1 text-xs text-gray-500">{point.unit_conversion.master_unit}</span>
                              </td>
                              <td className={tdCls}>
                                <input type="text" className={roBox} value={hysBar} readOnly />
                                <span className="ml-1 text-xs text-gray-500">{point.unit_conversion.master_unit}</span>
                              </td>
                            </>
                          );
                        }
                        return (
                          <td className={tdCls}>
                            <input type="hidden" name="calibrationpoint[]" value={pointId} />
                            <input type="hidden" name="type[]" value="error" />
                            <input type="hidden" name="repeatable[]" value="0" />
                            <input
                              type="text"
                              name="value[]"
                              id={`error${pointId}`}
                              className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-medium"
                              value={formatValueByLc(devVal, devDecimals)}
                              readOnly
                            />
                            <span className="ml-1 text-xs text-gray-500">{point.unit || point.set_point_unit || ''}</span>
                          </td>
                        );
                      })()}

                      {/* Specification / Tolerance */}
                      {(() => {
                        const rawTol = point.tolerance ?? point.tolerance_value ?? point.specification ?? '';
                        const tolType = (point.tolerance_type || '').trim();
                        const formattedTolerance = tolType === '%' && rawTol && !String(rawTol).includes('%')
                          ? `${rawTol}%`
                          : String(rawTol || '');
                        return (
                          <td className={isConv ? 'hidden' : tdCls}>
                            <input type="hidden" name="calibrationpoint[]" value={pointId} />
                            <input type="hidden" name="type[]" value="specification" />
                            <input type="hidden" name="repeatable[]" value="0" />
                            <input
                              type="text"
                              name="value[]"
                              id={`specification${pointId}`}
                              className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                              value={tableInputValues[`${pointId}-specification`] ?? formattedTolerance}
                              onChange={(e) => handleBiomedicalInputChange(pointId, 'specification', 0, e.target.value, masterCount, uucCount)}
                              onBlur={(e) => handleBiomedicalInputBlur(pointId, 'specification', 0, e.target.value, masterCount, uucCount)}
                            />
                          </td>
                        );
                      })()}

                      {/* Remark */}
                      {showDevAndUnc && showRemark && (
                        <td className={tdCls}>
                          <input type="hidden" name="calibrationpoint[]" value={pointId} />
                          <input type="hidden" name="type[]" value="remark" />
                          <input type="hidden" name="repeatable[]" value="0" />
                          <input
                            type="hidden"
                            name="value[]"
                            id={`remark${pointId}`}
                            value={tableInputValues[`${pointId}-remark`] ?? currentRemark}
                          />
                          {currentRemark ? (
                            <span className={`px-2 py-1 text-xs font-semibold rounded ${
                              currentRemark === 'Satisfactory' || currentRemark === 'Pass'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : currentRemark === 'Not Satisfactory' || currentRemark === 'Fail'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700'
                            }`}>
                              {currentRemark}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                      )}

                      {/* Expanded Uncertainty (Hidden input as per PHP) */}
                      <input type="hidden" name="calibrationpoint[]" value={pointId} />
                      <input type="hidden" name="type[]" value="expandeduncertainty" />
                      <input type="hidden" name="repeatable[]" value="0" />
                      <input type="hidden" id={`expandeduncertainty${pointId}`} name="value[]" value={tableInputValues[`${pointId}-expandeduncertainty`] ?? point.expanded_uncertainty ?? ''} />

                      {/* Hidden: Remark (when not shown as visible column) */}
                      {(!showDevAndUnc || !showRemark) && (
                        <>
                          <input type="hidden" name="calibrationpoint[]" value={pointId} />
                          <input type="hidden" name="type[]" value="remark" />
                          <input type="hidden" name="repeatable[]" value="0" />
                          <input type="hidden" name="value[]" value={tableInputValues[`${pointId}-remark`] ?? currentRemark ?? point.remark ?? ''} />
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    };

    const showElectrical = config
      ? (isYes(config.biomedical) && isYes(config.show_electrical_safety))
      : isElectricalSafetyVisible;

    const showPerformance = config
      ? (isYes(config.biomedical) && isYes(config.show_performance ?? config.show_performance_test))
      : isPerformanceVisible;

    return (
      <div className="space-y-6">
        {showElectrical && measureSafety.length > 0 && renderTable("3. ELECTRICAL SAFETY TEST", measureSafety, 1, 0, false, false, false)}
        {showElectrical && sourceSafety.length > 0 && renderTable("3. ELECTRICAL SAFETY TEST (Source)", sourceSafety, 5, 0, false, true, false)}
        {showPerformance && measurePerf.length > 0 && renderTable("4. PERFORMANCE TESTING", measurePerf, 1, 5, true, false, false)}
        {showPerformance && sourcePerfPlain.length > 0 && renderTable("4. PERFORMANCE TESTING (Source)", sourcePerfPlain, 5, 1, true, true, false)}
        {showPerformance && sourcePerfConv.length > 0 && renderTable("4. PERFORMANCE TESTING (Source) - UUC in mmHg, master in bar", sourcePerfConv, 3, 1, true, true, false)}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {renderVisualInspection()}
      {renderBasicSafetyTest()}
      {renderBiomedicalTables()}
    </div>
  );
};

export default ObservationBiomedical;