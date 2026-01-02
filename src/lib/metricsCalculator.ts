import { formatISO, startOfMonth, endOfMonth, subMonths, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const DUBAI_TZ = "Asia/Dubai";

// Types for metrics
export interface MetricsData {
  // Reminder Coverage
  reminderCoverage48h: number;
  reminderCoverage24h: number;
  reminderCoverage2h: number;

  // Confirmation & Response
  confirmationRate24h: number;
  noResponseRate24h: number;
  cancellationRate: number;
  rescheduleRate: number;

  // Follow-up
  followupCompletionRate: number;
  followupSpeedMedianHours: number;
  recoveryRate: number;

  // Backlog
  openFollowupsCount: number;
  overdueFollowupsCount: number;

  // Recall
  recallConversionRate: number;

  // Data Quality
  needsReviewRate: number;

  // Trends
  cancellationRateTrendMoM: number; // percentage change

  // Patterns
  timeSlotLeakage: TimeSlotLeakage[];
  dayOfWeekPatterns: DayOfWeekPattern[];
  cancellationReasons: ReasonFrequency[];
}

export interface TimeSlotLeakage {
  hour: number;
  confirmed: number;
  cancelled: number;
  noResponse: number;
  leakageRate: number;
}

export interface DayOfWeekPattern {
  dayName: string;
  dayNum: number; // 0-6, 0 = Sunday
  confirmationRate: number;
  cancellationRate: number;
  volume: number;
}

export interface ReasonFrequency {
  reason: string;
  count: number;
  percentage: number;
}

// Helper to extract hour from ISO string
function getHourFromISO(isoString?: string): number | null {
  if (!isoString) return null;
  try {
    const date = parseISO(isoString);
    return date.getHours();
  } catch {
    return null;
  }
}

// Helper to extract day of week from ISO string
function getDayOfWeekFromISO(isoString?: string): number | null {
  if (!isoString) return null;
  try {
    const date = parseISO(isoString);
    return date.getDay();
  } catch {
    return null;
  }
}

// Helper to check if date is within range
function isDateInRange(isoString: string, startRange: Date, endRange: Date): boolean {
  try {
    const date = parseISO(isoString);
    return date >= startRange && date <= endRange;
  } catch {
    return false;
  }
}

export function calculateMetrics(
  outboxRows: any[],
  confirmRows: any[],
  cancelledFollowUps: any[],
  rescheduleFollowUps: any[],
  recallRows: any[],
  needsReviewCount: number
): MetricsData {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const previousMonthStart = startOfMonth(subMonths(now, 1));
  const previousMonthEnd = endOfMonth(subMonths(now, 1));

  // ============ REMINDER COVERAGE ============
  const reminder48h = outboxRows.filter((r) => r.messageType === "reminder_48hr").length;
  const reminder24h = outboxRows.filter((r) => r.messageType === "reminder_tomorrow").length;
  const reminder2h = outboxRows.filter((r) => r.messageType === "reminder_2h").length;

  // ============ CONFIRMATION & RESPONSE (24h) ============
  const sentLast24h = outboxRows.filter((r) => r.sentAt && isDateInRange(r.sentAt, last24h, now)).length;
  const confirmedLast24h = confirmRows.filter((r) => r.createdAt && isDateInRange(r.createdAt, last24h, now))
    .length;

  const cancelledLast24h = cancelledFollowUps.filter((r) =>
    r.createdAt && isDateInRange(r.createdAt, last24h, now)
  ).length;

  const rescheduledLast24h = rescheduleFollowUps.filter((r) =>
    r.createdAt && isDateInRange(r.createdAt, last24h, now)
  ).length;

  const confirmationRate24h = sentLast24h > 0 ? (confirmedLast24h / sentLast24h) * 100 : 0;
  const noResponseLast24h = sentLast24h - confirmedLast24h - cancelledLast24h - rescheduledLast24h;
  const noResponseRate24h = sentLast24h > 0 ? (noResponseLast24h / sentLast24h) * 100 : 0;

  // ============ CANCELLATION & RESCHEDULE RATES (all time) ============
  const totalOutboxSent = outboxRows.filter((r) => r.sendStatus === "sent").length;
  const cancellationRate = totalOutboxSent > 0 ? (cancelledFollowUps.length / totalOutboxSent) * 100 : 0;
  const rescheduleRate = totalOutboxSent > 0 ? (rescheduleFollowUps.length / totalOutboxSent) * 100 : 0;

  // ============ FOLLOW-UP COMPLETION ============
  const cancelledClosed = cancelledFollowUps.filter((r) => r.followupStatus === "closed").length;
  const rescheduleClosed = rescheduleFollowUps.filter((r) => r.followupStatus === "closed").length;
  const totalFollowups = cancelledFollowUps.length + rescheduleFollowUps.length;
  const followupCompletionRate = totalFollowups > 0 ? ((cancelledClosed + rescheduleClosed) / totalFollowups) * 100 : 0;

  // ============ FOLLOW-UP SPEED (median hours) ============
  const allClosedFollowups = [
    ...cancelledFollowUps.filter((r) => r.followupStatus === "closed"),
    ...rescheduleFollowUps.filter((r) => r.followupStatus === "closed"),
  ];

  let followupSpeedMedianHours = 0;
  if (allClosedFollowups.length > 0) {
    const timeDiffs = allClosedFollowups
      .map((r) => {
        try {
          const created = parseISO(r.createdAt);
          const updated = parseISO(r.updatedAt || r.createdAt);
          return (updated.getTime() - created.getTime()) / (1000 * 60 * 60); // in hours
        } catch {
          return 0;
        }
      })
      .filter((h) => h > 0)
      .sort((a, b) => a - b);

    if (timeDiffs.length > 0) {
      const mid = Math.floor(timeDiffs.length / 2);
      followupSpeedMedianHours =
        timeDiffs.length % 2 === 0 ? (timeDiffs[mid - 1] + timeDiffs[mid]) / 2 : timeDiffs[mid];
    }
  }

  // ============ RECOVERY RATE ============
  const cancelledWithRebook = cancelledFollowUps.filter((r) => r.followupStatus === "booked").length;
  const recoveryRate = cancelledFollowUps.length > 0 ? (cancelledWithRebook / cancelledFollowUps.length) * 100 : 0;

  // ============ OPEN FOLLOW-UPS BACKLOG ============
  const openCancelled = cancelledFollowUps.filter((r) => r.followupStatus === "open").length;
  const openReschedule = rescheduleFollowUps.filter((r) => r.followupStatus === "open").length;
  const openRecall = recallRows.filter(
    (r) => r.sendStatus && !["done", "not_needed", "recalled"].includes(r.sendStatus)
  ).length;
  const openFollowupsCount = openCancelled + openReschedule + openRecall;

  // Overdue (> 2 days old)
  const overdueThreshold = 2 * 24 * 60 * 60 * 1000; // 2 days
  const overdueFollowups = [...openCancelled, ...openReschedule].filter((r) => {
    try {
      const updated = parseISO(r.updatedAt || r.createdAt);
      return now.getTime() - updated.getTime() > overdueThreshold;
    } catch {
      return false;
    }
  });
  const overdueFollowupsCount = overdueFollowups.length;

  // ============ RECALL CONVERSION ============
  const recallSent = recallRows.filter((r) => r.sendStatus === "ready").length;
  const recallSuccessful = recallRows.filter((r) => r.sendStatus === "recalled").length;
  const recallConversionRate = recallSent > 0 ? (recallSuccessful / recallSent) * 100 : 0;

  // ============ NEEDS REVIEW RATE ============
  const totalOutbox = outboxRows.length;
  const needsReviewRate = totalOutbox > 0 ? (needsReviewCount / totalOutbox) * 100 : 0;

  // ============ CANCELLATION TREND (MoM) ============
  const cancelledCurrentMonth = cancelledFollowUps.filter((r) =>
    isDateInRange(r.createdAt, currentMonthStart, currentMonthEnd)
  ).length;
  const cancelledPreviousMonth = cancelledFollowUps.filter((r) =>
    isDateInRange(r.createdAt, previousMonthStart, previousMonthEnd)
  ).length;
  const cancellationTrendMoM =
    cancelledPreviousMonth > 0 ? (((cancelledCurrentMonth - cancelledPreviousMonth) / cancelledPreviousMonth) * 100) : 0;

  // ============ TIME-SLOT LEAKAGE ============
  const timeSlotMap = new Map<
    number,
    { confirmed: number; cancelled: number; noResponse: number }
  >();

  // Initialize all hours
  for (let h = 0; h < 24; h++) {
    timeSlotMap.set(h, { confirmed: 0, cancelled: 0, noResponse: 0 });
  }

  // Count confirmations by hour
  confirmRows.forEach((r) => {
    const hour = getHourFromISO(r.startIso || r.start);
    if (hour !== null && hour >= 0 && hour < 24) {
      const data = timeSlotMap.get(hour)!;
      data.confirmed++;
    }
  });

  // Count cancellations by hour
  cancelledFollowUps.forEach((r) => {
    const hour = getHourFromISO(r.startIso);
    if (hour !== null && hour >= 0 && hour < 24) {
      const data = timeSlotMap.get(hour)!;
      data.cancelled++;
    }
  });

  // Estimate no-response (sent but not responded)
  outboxRows
    .filter((r) => r.sendStatus === "sent")
    .forEach((r) => {
      const appointmentId = r.appointmentId;
      const isConfirmed = confirmRows.some((c) => c.appointmentId === appointmentId);
      const isCancelled = cancelledFollowUps.some((c) => c.appointmentId === appointmentId);
      const isRescheduled = rescheduleFollowUps.some((c) => c.appointmentId === appointmentId);

      if (!isConfirmed && !isCancelled && !isRescheduled) {
        const hour = getHourFromISO(r.startIso);
        if (hour !== null && hour >= 0 && hour < 24) {
          const data = timeSlotMap.get(hour)!;
          data.noResponse++;
        }
      }
    });

  const timeSlotLeakage: TimeSlotLeakage[] = Array.from(timeSlotMap.entries())
    .map(([hour, data]) => {
      const total = data.confirmed + data.cancelled + data.noResponse;
      const leakageRate = total > 0 ? ((data.cancelled + data.noResponse) / total) * 100 : 0;
      return {
        hour,
        confirmed: data.confirmed,
        cancelled: data.cancelled,
        noResponse: data.noResponse,
        leakageRate,
      };
    })
    .sort((a, b) => a.hour - b.hour);

  // ============ DAY-OF-WEEK PATTERNS ============
  const dowMap = new Map<number, { confirmed: number; cancelled: number; total: number }>();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  for (let d = 0; d < 7; d++) {
    dowMap.set(d, { confirmed: 0, cancelled: 0, total: 0 });
  }

  confirmRows.forEach((r) => {
    const dow = getDayOfWeekFromISO(r.startIso || r.start);
    if (dow !== null && dow >= 0 && dow < 7) {
      const data = dowMap.get(dow)!;
      data.confirmed++;
      data.total++;
    }
  });

  cancelledFollowUps.forEach((r) => {
    const dow = getDayOfWeekFromISO(r.startIso);
    if (dow !== null && dow >= 0 && dow < 7) {
      const data = dowMap.get(dow)!;
      data.cancelled++;
      data.total++;
    }
  });

  const dayOfWeekPatterns: DayOfWeekPattern[] = Array.from(dowMap.entries())
    .map(([dayNum, data]) => ({
      dayName: dayNames[dayNum],
      dayNum,
      confirmationRate: data.total > 0 ? (data.confirmed / data.total) * 100 : 0,
      cancellationRate: data.total > 0 ? (data.cancelled / data.total) * 100 : 0,
      volume: data.total,
    }));

  // ============ CANCELLATION REASONS ============
  const reasonMap = new Map<string, number>();
  cancelledFollowUps.forEach((r) => {
    const reason = r.cancelReason || "No reason provided";
    reasonMap.set(reason, (reasonMap.get(reason) || 0) + 1);
  });

  const totalReasons = cancelledFollowUps.length;
  const cancellationReasons: ReasonFrequency[] = Array.from(reasonMap.entries())
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: totalReasons > 0 ? (count / totalReasons) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 reasons

  return {
    reminderCoverage48h: reminder48h,
    reminderCoverage24h: reminder24h,
    reminderCoverage2h: reminder2h,
    confirmationRate24h,
    noResponseRate24h,
    cancellationRate,
    rescheduleRate,
    followupCompletionRate,
    followupSpeedMedianHours,
    recoveryRate,
    openFollowupsCount,
    overdueFollowupsCount,
    recallConversionRate,
    needsReviewRate,
    cancellationRateTrendMoM,
    timeSlotLeakage,
    dayOfWeekPatterns,
    cancellationReasons,
  };
}
