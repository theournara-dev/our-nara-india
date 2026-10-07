export const AMBASSADOR_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type AmbassadorStatusValue = (typeof AMBASSADOR_STATUSES)[number];

export const AMBASSADOR_STATUS_LABELS: Record<AmbassadorStatusValue, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const AMBASSADOR_STATUS_STYLES: Record<AmbassadorStatusValue, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-rose-100 text-rose-700",
};
