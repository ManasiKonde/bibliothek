/**
 * Deliverable pincodes. Replace with Supabase table or API when you have one.
 * Indian pincodes are 6 digits. Add your serviceable areas here.
 */
const DELIVERABLE_PINCODES: ReadonlySet<string> = new Set([
  "110001", "110002", "110003", "110004", "110005", // Delhi sample
  "400001", "400002", "400003", "400004", "400005", // Mumbai sample
  "560001", "560002", "560003", "560004", "560005", // Bangalore sample
  "600001", "600002", "600003", "600004", "600005", // Chennai sample
  "700001", "700002", "700003", "700004", "700005", // Kolkata sample
  "411001", "411002", "411003", "411004", "411005", // Pune sample
]);

/** Normalize pincode: trim and take first 6 digits. */
function normalizePincode(pincode: string): string {
  const trimmed = String(pincode ?? "").trim().replace(/\s/g, "");
  const match = trimmed.match(/^\d{6}/);
  return match ? match[0] : trimmed.slice(0, 6) || "";
}

/**
 * Returns true if we deliver to this pincode.
 * Use after user enters address; show "We are not delivering at this location yet" when false.
 */
export function isPincodeDeliverable(pincode: string): boolean {
  const normalized = normalizePincode(pincode);
  if (normalized.length !== 6) return false;
  return DELIVERABLE_PINCODES.has(normalized);
}

export { DELIVERABLE_PINCODES };
