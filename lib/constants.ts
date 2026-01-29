export const ALLOWED_INTERVALS = [1, 7, 14, 30, 60, 90, 365] as const;
export type AllowedInterval = (typeof ALLOWED_INTERVALS)[number];

export const MESSAGE_TOKENS = ["{recipient_name}", "{recipient_first_name}"] as const;
export type MessageToken = (typeof MESSAGE_TOKENS)[number];

export const DEFAULT_MESSAGE_SUBJECT = "Switch triggered";
export const DEFAULT_MESSAGE_BODY = "If you're receiving this, my Switchifye safety switch has triggered. Here's what you need to know...";
