export type City = {
  id: string;
  name: string;
};

export type SchoolCityRef = {
  id: string;
  name: string;
};

export type School = {
  id: string;
  name: string;
  city: SchoolCityRef;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
};

export type SchoolSelection = {
  cityId: string;
  schoolId: string;
};

export const PUBLIC_NOTICE_KINDS = [
  "info",
  "organizational",
  "urgent",
] as const;

export type PublicNoticeKind = (typeof PUBLIC_NOTICE_KINDS)[number];

/** Public schedule notice from GET /api/v1/notices. */
export type PublicNotice = {
  id: string;
  schoolId: string;
  dateFrom: string;
  dateTo: string;
  kind: PublicNoticeKind;
  title: string;
  message: string;
  blocksSchedule: boolean;
};
