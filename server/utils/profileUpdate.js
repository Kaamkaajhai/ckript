export function resolveProfileImageUpdate(currentValue = "", incomingValue) {
  if (incomingValue === undefined) return currentValue;
  if (typeof incomingValue !== "string") return currentValue;
  return incomingValue.trim();
}
