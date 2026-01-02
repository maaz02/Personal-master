import jsPDF from "jspdf";
import { MetricsData } from "./metricsCalculator";

export async function generateWeeklyReport(metrics: MetricsData | null) {
  if (!metrics) {
    console.error("No metrics available for report generation");
    return;
  }

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Helper function to add text with word wrapping
  const addWrappedText = (text: string, fontSize: number, isBold: boolean = false, maxWidth: number = contentWidth) => {
    pdf.setFontSize(fontSize);
    if (isBold) pdf.setFont(undefined, "bold");
    else pdf.setFont(undefined, "normal");

    const lines = pdf.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => {
      if (yPosition > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
      pdf.text(line, margin, yPosition);
      yPosition += fontSize * 0.5;
    });
    yPosition += 5;
  };

  // Helper to add a metric box
  const addMetricBox = (label: string, value: string, unit: string = "") => {
    if (yPosition > pageHeight - 30) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.setFillColor(240, 248, 255);
    pdf.rect(margin, yPosition, contentWidth, 20, "F");
    pdf.setFontSize(10);
    pdf.setFont(undefined, "bold");
    pdf.text(label, margin + 3, yPosition + 7);
    pdf.setFontSize(14);
    pdf.setFont(undefined, "bold");
    pdf.text(`${value}${unit ? " " + unit : ""}`, margin + contentWidth - 30, yPosition + 7);
    yPosition += 25;
  };

  // Title
  pdf.setFontSize(24);
  pdf.setFont(undefined, "bold");
  pdf.text("Weekly Report", margin, yPosition);
  yPosition += 15;

  const today = new Date();
  pdf.setFontSize(10);
  pdf.setFont(undefined, "normal");
  pdf.text(`Generated: ${today.toLocaleDateString()} ${today.toLocaleTimeString()}`, margin, yPosition);
  yPosition += 10;

  // Executive Summary
  addWrappedText("Executive Summary", 16, true);

  const summaryText = `This week's performance shows ${
    metrics.confirmationRate24h > 60
      ? "strong patient engagement with"
      : "moderate patient engagement with"
  } a confirmation rate of ${metrics.confirmationRate24h.toFixed(1)}%. The team processed ${metrics.reminderCoverage24h + metrics.reminderCoverage48h + metrics.reminderCoverage2h} reminders across all time windows. Follow-up management remains a priority with ${metrics.openFollowupsCount} open items.`;

  addWrappedText(summaryText, 11);

  // Key Metrics Section
  addWrappedText("Key Performance Indicators", 16, true);

  addMetricBox("Confirmation Rate (24h)", metrics.confirmationRate24h.toFixed(1), "%");
  addMetricBox("No Response Rate (24h)", metrics.noResponseRate24h.toFixed(1), "%");
  addMetricBox("Cancellation Rate", metrics.cancellationRate.toFixed(1), "%");
  addMetricBox("Recovery Rate", metrics.recoveryRate.toFixed(1), "%");
  addMetricBox("Follow-up Completion", metrics.followupCompletionRate.toFixed(1), "%");
  addMetricBox("Data Quality Score", (100 - metrics.needsReviewRate).toFixed(1), "%");

  // Reminder Coverage
  addWrappedText("Reminder Coverage", 16, true);
  addMetricBox("48-Hour Reminders", metrics.reminderCoverage48h.toString());
  addMetricBox("24-Hour Reminders", metrics.reminderCoverage24h.toString());
  addMetricBox("2-Hour Reminders", metrics.reminderCoverage2h.toString());

  // Follow-up Status
  addWrappedText("Follow-up Status", 16, true);
  addMetricBox("Open Follow-ups", metrics.openFollowupsCount.toString());
  addMetricBox("Overdue Follow-ups (>2 days)", metrics.overdueFollowupsCount.toString());
  addMetricBox("Median Response Time", metrics.followupSpeedMedianHours.toFixed(1), "hours");

  // Trends
  addWrappedText("Trends & Analysis", 16, true);

  const trendText = `Month-over-month cancellation rate ${
    metrics.cancellationRateTrendMoM > 0
      ? `increased by ${Math.abs(metrics.cancellationRateTrendMoM).toFixed(1)}%`
      : `decreased by ${Math.abs(metrics.cancellationRateTrendMoM).toFixed(1)}%`
  }. ${
    metrics.cancellationRateTrendMoM > 0
      ? "Investigate potential causes for the increase and monitor closely."
      : "Positive trend continues - maintain current strategies."
  }`;

  addWrappedText(trendText, 11);

  // Top Cancellation Reasons
  if (metrics.cancellationReasons.length > 0) {
    addWrappedText("Top Cancellation Reasons", 12, true);
    metrics.cancellationReasons.slice(0, 5).forEach((reason, index) => {
      const reasonText = `${index + 1}. ${reason.reason} (${reason.count} cancellations, ${reason.percentage.toFixed(1)}%)`;
      addWrappedText(reasonText, 10);
    });
  }

  // Best Performing Days
  if (metrics.dayOfWeekPatterns.length > 0) {
    const bestDay = metrics.dayOfWeekPatterns.reduce((best, current) =>
      current.confirmationRate > best.confirmationRate ? current : best
    );
    const worstDay = metrics.dayOfWeekPatterns.reduce((worst, current) =>
      current.cancellationRate > worst.cancellationRate ? current : worst
    );

    addWrappedText("Weekly Patterns", 12, true);
    addWrappedText(`Best Performing Day: ${bestDay.dayName} (${bestDay.confirmationRate.toFixed(1)}% confirmation rate)`, 11);
    addWrappedText(`Highest Cancellation: ${worstDay.dayName} (${worstDay.cancellationRate.toFixed(1)}% cancellation rate)`, 11);
  }

  // Recommendations
  addWrappedText("Recommendations", 16, true);

  const recommendations: string[] = [];

  if (metrics.confirmationRate24h < 60) {
    recommendations.push(
      "- Increase reminder frequency or adjust timing to improve confirmation rates"
    );
  }

  if (metrics.overdueFollowupsCount > 5) {
    recommendations.push("- Prioritize closing overdue follow-ups to avoid revenue leakage");
  }

  if (metrics.cancellationRateTrendMoM > 5) {
    recommendations.push("- Investigate recent increase in cancellations and address root causes");
  }

  if (metrics.needsReviewRate > 5) {
    recommendations.push(
      "- Improve data quality by ensuring complete patient information at booking"
    );
  }

  if (recommendations.length === 0) {
    recommendations.push("- Continue current strategies - metrics show positive performance");
    recommendations.push("- Monitor for any deviations from baseline performance");
  }

  recommendations.forEach((rec) => {
    addWrappedText(rec, 11);
  });

  // Footer
  pdf.setFontSize(8);
  pdf.setFont(undefined, "normal");
  const footerText = "This report was automatically generated. For questions, contact clinic management.";
  const footerX = (pageWidth - pdf.getTextWidth(footerText)) / 2;
  pdf.text(footerText, footerX, pageHeight - 10);

  // Save the PDF
  const fileName = `Weekly_Report_${today.toISOString().split("T")[0]}.pdf`;
  pdf.save(fileName);

  console.log(`Report generated: ${fileName}`);
}
