// Display rule (lab, 2026-11-20): a grade of NA / None / blank means "no grade specified",
// so the report must not print the "Grade" label or value. Real grades print as before.
const NO_GRADE = ['', '-', '--', 'na', 'n/a', 'n.a', 'n.a.', 'none', 'nil', 'not applicable', '0'];

export const hasGrade = (grade) => {
  if (grade === null || grade === undefined) return false;
  return !NO_GRADE.includes(String(grade).trim().toLowerCase());
};
