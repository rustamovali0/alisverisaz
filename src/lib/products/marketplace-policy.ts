export function allowsPersonalListings(): boolean {
  // Keep historical records readable; only approved stores can create new offers.
  return false;
}
