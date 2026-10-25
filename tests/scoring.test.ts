import { computeComplianceStatus } from "../src/lib/bshces-utils";

const cases: Array<[number, number, string]> = [
  [100, 100, "compliant"],
  [95, 100, "partially_compliant"],
  [70, 100, "partially_compliant"],
  [69, 100, "non_compliant"],
  [0, 100, "non_compliant"],
  [0, 0, "non_compliant"],
];

let failed = 0;
for (const [total, max, expected] of cases) {
  const got = computeComplianceStatus(total, max);
  if (got !== expected) {
    console.error(`FAIL: ${total}/${max} -> ${got}, expected ${expected}`);
    failed++;
  }
}
if (failed) {
  console.error(`${failed} scoring band test(s) failed`);
  process.exit(1);
}
console.log("All scoring band tests passed");
