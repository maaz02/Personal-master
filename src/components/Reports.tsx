import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricsData } from "@/lib/metricsCalculator";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Download, FileText } from "lucide-react";

interface ReportsProps {
  metrics: MetricsData | null;
  onGenerateReport: () => void;
}

const COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899"];

export function Reports({ metrics, onGenerateReport }: ReportsProps) {
  if (!metrics) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
        <p>Loading metrics...</p>
      </div>
    );
  }

  const StatCard = ({
    label,
    value,
    unit,
    trend,
    color = "text-primary",
  }: {
    label: string;
    value: number | string;
    unit?: string;
    trend?: number;
    color?: string;
  }) => (
    <Card className="p-4">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {trend !== undefined && (
        <p className={`mt-1 text-xs ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
          {trend >= 0 ? "↑" : "↓"} {Math.abs(trend).toFixed(1)}% {trend >= 0 ? "increase" : "decrease"}
        </p>
      )}
    </Card>
  );

  return (
    <div className="h-full space-y-6 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Reports & KPIs</h2>
        <Button onClick={onGenerateReport} size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Generate Weekly Report
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="quality">Data Quality</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Confirmation Rate (24h)"
              value={metrics.confirmationRate24h.toFixed(1)}
              unit="%"
              color="text-green-600"
            />
            <StatCard
              label="No Response Rate (24h)"
              value={metrics.noResponseRate24h.toFixed(1)}
              unit="%"
              color="text-yellow-600"
            />
            <StatCard
              label="Cancellation Rate"
              value={metrics.cancellationRate.toFixed(1)}
              unit="%"
              color="text-red-600"
            />
            <StatCard
              label="Reschedule Rate"
              value={metrics.rescheduleRate.toFixed(1)}
              unit="%"
              color="text-orange-600"
            />
            <StatCard
              label="Recovery Rate"
              value={metrics.recoveryRate.toFixed(1)}
              unit="%"
              color="text-purple-600"
            />
            <StatCard
              label="Data Quality Score"
              value={(100 - metrics.needsReviewRate).toFixed(1)}
              unit="%"
              color="text-blue-600"
            />
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Message Response Distribution (24h)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Confirmed", value: metrics.confirmationRate24h },
                    { name: "No Response", value: metrics.noResponseRate24h },
                    { name: "Other", value: 100 - metrics.confirmationRate24h - metrics.noResponseRate24h },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${(value as number).toFixed(1)}%`} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Cancellation Trend (Month-over-Month)</h3>
            <p className="mb-4 text-2xl font-bold">
              {metrics.cancellationRateTrendMoM >= 0 ? "↑" : "↓"}{" "}
              <span className={metrics.cancellationRateTrendMoM >= 0 ? "text-red-600" : "text-green-600"}>
                {Math.abs(metrics.cancellationRateTrendMoM).toFixed(1)}%
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              {metrics.cancellationRateTrendMoM > 0
                ? "Cancellations increasing - investigate potential issues"
                : "Cancellations improving - positive trend"}
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard
              label="48-Hour Reminders Sent"
              value={metrics.reminderCoverage48h}
              color="text-blue-600"
            />
            <StatCard
              label="24-Hour Reminders Sent"
              value={metrics.reminderCoverage24h}
              color="text-indigo-600"
            />
            <StatCard
              label="2-Hour Reminders Sent"
              value={metrics.reminderCoverage2h}
              color="text-purple-600"
            />
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Reminder Coverage</h3>
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex justify-between">
                  <span className="text-sm font-medium">48-Hour Reminders</span>
                  <span className="text-sm text-muted-foreground">{metrics.reminderCoverage48h}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-blue-500"
                    style={{
                      width: `${Math.min(100, (metrics.reminderCoverage48h / Math.max(1, metrics.reminderCoverage48h)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between">
                  <span className="text-sm font-medium">24-Hour Reminders</span>
                  <span className="text-sm text-muted-foreground">{metrics.reminderCoverage24h}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-indigo-500"
                    style={{
                      width: `${Math.min(100, (metrics.reminderCoverage24h / Math.max(1, metrics.reminderCoverage24h)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between">
                  <span className="text-sm font-medium">2-Hour Reminders</span>
                  <span className="text-sm text-muted-foreground">{metrics.reminderCoverage2h}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-purple-500"
                    style={{
                      width: `${Math.min(100, (metrics.reminderCoverage2h / Math.max(1, metrics.reminderCoverage2h)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="followups" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Follow-up Completion Rate"
              value={metrics.followupCompletionRate.toFixed(1)}
              unit="%"
              color="text-green-600"
            />
            <StatCard
              label="Median Response Time"
              value={metrics.followupSpeedMedianHours.toFixed(1)}
              unit="hours"
              color="text-blue-600"
            />
            <StatCard
              label="Open Follow-ups"
              value={metrics.openFollowupsCount}
              color={metrics.openFollowupsCount > 5 ? "text-red-600" : "text-orange-600"}
            />
            <StatCard
              label="Overdue Follow-ups"
              value={metrics.overdueFollowupsCount}
              color={metrics.overdueFollowupsCount > 0 ? "text-red-600" : "text-green-600"}
            />
            <StatCard
              label="Recall Conversion Rate"
              value={metrics.recallConversionRate.toFixed(1)}
              unit="%"
              color="text-purple-600"
            />
            <StatCard
              label="Recovery Rate"
              value={metrics.recoveryRate.toFixed(1)}
              unit="%"
              color="text-indigo-600"
            />
          </div>

          {metrics.openFollowupsCount > 0 && (
            <Card className="border-orange-200 bg-orange-50 p-4">
              <div className="flex gap-3">
                <div className="text-2xl">⚠️</div>
                <div>
                  <p className="font-semibold text-orange-900">Active Follow-ups</p>
                  <p className="text-sm text-orange-700">
                    {metrics.openFollowupsCount} follow-ups pending action.
                    {metrics.overdueFollowupsCount > 0 && ` ${metrics.overdueFollowupsCount} are overdue (>2 days).`}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Time-Slot Leakage Analysis</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.timeSlotLeakage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" label={{ value: "Hour of Day", position: "insideBottomRight", offset: -5 }} />
                <YAxis label={{ value: "Count", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="confirmed" fill="#10b981" name="Confirmed" />
                <Bar dataKey="cancelled" fill="#ef4444" name="Cancelled" />
                <Bar dataKey="noResponse" fill="#f59e0b" name="No Response" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Day-of-Week Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.dayOfWeekPatterns}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dayName" />
                <YAxis label={{ value: "Rate (%)", angle: -90, position: "insideLeft" }} />
                <Tooltip formatter={(value) => `${(value as number).toFixed(1)}%`} />
                <Legend />
                <Line type="monotone" dataKey="confirmationRate" stroke="#10b981" name="Confirmation Rate" strokeWidth={2} />
                <Line type="monotone" dataKey="cancellationRate" stroke="#ef4444" name="Cancellation Rate" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {metrics.cancellationReasons.length > 0 && (
            <Card className="p-6">
              <h3 className="mb-4 text-lg font-semibold">Top Cancellation Reasons</h3>
              <div className="space-y-3">
                {metrics.cancellationReasons.map((reason, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{index + 1}.</span>
                      <span className="text-sm">{reason.reason}</span>
                    </div>
                    <Badge variant="secondary">
                      {reason.count} ({reason.percentage.toFixed(1)}%)
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="quality" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <StatCard
              label="Needs Review Rate"
              value={metrics.needsReviewRate.toFixed(1)}
              unit="%"
              color={metrics.needsReviewRate > 5 ? "text-red-600" : "text-yellow-600"}
            />
            <StatCard
              label="Data Quality Score"
              value={(100 - metrics.needsReviewRate).toFixed(1)}
              unit="%"
              color="text-green-600"
            />
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Data Quality Overview</h3>
            {metrics.needsReviewRate > 0 ? (
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium">Records Needing Review</p>
                  <div className="h-3 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-red-500"
                      style={{ width: `${Math.min(100, metrics.needsReviewRate)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {metrics.needsReviewRate.toFixed(1)}% of messages have data issues (missing fields, invalid phone, duplicates)
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 rounded-lg bg-green-50 p-4">
                <span className="text-2xl">✓</span>
                <div>
                  <p className="font-semibold text-green-900">Excellent Data Quality</p>
                  <p className="text-sm text-green-700">All messages have complete and valid data</p>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
