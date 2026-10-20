import type { ArrivalStatus, GroupId } from "./types";

export type EntryFilter = "all" | "registered" | ArrivalStatus;

type OperationQuery = {
  group: "all" | GroupId;
  status: EntryFilter;
  query: string;
};

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/** The same intersection powers the operation table and its actionable summaries. */
export function filterArrivals<
  T extends {
    employee: { id: string; name: string; group: GroupId };
    status: ArrivalStatus;
    entry?: string | undefined;
  },
>(arrivals: readonly T[], { group, status, query }: OperationQuery): T[] {
  const search = normalizeSearch(query);
  return arrivals.filter((arrival) => {
    if (group !== "all" && arrival.employee.group !== group) return false;
    if (status === "registered" && !arrival.entry) return false;
    if (status !== "all" && status !== "registered" && arrival.status !== status) return false;
    return (
      !search ||
      normalizeSearch(arrival.employee.name).includes(search) ||
      normalizeSearch(arrival.employee.id).includes(search)
    );
  });
}

/** Accept only real calendar dates supported by the demonstration history. */
export function isValidReferenceDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year = 0, month = 0, day = 0] = value.split("-").map(Number);
  if (year < 2000 || year > 9999 || month < 1 || month > 12 || day < 1) return false;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= lastDay;
}
