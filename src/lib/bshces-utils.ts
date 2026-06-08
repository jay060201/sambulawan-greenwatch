export const COMPLIANCE_COLOR: Record<string, string> = {
  compliant: "var(--success)",
  partially_compliant: "var(--warning)",
  non_compliant: "var(--destructive)",
};

export const COMPLIANCE_LABEL: Record<string, string> = {
  compliant: "Compliant",
  partially_compliant: "Partially Compliant",
  non_compliant: "Non-Compliant",
};

export const CATEGORY_LABEL: Record<string, string> = {
  waste_segregation: "Waste Segregation",
  sanitation: "Sanitation",
  gardening: "Gardening",
  ordinance: "Ordinance Compliance",
};

export const PUROKS = ["Aquino", "Marcos", "Macapagal", "Magsaysay", "Ramos", "Roxas"] as const;

export function complianceBadgeClass(status: string) {
  switch (status) {
    case "compliant":
      return "bg-[color:var(--success)]/15 text-[color:var(--success)] border border-[color:var(--success)]/30";
    case "partially_compliant":
      return "bg-[color:var(--warning)]/15 text-[color:var(--warning)] border border-[color:var(--warning)]/30";
    default:
      return "bg-destructive/15 text-destructive border border-destructive/30";
  }
}

export function exportCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}