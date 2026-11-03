import { formatUncertaintyValue } from "./viewCmcUtils";

export const OdfmCmcTable = ({ data }) => (
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
          <th className="border border-gray-300 px-1 py-2">Uncertainty of master 1 sensor in (°C)</th>
          <th className="border border-gray-300 px-1 py-2">Uncertainty of master 2 (6.5 DMM) in Value</th>
          <th className="border border-gray-300 px-1 py-2">Sensitivity Coefficient</th>
          <th className="border border-gray-300 px-1 py-2">Uncertainty of master 2 (6.5 DMM) in °C</th>
          <th className="border border-gray-300 px-1 py-2">Stability of Bath (°C)</th>
          <th className="border border-gray-300 px-1 py-2">Uniformity Of Bath (°C)</th>
          <th className="border border-gray-300 px-1 py-2">Drift in Master (°C)</th>
          <th className="border border-gray-300 px-1 py-2">Least Count of UUC</th>
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
            <td className="border border-gray-300 px-1 py-2">{row.master0}</td>
            <td className="border border-gray-300 px-1 py-2">{row.master1}</td>
            <td className="border border-gray-300 px-1 py-2">{row.master2}</td>
            <td className="border border-gray-300 px-1 py-2">{row.master3}</td>
            <td className="border border-gray-300 px-1 py-2">{row.master4}</td>
            <td className="border border-gray-300 px-1 py-2">{row.unit}</td>
            <td className="border border-gray-300 px-1 py-2">{row.calibrationPoint}</td>
            <td className="border border-gray-300 px-1 py-2">{row.average}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.stdDeviation === 'number' ? formatUncertaintyValue(row.stdDeviation, 6) : row.stdDeviation}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.typeA === 'number' ? formatUncertaintyValue(row.typeA, 6) : row.typeA}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.uncertaintyMaster1 === 'number' ? row.uncertaintyMaster1.toFixed(3) : row.uncertaintyMaster1}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.uncertaintyMaster2Value === 'number' ? row.uncertaintyMaster2Value.toFixed(3) : row.uncertaintyMaster2Value}</td>
            <td className="border border-gray-300 px-1 py-2">{row.sensitivityCoefficient}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.uncertaintyMaster2Celsius === 'number' ? row.uncertaintyMaster2Celsius.toFixed(3) : row.uncertaintyMaster2Celsius}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.stabilityBath === 'number' ? row.stabilityBath.toFixed(3) : row.stabilityBath}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.uniformityBath === 'number' ? row.uniformityBath.toFixed(3) : row.uniformityBath}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.driftMaster === 'number' ? row.driftMaster.toFixed(3) : row.driftMaster}</td>
            <td className="border border-gray-300 px-1 py-2">{row.leastCountUuc}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.combinedUncertainty === 'number' ? row.combinedUncertainty.toFixed(6) : row.combinedUncertainty}</td>
            <td className="border border-gray-300 px-1 py-2">{row.degreeOfFreedom === '-' ? '-' : (typeof row.degreeOfFreedom === 'number' ? row.degreeOfFreedom.toFixed(2) : row.degreeOfFreedom)}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.coverageFactor === 'number' ? row.coverageFactor.toFixed(2) : row.coverageFactor}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.expandedUncertaintyValue === 'number' ? row.expandedUncertaintyValue.toFixed(6) : row.expandedUncertaintyValue}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.cmcScope === 'number' ? row.cmcScope.toFixed(6) : (row.cmcScope ?? '-')}</td>
            <td className="border border-gray-300 px-1 py-2">{typeof row.cmcUncertainty === 'number' ? row.cmcUncertainty.toFixed(6) : row.cmcUncertainty}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default OdfmCmcTable;
