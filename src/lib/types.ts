export type MessageType =
  | "confirm"
  | "reminder_48hr"
  | "reminder_tomorrow"
  | "reminder_2h"
  | "book_next_nudge1"
  | "book_next_nudge2"
  | "book_next_nudge_manual";

export type SendStatus = "ready" | "opened" | "sent" | "needs_review";

export type FollowupStatus = "open" | "contacted" | "booked" | "closed";

export type NoNextStatus = "pending" | "nudged1" | "nudged2" | "booked" | "closed";

export type TimeRange = "today" | "tomorrow" | "week";

export interface Clinic {
  id: string;
  name: string;
  status: string | null;
  created_at: string | null;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  clinic_id: string | null;
  clinic_name: string | null;
  is_active: boolean;
  is_admin: boolean;
}

export interface OutboxMessage {
  id: string;
  created_at: string;
  clinic_id: string;
  appointment_id: string;
  message_type: MessageType;
  potential_duplicate: boolean;
  idempotency_key: string;
  phone_e164: string;
  message_text: string;
  wa_clickable_label: string | null;
  wa_link: string;
  send_status: SendStatus;
  patient_name: string | null;
  dentist: string | null;
  start_iso: string | null;
  display_time: string | null;
  event_updated_at: string | null;
  opened_at: string | null;
  opened_by: string | null;
  sent_at: string | null;
  sent_by: string | null;
  not_sent_reason: string | null;
}

export interface ConfirmedAppointment {
  id: string;
  created_at: string;
  clinic_id: string;
  appointment_id: string;
  patient_name: string | null;
  phone: string | null;
  dentist: string | null;
  start: string | null;
  status: string | null;
}

export interface RescheduleFollowup {
  id: string;
  created_at: string;
  updated_at: string;
  clinic_id: string;
  appointment_id: string;
  patient_name: string | null;
  phone: string | null;
  dentist: string | null;
  current_start: string | null;
  note: string | null;
  ai_summary: string | null;
  followup_status: FollowupStatus;
  handled_by: string | null;
  handled_note: string | null;
}

export interface CancelledFollowup {
  id: string;
  created_at: string;
  updated_at: string;
  clinic_id: string;
  appointment_id: string;
  patient_name: string | null;
  phone: string | null;
  dentist: string | null;
  start: string | null;
  cancel_reason: string | null;
  ai_summary: string | null;
  followup_status: FollowupStatus;
  handled_by: string | null;
  handled_note: string | null;
}

export interface NoNextAppointment {
  id: string;
  created_at: string;
  updated_at: string;
  clinic_id: string;
  patient_name: string | null;
  phone_e164: string;
  dentist: string | null;
  last_visit_iso: string | null;
  note: string | null;
  status: NoNextStatus;
  idempotency_key: string | null;
}
