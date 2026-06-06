/**
 * Turns raw, reductionist agent output into a calm, contextual summary for a
 * human. This template version is deterministic and dependency-free; swap the
 * body for an LLM call where the marked TODO is, keeping the same signature.
 */
export interface AgentFinding {
  label: string;
  value: string | number;
  significance?: "low" | "medium" | "high";
}

export function toNarrative(
  findings: AgentFinding[],
  context: { subject: string },
): string {
  if (findings.length === 0) {
    return `No notable findings for ${context.subject}.`;
  }
  const high = findings.filter((f) => f.significance === "high");
  const lead = high.length
    ? `For ${context.subject}, the items that need your attention: ` +
      high.map((f) => `${f.label} (${f.value})`).join(", ") + "."
    : `For ${context.subject}, here is a calm summary of what the agents found.`;
  const rest = findings
    .filter((f) => f.significance !== "high")
    .map((f) => `- ${f.label}: ${f.value}`)
    .join("\n");
  // TODO: replace with an LLM call for richer phrasing, same input/output shape.
  return rest ? `${lead}\n\n${rest}` : lead;
}
