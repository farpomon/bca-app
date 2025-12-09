import type { Assessment, Deficiency } from "../drizzle/schema";

export function generateDeficienciesCSV(deficiencies: Deficiency[]): string {
  const headers = [
    "Component Code",
    "Title",
    "Description",
    "Location",
    "Severity",
    "Priority",
    "Status",
    "Recommended Action",
    "Estimated Cost",
    "Created Date",
  ];

  const rows = deficiencies.map(d => [
    d.componentCode,
    d.title,
    d.description || "",
    d.location || "",
    d.severity,
    d.priority.replace("_", " "),
    d.status,
    d.recommendedAction || "",
    d.estimatedCost ? `$${(d.estimatedCost / 100).toFixed(2)}` : "",
    d.createdAt.toLocaleDateString(),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  return csvContent;
}

export function generateAssessmentsCSV(assessments: Assessment[]): string {
  const headers = [
    "Component Code",
    "Condition",
    "Observations",
    "Remaining Useful Life (years)",
    "Expected Useful Life (years)",
    "Assessment Date",
  ];

  const rows = assessments.map(a => [
    a.componentCode,
    a.condition,
    a.observations || "",
    a.remainingUsefulLife?.toString() || "",
    a.expectedUsefulLife?.toString() || "",
    a.createdAt.toLocaleDateString(),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  return csvContent;
}

export function generateCostEstimatesCSV(deficiencies: Deficiency[]): string {
  const headers = [
    "Priority",
    "Component Code",
    "Title",
    "Severity",
    "Estimated Cost",
  ];

  const rows = deficiencies
    .filter(d => d.estimatedCost)
    .map(d => [
      d.priority.replace("_", " "),
      d.componentCode,
      d.title,
      d.severity,
      `$${(d.estimatedCost! / 100).toFixed(2)}`,
    ]);

  // Add totals by priority
  const priorities = ["immediate", "short_term", "medium_term", "long_term"] as const;
  const totals = priorities.map(priority => {
    const total = deficiencies
      .filter(d => d.priority === priority && d.estimatedCost)
      .reduce((sum, d) => sum + (d.estimatedCost || 0), 0);
    return [
      "",
      "",
      `${priority.replace("_", " ")} Total`,
      "",
      `$${(total / 100).toFixed(2)}`,
    ];
  });

  const grandTotal = deficiencies
    .filter(d => d.estimatedCost)
    .reduce((sum, d) => sum + (d.estimatedCost || 0), 0);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(",")),
    "",
    ...totals.map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(",")),
    "",
    `"","","Grand Total","","$${(grandTotal / 100).toFixed(2)}"`,
  ].join("\n");

  return csvContent;
}
