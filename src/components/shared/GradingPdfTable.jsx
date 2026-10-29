// Aggregate "Size and Grading" table for @react-pdf/renderer report PDFs (IS 2386 Part 1, limits IS 383 : 2016).
// Same data as components/shared/GradingTable.jsx: `table` = { title, zone, rows: [{ sieve, passing, spec, within }] }.
// Used only when a result row carries `grading_table`; every other row renders exactly as before.
import { View, Text, StyleSheet } from "@react-pdf/renderer";

const S = StyleSheet.create({
  row: { flexDirection: "row" },
  cell: { flex: 1, borderWidth: 0.5, borderColor: "#555555", paddingVertical: 1.5, paddingHorizontal: 2, fontSize: 6.5, textAlign: "center" },
  head: { fontFamily: "Helvetica-Bold" },
  note: { fontSize: 6.5, textAlign: "center", marginTop: 1 },
});

export function GradingPdfTable({ table, mode = "result" }) {
  if (!table || !Array.isArray(table.rows)) return null;
  const isResult = mode === "result";
  return (
    <View>
      <View style={S.row}>
        <Text style={[S.cell, S.head]}>IS Sieve Designation mm</Text>
        <Text style={[S.cell, S.head]}>{isResult ? "% Passing" : "IS 383 : 2016"}</Text>
      </View>
      {table.rows.map((r) => (
        <View key={r.sieve} style={S.row} wrap={false}>
          <Text style={S.cell}>{r.sieve}</Text>
          <Text style={isResult && r.within === false ? [S.cell, { color: "#c00000" }] : S.cell}>{isResult ? r.passing : r.spec}</Text>
        </View>
      ))}
      {isResult && table.title ? <Text style={S.note}>{table.title}</Text> : null}
      {isResult && table.zone ? <Text style={S.note}>Zone {table.zone}</Text> : null}
    </View>
  );
}
