import { create } from "zustand";

export const usePeriodStore = create((set) => ({
  period: "this_month",
  setPeriod: (period) => set({ period }),
}));

export function useGlobalPeriod() {
  const period = usePeriodStore((state) => state.period);
  const setPeriod = usePeriodStore((state) => state.setPeriod);
  return { period, setPeriod };
}
