import { formatUncertaintyValue } from "./viewCmcUtils";

export const MtCmcTable = ({ data }) => (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse text-[12px] text-gray-700 min-w-max">
      <thead>
        <tr className="bg-gray-100 text-center">
          <th colSpan="11" className="border border-gray-300 px-1 py-2 bg-gray-200 font-semibold text-xs">
            Type A Factor
          </th>
          <th colSpan="8" className="border border-gray-300 px-1 py-2 bg-gray-200 font-semibold text-xs">
            Type B Factor
          </th>
          <th colSpan="6" className="border border-gray-300 px-1 py-2 bg-gray-200 font-semibold text-xs">
            Uncertainty Measurement
          </th>
        </tr>
        <tr className="bg-gray-200 text-center text-[12px] font-medium">
          <th className="border border-gray-300 px-1 py-2">Sr No</th>
          <th className="border border-gray-300 px-1 py-2">1</th>
          <th className="border border-gray-300 px-1 py-2">2</th>
          <th className="border border-gray-300 px-1 py-2">3</th>
          <th className="border border-gray-300 px-1 py-2">4</th>
          <th className="border border-gray-300 px-1 py-2">5</th>
          <th className="border border-gray-300 px-1 py-2">Unit</th>
          <th className="border border-gray-300 px-1 py-2">Calibration Point</th>
          <th className="border border-gray-300 px-1 py-2">Average</th>
          <th className="border border-gray-300 px-1 py-2">Std Deviation</th>
          <th className="border border-gray-300 px-1 py-2">Type A</th>
          <th className="border border-gray-300 px-1 py-2">Uncertainty of Master in (mm)</th>
          <th className="border border-gray-300 px-1 py-2">Thickness of Graduation Line Mark in Measuring Tape</th>
          <th className="border border-gray-300 px-1 py-2">Thermal Coefficient of Master</th>
          <th className="border border-gray-300 px-1 py-2">Thermal Coefficient of UUC</th>
          <th className="border border-gray-300 px-1 py-2">Uncertainty due to Temperature Indicating Device (mm)</th>
          <th className="border border-gray-300 px-1 py-2">Standard Uncertainty due to Thermal Coefficient of Expansion Master and UUC assuming 20% (mm)</th>
          <th className="border border-gray-300 px-1 py-2">Standard Uncertainty due to Difference in Temperature Master and UUC assuming 0.5°C (mm)</th>
          <th className="border border-gray-300 px-1 py-2">Uncertainty Due to Parallelism in (mm)</th>
          <th className="border border-gray-300 px-1 py-2">Standard Uncertainty due to Error in Master (Taken Half) in mm</th>
          <th className="border border-gray-300 px-1 py-2">Combined Uncertainty</th>
          <th className="border border-gray-300 px-1 py-2">Degree of Freedom</th>
          <th className="border border-gray-300 px-1 py-2">Coverage Factor (k)</th>
          <th className="border border-gray-300 px-1 py-2">Expanded Uncertainty in Value</th>
          <th className="border border-gray-300 px-1 py-2">CMC Scope</th>
          <th className="border border-gray-300 px-1 py-2">CMC Taken</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i} className="hover:bg-gray-50 text-center text-[12px]">
            <td className="border border-gray-300 px-1 py-2">{row.srNo}</td>
            {row.values.map((v, idx) => (
              <td key={idx} className="border border-gray-300 px-1 py-2">{v}</td>
            ))}
            <td className="border border-gray-300 px-1 py-2">{row.unit}</td>
            <td className="border border-gray-300 px-1 py-2">{row.calibrationPoint}</td>
            <td className="border border-gray-300 px-1 py-2">{row.average}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.stdDeviation === 'number' ? formatUncertaintyValue(row.stdDeviation, 6) : row.stdDeviation}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.typeA === 'number' ? formatUncertaintyValue(row.typeA, 6) : row.typeA}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.uncertaintyOfMaster === 'number' ? row.uncertaintyOfMaster.toFixed(6) : row.uncertaintyOfMaster}</td>
            <td className="border border-gray-300 px-1 py-2">{row.thicknessOfGraduation}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.thermalCoeffMaster === 'number' ? row.thermalCoeffMaster.toFixed(6) : row.thermalCoeffMaster}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.thermalCoeffUuc === 'number' ? row.thermalCoeffUuc.toFixed(6) : row.thermalCoeffUuc}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.uncTempDevice === 'number' ? row.uncTempDevice.toFixed(6) : row.uncTempDevice}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.stdUncTher20 === 'number' ? row.stdUncTher20.toFixed(6) : row.stdUncTher20}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.stdUncDiff === 'number' ? row.stdUncDiff.toFixed(6) : row.stdUncDiff}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.uncParallelism === 'number' ? row.uncParallelism.toFixed(6) : row.uncParallelism}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.uncError === 'number' ? row.uncError.toFixed(6) : row.uncError}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.combinedUnc === 'number' ? row.combinedUnc.toFixed(6) : row.combinedUnc}</td>
            <td className="border border-gray-300 px-1 py-2">{row.dof === '-' ? '-' : (typeof row.dof === 'number' ? row.dof.toFixed(2) : row.dof)}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.coverageFactor === 'number' ? row.coverageFactor.toFixed(2) : row.coverageFactor}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.expandedUnc === 'number' ? row.expandedUnc.toFixed(6) : row.expandedUnc}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof (row.cmcScope ?? row.cmc_scope) === 'number' ? (row.cmcScope ?? row.cmc_scope).toFixed(6) : (row.cmcScope ?? row.cmc_scope ?? '-')}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.cmc === 'number' ? row.cmc.toFixed(6) : row.cmc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default MtCmcTable;
