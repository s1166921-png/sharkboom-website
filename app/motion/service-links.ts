// Use only the business owner's confirmed partner URLs. Null opens service guidance.
export const serviceLinks: {
  riskOverview: string | null;
  asinDetection: string | null;
  aiLawyer: string | null;
} = {
  riskOverview: null,
  asinDetection: null,
  aiLawyer: null,
};

export function externalServiceUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
