import { GROUP_IDS } from "../config";
import type { ArrivalStatus, Employee, GroupId, Time } from "../types";

export interface GroupEntryStatus {
  group: GroupId;
  scheduled: number;
  registered: number;
  pending: number;
  aboveAlert: number;
  pendingNames: string[];
}

/**
 * Estado documental das entradas: nunca interpreta ausência de marcação como
 * falta confirmada ou presença física de quem registrou entrada.
 */
export function summarizeGroupEntries(
  arrivals: readonly {
    employee: Pick<Employee, "id" | "name" | "group">;
    entry?: Time;
    status: ArrivalStatus;
  }[],
): GroupEntryStatus[] {
  return GROUP_IDS.map((group) => {
    const members = arrivals.filter((arrival) => arrival.employee.group === group);
    const pendingMembers = members.filter((member) => !member.entry);
    return {
      group,
      scheduled: members.length,
      registered: members.length - pendingMembers.length,
      pending: pendingMembers.length,
      aboveAlert: members.filter((member) => member.status === "atraso_acima").length,
      pendingNames: pendingMembers.map((member) => member.employee.name),
    };
  });
}
