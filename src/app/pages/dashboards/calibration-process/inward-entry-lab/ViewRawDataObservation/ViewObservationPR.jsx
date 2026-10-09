import { safeGetValue } from './viewRawDataUtils';

/**
 * Table configuration for Proving Ring (PR)
 * Matches the header structure of the PR observation:
 * - Single Headers: Sr. No., Applied Force(F) (Unit)
 * - Sub Headers: Observed (F) with Position 0°, Position 120°, Position 240°
 * - Remaining Headers: Mean(Fi), % Repeatability Error(q), Factor
 */
export const prTableConfig = {
    id: 'observationpr',
    name: 'Observation PR',
    category: 'Proving Ring',
    structure: {
        singleHeaders: ['Sr. No.', 'Applied Force(F)'],
        subHeaders: {
            'Observed (F)': ['Position 0°', 'Position 120°', 'Position 240°'],
        },
        remainingHeaders: ['Mean(Fi)', '% Repeatability Error(q)', 'Factor'],
    },
};

/**
 * Extract number of decimal places from least count value.
 */
export const getDecimalPlaces = (leastCount) => {
    if (!leastCount || leastCount === 'NA' || leastCount === 'N.A') return null;
    const s = String(leastCount).trim();
    if (s.includes('.')) {
        const parts = s.split('.');
        return parts[parts.length - 1].length;
    }
    if (!isNaN(parseFloat(s))) return 0;
    return null;
};

/**
 * Calculate PR values for display
 * - Mean(Fi) = average of 3 readings formatted to 4 decimal places
 * - % Repeatability Error(q) = ((max - min) / mean) * 100 formatted to 2 decimal places
 * - Factor = (point / mean) * 101.9716005 (full calculation)
 */
export const calculatePRValues = (setpointVal, readings = []) => {
    const result = {
        mean: '',
        repeatability: '',
        factor: '',
    };

    const validNumbers = readings
        .map((v) => (v !== undefined && v !== null && String(v).trim() !== '' ? parseFloat(v) : NaN))
        .filter((v) => !isNaN(v));

    if (validNumbers.length === 0) return result;

    // Mean(Fi) - formatted to 4 decimal places
    const sum = validNumbers.reduce((acc, curr) => acc + curr, 0);
    const avg = sum / validNumbers.length;
    result.mean = avg.toFixed(4);

    const meanNum = parseFloat(result.mean);

    // % Repeatability Error(q)
    if (validNumbers.length >= 2 && !isNaN(meanNum) && meanNum !== 0) {
        const maxVal = Math.max(...validNumbers);
        const minVal = Math.min(...validNumbers);
        const rep = ((maxVal - minVal) / meanNum) * 100;
        result.repeatability = rep.toFixed(2);
    }

    // Factor = (point / mean) * 101.9716005
    const pointNum = parseFloat(setpointVal);
    if (!isNaN(pointNum) && !isNaN(meanNum) && meanNum !== 0) {
        const factorCalc = (pointNum / meanNum) * 101.9716005;
        result.factor = factorCalc.toString();
    }

    return result;
};

/**
 * Create PR table rows for view mode
 * Handles API response structure with observation_data.matrices[0].points
 */
export const createPRRows = (observations = [], instrument = {}) => {
    const rows = [];

    // Handle API response structure
    let observationData = observations;

    // Handle nested observation_data structure from API response
    if (observations?.observation_data) {
        observationData = observations.observation_data;
    }

    // Handle data.matrices structure
    if (observationData?.data?.matrices) {
        observationData = observationData.data.matrices;
    } else if (observationData?.matrices) {
        observationData = observationData.matrices;
    }

    // Handle matrices structure
    let matrices = [];
    if (Array.isArray(observationData)) {
        if (observationData.length > 0 && observationData[0]?.matrices) {
            matrices = observationData[0].matrices;
        } else if (observationData.length > 0 && observationData[0]?.points) {
            matrices = observationData;
        } else {
            matrices = observationData;
        }
    } else if (observationData?.matrices) {
        matrices = observationData.matrices;
    } else if (observationData?.points) {
        matrices = [{ points: observationData.points }];
    }

    // Extract unit from header_info or first available point
    const firstMatrix = matrices[0] || {};
    const firstPoint = firstMatrix?.points?.[0] ||
        (Array.isArray(firstMatrix) ? firstMatrix[0] : null) ||
        observations[0];

    const unit = firstMatrix?.header_info?.uuc_unit ||
        firstMatrix?.header_info?.calculation_unit ||
        firstPoint?.unit_description ||
        firstPoint?.unit_name ||
        firstPoint?.unit ||
        instrument?.unit ||
        'N';

    const note = firstMatrix?.note ||
        "The calibration data obtained in compression is valid for the following dial gauge setting only: Large Pointer at 12 'O' clock position    Small Pointer at 1";

    let globalSrNo = 1;

    matrices.forEach((matrix) => {
        const points = matrix?.points || (Array.isArray(matrix) ? matrix : []);

        points.forEach((point) => {
            if (!point) return;

            const srNo = point.sr_no ?? globalSrNo++;
            const setpoint = safeGetValue(
                point.set_point ??
                point.point ??
                point.setpoint ??
                point.nominal_value ??
                ''
            );

            // Get 3 master readings from observations array
            const obs0 = safeGetValue(
                point.observations?.[0] ??
                point.master_readings?.[0] ??
                point.m0 ??
                point.observations?.find?.((o) => o.type === 'master' && Number(o.repeatable) === 0)?.value ??
                ''
            );

            const obs1 = safeGetValue(
                point.observations?.[1] ??
                point.master_readings?.[1] ??
                point.m1 ??
                point.observations?.find?.((o) => o.type === 'master' && Number(o.repeatable) === 1)?.value ??
                ''
            );

            const obs2 = safeGetValue(
                point.observations?.[2] ??
                point.master_readings?.[2] ??
                point.m2 ??
                point.observations?.find?.((o) => o.type === 'master' && Number(o.repeatable) === 2)?.value ??
                ''
            );

            // Use already calculated values from API response, fallback to calculation
            const mean = safeGetValue(
                point.average_master ??
                point.averagemaster ??
                point.mean ??
                point.average ??
                ''
            );

            const repeatability = safeGetValue(
                point.repeatability ??
                point.repeatability_error ??
                ''
            );

            const factor = safeGetValue(
                point.factor ??
                ''
            );

            // If values are missing, calculate them
            const calculated = calculatePRValues(setpoint, [obs0, obs1, obs2]);
            const finalMean = mean || calculated.mean;
            const finalRepeatability = repeatability || calculated.repeatability;
            const finalFactor = calculated.factor || factor;

            const row = [
                srNo.toString(),
                setpoint,
                obs0,
                obs1,
                obs2,
                finalMean,
                finalRepeatability,
                finalFactor,
            ];

            rows.push(row);
        });
    });

    return {
        rows,
        unit,
        note,
    };
};

/**
 * Main ViewObservationPR component
 * Displays read-only PR observation data in table format
 */
export const ViewObservationPR = ({ observations = [], instrument = {} }) => {
    console.log('ViewObservationPR received observations:', observations);
    console.log('ViewObservationPR received instrument:', instrument);

    const { rows, unit, note } = createPRRows(observations, instrument);

    console.log('ViewObservationPR generated rows:', rows);
    console.log('ViewObservationPR unit:', unit);
    console.log('ViewObservationPR note:', note);

    if (rows.length === 0) {
        return (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-md">
                <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                    No observation data available for Proving Ring (PR).
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Dial Gauge Setting Notice */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs sm:text-sm rounded-md">
                {note}
            </div>

            {/* Main Observation Table */}
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-md">
                <table className="w-full text-sm border-collapse bg-white dark:bg-gray-800">
                    <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700/80 border-b border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200">
                            <th
                                rowSpan={3}
                                className="px-3 py-2 text-center text-xs font-semibold uppercase border-r border-gray-300 dark:border-gray-600 w-16"
                            >
                                Sr. No.
                            </th>
                            <th
                                rowSpan={3}
                                className="px-3 py-2 text-center text-xs font-semibold uppercase border-r border-gray-300 dark:border-gray-600 min-w-[130px]"
                            >
                                Applied Force(F) ({unit})
                            </th>
                            <th
                                colSpan={3}
                                style={{ maxWidth: '280px' }}
                                className="px-3 py-2 text-center text-xs font-semibold uppercase border-r border-gray-300 dark:border-gray-600"
                            >
                                Observed (F)
                            </th>
                            <th
                                rowSpan={3}
                                className="px-3 py-2 text-center text-xs font-semibold uppercase border-r border-gray-300 dark:border-gray-600 min-w-[110px]"
                            >
                                Mean(Fi)
                            </th>
                            <th
                                rowSpan={3}
                                className="px-3 py-2 text-center text-xs font-semibold uppercase border-r border-gray-300 dark:border-gray-600 min-w-[150px]"
                            >
                                % Repeatability Error(q)
                            </th>
                            <th
                                rowSpan={3}
                                className="px-3 py-2 text-center text-xs font-semibold uppercase min-w-[110px]"
                            >
                                Factor
                            </th>
                        </tr>
                        <tr className="bg-gray-50 dark:bg-gray-600/70 border-b border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300">
                            <th className="px-2 py-1 text-center text-xs font-medium border-r border-gray-300 dark:border-gray-600">
                                Position 0°
                            </th>
                            <th className="px-2 py-1 text-center text-xs font-medium border-r border-gray-300 dark:border-gray-600">
                                Position 120°
                            </th>
                            <th className="px-2 py-1 text-center text-xs font-medium border-r border-gray-300 dark:border-gray-600">
                                Position 240°
                            </th>
                        </tr>
                        <tr className="bg-gray-50 dark:bg-gray-600/70 border-b border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400">
                            <th className="px-2 py-1 text-center text-xs font-medium border-r border-gray-300 dark:border-gray-600">
                                Observation 1
                            </th>
                            <th className="px-2 py-1 text-center text-xs font-medium border-r border-gray-300 dark:border-gray-600">
                                Observation 2
                            </th>
                            <th className="px-2 py-1 text-center text-xs font-medium border-r border-gray-300 dark:border-gray-600">
                                Observation 3
                            </th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {rows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors">
                                {/* Sr. No. */}
                                <td className="px-3 py-2 text-center text-sm font-medium border-r border-gray-200 dark:border-gray-700 dark:text-white bg-gray-50/50 dark:bg-gray-800/50">
                                    {row[0]}
                                </td>

                                {/* Applied Force(F) */}
                                <td className="px-2 py-1.5 border-r border-gray-200 dark:border-gray-700 text-center text-sm text-gray-900 dark:text-white">
                                    {row[1]}
                                </td>

                                {/* Observation 1 (Position 0°) */}
                                <td className="px-2 py-1.5 border-r border-gray-200 dark:border-gray-700 text-center text-sm text-gray-900 dark:text-white">
                                    {row[2]}
                                </td>

                                {/* Observation 2 (Position 120°) */}
                                <td className="px-2 py-1.5 border-r border-gray-200 dark:border-gray-700 text-center text-sm text-gray-900 dark:text-white">
                                    {row[3]}
                                </td>

                                {/* Observation 3 (Position 240°) */}
                                <td className="px-2 py-1.5 border-r border-gray-200 dark:border-gray-700 text-center text-sm text-gray-900 dark:text-white">
                                    {row[4]}
                                </td>

                                {/* Mean(Fi) */}
                                <td className="px-2 py-1.5 border-r border-gray-200 dark:border-gray-700 text-center text-sm font-medium text-gray-900 dark:text-white">
                                    {row[5]}
                                </td>

                                {/* % Repeatability Error(q) */}
                                <td className="px-2 py-1.5 border-r border-gray-200 dark:border-gray-700 text-center text-sm text-gray-900 dark:text-white">
                                    {row[6]}
                                </td>

                                {/* Factor */}
                                <td className="px-2 py-1.5 text-center text-sm text-gray-900 dark:text-white">
                                    {row[7]}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ViewObservationPR;