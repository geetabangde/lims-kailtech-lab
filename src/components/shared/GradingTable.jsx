// Aggregate "Size and Grading" table (IS 2386 Part 1, limits IS 383 : 2016).
// `table` = { title, zone, rows: [{ sieve, passing, spec, within }] } built by the backend (App\Support\TestFormats::gradingTable).
//   mode="result" -> IS Sieve Designation mm | % Passing (+ caption / zone)      mode="spec" -> IS Sieve Designation mm | IS 383 : 2016
// Used only when a result row carries `grading_table`; every other row renders exactly as before.
import PropTypes from "prop-types";

const cell = "border border-gray-400 px-2 py-0.5 text-center text-xs";

export function GradingTable({ table, mode = "result" }) {
  if (!table || !Array.isArray(table.rows)) return null;
  const isResult = mode === "result";
  return (
    <div>
      <table className="w-full border-collapse text-gray-800 dark:text-gray-200">
        <thead>
          <tr>
            <th className={cell}>IS Sieve Designation mm</th>
            <th className={cell}>{isResult ? "% Passing" : "IS 383 : 2016"}</th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r) => (
            <tr key={r.sieve}>
              <td className={cell}>{r.sieve}</td>
              <td className={cell} style={isResult && r.within === false ? { color: "#c00000", fontWeight: 600 } : undefined}>
                {isResult ? r.passing : r.spec}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {isResult && table.title ? <div className="mt-1 text-center text-xs">{table.title}</div> : null}
      {isResult && table.zone ? <div className="text-center text-xs">Zone {table.zone}</div> : null}
    </div>
  );
}

GradingTable.propTypes = {
  table: PropTypes.shape({
    title: PropTypes.string,
    zone: PropTypes.string,
    rows: PropTypes.array,
  }),
  mode: PropTypes.oneOf(["result", "spec"]),
};
