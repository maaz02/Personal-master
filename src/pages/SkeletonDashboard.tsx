
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";

type OutboxRow = {
  id: string;
  appointmentId: string;
  patientName: string;
  phoneE164?: string;
  dentist: string;
  startIso?: string;
  createdAt: string;
  openedAt?: string;
  sentAt?: string;
  sendStatus: "ready" | "opened" | "sent" | "needs_review";
  potentialDuplicate?: boolean;
  messageText?: string;
  waLink?: string;
  messageType: "confirm" | "reminder_48hr" | "reminder_tomorrow" | "reminder_2h";
};

type CancelledFollowUp = {
  id: string;
  appointmentId: string;
  patientName: string;
  dentist: string;
  startIso: string;
  followupStatus: "open" | "closed";
  createdAt: string;
  updatedAt?: string;
  aiSummary: string;
  cancelReason: string;
};

type RescheduleFollowUp = {
  id: string;
  appointmentId: string;
  patientName: string;
  dentist: string;
  currentStartIso: string;
  followupStatus: "open" | "closed";
  createdAt: string;
  updatedAt?: string;
  aiSummary: string;
  phoneE164?: string;
  note: string;
};

type NoNextAppointment = {
  id: string;
  patientName: string;
  dentist: string;
  lastVisitIso: string;
  status: "pending" | "nudged1" | "nudged" | "nudged2";
  createdAt: string;
  updatedAt?: string;
  phoneE164?: string;
};

type WeeklyEvent = {
  id: string;
  patientName: string;
  dentist: string;
  detail: string;
  status: "open" | "closed";
  date: string;
  type: "outbox" | "followup" | "no_next";
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
        // infer year from createdAt (Dubai year)
        const baseYear = Number(getDubaiDateKey(base).slice(0, 4));
        const dateKey = `${baseYear}-${pad2(month)}-${pad2(day)}`;
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
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<OutboxRow | null>(null);
  const [editForm, setEditForm] = useState({
    patientName: "",
    phoneE164: "",
    messageText: "",
    waLink: "",
  });

  const [outboxRows, setOutboxRows] = useState<OutboxRow[]>([]);
  const [cancelledFollowUps, setCancelledFollowUps] = useState<CancelledFollowUp[]>([]);
  const [rescheduleFollowUps, setRescheduleFollowUps] = useState<RescheduleFollowUp[]>([]);
  const [noNextAppointments, setNoNextAppointments] = useState<NoNextAppointment[]>([]);

  useEffect(() => {
  const fetchTab = async (tab: string) => {
    // ✅ easiest: use query string in the function name
    const { data, error } = await supabase.functions.invoke(
      `get_patients?tab=${encodeURIComponent(tab)}`
    );

    if (error) throw error;
    return Array.isArray(data?.patients) ? data.patients : [];
  };

  const mapOutbox = (r: any): OutboxRow => ({
    id: r.naturalKey ?? r.idempotencyKey ?? r.id ?? crypto.randomUUID(),
    appointmentId: r.appointmentId ?? r.appointment_id ?? "",
    patientName: r.patientName ?? r.patient_name ?? (r.messageText?.match(/^Hi\s+(.+?),/i)?.[1] ?? "Unknown"),
    dentist: r.dentist ?? (r.messageText?.match(/\bwith\s+(Dr\s+\w+)/i)?.[1] ?? "Unknown"),
    phoneE164: r.phoneE164 ?? r.phone_e164 ?? "",
    startIso:r.startIso ?? r.start_iso ?? parseStartIsoFromMessage(r.messageText, r.createdAt ?? r.created_at),
    createdAt: r.createdAt ?? r.created_at ?? new Date().toISOString(),
    openedAt: r.openedAt ?? r.opened_at ?? undefined,
    sentAt: r.sentAt ?? r.sent_at ?? undefined,
    sendStatus: (r.sendStatus ?? r.send_status ?? "needs_review") as OutboxRow["sendStatus"],
    potentialDuplicate: r.potentialDuplicate === true || r.potentialDuplicate === "true",
    messageText: r.messageText ?? r.message_text ?? "",
    waLink: r.waLink ?? r.wa_link ?? "",
    messageType: (r.messageType ?? r.message_type ?? "confirm") as OutboxRow["messageType"],
  });

  const mapCancelled = (r: any): CancelledFollowUp => ({
    id: r.id ?? crypto.randomUUID(),
    appointmentId: r.appointmentId ?? "",
    patientName: r.patient_name ?? r.patientName ?? "Unknown",
    dentist: r.dentist ?? "Unknown",
    startIso: r.start ?? r.startIso ?? "",
    followupStatus: (r.status ?? r.followupStatus ?? "open") as CancelledFollowUp["followupStatus"],
    createdAt: r.createdAt ?? new Date().toISOString(),
    updatedAt: r.updatedAt ?? r.updated_at ?? undefined,
    cancelReason: r.cancelReason ?? r.cancel_reason ?? "",
    aiSummary: r.aiSummary ?? r.ai_summary ?? "",
  });


  const mapReschedule = (r: any): RescheduleFollowUp => ({
    id: r.id ?? crypto.randomUUID(),
    appointmentId: r.appointmentId ?? r.appointment_id ?? "",
    patientName: r.patientName ?? r.patient_name ?? "Unknown",
    dentist: r.dentist ?? "Unknown",
    currentStartIso: r.currentStart ?? r.current_start_iso ?? "",
    followupStatus: (r.followupStatus ?? r.followup_status ?? "open") as RescheduleFollowUp["followupStatus"],
    createdAt: r.createdAt ?? r.created_at ?? new Date().toISOString(),
    updatedAt: r.updatedAt ?? r.updated_at ?? undefined,
    note: r.note ?? "",
    aiSummary: r.aiSummary ?? r.ai_summary ?? "",
    phoneE164: r.phone ?? "",
  });

  const mapNoNext = (r: any): NoNextAppointment => ({
    id: r.id ?? crypto.randomUUID(),
    patientName: r.patientName ?? r.patient_name ?? "Unknown",
    phoneE164: r.phoneE164 ?? "",
    dentist: r.dentist ?? "Unknown",
    lastVisitIso: r.lastVisitIso ?? r.last_visit_iso ?? "",
    status: (r.status ?? "pending") as NoNextAppointment["status"],
    createdAt: r.createdAt ?? r.created_at ?? new Date().toISOString(),
    updatedAt: r.updatedAt ?? r.updated_at ?? undefined,
  });

  const loadAll = async () => {
    try {
      const [outboxRaw, confirmedRaw, cancelledRaw, rescheduleRaw, noNextRaw] = await Promise.all([
        fetchTab("Outbox"),
        fetchTab("Confirmed"),
        fetchTab("CancelledFollowUp"),
        fetchTab("RescheduleFollowUp"),
        fetchTab("NoNextAppointment"), // ⚠️ must match your EXACT sheet tab name
      ]);

      setOutboxRows(outboxRaw.map(mapOutbox));
      setCancelledFollowUps(cancelledRaw.map(mapCancelled));
      setRescheduleFollowUps(rescheduleRaw.map(mapReschedule));
      setNoNextAppointments(noNextRaw.map(mapNoNext));
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
      detail: "No next pending",
      status: "open",
      date: "2025-12-17T08:10:00.000Z",
      type: "no_next",
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
        return (
          (row.sendStatus === "ready" || row.sendStatus === "needs_review")
 &&
          !row.potentialDuplicate &&
          isValidPhone(row.phoneE164) &&
          Boolean(row.waLink) &&
          Boolean(row.messageText)
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
      if (!isValidPhone(row.phoneE164)) return 1;
      if (row.potentialDuplicate) return 2;
      if (!row.waLink || !row.messageText) return 3;
      return 4;
    };
    return outboxRows
      .filter((row) => {
        return (
          row.sendStatus === "needs_review" ||
          row.potentialDuplicate ||
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
    return outboxRows.filter((row) => row.sendStatus === "sent" && isToday(row.sentAt));
  }, [outboxRows, todayKey]);

  const openedCount = useMemo(() => {
    return outboxRows.filter((row) => row.sendStatus === "opened").length;
  }, [outboxRows]);

  const cancelledOpen = cancelledFollowUps.filter((row) => row.followupStatus === "open");
  const rescheduleOpen = rescheduleFollowUps.filter((row) => row.followupStatus === "open");
  const noNextOpen = noNextAppointments.filter((row) => row.status === "pending" || row.status === "nudged" || row.status === "nudged1" || row.status === "nudged2");


  const followUpCount = cancelledOpen.length + rescheduleOpen.length + noNextOpen.length;

  const followUpOverdue = [...cancelledOpen, ...rescheduleOpen].filter((row) => {
    const updatedAt = toDate(row.updatedAt || row.createdAt);
    if (!updatedAt) return false;
    return Date.now() - updatedAt.getTime() > 2 * 24 * 60 * 60 * 1000;
  }).length;

  const noNextOverdue = noNextOpen.filter((row) => {
    const lastVisit = toDate(row.lastVisitIso);
    if (!lastVisit) return false;
    return Date.now() - lastVisit.getTime() > 7 * 24 * 60 * 60 * 1000;
  }).length;

  const followUpOverdueCount = followUpOverdue + noNextOverdue;

  const sendCompletionPercent = useMemo(() => {
    const total = sendNowRows.length + openedCount + completedTodayRows.length;
    if (total === 0) return 0;
    return Math.round((completedTodayRows.length / total) * 100);
  }, [sendNowRows.length, openedCount, completedTodayRows.length]);

  const weeklyWindow = useMemo(() => {
    const keys = new Set(getDubaiDateKeys(7));
    return weeklyEvents.filter((row) => keys.has(getDubaiDateKey(new Date(row.date))));
  }, [weeklyEvents]);

  const weeklyClosed = weeklyWindow.filter((row) => row.status === "closed").length;
  const weeklyTotal = weeklyWindow.length;
  const followUpClosurePercent = weeklyTotal === 0 ? 0 : Math.round((weeklyClosed / weeklyTotal) * 100);

  const allPatients = useMemo(() => {
    const statusPriority: Record<string, number> = {
      "Follow-up open": 1,
      "No next pending": 2,
      "Needs review": 3,
      "Outbox open": 4,
      Completed: 5,
    };

    const map = new Map<
      string,
      {
        name: string;
        lastActivity: string;
        lastActivityMs: number;
        status: string;
      }
    >();

    const update = (name: string, activity: string, status: string) => {
      if (!name) return;
      const activityMs = Number.isFinite(new Date(activity).getTime())
        ? new Date(activity).getTime()
        : 0;
      const current = map.get(name);
      if (!current) {
        map.set(name, { name, lastActivity: activity, lastActivityMs: activityMs, status });
        return;
      }
      const nextActivity = activityMs > current.lastActivityMs ? activity : current.lastActivity;
      const nextActivityMs = Math.max(activityMs, current.lastActivityMs);
      const nextStatus =
        statusPriority[status] < statusPriority[current.status] ? status : current.status;
      map.set(name, {
        ...current,
        lastActivity: nextActivity,
        lastActivityMs: nextActivityMs,
        status: nextStatus,
      });
    };

    outboxRows.forEach((row) => {
      const activity = row.sentAt || row.openedAt || row.createdAt;
      let status = "Outbox open";
      if (row.sendStatus === "needs_review") status = "Needs review";
      if (row.sendStatus === "sent") status = "Completed";
      update(row.patientName, activity, status);
    });

    cancelledFollowUps.forEach((row) => {
      const activity = row.updatedAt || row.createdAt;
      const status = row.followupStatus === "open" ? "Follow-up open" : "Completed";
      update(row.patientName, activity, status);
    });

    rescheduleFollowUps.forEach((row) => {
      const activity = row.updatedAt || row.createdAt;
      const status = row.followupStatus === "open" ? "Follow-up open" : "Completed";
      update(row.patientName, activity, status);
    });

    noNextAppointments.forEach((row) => {
      const activity = row.updatedAt || row.createdAt;
      const status = row.status === "pending" || row.status === "nudged" ? "No next pending" : "Completed";
      update(row.patientName, activity, status);
    });

    return Array.from(map.values()).sort((a, b) => b.lastActivityMs - a.lastActivityMs);
  }, [outboxRows, cancelledFollowUps, rescheduleFollowUps, noNextAppointments]);

  const countBubble = (count: number) =>
    count > 0 ? (
      <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-400/20 px-1 text-xs font-semibold text-sky-100 ring-1 ring-sky-300/30">
        {count}
      </span>
    ) : null;

  const copyText = (value?: string) => {
    if (!value || typeof navigator === "undefined") return;
    navigator.clipboard?.writeText(value).catch(() => undefined);
  };

  const openEditDetails = (row: OutboxRow) => {
    setEditRow(row);
    setEditForm({
      patientName: row.patientName ?? "",
      phoneE164: row.phoneE164 ?? "",
      messageText: row.messageText ?? "",
      waLink: row.waLink ?? "",
    });
    setEditError(null);
    setEditOpen(true);
  };

  const handleEditChange = (field: keyof typeof editForm, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateOutboxRow = (id: string, updater: (row: OutboxRow) => OutboxRow) => {
    setOutboxRows((prev) => prev.map((row) => (row.id === id ? updater(row) : row)));
  };

  const saveEditDetails = async () => {
    if (!editRow) return;
    if (!editRow.appointmentId) {
      setEditError("Missing appointment ID. Unable to update the sheet.");
      return;
    }

    setEditSaving(true);
    setEditError(null);
    const updates = {
      patient_name: editForm.patientName,
      phone_e164: editForm.phoneE164,
      message_text: editForm.messageText,
      wa_link: editForm.waLink,
    };

    const { error } = await supabase.functions.invoke("update_patient", {
      body: {
        tab: "Outbox",
        appointment_id: editRow.appointmentId,
        updates,
      },
    });

    if (error) {
      setEditError(error.message || "Failed to update Google Sheet.");
      setEditSaving(false);
      return;
    }

    updateOutboxRow(editRow.id, (current) => ({
      ...current,
      patientName: editForm.patientName,
      phoneE164: editForm.phoneE164,
      messageText: editForm.messageText,
      waLink: editForm.waLink,
    }));
    setEditSaving(false);
    setEditOpen(false);
    setEditRow(null);
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
    if (!activeRowId) return;
    updateOutboxRow(activeRowId, (current) => ({
      ...current,
      sendStatus: "sent",
      sentAt: new Date().toISOString(),
    }));
    setConfirmOpen(false);
    setActiveRowId(null);
    setActiveTab("completed");
  };

  const handleConfirmNotSent = () => {
    if (!activeRowId) return;
    updateOutboxRow(activeRowId, (current) => ({
      ...current,
      sendStatus: "ready",
      openedAt: undefined,
    }));
    setConfirmOpen(false);
    setActiveRowId(null);
  };

  const getReviewReason = (row: OutboxRow) => {
    if (!isValidPhone(row.phoneE164)) return "Missing phone";
    if (row.potentialDuplicate) return "Duplicate";
    if (!row.waLink || !row.messageText) return "Missing details";
    return "Needs review";
  };

  const cardBase =
    "relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(140deg,rgba(15,23,42,0.9)_0%,rgba(2,6,23,0.96)_70%)] shadow-[0_16px_50px_rgba(2,6,23,0.45)] backdrop-blur";
  const cardHover =
    "transition-all duration-300 hover:-translate-y-0.5 hover:border-white/25 hover:shadow-[0_30px_80px_rgba(14,165,233,0.18)]";
  const rowCard =
    "group relative rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur transition-all duration-200 hover:border-white/25 hover:bg-slate-900/70 hover:shadow-[0_16px_50px_rgba(2,6,23,0.45)]";
  const tabListBase =
    "flex flex-wrap gap-1.5 justify-start rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.9),rgba(2,6,23,0.92))] p-1.5 shadow-[0_10px_30px_rgba(2,6,23,0.55)] backdrop-blur";
  const tileCard = `${cardBase} ${cardHover} group p-5 before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-300 before:content-[''] before:bg-[radial-gradient(120%_100%_at_80%_0%,rgba(56,189,248,0.2),transparent_55%)] hover:before:opacity-100`;

  const showWeekTab = timeRange === "7d";

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-foreground">
      <div className="pointer-events-none absolute -top-32 right-0 h-72 w-72 rounded-full bg-sky-400/25 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 left-0 h-96 w-96 rounded-full bg-indigo-500/20 blur-[140px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_0%,rgba(56,189,248,0.12),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(14,165,233,0.08),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(148,163,184,0.25)_1px,transparent_0)] [background-size:18px_18px] [mask-image:radial-gradient(70%_60%_at_50%_20%,black,transparent)]" />
      <div className="pointer-events-none absolute left-1/2 top-24 h-64 w-[860px] -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-sky-400/20 to-transparent blur-[120px]" />

      <div className="relative z-10">
        <div className="relative border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/60 to-transparent" />
          <div className="container mx-auto flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="text-lg font-semibold text-foreground">
                Clinic Appointments <span className="bg-gradient-to-r from-sky-300 to-blue-500 bg-clip-text text-transparent">Dashboard</span>
              </div>
              <Badge variant="outline" className="border-primary/40 text-primary">
                Placeholder
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40 border-white/10 bg-slate-900/70">
                  <SelectValue placeholder="Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7d">7 days</SelectItem>
                  <SelectItem value="30d">30 days</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => navigate("/auth")}>
                Sign out
              </Button>
            </div>
          </div>
        </div>

        <main className="container mx-auto px-4 py-10 animate-in fade-in duration-500">
          <div className="grid gap-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Front desk <span className="bg-gradient-to-r from-sky-300 to-blue-400 bg-clip-text text-transparent">overview</span>
              </h2>
              <p className="text-sm text-muted-foreground">Keep the queue moving with clear, single actions.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className={`${tileCard} animate-fade-in-up`} style={{ animationDelay: "0ms" }}>
                <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-sky-500/25 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-12 -left-10 h-28 w-28 rounded-full bg-indigo-500/20 blur-3xl" />
                <div className="relative flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Send now</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-3xl font-semibold text-foreground">{sendNowRows.length}</div>
                    <Button size="sm" className="btn-gradient rounded-full px-4" onClick={() => setActiveTab("send")}>
                      Open
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">Ready to send now</div>
                </div>
              </Card>
              <Card className={`${tileCard} animate-fade-in-up`} style={{ animationDelay: "80ms" }}>
                <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-cyan-400/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-12 -left-10 h-28 w-28 rounded-full bg-blue-500/20 blur-3xl" />
                <div className="relative flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Sent today</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-3xl font-semibold text-foreground">{completedTodayRows.length}</div>
                    <Button size="sm" className="btn-gradient rounded-full px-4" onClick={() => setActiveTab("completed")}>
                      Open
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">Done and recorded</div>
                </div>
              </Card>
              <Card className={`${tileCard} animate-fade-in-up`} style={{ animationDelay: "160ms" }}>
                <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-sky-500/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-12 -left-10 h-28 w-28 rounded-full bg-indigo-500/20 blur-3xl" />
                <div className="relative flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Follow-ups</span>
                    {followUpOverdueCount > 0 ? (
                      <Badge variant="outline">Overdue {followUpOverdueCount}</Badge>
                    ) : null}
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-3xl font-semibold text-foreground">{followUpCount}</div>
                    <Button size="sm" className="btn-gradient rounded-full px-4" onClick={() => setActiveTab("followups")}>
                      Open
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">Cancelled + reschedule + no next</div>
                </div>
              </Card>
              <Card className={`${tileCard} animate-fade-in-up`} style={{ animationDelay: "240ms" }}>
                <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-indigo-500/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-12 -left-10 h-28 w-28 rounded-full bg-slate-500/20 blur-3xl" />
                <div className="relative flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Needs review</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-3xl font-semibold text-foreground">{needsReviewRows.length}</div>
                    <Button size="sm" className="btn-gradient rounded-full px-4" onClick={() => setActiveTab("review")}>
                      Open
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">Fix missing details</div>
                </div>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className={`${cardBase} ${cardHover} p-5`}>
                <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-sky-500/20 blur-3xl" />
                <div className="relative">
                  <div className="text-sm text-muted-foreground">Send completion % (Today)</div>
                  <div className="mt-2 text-3xl font-semibold text-foreground">{sendCompletionPercent}%</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {completedTodayRows.length}/
                    {sendNowRows.length + openedCount + completedTodayRows.length} sent
                  </div>
                </div>
              </Card>
              <Card className={`${cardBase} ${cardHover} p-5`}>
                <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-indigo-500/20 blur-3xl" />
                <div className="relative">
                  <div className="text-sm text-muted-foreground">Follow-up closure % (This week)</div>
                  <div className="mt-2 text-3xl font-semibold text-foreground">{followUpClosurePercent}%</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {weeklyClosed}/{weeklyTotal} closed
                  </div>
                </div>
              </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={tabListBase}>
                <TabsTrigger value="send">Send now</TabsTrigger>
                <TabsTrigger value="followups">Follow-ups</TabsTrigger>
                <TabsTrigger value="review">Needs review</TabsTrigger>
                <TabsTrigger value="completed">Completed today</TabsTrigger>
                {showWeekTab ? <TabsTrigger value="week">This week</TabsTrigger> : null}
                <TabsTrigger value="patients">All patients</TabsTrigger>
              </TabsList>

              <TabsContent value="send" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Card className={`${cardBase} p-6`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-foreground">Send now</h3>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Tap Send WhatsApp, then mark as done.</p>
                  <div className="mt-4 grid gap-3">
                    {sendNowRows.map((row) => (
                      <div
                        key={row.id}
                        className={`${rowCard} flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between`}
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-base font-semibold text-foreground">{row.patientName}</div>
                            <Badge variant="secondary">{messageTypeLabel(row.messageType)}</Badge>
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {row.dentist} - {new Date(row.startIso || row.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" className="btn-gradient" onClick={() => handleSendClick(row)}>
                            Send WhatsApp
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleMarkDoneClick(row)}>
                            Mark as done
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openEditDetails(row)}>
                            Edit details
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">View details</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                              <DialogHeader>
                                <DialogTitle>WhatsApp details</DialogTitle>
                                <DialogDescription>Copy the details you need.</DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 text-sm">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-xs text-muted-foreground">Patient</div>
                                    <div className="font-semibold text-foreground break-words">{row.patientName}</div>
                                  </div>
                                  <Button size="sm" variant="ghost" onClick={() => copyText(row.patientName)}>
                                    Copy
                                  </Button>
                                </div>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-xs text-muted-foreground">Phone</div>
                                    <div className="font-semibold text-foreground break-words">
                                      {row.phoneE164 || "Unknown"}
                                    </div>
                                  </div>
                                  <Button size="sm" variant="ghost" onClick={() => copyText(row.phoneE164)}>
                                    Copy
                                  </Button>
                                </div>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-xs text-muted-foreground">Message</div>
                                    <div className="text-foreground break-words whitespace-pre-wrap">
                                      {row.messageText || "Missing"}
                                    </div>
                                  </div>
                                  <Button size="sm" variant="ghost" onClick={() => copyText(row.messageText)}>
                                    Copy
                                  </Button>
                                </div>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-xs text-muted-foreground">WhatsApp link</div>
                                    <div className="text-foreground break-all">{row.waLink || "Missing"}</div>
                                  </div>
                                  <Button size="sm" variant="ghost" onClick={() => copyText(row.waLink)}>
                                    Copy
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="review" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Card className={`${cardBase} p-6`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">Needs review</h3>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Resolve missing or duplicated info.</p>
                  <div className="mt-4 grid gap-3">
                    {needsReviewRows.map((row) => {
                      const reason = getReviewReason(row);
                      return (
                        <div key={row.id} className={`${rowCard} p-4`}>
                          <div className="flex items-center justify-between">
                            <div className="text-base font-semibold text-foreground">{row.patientName}</div>
                            <Badge variant="outline">{reason}</Badge>
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {row.dentist} - {new Date(row.startIso || row.createdAt).toLocaleString()}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {reason === "Missing phone" ? (
                              <>
                                <Button size="sm">Add phone</Button>
                                <Button size="sm" variant="outline">
                                  Mark cannot message
                                </Button>
                              </>
                            ) : null}
                            {reason === "Duplicate" ? (
                              <>
                                <Button size="sm">Approve send</Button>
                                <Button size="sm" variant="outline">
                                  Dismiss
                                </Button>
                              </>
                            ) : null}
                            {reason === "Missing details" || reason === "Needs review" ? (
                              <>
                                <Button size="sm">Open appointment</Button>
                                <Button size="sm" variant="outline">
                                  Resolve
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="followups" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Tabs value={followupTab} onValueChange={setFollowupTab} className="w-full">
                  <TabsList className={tabListBase}>
                    <TabsTrigger value="cancelled">
                      Cancelled {countBubble(cancelledOpen.length)}
                    </TabsTrigger>
                    <TabsTrigger value="reschedule">
                      Reschedule {countBubble(rescheduleOpen.length)}
                    </TabsTrigger>
                    <TabsTrigger value="no-next">
                      No next appointment {countBubble(noNextOpen.length)}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="cancelled">
                    <Card className={`${cardBase} p-6`}>
                      <h3 className="text-lg font-semibold text-foreground">Cancelled follow-ups</h3>
                      <div className="mt-4 grid gap-3">
                        {cancelledOpen.map((row) => (
                          <div key={row.id} className={`${rowCard} p-4`}>
                            <div className="flex items-center justify-between">
                              <div className="text-base font-semibold text-foreground">{row.patientName}</div>
                              <Badge variant="secondary">Cancelled</Badge>
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              {row.dentist} - {new Date(row.startIso).toLocaleString()}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">AI summary: {row.aiSummary}</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button size="sm">Call</Button>
                              <Button size="sm" variant="outline">
                                WhatsApp
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </TabsContent>

                  <TabsContent value="reschedule">
                    <Card className={`${cardBase} p-6`}>
                      <h3 className="text-lg font-semibold text-foreground">Reschedule follow-ups</h3>
                      <div className="mt-4 grid gap-3">
                        {rescheduleOpen.map((row) => (
                          <div key={row.id} className={`${rowCard} p-4`}>
                            <div className="flex items-center justify-between">
                              <div className="text-base font-semibold text-foreground">{row.patientName}</div>
                              <Badge variant="secondary">Reschedule</Badge>
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              {row.dentist} - {new Date(row.currentStartIso).toLocaleString()}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">AI summary: {row.aiSummary}</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button size="sm">Call</Button>
                              <Button size="sm" variant="outline">
                                WhatsApp
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </TabsContent>

                  <TabsContent value="no-next">
                    <Card className={`${cardBase} p-6`}>
                      <h3 className="text-lg font-semibold text-foreground">No next appointment</h3>
                      <div className="mt-4 grid gap-3">
                        {noNextOpen.map((row) => (
                          <div key={row.id} className={`${rowCard} p-4`}>
                            <div className="flex items-center justify-between">
                              <div className="text-base font-semibold text-foreground">{row.patientName}</div>
                              <Badge variant="outline">{row.status === "pending" ? "Pending" : "Nudged"}</Badge>
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              {row.dentist} - Last visit {new Date(row.lastVisitIso).toLocaleDateString()}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button size="sm">Send follow-up</Button>
                              <Button size="sm" variant="outline">
                                Mark booked
                              </Button>
                              <Button size="sm" variant="ghost">
                                Snooze 7 days
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="completed" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Card className={`${cardBase} p-6`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">Completed today</h3>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Proof of work for today.</p>
                  <div className="mt-4 grid gap-3">
                    {completedTodayRows.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No completed messages yet.</div>
                    ) : (
                      completedTodayRows.map((row) => (
                        <div key={row.id} className={`${rowCard} p-4`}>
                          <div className="flex items-center justify-between">
                            <div className="text-base font-semibold text-foreground">{row.patientName}</div>
                            <Badge variant="secondary">Sent</Badge>
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {row.dentist} - {new Date(row.startIso || row.createdAt).toLocaleString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </TabsContent>

              {showWeekTab ? (
                <TabsContent value="week" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <Card className={`${cardBase} p-6`}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-foreground">This week</h3>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">Last 7 days including today.</p>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className={`${rowCard} p-4`}>
                        <div className="text-sm text-muted-foreground">Closed follow-ups</div>
                        <div className="mt-2 text-2xl font-semibold text-foreground">{weeklyClosed}</div>
                      </div>
                      <div className={`${rowCard} p-4`}>
                        <div className="text-sm text-muted-foreground">Open follow-ups</div>
                        <div className="mt-2 text-2xl font-semibold text-foreground">
                          {Math.max(weeklyTotal - weeklyClosed, 0)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3">
                      {weeklyWindow.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No follow-ups logged this week.</div>
                      ) : (
                        weeklyWindow.map((row) => (
                          <div key={row.id} className={`${rowCard} p-4`}>
                            <div className="flex items-center justify-between">
                              <div className="text-base font-semibold text-foreground">{row.patientName}</div>
                              <Badge variant={row.status === "closed" ? "secondary" : "outline"}>
                                {row.status === "closed" ? "Closed" : "Open"}
                              </Badge>
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              {row.dentist} - {row.detail} - {new Date(row.date).toLocaleDateString()}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                </TabsContent>
              ) : null}

              <TabsContent value="patients" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Card className={`${cardBase} p-6`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">All patients</h3>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Lookup by latest activity.</p>
                  <div className="mt-4 grid gap-3">
                    {allPatients.map((row) => (
                      <div
                        key={row.name}
                        className={`${rowCard} flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between`}
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-base font-semibold text-foreground">{row.name}</div>
                            <Badge variant="outline">{row.status}</Badge>
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            Last activity - {new Date(row.lastActivity).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditOpen(false);
            setEditRow(null);
            setEditError(null);
            return;
          }
          setEditOpen(true);
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit details</DialogTitle>
            <DialogDescription>Changes are saved back to Google Sheets.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-patient">Patient name</Label>
              <Input
                id="edit-patient"
                value={editForm.patientName}
                onChange={(e) => handleEditChange("patientName", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={editForm.phoneE164}
                onChange={(e) => handleEditChange("phoneE164", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-message">Message</Label>
              <Textarea
                id="edit-message"
                rows={4}
                value={editForm.messageText}
                onChange={(e) => handleEditChange("messageText", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-link">WhatsApp link</Label>
              <Textarea
                id="edit-link"
                rows={3}
                value={editForm.waLink}
                onChange={(e) => handleEditChange("waLink", e.target.value)}
              />
            </div>
          </div>
          {editError ? <div className="text-sm text-destructive">{editError}</div> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditOpen(false);
                setEditRow(null);
                setEditError(null);
              }}
              disabled={editSaving}
            >
              Cancel
            </Button>
            <Button className="btn-gradient" onClick={saveEditDetails} disabled={editSaving}>
              {editSaving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open && activeRowId) {
            handleConfirmNotSent();
            return;
          }
          setConfirmOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmMode === "done" ? "Are you sure you've sent it?" : "Did you send the message?"}
            </DialogTitle>
            <DialogDescription>
              If not, keep it in Send now and send it when ready.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-3">
            <Button className="btn-gradient" onClick={handleConfirmSent}>
              Yes, sent
            </Button>
            <Button variant="outline" onClick={handleConfirmNotSent}>
              Not yet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SkeletonDashboard;
