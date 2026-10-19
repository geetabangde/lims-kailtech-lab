import { formatUncertaintyValue } from "./viewCmcUtils";

export const ExmCmcTable = ({ data }) => (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse text-[12px] text-gray-700 min-w-max">
      <thead>
        <tr className="bg-gray-100 text-center">
          <th colSpan="11" className="border border-gray-300 px-1 py-2 bg-gray-200 font-semibold text-xs">
            Type A Factor
          </th>
          <th colSpan="9" className="border border-gray-300 px-1 py-2 bg-gray-200 font-semibold text-xs">
            Type B Factor
          </th>
          <th colSpan="6" className="border border-gray-300 px-1 py-2 bg-gray-200 font-semibold text-xs">
            Uncertainty Measurement
          </th>
        </tr>
        <tr className="bg-gray-200 text-center text-[12px] font-medium">
          <th className="border border-gray-300 px-1 py-2">Sr no</th>
          <th className="border border-gray-300 px-1 py-2">Type Of Measurement</th>
          <th className="border border-gray-300 px-1 py-2">1</th>
          <th className="border border-gray-300 px-1 py-2">2</th>
          <th className="border border-gray-300 px-1 py-2">3</th>
          <th className="border border-gray-300 px-1 py-2">4</th>
          <th className="border border-gray-300 px-1 py-2">5</th>
          <th className="border border-gray-300 px-1 py-2">Unit</th>
          <th className="border border-gray-300 px-1 py-2">Calibration point</th>
          <th className="border border-gray-300 px-1 py-2">Average</th>
          <th className="border border-gray-300 px-1 py-2">Std Deviation</th>
          <th className="border border-gray-300 px-1 py-2">Type A</th>
          <th className="border border-gray-300 px-1 py-2">Uncertainty of Slip Gauge in mm</th>
          <th className="border border-gray-300 px-1 py-2">Least Count of UUC</th>
          <th className="border border-gray-300 px-1 py-2">Thermal Coefficient of Master</th>
          <th className="border border-gray-300 px-1 py-2">Thermal Coefficient of UUC</th>
          <th className="border border-gray-300 px-1 py-2">Uncertainty due to Temperature Indicating Device (mm)</th>
          <th className="border border-gray-300 px-1 py-2">Standard uncertainty due to the thermal coefficient of expansion master and Unit Under Calibration assuming 20% (mm)</th>
          <th className="border border-gray-300 px-1 py-2">Standard uncertainty due to the difference in temperature master and Unit Under Calibration assuming 0.5˚C (mm)</th>
          <th className="border border-gray-300 px-1 py-2">Uncertainty Due Parallelism in (mm)</th>
          <th className="border border-gray-300 px-1 py-2">Standard uncertainty due to Error in Master (Taken Half) in mm</th>
          <th className="border border-gray-300 px-1 py-2">Combined Uncertainty</th>
          <th className="border border-gray-300 px-1 py-2">Degree of Freedom</th>
          <th className="border border-gray-300 px-1 py-2">Coverage Factor (k)</th>
          <th className="border border-gray-300 px-1 py-2">Expanded Uncertainty in Value</th>
          <th className="border border-gray-300 px-1 py-2">CMC Scope</th>
          <th className="border border-gray-300 px-1 py-2">CMC taken</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i} className="hover:bg-gray-50 text-center text-[12px]">
            <td className="border border-gray-300 px-1 py-2">{row.srNo}</td>
            <td className="border border-gray-300 px-1 py-2 text-left">{row.typeOfMeasurement}</td>
            {row.values.map((v, idx) => (
              <td key={idx} className="border border-gray-300 px-1 py-2">{v}</td>
            ))}
            <td className="border border-gray-300 px-1 py-2">{row.unit}</td>
            <td className="border border-gray-300 px-1 py-2">{row.calibrationPoint}</td>
            <td className="border border-gray-300 px-1 py-2">{row.average}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.stdDeviation === 'number' ? formatUncertaintyValue(row.stdDeviation, 6) : row.stdDeviation}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.typeA === 'number' ? formatUncertaintyValue(row.typeA, 6) : row.typeA}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.uncertaintySlipGauge === 'number' ? formatUncertaintyValue(row.uncertaintySlipGauge, 6) : row.uncertaintySlipGauge}</td>
            <td className="border border-gray-300 px-1 py-2">{row.leastCountUuc}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.thermalCoeffMaster === 'number' ? formatUncertaintyValue(row.thermalCoeffMaster, 6) : row.thermalCoeffMaster}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.thermalCoeffUuc === 'number' ? formatUncertaintyValue(row.thermalCoeffUuc, 6) : row.thermalCoeffUuc}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.uncTempDevice === 'number' ? formatUncertaintyValue(row.uncTempDevice, 6) : row.uncTempDevice}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.stdUncTher20 === 'number' ? formatUncertaintyValue(row.stdUncTher20, 6) : row.stdUncTher20}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.stdUncDiff === 'number' ? formatUncertaintyValue(row.stdUncDiff, 6) : row.stdUncDiff}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.uncParallelism === 'number' ? formatUncertaintyValue(row.uncParallelism, 6) : row.uncParallelism}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.uncError === 'number' ? formatUncertaintyValue(row.uncError, 6) : row.uncError}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.combinedUnc === 'number' ? formatUncertaintyValue(row.combinedUnc, 6) : row.combinedUnc}</td>
            <td className="border border-gray-300 px-1 py-2">{row.dof === '-' ? '-' : (typeof row.dof === 'number' ? formatUncertaintyValue(row.dof, 2) : row.dof)}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.coverageFactor === 'number' ? formatUncertaintyValue(row.coverageFactor, 2) : row.coverageFactor}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.expandedUnc === 'number' ? formatUncertaintyValue(row.expandedUnc, 6) : row.expandedUnc}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.cmcScope === 'number' ? formatUncertaintyValue(row.cmcScope, 2) : (row.cmcScope || '-')}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.cmc === 'number' ? formatUncertaintyValue(row.cmc, 6) : row.cmc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default ExmCmcTable;
