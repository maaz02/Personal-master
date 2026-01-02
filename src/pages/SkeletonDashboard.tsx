
import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Send, CheckCircle2, AlertCircle, Clock, Phone, MessageSquare, Trash2, MoreVertical } from "lucide-react";

type OutboxRow = {
  id: string;
  appointmentId: string;
  patientName: string;
  service?: string;
  phoneE164?: string;
  dentist: string;
  startIso?: string;
  createdAt: string;
  openedAt?: string;
  sentAt?: string;
  sendStatus: "ready" | "opened" | "sent" | "done" | "needs_review";
  potentialDuplicate?: boolean;
  messageText?: string;
  waLink?: string;
  messageType:
    | "confirm"
    | "reminder_48hr"
    | "reminder_tomorrow"
    | "reminder_2h"
    | "book_next_nudge1"
    | "book_next_nudge2"
    | "book_next_nudge_manual";
};

type CancelledFollowUp = {
  id: string;
  appointmentId: string;
  patientName: string;
  dentist: string;
  startIso: string;
  followupStatus: "open" | "closed";
  sendStatus?: "ready" | "done";
  createdAt: string;
  updatedAt?: string;
  aiSummary: string;
  cancelReason: string;
  phoneE164?: string;
};

type RescheduleFollowUp = {
  id: string;
  appointmentId: string;
  patientName: string;
  dentist: string;
  currentStartIso: string;
  followupStatus: "open" | "closed";
  sendStatus?: "ready" | "done";
  createdAt: string;
  updatedAt?: string;
  aiSummary: string;
  phoneE164?: string;
  note: string;
};

type RecallRow = {
  id: string;
  patientName: string;
  dentist: string;
  service?: string;
  lastVisitIso: string;
  phoneE164?: string;
  copyBlock?: string;
  sendStatus?: "ready" | "done" | "not_needed" | "recalled";
  createdAt?: string;
  updatedAt?: string;
};

type WeeklyEvent = {
  id: string;
  patientName: string;
  dentist: string;
  detail: string;
  status: "open" | "closed";
  date: string;
  type: "outbox" | "followup" | "recall";
};

const DUBAI_TZ = "Asia/Dubai";
const POLL_INTERVAL_MS = 30000;
const getDubaiDateKey = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: DUBAI_TZ }).format(date);
const toDate = (value?: string) => (value ? new Date(value) : null);

const getDubaiDateKeys = (days: number) => {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 0; i < days; i += 1) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    keys.push(getDubaiDateKey(date));
  }
  return keys;
};

const isValidPhone = (value?: string) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length >= 9;
};

const isMissingName = (value?: string) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return true;
  const lower = normalized.toLowerCase();
  return lower === "unknown" || lower === "there";
};

const isMissingService = (value?: string) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return true;
  return normalized.toLowerCase() === "unknown";
};

const displayPatientName = (value?: string) => (isMissingName(value) ? "Missing name" : value ?? "Missing name");

const displayDentistName = (value?: string) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "Unknown";
  const match = normalized.match(
    /\bdr\.?\s+[a-z]+(?:\s+(?!is\b|booked\b|today\b|tomorrow\b|at\b|on\b|for\b)[a-z]+)*/i
  );
  if (match?.[0]) {
    return match[0].replace(/\./g, "").replace(/\s+/g, " ").trim();
  }
  return normalized;
};

const DUBAI_OFFSET = "+04:00";

const pad2 = (n: number) => String(n).padStart(2, "0");

const monthMap: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

const to24Hour = (hour: number, ampm?: string) => {
  if (!ampm) return hour;
  const m = ampm.toLowerCase();
  if (m === "pm" && hour < 12) return hour + 12;
  if (m === "am" && hour === 12) return 0;
  return hour;
};

const buildDubaiIso = (dateKey: string, hour24: number, minute: number) => {
  return `${dateKey}T${pad2(hour24)}:${pad2(minute)}:00${DUBAI_OFFSET}`;
};

const parseServiceFromMessage = (messageText?: string) => {
  if (!messageText) return undefined;
  const patterns = [
    /\bservice\s*[:\-]\s*([^\n.]+)/i,
    /\btreatment\s*[:\-]\s*([^\n.]+)/i,
    /\bprocedure\s*[:\-]\s*([^\n.]+)/i,
    /\bappointment\s+for\s+([^\n.]+?)(?:\s+with|\s+at|\.|\n|$)/i,
    /\bbooked\s+for\s+([^\n.]+?)(?:\s+with|\s+at|\.|\n|$)/i,
  ];

  for (const pattern of patterns) {
    const match = messageText.match(pattern);
    if (match?.[1]) {
      const value = match[1].trim();
      if (value) return value;
    }
  }

  return undefined;
};

const parseStartIsoFromMessage = (messageText?: string, createdAt?: string) => {
  if (!messageText) return undefined;

  // 1) BEST: parse startIso from the URL query param (your Tally links have it)
  const startIsoMatch = messageText.match(/startIso=([^&\s]+)/i);
  if (startIsoMatch?.[1]) {
    try {
      return decodeURIComponent(startIsoMatch[1]);
    } catch {
      return startIsoMatch[1];
    }
  }

  // use createdAt as the "reference day" for today/tomorrow
  const base = createdAt ? new Date(createdAt) : new Date();

  // Helper: get Dubai date key for base +/- days
  const dateKeyPlusDays = (days: number) => {
    const d = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    return getDubaiDateKey(d); // uses Asia/Dubai
  };

  // 2) Parse "(today at 11:00 AM)" or "today at 11:00 AM"
  {
    const m = messageText.match(/\b(today|tomorrow)\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
    if (m) {
      const when = m[1].toLowerCase();
      const h = Number(m[2]);
      const min = Number(m[3] ?? "0");
      const ampm = m[4];
      const dayOffset = when === "tomorrow" ? 1 : 0;
      const dateKey = dateKeyPlusDays(dayOffset);
      return buildDubaiIso(dateKey, to24Hour(h, ampm), min);
    }
  }

  // 3) Parse "on 23rd December at 2:00 PM" (also works with "23 December")
  {
    const m = messageText.match(
      /\bon\s+(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i
    );
    if (m) {
      const day = Number(m[1]);
      const monthName = m[2].toLowerCase();
      const month = monthMap[monthName] ?? monthMap[monthName.slice(0, 3)];
      const h = Number(m[3]);
      const min = Number(m[4] ?? "0");
      const ampm = m[5];

      if (month) {
        // Infer year from createdAt (Dubai year); roll forward if date already passed.
        const baseKey = getDubaiDateKey(base);
        const baseYear = Number(baseKey.slice(0, 4));
        let dateKey = `${baseYear}-${pad2(month)}-${pad2(day)}`;
        if (dateKey < baseKey) {
          dateKey = `${baseYear + 1}-${pad2(month)}-${pad2(day)}`;
        }
        return buildDubaiIso(dateKey, to24Hour(h, ampm), min);
      }
    }
  }

  // 4) Parse "booked tomorrow at 11:00 am" (no "appointment is")
  {
    const m = messageText.match(/\bbooked\s+(today|tomorrow)\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
    if (m) {
      const when = m[1].toLowerCase();
      const h = Number(m[2]);
      const min = Number(m[3] ?? "0");
      const ampm = m[4];
      const dayOffset = when === "tomorrow" ? 1 : 0;
      const dateKey = dateKeyPlusDays(dayOffset);
      return buildDubaiIso(dateKey, to24Hour(h, ampm), min);
    }
  }

  return undefined;
};


const messageTypeLabel = (type: OutboxRow["messageType"]) => {
  switch (type) {
    case "confirm":
      return "Confirm booking details";
    case "reminder_48hr":
      return "Reminder: 2 days away";
    case "reminder_tomorrow":
      return "Reminder: tomorrow";
    case "reminder_2h":
      return "Reminder: in 2 hours";
    case "book_next_nudge1":
      return "Book next: nudge 1";
    case "book_next_nudge2":
      return "Book next: nudge 2";
    case "book_next_nudge_manual":
      return "Book next: manual";
    default:
      return type;
  }
};

const SkeletonDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("send");
  const [followupTab, setFollowupTab] = useState("cancelled");
  const [timeRange, setTimeRange] = useState("today");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<"send" | "done">("send");
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [fixOpen, setFixOpen] = useState(false);
  const [fixRow, setFixRow] = useState<OutboxRow | null>(null);
  const [fixPatientName, setFixPatientName] = useState("");
  const [fixPhone, setFixPhone] = useState("");
  const [fixDentist, setFixDentist] = useState("");
  const [fixService, setFixService] = useState("");
  const [fixSaving, setFixSaving] = useState(false);
  const [fixError, setFixError] = useState<string | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactRow, setContactRow] = useState<CancelledFollowUp | null>(null);
  const [rescheduleContactOpen, setRescheduleContactOpen] = useState(false);
  const [rescheduleContactRow, setRescheduleContactRow] = useState<RescheduleFollowUp | null>(null);
  const [recallContactOpen, setRecallContactOpen] = useState(false);
  const [recallContactRow, setRecallContactRow] = useState<RecallRow | null>(null);
  const [recallAlertOpen, setRecallAlertOpen] = useState(false);
  const [recallAlertRow, setRecallAlertRow] = useState<RecallRow | null>(null);
  const recallAlertTimerRef = useRef<number | null>(null);
  const recallSeenRef = useRef<Set<string>>(new Set());
  const recallInitRef = useRef(false);

  const [outboxRows, setOutboxRows] = useState<OutboxRow[]>([]);
  const [cancelledFollowUps, setCancelledFollowUps] = useState<CancelledFollowUp[]>([]);
  const [rescheduleFollowUps, setRescheduleFollowUps] = useState<RescheduleFollowUp[]>([]);
  const [recallRows, setRecallRows] = useState<RecallRow[]>([]);

  useEffect(() => {
  const fetchTab = async (tab: string) => {
    // ✅ easiest: use query string in the function name
    const { data, error } = await supabase.functions.invoke(
      `get_patients?tab=${encodeURIComponent(tab)}`
    );

    if (error) throw error;
    return Array.isArray(data?.patients) ? data.patients : [];
  };

  const mapOutbox = (r: any): OutboxRow => {
    const rawId = r.idempotencyKey ?? r.naturalKey ?? r.id ?? r.appointmentId ?? r.appointment_id;
    const normalizedId =
      typeof rawId === "string" ? rawId.trim() : rawId != null ? String(rawId).trim() : "";
    const rawAppointmentId = r.appointmentId ?? r.appointment_id ?? "";
    const normalizedAppointmentId =
      typeof rawAppointmentId === "string"
        ? rawAppointmentId.trim()
        : rawAppointmentId != null
        ? String(rawAppointmentId).trim()
        : "";

    return {
      id: normalizedId || crypto.randomUUID(),
      appointmentId: normalizedAppointmentId,
      patientName: r.patientName ?? r.patient_name ?? (r.messageText?.match(/^Hi\s+(.+?),/i)?.[1] ?? "Unknown"),
      service:
        r.service ??
        r.service_name ??
        r.serviceName ??
        parseServiceFromMessage(r.messageText ?? r.message_text ?? ""),
      dentist:
        r.dentist ??
        (r.messageText?.match(/\bwith\s+(Dr\s+[A-Za-z]+(?:\s+[A-Za-z]+)*)/i)?.[1] ?? "Unknown"),
      phoneE164: r.phoneE164 ?? r.phone_e164 ?? "",
      startIso: r.startIso ?? r.start_iso ?? parseStartIsoFromMessage(r.messageText, r.createdAt ?? r.created_at),
      createdAt: r.createdAt ?? r.created_at ?? new Date().toISOString(),
      openedAt: r.openedAt ?? r.opened_at ?? undefined,
    sentAt: r.sentAt ?? r.sentTime ?? r.sent_at ?? undefined,
      sendStatus: (r.sendStatus ?? r.send_status ?? "needs_review") as OutboxRow["sendStatus"],
      potentialDuplicate: r.potentialDuplicate === true || r.potentialDuplicate === "true",
      messageText: r.messageText ?? r.message_text ?? "",
      waLink: r.waLink ?? r.wa_link ?? "",
      messageType: (r.messageType ?? r.message_type ?? "confirm") as OutboxRow["messageType"],
    };
  };

  const mapCancelled = (r: any): CancelledFollowUp => ({
    id: r.id ?? crypto.randomUUID(),
    appointmentId: r.appointmentId ?? "",
    patientName: r.patient_name ?? r.patientName ?? "Unknown",
    dentist: r.dentist ?? "Unknown",
    startIso: r.start ?? r.startIso ?? "",
    followupStatus: (r.status ?? r.followupStatus ?? "open") as CancelledFollowUp["followupStatus"],
    sendStatus: (r.sendStatus ?? r.send_status ?? "ready") as CancelledFollowUp["sendStatus"],
    createdAt: r.createdAt ?? new Date().toISOString(),
    updatedAt: r.updatedAt ?? r.updated_at ?? undefined,
    cancelReason: r.cancelReason ?? r.cancel_reason ?? "",
    aiSummary: r.aiSummary ?? r.ai_summary ?? "",
    phoneE164: r.phoneE164 ?? r.phone_e164 ?? r.phone ?? "",
  });


  const mapReschedule = (r: any): RescheduleFollowUp => ({
    id: r.id ?? crypto.randomUUID(),
    appointmentId: r.appointmentId ?? r.appointment_id ?? "",
    patientName: r.patientName ?? r.patient_name ?? "Unknown",
    dentist: r.dentist ?? "Unknown",
    currentStartIso: r.currentStart ?? r.current_start_iso ?? "",
    followupStatus: (r.followupStatus ?? r.followup_status ?? "open") as RescheduleFollowUp["followupStatus"],
    sendStatus: (r.sendStatus ?? r.send_status ?? "ready") as RescheduleFollowUp["sendStatus"],
    createdAt: r.createdAt ?? r.created_at ?? new Date().toISOString(),
    updatedAt: r.updatedAt ?? r.updated_at ?? undefined,
    note: r.note ?? "",
    aiSummary: r.aiSummary ?? r.ai_summary ?? "",
    phoneE164: r.phoneE164 ?? r.phone_e164 ?? r.phone ?? "",
  });

  const mapRecall = (r: any): RecallRow => ({
    id: r.id ?? r.idempotencyKey ?? r.idempotency_key ?? crypto.randomUUID(),
    patientName: r.patientName ?? r.patient_name ?? "Unknown",
    phoneE164: r.phoneE164 ?? r.phone_e164 ?? r.phone ?? "",
    dentist: r.dentist ?? "Unknown",
    service: r.service ?? r.service_name ?? r.serviceName,
    lastVisitIso: r.lastVisitIso ?? r.last_visit_iso ?? "",
    copyBlock: r.copyBlock ?? r.copy_block ?? "",
    sendStatus: (r.sendStatus ?? r.send_status ?? "ready") as RecallRow["sendStatus"],
    createdAt: r.createdAt ?? r.created_at ?? new Date().toISOString(),
    updatedAt: r.updatedAt ?? r.updated_at ?? undefined,
  });

  const loadAll = async () => {
    try {
      const [outboxRaw, confirmedRaw, cancelledRaw, rescheduleRaw, recallRaw] = await Promise.all([
        fetchTab("Outbox"),
        fetchTab("Confirmed"),
        fetchTab("CancelledFollowUp"),
        fetchTab("RescheduleFollowUp"),
        fetchTab("Recall"), // ⚠️ must match your EXACT sheet tab name
      ]);

      setOutboxRows(outboxRaw.map(mapOutbox));
      setCancelledFollowUps(cancelledRaw.map(mapCancelled));
      setRescheduleFollowUps(rescheduleRaw.map(mapReschedule));
      setRecallRows(recallRaw.map(mapRecall));
    } catch (e) {
      console.error("Load sheets error:", e);
    }
  };

  loadAll();
  const intervalId = window.setInterval(loadAll, POLL_INTERVAL_MS);

  return () => {
    window.clearInterval(intervalId);
  };
}, []);

  const weeklyEvents: WeeklyEvent[] = [
    {
      id: "week-1",
      patientName: "John Doe",
      dentist: "Dr Sara",
      detail: "Outbox sent",
      status: "closed",
      date: "2025-12-20T09:30:00.000Z",
      type: "outbox",
    },
    {
      id: "week-2",
      patientName: "Sara",
      dentist: "Dr Ahmed",
      detail: "Cancelled follow-up opened",
      status: "open",
      date: "2025-12-19T10:00:00.000Z",
      type: "followup",
    },
    {
      id: "week-3",
      patientName: "Maaz",
      dentist: "Dr Ahmed",
      detail: "Recall pending",
      status: "open",
      date: "2025-12-17T08:10:00.000Z",
      type: "recall",
    },
  ];

  const todayKey = getDubaiDateKey();
  const rangeKeys = useMemo(() => {
    if (timeRange === "7d") return getDubaiDateKeys(7);
    if (timeRange === "30d") return getDubaiDateKeys(30);
    return [todayKey];
  }, [timeRange, todayKey]);

  const isInRange = (dateValue?: string) => {
    if (!dateValue) return false;
    const key = getDubaiDateKey(new Date(dateValue));
    return rangeKeys.includes(key);
  };


  const isToday = (dateValue?: string) => {
    if (!dateValue) return false;
    return getDubaiDateKey(new Date(dateValue)) === todayKey;
  };

  const sendNowRows = useMemo(() => {
    return outboxRows
      .filter((row) => {
        const hasName = !isMissingName(row.patientName);
        const hasDentist = Boolean(row.dentist) && row.dentist !== "Unknown";
        const hasService = !isMissingService(row.service);
        return (
          (row.sendStatus === "ready" || row.sendStatus === "needs_review")
 &&
          !row.potentialDuplicate &&
          isValidPhone(row.phoneE164) &&
          Boolean(row.waLink) &&
          Boolean(row.messageText) &&
          hasName &&
          hasDentist &&
          hasService
        );
      })
      .sort((a, b) => {
        const dateA = toDate(a.startIso)?.getTime() ?? toDate(a.createdAt)?.getTime() ?? 0;
        const dateB = toDate(b.startIso)?.getTime() ?? toDate(b.createdAt)?.getTime() ?? 0;
        return dateA - dateB;
      });
  }, [outboxRows]);

  const needsReviewRows = useMemo(() => {
    const priority = (row: OutboxRow) => {
      if (isMissingName(row.patientName)) return 1;
      if (!row.dentist || row.dentist === "Unknown") return 2;
      if (isMissingService(row.service)) return 3;
      if (!isValidPhone(row.phoneE164)) return 4;
      if (row.potentialDuplicate) return 5;
      if (!row.waLink || !row.messageText) return 6;
      return 7;
    };
    return outboxRows
      .filter((row) => {
        return (
          row.sendStatus === "needs_review" ||
          row.potentialDuplicate ||
          isMissingName(row.patientName) ||
          !row.dentist ||
          row.dentist === "Unknown" ||
          isMissingService(row.service) ||
          !isValidPhone(row.phoneE164) ||
          !row.waLink ||
          !row.messageText
        );
      })
      .sort((a, b) => {
        const priorityDiff = priority(a) - priority(b);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }, [outboxRows]);

  const completedTodayRows = useMemo(() => {
    return outboxRows.filter((row) => row.sendStatus === "sent" && Boolean(row.sentAt) && isToday(row.sentAt));
  }, [outboxRows, todayKey]);

  const cancelledOpen = cancelledFollowUps.filter(
    (row) => row.followupStatus === "open" && row.sendStatus === "ready"
  );
  const rescheduleOpen = rescheduleFollowUps.filter(
    (row) => row.followupStatus === "open" && row.sendStatus === "ready"
  );
  const recallOpen = recallRows.filter(
    (row) => row.sendStatus !== "done" && row.sendStatus !== "not_needed" && row.sendStatus !== "recalled"
  );

  const followUpCount = cancelledOpen.length + rescheduleOpen.length + recallOpen.length;

  useEffect(() => {
    const currentIds = new Set(recallOpen.map((row) => row.id));

    if (!recallInitRef.current) {
      recallSeenRef.current = currentIds;
      recallInitRef.current = true;
      return;
    }

    const newRows = recallOpen.filter((row) => !recallSeenRef.current.has(row.id));
    if (newRows.length > 0) {
      const newestRow = newRows.reduce((best, row) => {
        const bestTime = new Date(best.createdAt || best.updatedAt || best.lastVisitIso || 0).getTime() || 0;
        const rowTime = new Date(row.createdAt || row.updatedAt || row.lastVisitIso || 0).getTime() || 0;
        return rowTime >= bestTime ? row : best;
      }, newRows[0]);

      setRecallAlertRow(newestRow);
      setRecallAlertOpen(true);

      if (recallAlertTimerRef.current !== null) {
        window.clearTimeout(recallAlertTimerRef.current);
      }
      recallAlertTimerRef.current = window.setTimeout(() => {
        setRecallAlertOpen(false);
        recallAlertTimerRef.current = null;
      }, 10000);
    }

    recallSeenRef.current = currentIds;
  }, [recallOpen]);

  useEffect(() => {
    return () => {
      if (recallAlertTimerRef.current !== null) {
        window.clearTimeout(recallAlertTimerRef.current);
      }
    };
  }, []);

  const followUpOverdue = [...cancelledOpen, ...rescheduleOpen].filter((row) => {
    const updatedAt = toDate(row.updatedAt || row.createdAt);
    if (!updatedAt) return false;
    return Date.now() - updatedAt.getTime() > 2 * 24 * 60 * 60 * 1000;
  }).length;

  const followUpOverdueCount = followUpOverdue;

  const weeklyWindow = useMemo(() => {
    const keys = new Set(getDubaiDateKeys(7));
    return weeklyEvents.filter((row) => keys.has(getDubaiDateKey(new Date(row.date))));
  }, [weeklyEvents]);

  const weeklyClosed = weeklyWindow.filter((row) => row.status === "closed").length;
  const weeklyTotal = weeklyWindow.length;
  const countBubble = (count: number, className = "") =>
    count > 0 ? (
      <span
        className={`ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1 text-xs font-semibold text-primary ring-1 ring-primary/20 ${className}`}
      >
        {count}
      </span>
    ) : null;

  const copyText = (value?: string) => {
    if (!value || typeof navigator === "undefined") return;
    navigator.clipboard?.writeText(value).catch(() => undefined);
  };

  const buildRecallTemplate = (row?: RecallRow | null) => {
    if (!row) return "";

    const baseLines = (row.copyBlock || "")
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter(Boolean);

    const fallbackLines = [
      `Patient: ${row.patientName ?? "Unknown"}`,
      `Phone: ${row.phoneE164 ?? "Unknown"}`,
      `Doctor: ${row.dentist ?? "Unknown"}`,
    ];

    const lines = baseLines.length > 0 ? baseLines : fallbackLines;
    const sanitized = lines.filter((line) => {
      if (/last\s*visit/i.test(line)) return false;
      if (/previous\s*service/i.test(line)) return false;
      return true;
    });

    return sanitized.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  };

  const recallMessage = buildRecallTemplate(recallContactRow);

  const updateOutboxRow = (id: string, updater: (row: OutboxRow) => OutboxRow) => {
    setOutboxRows((prev) => prev.map((row) => (row.id === id ? updater(row) : row)));
  };

  const updateRecallRow = (id: string, updater: (row: RecallRow) => RecallRow) => {
    setRecallRows((prev) => prev.map((row) => (row.id === id ? updater(row) : row)));
  };

  const persistOutboxUpdates = async (row: OutboxRow, updates: Record<string, unknown>) => {
    const lookupKey = row.id || row.appointmentId;
    if (!lookupKey) {
      console.warn("Missing row identifier. Unable to update the sheet.", row);
      return;
    }

    const { error } = await supabase.functions.invoke("update_patient", {
      body: {
        tab: "Outbox",
        appointment_id: lookupKey,
        updates: {
          idempotencyKey: row.id,
          appointmentId: row.appointmentId,
          ...updates,
        },
      },
    });

    if (error) {
      console.error("Failed to update Outbox row:", error);
    }
  };

  const persistCancelledFollowUpUpdates = async (
    row: CancelledFollowUp,
    updates: Record<string, unknown>
  ) => {
    const lookupKey = row.appointmentId || row.id;
    if (!lookupKey) {
      console.warn("Missing follow-up identifier. Unable to update the sheet.", row);
      return;
    }

    const { error } = await supabase.functions.invoke("update_patient", {
      body: {
        tab: "CancelledFollowUp",
        appointment_id: lookupKey,
        updates,
      },
    });

    if (error) {
      console.error("Failed to update CancelledFollowUp row:", error);
    }
  };

  const persistRescheduleFollowUpUpdates = async (
    row: RescheduleFollowUp,
    updates: Record<string, unknown>
  ) => {
    const lookupKey = row.appointmentId || row.id;
    if (!lookupKey) {
      console.warn("Missing follow-up identifier. Unable to update the sheet.", row);
      return;
    }

    const { error } = await supabase.functions.invoke("update_patient", {
      body: {
        tab: "RescheduleFollowUp",
        appointment_id: lookupKey,
        updates,
      },
    });

    if (error) {
      console.error("Failed to update RescheduleFollowUp row:", error);
    }
  };

  const persistRecallUpdates = async (row: RecallRow, updates: Record<string, unknown>) => {
    const lookupKey = row.id;
    if (!lookupKey) {
      console.warn("Missing recall identifier. Unable to update the sheet.", row);
      return;
    }

    const { error } = await supabase.functions.invoke("update_patient", {
      body: {
        tab: "Recall",
        appointment_id: lookupKey,
        updates,
      },
    });

    if (error) {
      console.error("Failed to update Recall row:", error);
    }
  };

  const openFixDetails = (row: OutboxRow) => {
    setFixRow(row);
    setFixPatientName(isMissingName(row.patientName) ? "" : row.patientName ?? "");
    setFixPhone(row.phoneE164 ?? "");
    setFixDentist(row.dentist === "Unknown" ? "" : row.dentist ?? "");
    setFixService(isMissingService(row.service) ? "" : row.service ?? "");
    setFixError(null);
    setFixOpen(true);
  };

  const submitFixDetails = async () => {
    if (!fixRow) return;
    const eventId = fixRow.appointmentId?.trim();
    if (!eventId) {
      setFixError("Missing appointment ID. Unable to update the calendar.");
      return;
    }

    const payload = {
      eventId,
      patientName: fixPatientName.trim(),
      phone: fixPhone.trim(),
      dentist: fixDentist.trim(),
      service: fixService.trim(),
    };

    setFixSaving(true);
    setFixError(null);

    try {
      const { error } = await supabase.functions.invoke("fix_calendar_appointment", {
        body: payload,
      });

      if (error) {
        if (error instanceof FunctionsHttpError) {
          const details = await error.context.json().catch(() => null);
          const message = details?.error ?? details?.message ?? error.message;
          setFixError(typeof message === "string" ? message : JSON.stringify(message));
        } else {
          setFixError(error.message);
        }
        return;
      }

      const trimmedUpdates = {
        patientName: fixPatientName.trim(),
        phoneE164: fixPhone.trim(),
        dentist: fixDentist.trim(),
        service: fixService.trim(),
      };

      updateOutboxRow(fixRow.id, (current) => ({
        ...current,
        ...trimmedUpdates,
      }));
      persistOutboxUpdates(fixRow, trimmedUpdates);

      setFixOpen(false);
      setFixRow(null);
    } catch (err) {
      setFixError(err instanceof Error ? err.message : String(err));
    } finally {
      setFixSaving(false);
    }
  };

  const openContactDialog = (row: CancelledFollowUp) => {
    setContactRow(row);
    setContactOpen(true);
  };

  const openRescheduleContactDialog = (row: RescheduleFollowUp) => {
    setRescheduleContactRow(row);
    setRescheduleContactOpen(true);
  };

  const openRecallContactDialog = (row: RecallRow) => {
    setRecallContactRow(row);
    setRecallContactOpen(true);
  };

  const handleRecallNotNeeded = (row: RecallRow) => {
    const updatedAt = new Date().toISOString();
    updateRecallRow(row.id, (current) => ({ ...current, sendStatus: "not_needed", updatedAt }));
    persistRecallUpdates(row, { sendStatus: "not_needed", updatedAt });
  };

  const handleRecallDone = (row: RecallRow) => {
    const updatedAt = new Date().toISOString();
    updateRecallRow(row.id, (current) => ({ ...current, sendStatus: "recalled", updatedAt }));
    persistRecallUpdates(row, { sendStatus: "recalled", updatedAt });
    setRecallContactOpen(false);
  };

  const handleCancelledDone = (row: CancelledFollowUp) => {
    const updatedAt = new Date().toISOString();
    setCancelledFollowUps((prev) =>
      prev.map((item) =>
        item.id === row.id
          ? { ...item, followupStatus: "closed", sendStatus: "done", updatedAt }
          : item
      )
    );
    persistCancelledFollowUpUpdates(row, {
      followupStatus: "closed",
      status: "closed",
      sendStatus: "done",
      updatedAt,
    });
  };

  const handleRescheduleDone = (row: RescheduleFollowUp) => {
    const updatedAt = new Date().toISOString();
    setRescheduleFollowUps((prev) =>
      prev.map((item) =>
        item.id === row.id ? { ...item, sendStatus: "done", updatedAt } : item
      )
    );
    persistRescheduleFollowUpUpdates(row, {
      sendStatus: "done",
      updatedAt,
    });
  };

  const dismissRecallAlert = () => {
    setRecallAlertOpen(false);
    if (recallAlertTimerRef.current !== null) {
      window.clearTimeout(recallAlertTimerRef.current);
      recallAlertTimerRef.current = null;
    }
  };

  const handleRecallAlertNavigate = () => {
    setActiveTab("followups");
    setFollowupTab("recall");
    dismissRecallAlert();
  };


  const handleSendClick = (row: OutboxRow) => {
    if (row.waLink) {
      window.open(row.waLink, "_blank", "noopener,noreferrer");
    }
    updateOutboxRow(row.id, (current) => ({
      ...current,
      sendStatus: "opened",
      openedAt: new Date().toISOString(),
    }));
    setConfirmMode("send");
    setActiveRowId(row.id);
    setConfirmOpen(true);
  };

  const handleMarkDoneClick = (row: OutboxRow) => {
    setConfirmMode("done");
    setActiveRowId(row.id);
    setConfirmOpen(true);
  };

  const handleConfirmSent = () => {
    if (activeRowId === null) return;
    const sentAt = new Date().toISOString();
    updateOutboxRow(activeRowId, (current) => ({
      ...current,
      sendStatus: "sent",
      sentAt,
    }));
    const row = outboxRows.find((item) => item.id === activeRowId);
    if (row) {
      persistOutboxUpdates(row, { sendStatus: "sent", sentTime: sentAt });
    }
    setConfirmOpen(false);
    setActiveRowId(null);
    setActiveTab("completed");
  };

  const handleConfirmNotSent = () => {
    if (activeRowId === null) return;
    updateOutboxRow(activeRowId, (current) => ({
      ...current,
      sendStatus: "ready",
      openedAt: undefined,
    }));
    const row = outboxRows.find((item) => item.id === activeRowId);
    if (row) {
      persistOutboxUpdates(row, { sendStatus: "ready" });
    }
    setConfirmOpen(false);
    setActiveRowId(null);
  };

  const getReviewReason = (row: OutboxRow) => {
    if (isMissingName(row.patientName)) return "Missing name";
    if (!row.dentist || row.dentist === "Unknown") return "Missing dentist";
    if (isMissingService(row.service)) return "Missing service";
    if (!isValidPhone(row.phoneE164)) return "Missing phone";
    if (row.potentialDuplicate) return "Duplicate";
    if (!row.waLink || !row.messageText) return "Missing details";
    return "Needs review";
  };

  const cardBase =
    "relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]";
  const cardHover =
    "transition-all duration-300 hover:shadow-[0_16px_40px_rgba(0,0,0,0.12)] hover:border-slate-300";
  const rowCard =
    "group relative rounded-2xl border border-slate-200 bg-white animate-row-enter transition-all duration-200 hover:border-blue-300 hover:shadow-[0_12px_28px_rgba(0,0,0,0.1)]";
  const tabListBase =
    "inline-flex h-auto flex-wrap items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100/80 p-1.5 shadow-sm backdrop-blur-sm";
  const tabTriggerBase =
    "rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-white/70 data-[state=active]:text-white";
  const tileCard = `${cardBase} ${cardHover} group p-6 before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-300 before:content-[''] before:bg-[radial-gradient(120%_100%_at_80%_0%,rgba(59,130,246,0.12),transparent_60%)] hover:before:opacity-100`;
  const rowDelayStyle = (index: number) => ({
    animationDelay: `${Math.min(index, 10) * 60}ms`,
  });

  const showWeekTab = timeRange === "7d";

  return (
    <div className="app-theme relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 text-foreground">
      <div className="pointer-events-none absolute -top-40 right-1/4 h-80 w-80 rounded-full bg-blue-100/40 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-cyan-100/30 blur-[100px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_0%,rgba(191,219,254,0.15),transparent_50%)]" />

      <div className="relative z-10">
        <div className="relative border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-200/40 to-transparent" />
          <div className="container mx-auto flex flex-col gap-4 px-4 py-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-1">
              <div className="text-3xl font-extrabold text-slate-900">
                Appointment{" "}
                <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Hub
                </span>
              </div>
              <p className="text-sm font-medium text-slate-600">Manage appointments and follow-ups efficiently</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40 border-slate-200 bg-white rounded-xl font-medium">
                  <SelectValue placeholder="Range" />
                </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => navigate("/auth")} className="rounded-xl border-slate-200 font-medium hover:bg-slate-50 hover:border-slate-300">
                Sign out
              </Button>
            </div>
          </div>
        </div>

        <main className="container mx-auto px-4 py-8 animate-in fade-in duration-500">
          <div className="grid gap-8">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">
                Activity{" "}
                <span className="bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                  Overview
                </span>
              </h2>
              <p className="text-sm font-medium text-slate-600 mt-2">Track your dashboard metrics at a glance</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Card className={`${tileCard} animate-fade-in-up`} style={{ animationDelay: "0ms" }}>
                <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-blue-200/30 blur-2xl" />
                <div className="relative flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">Ready to Send</span>
                    <div className="rounded-full bg-blue-100 p-2.5 text-blue-600">
                      <Send size={18} />
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-3xl font-extrabold text-slate-900">{sendNowRows.length}</div>
                    <Button size="sm" className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 font-semibold" onClick={() => setActiveTab("send")}>
                      Send
                    </Button>
                  </div>
                  <div className="text-xs font-medium text-slate-600">Messages ready to dispatch</div>
                </div>
              </Card>

              <Card className={`${tileCard} animate-fade-in-up`} style={{ animationDelay: "80ms" }}>
                <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-green-200/30 blur-2xl" />
                <div className="relative flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">Sent Today</span>
                    <div className="rounded-full bg-green-100 p-2.5 text-green-600">
                      <CheckCircle2 size={18} />
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-3xl font-extrabold text-slate-900">{completedTodayRows.length}</div>
                    <Button size="sm" className="rounded-xl bg-green-600 hover:bg-green-700 text-white px-4 font-semibold" onClick={() => setActiveTab("completed")}>
                      View
                    </Button>
                  </div>
                  <div className="text-xs font-medium text-slate-600">Successfully completed</div>
                </div>
              </Card>

              <Card className={`${tileCard} animate-fade-in-up`} style={{ animationDelay: "160ms" }}>
                <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-orange-200/30 blur-2xl" />
                <div className="relative flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">Follow-ups</span>
                    <div className="rounded-full bg-orange-100 p-2.5 text-orange-600">
                      <Clock size={18} />
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-3xl font-extrabold text-slate-900">{followUpCount}</div>
                    <Button size="sm" className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white px-4 font-semibold" onClick={() => setActiveTab("followups")}>
                      Manage
                    </Button>
                  </div>
                  <div className="text-xs font-medium text-slate-600">
                    {followUpOverdueCount > 0 ? `${followUpOverdueCount} overdue` : "All on track"}
                  </div>
                </div>
              </Card>

              <Card className={`${tileCard} animate-fade-in-up`} style={{ animationDelay: "240ms" }}>
                <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-red-200/30 blur-2xl" />
                <div className="relative flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">Review Needed</span>
                    <div className="rounded-full bg-red-100 p-2.5 text-red-600">
                      <AlertCircle size={18} />
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-3xl font-extrabold text-slate-900">{needsReviewRows.length}</div>
                    <Button size="sm" className="rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 font-semibold" onClick={() => setActiveTab("review")}>
                      Review
                    </Button>
                  </div>
                  <div className="text-xs font-medium text-slate-600">Issues to resolve</div>
                </div>
              </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={tabListBase}>
                <TabsTrigger value="send" className={`${tabTriggerBase} data-[state=active]:bg-blue-600`}>Send now</TabsTrigger>
                <TabsTrigger value="followups" className={`${tabTriggerBase} data-[state=active]:bg-orange-600`}>Follow-ups</TabsTrigger>
                <TabsTrigger value="review" className={`${tabTriggerBase} data-[state=active]:bg-red-600`}>Review</TabsTrigger>
                <TabsTrigger value="completed" className={`${tabTriggerBase} data-[state=active]:bg-green-600`}>Completed</TabsTrigger>
                {showWeekTab ? (
                  <TabsTrigger value="week" className={`${tabTriggerBase} data-[state=active]:bg-purple-600`}>This week</TabsTrigger>
                ) : null}
              </TabsList>

              <TabsContent value="send" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Card className={`${cardBase} p-8`}>
                  <div className="flex flex-col gap-6">
                    <div>
                      <h3 className="text-xl font-bold text-foreground">Send WhatsApp Messages</h3>
                      <p className="mt-2 text-sm text-muted-foreground">Click Send WhatsApp, compose your message, then mark as done.</p>
                    </div>
                    <div className="grid gap-3">
                      {sendNowRows.length === 0 ? (
                        <div className="rounded-2xl border border-border/40 bg-slate-50 p-6 text-center">
                          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-600" />
                          <p className="text-sm font-semibold text-foreground">All caught up!</p>
                          <p className="mt-1 text-xs text-muted-foreground">No messages to send right now.</p>
                        </div>
                      ) : (
                        sendNowRows.map((row, index) => (
                          <div
                            key={row.id}
                            className={`${rowCard} flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between`}
                            style={rowDelayStyle(index)}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className="w-44 truncate text-base font-semibold text-foreground" title={displayPatientName(row.patientName)}>
                                  {displayPatientName(row.patientName)}
                                </div>
                                {row.service ? (
                                  <Badge variant="outline" className="shrink-0 rounded-full text-xs">
                                    {row.service}
                                  </Badge>
                                ) : null}
                                <Badge variant="secondary" className="shrink-0 rounded-full text-xs">
                                  {messageTypeLabel(row.messageType)}
                                </Badge>
                              </div>
                              <div className="mt-2 text-sm text-muted-foreground">
                                <span className="font-semibold text-foreground">{displayDentistName(row.dentist)}</span> - {new Date(row.startIso || row.createdAt).toLocaleString()}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleSendClick(row)}>
                                <Send size={16} className="mr-1" />
                                Send
                              </Button>
                              <Button size="sm" variant="outline" className="rounded-xl border-border/40" onClick={() => handleMarkDoneClick(row)}>
                                <CheckCircle2 size={16} className="mr-1" />
                                Mark done
                              </Button>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="rounded-xl border-border/40">
                                    <MoreVertical size={16} />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-lg">
                                  <DialogHeader>
                                    <DialogTitle>Message Details</DialogTitle>
                                    <DialogDescription>Copy what you need for WhatsApp.</DialogDescription>
                                  </DialogHeader>
                                  <div className="grid gap-4 text-sm">
                                    <div className="flex items-start justify-between gap-3 rounded-xl border border-border/40 p-3">
                                      <div className="min-w-0 flex-1">
                                        <div className="text-xs font-semibold text-muted-foreground">PATIENT</div>
                                        <div className="mt-1 font-semibold text-foreground break-words">
                                          {displayPatientName(row.patientName)}
                                        </div>
                                      </div>
                                      <Button size="sm" variant="ghost" className="mt-4 flex-shrink-0" onClick={() => copyText(row.patientName)}>
                                        Copy
                                      </Button>
                                    </div>
                                    <div className="flex items-start justify-between gap-3 rounded-xl border border-border/40 p-3">
                                      <div className="min-w-0 flex-1">
                                        <div className="text-xs font-semibold text-muted-foreground">PHONE</div>
                                        <div className="mt-1 font-semibold text-foreground break-words">
                                          {row.phoneE164 || "Unknown"}
                                        </div>
                                      </div>
                                      <Button size="sm" variant="ghost" className="mt-4 flex-shrink-0" onClick={() => copyText(row.phoneE164)}>
                                        Copy
                                      </Button>
                                    </div>
                                    <div className="flex items-start justify-between gap-3 rounded-xl border border-border/40 p-3">
                                      <div className="min-w-0 flex-1">
                                        <div className="text-xs font-semibold text-muted-foreground">MESSAGE</div>
                                        <div className="mt-1 text-foreground break-words whitespace-pre-wrap text-xs">
                                          {row.messageText || "Missing"}
                                        </div>
                                      </div>
                                      <Button size="sm" variant="ghost" className="mt-4 flex-shrink-0" onClick={() => copyText(row.messageText)}>
                                        Copy
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="review" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Card className={`${cardBase} p-8`}>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Messages Needing Review</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Fix missing information or resolve issues before sending.</p>
                  </div>
                  <div className="mt-6 grid gap-3">
                    {needsReviewRows.length === 0 ? (
                      <div className="rounded-2xl border border-border/40 bg-slate-50 p-6 text-center">
                        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-600" />
                        <p className="text-sm font-semibold text-foreground">Everything looks good!</p>
                        <p className="mt-1 text-xs text-muted-foreground">No messages need review at the moment.</p>
                      </div>
                    ) : (
                      needsReviewRows.map((row, index) => {
                        const reason = getReviewReason(row);
                        return (
                          <div key={row.id} className={`${rowCard} p-5`} style={rowDelayStyle(index)}>
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-3">
                                  <div className="text-base font-semibold text-foreground">
                                    {displayPatientName(row.patientName)}
                                  </div>
                                  {row.service ? (
                                    <Badge variant="outline" className="rounded-full text-xs">
                                      {row.service}
                                    </Badge>
                                  ) : null}
                                  <Badge variant="destructive" className="rounded-full text-xs">{reason}</Badge>
                                </div>
                                <div className="mt-2 text-sm text-muted-foreground">
                                  <span className="font-semibold text-foreground">{displayDentistName(row.dentist)}</span> - {new Date(row.startIso || row.createdAt).toLocaleString()}
                                </div>
                              </div>
                              <AlertCircle className="mt-1 h-5 w-5 flex-shrink-0 text-red-600" />
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                              {["Missing name", "Missing dentist", "Missing phone", "Missing service"].includes(reason) ? (
                                <Button size="sm" className="rounded-xl bg-red-600 hover:bg-red-700 text-white" onClick={() => openFixDetails(row)}>
                                  Edit details
                                </Button>
                              ) : null}
                              {reason === "Duplicate" ? (
                                <>
                                  <Button size="sm" className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white">Approve</Button>
                                  <Button size="sm" variant="outline" className="rounded-xl border-border/40">
                                    Dismiss
                                  </Button>
                                </>
                              ) : null}
                              {reason === "Missing details" || reason === "Needs review" ? (
                                <>
                                  <Button size="sm" className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white">Check appt</Button>
                                  <Button size="sm" variant="outline" className="rounded-xl border-border/40">
                                    Resolve
                                  </Button>
                                </>
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="followups" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Tabs value={followupTab} onValueChange={setFollowupTab} className="w-full">
                  <TabsList className={tabListBase}>
                    <TabsTrigger value="cancelled" className={`${tabTriggerBase} data-[state=active]:bg-orange-600`}>
                      Cancelled {countBubble(cancelledOpen.length)}
                    </TabsTrigger>
                    <TabsTrigger value="reschedule" className={`${tabTriggerBase} data-[state=active]:bg-blue-600`}>
                      Reschedule {countBubble(rescheduleOpen.length)}
                    </TabsTrigger>
                    <TabsTrigger value="recall" className={`${tabTriggerBase} data-[state=active]:bg-purple-600`}>
                      Recall {countBubble(recallOpen.length, "bg-purple-500 text-white ring-purple-400/60")}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="cancelled">
                    <Card className={`${cardBase} p-8`}>
                      <div>
                        <h3 className="text-xl font-bold text-foreground">Cancelled Appointments</h3>
                        <p className="mt-2 text-sm text-muted-foreground">Follow up with patients who cancelled their appointments.</p>
                      </div>
                      <div className="mt-6 grid gap-3">
                        {cancelledOpen.length === 0 ? (
                          <div className="rounded-2xl border border-border/40 bg-slate-50 p-6 text-center">
                            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-600" />
                            <p className="text-sm font-semibold text-foreground">All clear</p>
                            <p className="mt-1 text-xs text-muted-foreground">No cancelled appointments to follow up.</p>
                          </div>
                        ) : (
                          cancelledOpen.map((row, index) => (
                            <div key={row.id} className={`${rowCard} p-5`} style={rowDelayStyle(index)}>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center gap-3">
                                    <div className="text-base font-semibold text-foreground">{row.patientName}</div>
                                    <Badge variant="outline" className="rounded-full text-xs">Cancelled</Badge>
                                  </div>
                                  <div className="mt-2 text-sm text-muted-foreground">
                                    <span className="font-semibold text-foreground">{displayDentistName(row.dentist)}</span> - {new Date(row.startIso).toLocaleString()}
                                  </div>
                                  <div className="mt-2 text-xs text-muted-foreground">Reason: {row.cancelReason || "Not specified"}</div>
                                  {row.aiSummary && <div className="mt-1 text-xs text-muted-foreground italic">Note: {row.aiSummary}</div>}
                                </div>
                                <Phone className="mt-1 h-5 w-5 flex-shrink-0 text-orange-600" />
                              </div>
                              <div className="mt-4 flex flex-wrap gap-2">
                                <Button size="sm" className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white" onClick={() => openContactDialog(row)}>
                                  <MessageSquare size={16} className="mr-1" />
                                  Contact
                                </Button>
                                <Button size="sm" variant="outline" className="rounded-xl border-border/40" onClick={() => handleCancelledDone(row)}>
                                  Done
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </Card>
                  </TabsContent>

                  <TabsContent value="reschedule">
                    <Card className={`${cardBase} p-8`}>
                      <div>
                        <h3 className="text-xl font-bold text-foreground">Reschedule Requests</h3>
                        <p className="mt-2 text-sm text-muted-foreground">Help patients reschedule their appointments.</p>
                      </div>
                      <div className="mt-6 grid gap-3">
                        {rescheduleOpen.length === 0 ? (
                          <div className="rounded-2xl border border-border/40 bg-slate-50 p-6 text-center">
                            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-600" />
                            <p className="text-sm font-semibold text-foreground">All scheduled</p>
                            <p className="mt-1 text-xs text-muted-foreground">No reschedule requests pending.</p>
                          </div>
                        ) : (
                          rescheduleOpen.map((row, index) => (
                            <div key={row.id} className={`${rowCard} p-5`} style={rowDelayStyle(index)}>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center gap-3">
                                    <div className="text-base font-semibold text-foreground">{row.patientName}</div>
                                    <Badge variant="outline" className="rounded-full text-xs">Reschedule</Badge>
                                  </div>
                                  <div className="mt-2 text-sm text-muted-foreground">
                                    <span className="font-semibold text-foreground">{displayDentistName(row.dentist)}</span> - {new Date(row.currentStartIso).toLocaleString()}
                                  </div>
                                  {row.aiSummary && <div className="mt-2 text-xs text-muted-foreground italic">Note: {row.aiSummary}</div>}
                                </div>
                                <Phone className="mt-1 h-5 w-5 flex-shrink-0 text-blue-600" />
                              </div>
                              <div className="mt-4 flex flex-wrap gap-2">
                                <Button size="sm" className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white" onClick={() => openRescheduleContactDialog(row)}>
                                  <MessageSquare size={16} className="mr-1" />
                                  Contact
                                </Button>
                                <Button size="sm" variant="outline" className="rounded-xl border-border/40" onClick={() => handleRescheduleDone(row)}>
                                  Done
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </Card>
                  </TabsContent>

                  <TabsContent value="recall">
                    <Card className={`${cardBase} p-8`}>
                      <div>
                        <h3 className="text-xl font-bold text-foreground">Patient Recall</h3>
                        <p className="mt-2 text-sm text-muted-foreground">Invite patients back for their routine checkups.</p>
                      </div>
                      <div className="mt-6 grid gap-3">
                        {recallOpen.length === 0 ? (
                          <div className="rounded-2xl border border-border/40 bg-slate-50 p-6 text-center">
                            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-600" />
                            <p className="text-sm font-semibold text-foreground">All reminded</p>
                            <p className="mt-1 text-xs text-muted-foreground">No recalls pending at this time.</p>
                          </div>
                        ) : (
                          recallOpen.map((row, index) => (
                            <div key={row.id} className={`${rowCard} p-5`} style={rowDelayStyle(index)}>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center gap-3">
                                    <div className="text-base font-semibold text-foreground">{row.patientName}</div>
                                    <Badge variant="outline" className="rounded-full text-xs">Recall</Badge>
                                  </div>
                                  <div className="mt-2 text-sm text-muted-foreground">
                                    <span className="font-semibold text-foreground">{row.dentist}</span> • Last visit {row.lastVisitIso ? new Date(row.lastVisitIso).toLocaleDateString() : "Unknown"}
                                  </div>
                                  <div className="mt-2 text-xs text-muted-foreground">{row.phoneE164 || "No phone on file"}</div>
                                </div>
                                <Phone className="mt-1 h-5 w-5 flex-shrink-0 text-purple-600" />
                              </div>
                              <div className="mt-4 flex flex-wrap gap-2">
                                <Button size="sm" className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white" onClick={() => openRecallContactDialog(row)}>
                                  <MessageSquare size={16} className="mr-1" />
                                  Contact
                                </Button>
                                <Button size="sm" variant="outline" className="rounded-xl border-border/40" onClick={() => handleRecallNotNeeded(row)}>
                                  Not needed
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </Card>
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="completed" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Card className={`${cardBase} p-8`}>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Today's Activity</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Messages sent and appointments handled.</p>
                  </div>
                  <div className="mt-6 grid gap-3">
                    {completedTodayRows.length === 0 ? (
                      <div className="rounded-2xl border border-border/40 bg-slate-50 p-6 text-center">
                        <Clock className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                        <p className="text-sm font-semibold text-foreground">Nothing sent yet</p>
                        <p className="mt-1 text-xs text-muted-foreground">Start sending messages to see your activity here.</p>
                      </div>
                    ) : (
                      completedTodayRows.map((row, index) => (
                        <div key={row.id} className={`${rowCard} p-5`} style={rowDelayStyle(index)}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-3">
                                <div className="text-base font-semibold text-foreground">
                                  {displayPatientName(row.patientName)}
                                </div>
                                {row.service ? (
                                  <Badge variant="outline" className="rounded-full text-xs">
                                    {row.service}
                                  </Badge>
                                ) : null}
                                <Badge variant="secondary" className="rounded-full text-xs bg-green-100 text-green-700 border-green-200">✓ Sent</Badge>
                              </div>
                              <div className="mt-2 text-sm text-muted-foreground">
                                <span className="font-semibold text-foreground">{displayDentistName(row.dentist)}</span> - {new Date(row.startIso || row.createdAt).toLocaleString()}
                              </div>
                              {row.sentAt && <div className="mt-1 text-xs text-muted-foreground">Sent at {new Date(row.sentAt).toLocaleTimeString()}</div>}
                            </div>
                            <CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-green-600" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </TabsContent>

              {showWeekTab ? (
                <TabsContent value="week" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <Card className={`${cardBase} p-8`}>
                    <div>
                      <h3 className="text-xl font-bold text-foreground">This Week</h3>
                      <p className="mt-2 text-sm text-muted-foreground">Last 7 days including today.</p>
                    </div>
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <div className={`${rowCard} p-6`}>
                        <div className="text-sm font-semibold text-muted-foreground">Closed</div>
                        <div className="mt-3 flex items-baseline gap-2">
                          <div className="text-3xl font-bold text-green-600">{weeklyClosed}</div>
                          <div className="text-xs text-muted-foreground">of {weeklyTotal}</div>
                        </div>
                      </div>
                      <div className={`${rowCard} p-6`}>
                        <div className="text-sm font-semibold text-muted-foreground">Pending</div>
                        <div className="mt-3 flex items-baseline gap-2">
                          <div className="text-3xl font-bold text-orange-600">{Math.max(weeklyTotal - weeklyClosed, 0)}</div>
                          <div className="text-xs text-muted-foreground">of {weeklyTotal}</div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 grid gap-3">
                      {weeklyWindow.length === 0 ? (
                        <div className="rounded-2xl border border-border/40 bg-slate-50 p-6 text-center">
                          <Clock className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                          <p className="text-sm font-semibold text-foreground">No activity</p>
                          <p className="mt-1 text-xs text-muted-foreground">No follow-ups logged this week.</p>
                        </div>
                      ) : (
                        weeklyWindow.map((row, index) => (
                          <div key={row.id} className={`${rowCard} p-5`} style={rowDelayStyle(index)}>
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-3">
                                  <div className="text-base font-semibold text-foreground">{row.patientName}</div>
                                  <Badge variant={row.status === "closed" ? "secondary" : "outline"} className="rounded-full text-xs">
                                    {row.status === "closed" ? "✓ Closed" : "Pending"}
                                  </Badge>
                                </div>
                                <div className="mt-2 text-sm text-muted-foreground">
                                  <span className="font-semibold text-foreground">{row.dentist}</span> • {row.detail}
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">{new Date(row.date).toLocaleDateString()}</div>
                              </div>
                              {row.status === "closed" ? (
                                <CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-green-600" />
                              ) : (
                                <Clock className="mt-1 h-5 w-5 flex-shrink-0 text-orange-600" />
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                </TabsContent>
              ) : null}

            </Tabs>
          </div>
        </main>
      </div>

      <Dialog
        open={fixOpen}
        onOpenChange={(open) => {
          setFixOpen(open);
          if (!open) {
            setFixRow(null);
            setFixError(null);
          }
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Fix Appointment Details</DialogTitle>
            <DialogDescription>
              Correct any missing information. Updates will sync to Google Calendar.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-foreground">Patient Name</label>
              <input
                className="rounded-xl border border-border/40 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 transition-colors hover:border-border/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={fixPatientName}
                onChange={(e) => setFixPatientName(e.target.value)}
                placeholder="Enter patient name"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-semibold text-foreground">Phone Number</label>
              <input
                className="rounded-xl border border-border/40 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 transition-colors hover:border-border/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={fixPhone}
                onChange={(e) => setFixPhone(e.target.value)}
                placeholder="e.g., +971501234567"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-semibold text-foreground">Dentist Name</label>
              <input
                className="rounded-xl border border-border/40 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 transition-colors hover:border-border/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={fixDentist}
                onChange={(e) => setFixDentist(e.target.value)}
                placeholder="e.g., Dr. Smith"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-semibold text-foreground">Service</label>
              <input
                className="rounded-xl border border-border/40 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 transition-colors hover:border-border/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={fixService}
                onChange={(e) => setFixService(e.target.value)}
                placeholder="e.g., Cleaning"
              />
            </div>

            {fixError ? (
              <div className="rounded-xl border border-red-200/50 bg-red-50 p-3 text-sm text-red-700">
                <span className="font-semibold">Error: </span>{fixError}
              </div>
            ) : null}

            <div className="flex gap-3 pt-2">
              <Button 
                className="rounded-xl flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold" 
                disabled={fixSaving} 
                onClick={submitFixDetails}
              >
                {fixSaving ? "Saving..." : "Save changes"}
              </Button>
              <Button 
                variant="outline" 
                className="rounded-xl flex-1 border-border/40" 
                onClick={() => setFixOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setActiveRowId(null);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {confirmMode === "done" ? "Message Sent?" : "Confirm Send"}
            </DialogTitle>
            <DialogDescription>
              {confirmMode === "done" 
                ? "Did you successfully send this message via WhatsApp?"
                : "Have you sent the message via WhatsApp?"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Button 
              className="rounded-xl w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
              onClick={handleConfirmSent}
            >
              <CheckCircle2 size={16} className="mr-2" />
              Yes, sent
            </Button>
            <Button 
              variant="outline" 
              className="rounded-xl w-full border-border/40"
              onClick={handleConfirmNotSent}
            >
              Not yet
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={contactOpen}
        onOpenChange={(open) => {
          setContactOpen(open);
          if (!open) setContactRow(null);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Contact Patient</DialogTitle>
            <DialogDescription>Use the information below to reach out.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 text-sm">
            <div className="rounded-xl border border-border/40 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-muted-foreground">PATIENT NAME</div>
              <div className="mt-2 font-semibold text-foreground">
                {contactRow?.patientName ?? "Unknown"}
              </div>
            </div>
            <div className="rounded-xl border border-border/40 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-muted-foreground">PHONE</div>
              <div className="mt-2 font-mono font-semibold text-foreground break-all">
                {contactRow?.phoneE164 || "Unknown"}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                className="rounded-xl flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                onClick={() => copyText(contactRow?.phoneE164)}
                disabled={!contactRow?.phoneE164}
              >
                <Phone size={16} className="mr-2" />
                Copy
              </Button>
              <Button 
                variant="outline" 
                className="rounded-xl flex-1 border-border/40"
                onClick={() => setContactOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rescheduleContactOpen}
        onOpenChange={(open) => {
          setRescheduleContactOpen(open);
          if (!open) setRescheduleContactRow(null);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Contact Patient</DialogTitle>
            <DialogDescription>Share these details to help reschedule their appointment.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 text-sm">
            <div className="rounded-xl border border-border/40 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-muted-foreground">PATIENT NAME</div>
              <div className="mt-2 font-semibold text-foreground">
                {rescheduleContactRow?.patientName ?? "Unknown"}
              </div>
            </div>
            <div className="rounded-xl border border-border/40 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-muted-foreground">PHONE</div>
              <div className="mt-2 font-mono font-semibold text-foreground break-all">
                {rescheduleContactRow?.phoneE164 || "Unknown"}
              </div>
            </div>
            <div className="rounded-xl border border-border/40 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-muted-foreground">DENTIST</div>
              <div className="mt-2 font-semibold text-foreground">
                {rescheduleContactRow?.dentist ?? "Unknown"}
              </div>
            </div>
            {rescheduleContactRow?.aiSummary && (
              <div className="rounded-xl border border-border/40 bg-blue-50 p-4">
                <div className="text-xs font-semibold text-muted-foreground">NOTE</div>
                <div className="mt-2 text-foreground italic">
                  {rescheduleContactRow.aiSummary}
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button
                className="rounded-xl flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                onClick={() => copyText(rescheduleContactRow?.phoneE164)}
                disabled={!rescheduleContactRow?.phoneE164}
              >
                <Phone size={16} className="mr-2" />
                Copy
              </Button>
              <Button 
                variant="outline" 
                className="rounded-xl flex-1 border-border/40"
                onClick={() => setRescheduleContactOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={recallAlertOpen}
        onOpenChange={(open) => {
          if (!open) {
            dismissRecallAlert();
            return;
          }
          setRecallAlertOpen(true);
        }}
      >
        <DialogContent className="max-w-sm rounded-3xl border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.4)] p-0 overflow-hidden">
          {/* Animated background blur effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-b from-purple-500/10 to-transparent rounded-full blur-3xl animate-pulse"></div>
          </div>
          
          <div className="relative z-10 p-7">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 mb-4">
                <CheckCircle2 className="w-6 h-6 text-purple-400" />
              </div>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent">
                Book their next appointment
              </DialogTitle>
              <DialogDescription className="text-slate-400 mt-2 text-sm">
                A recall just came in. Open the Recall tab to follow up.
              </DialogDescription>
            </div>

            <div className="grid gap-3 mb-6">
              <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 via-slate-800/30 to-slate-900/50 p-4 backdrop-blur-sm hover:border-purple-500/30 transition-all duration-300">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Patient</div>
                <div className="text-base font-semibold text-white">
                  {recallAlertRow?.patientName ?? "Unknown"}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 via-slate-800/30 to-slate-900/50 p-4 backdrop-blur-sm hover:border-purple-500/30 transition-all duration-300">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Dentist</div>
                <div className="text-base font-semibold text-white">
                  {recallAlertRow?.dentist ?? "Unknown"}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 via-slate-800/30 to-slate-900/50 p-4 backdrop-blur-sm hover:border-purple-500/30 transition-all duration-300">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Service</div>
                <div className="text-base font-semibold text-white">
                  {recallAlertRow?.service ?? "Unknown"}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                className="rounded-xl flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                onClick={handleRecallAlertNavigate}
              >
                Go to recalls
              </Button>
              <Button
                className="rounded-xl flex-1 border border-slate-600/50 bg-slate-800/30 hover:bg-slate-700/50 text-slate-100 font-semibold transition-all duration-300 backdrop-blur-sm"
                onClick={dismissRecallAlert}
              >
                Later
              </Button>
            </div>

            <div className="mt-4 text-center text-xs text-slate-500">
              Auto closes in 10s.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={recallContactOpen}
        onOpenChange={(open) => {
          setRecallContactOpen(open);
          if (!open) setRecallContactRow(null);
        }}
      >
        <DialogContent className="w-[92vw] max-w-lg max-h-[78vh] overflow-y-auto rounded-3xl border-slate-200 bg-white/95 p-7 shadow-[0_20px_60px_rgba(15,23,42,0.32)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-slate-900">Send Recall Message</DialogTitle>
            <DialogDescription className="text-slate-600">
              Use the details below to contact the patient.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white via-white to-slate-50 p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Patient name</div>
              <div className="mt-2 text-base font-semibold text-slate-900">
                {recallContactRow?.patientName ?? "Unknown"}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white via-white to-slate-50 p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Phone</div>
              <div className="mt-2 break-all font-mono text-base font-semibold text-slate-900">
                {recallContactRow?.phoneE164 || "Unknown"}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white via-white to-slate-50 p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Dentist</div>
              <div className="mt-2 text-base font-semibold text-slate-900">
                {recallContactRow?.dentist ?? "Unknown"}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white via-white to-slate-50 p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Last visit</div>
              <div className="mt-2 text-base font-semibold text-slate-900">
                {recallContactRow?.lastVisitIso
                  ? new Date(recallContactRow.lastVisitIso).toLocaleDateString()
                  : "Unknown"}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white via-white to-slate-50 p-4 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Previous service</div>
              <div className="mt-2 text-base font-semibold text-slate-900">
                {recallContactRow?.service ?? "Unknown"}
              </div>
            </div>
            {recallMessage ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-[inset_0_1px_0_rgba(148,163,184,0.35)] sm:col-span-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Message template</div>
                <div className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-slate-900">
                  {recallMessage}
                </div>
              </div>
            ) : null}
            <div className="flex flex-col gap-2 pt-2 sm:col-span-2">
              <Button
                className="rounded-full w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold shadow-[0_12px_26px_rgba(124,58,237,0.35)] hover:from-purple-500 hover:to-indigo-500"
                onClick={() => copyText(recallMessage)}
                disabled={!recallMessage}
              >
                <MessageSquare size={16} className="mr-2" />
                Copy message
              </Button>
              <Button
                variant="outline"
                className="rounded-full w-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                onClick={() => recallContactRow && handleRecallDone(recallContactRow)}
                disabled={!recallContactRow}
              >
                <CheckCircle2 size={16} className="mr-2" />
                Mark as done
              </Button>
              <Button 
                variant="outline" 
                className="rounded-full w-full border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                onClick={() => setRecallContactOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SkeletonDashboard;
