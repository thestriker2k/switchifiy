export type SwitchRow = {
  id: string;
  name: string;
  status: string;
  interval_days: number;
  grace_days: number;
  created_at: string;
  last_checkin_at: string | null;
  timezone: string | null;
};

export type RecipientRow = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};

export type SwitchRecipientRow = {
  switch_id: string;
  recipient_id: string;
  created_at: string;
};

export type FocusTarget =
  | { mode: "create"; field: "subject" | "body" }
  | { mode: "edit"; field: "subject" | "body" }
  | null;
