// Aggregate "Size and Grading" table (IS 2386 Part 1, limits IS 383 : 2016).
// `table` = { title, zone, rows: [{ sieve, passing, spec, within }] } built by the backend (App\Support\TestFormats::gradingTable).
//   mode="result" -> IS Sieve Designation mm | % Passing (+ caption / zone)      mode="spec" -> IS Sieve Designation mm | IS 383 : 2016
// Used only when a result row carries `grading_table`; every other row renders exactly as before.
// Inline styles on purpose: this component is also printed through renderToStaticMarkup (print windows without Tailwind).
import PropTypes from "prop-types";

const cell = { border: "1px solid #6b7280", padding: "2px 6px", textAlign: "center", fontSize: "11px" };

export function GradingTable({ table, mode = "result" }) {
  if (!table || !Array.isArray(table.rows)) return null;
  const isResult = mode === "result";
  return (
    <div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={cell}>IS Sieve Designation mm</th>
            <th style={cell}>{isResult ? "% Passing" : "IS 383 : 2016"}</th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r) => (
            <tr key={r.sieve}>
              <td style={cell}>{r.sieve}</td>
              <td style={isResult && r.within === false ? { ...cell, color: "#c00000", fontWeight: 600 } : cell}>
                {isResult ? r.passing : r.spec}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {isResult && table.title ? <div style={{ marginTop: "2px", textAlign: "center", fontSize: "11px" }}>{table.title}</div> : null}
      {isResult && table.zone ? <div style={{ textAlign: "center", fontSize: "11px" }}>Zone {table.zone}</div> : null}
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
