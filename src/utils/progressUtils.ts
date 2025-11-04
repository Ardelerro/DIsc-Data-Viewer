function smoothProgress(p: number): number {
  return Math.pow(p / 100, 0.6) * 100;
}
function map(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
) {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

export { smoothProgress, map };