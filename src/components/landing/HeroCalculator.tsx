import { useMemo, useState } from "react";

const RECOVERY_MIN_RATIO = 0.5;
const RECOVERY_MAX_RATIO = 0.8;

export function HeroCalculator() {
  const [appointmentsPerDay, setAppointmentsPerDay] = useState(25);
  const [workingDaysPerWeek, setWorkingDaysPerWeek] = useState(5);
  const [revenuePerAppointment, setRevenuePerAppointment] = useState(400);
  const [noShowRate, setNoShowRate] = useState(10);

  const results = useMemo(() => {
    const monthlyAppointments = appointmentsPerDay * workingDaysPerWeek * 4.33;
    const noShowAppointments = monthlyAppointments * (noShowRate / 100);
    const monthlyLoss = noShowAppointments * revenuePerAppointment;
    const yearlyLoss = monthlyLoss * 12;
    const recoveryMin = monthlyLoss * RECOVERY_MIN_RATIO;
    const recoveryMax = monthlyLoss * RECOVERY_MAX_RATIO;

    return {
      monthlyLoss: Math.round(monthlyLoss),
      yearlyLoss: Math.round(yearlyLoss),
      recoveryMin: Math.round(recoveryMin),
      recoveryMax: Math.round(recoveryMax),
    };
  }, [appointmentsPerDay, workingDaysPerWeek, revenuePerAppointment, noShowRate]);

  const resetDefaults = () => {
    setAppointmentsPerDay(25);
    setWorkingDaysPerWeek(5);
    setRevenuePerAppointment(400);
    setNoShowRate(10);
  };

  const copySummary = () => {
    const summary = `Chair-Time Recovery Calculator Summary\nChair-time loss/month: AED ${results.monthlyLoss.toLocaleString()}\nGuaranteed recovery/month (50%+): AED ${results.recoveryMin.toLocaleString()} - ${results.recoveryMax.toLocaleString()}`;
    navigator.clipboard.writeText(summary);
  };

  const inputClass =
    "w-full border border-border rounded-lg px-2.5 py-2 text-sm bg-muted/30 text-foreground focus:border-primary/55 focus:ring-2 focus:ring-primary/20 outline-none transition-all";

  return (
    <div className="w-full bg-card rounded-2xl shadow-[0_22px_60px_rgba(2,6,23,0.45)] overflow-hidden border border-border">
      <div className="px-4 md:px-5 pt-4 pb-2 border-b border-border">
        <h3 className="text-base font-extrabold tracking-tight text-foreground mb-1">
          Chair-Time Recovery Calculator
        </h3>
        <p className="text-xs text-muted-foreground leading-snug">
          Use this calculator to see how much you would recover with our system.
        </p>
      </div>

      <div className="p-4 md:p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-[11px] text-muted-foreground">
            <span>Appointments/day</span>
            <input
              type="number"
              value={appointmentsPerDay}
              onChange={(e) => setAppointmentsPerDay(Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className="space-y-1 text-[11px] text-muted-foreground">
            <span>Days/week</span>
            <input
              type="number"
              value={workingDaysPerWeek}
              onChange={(e) => setWorkingDaysPerWeek(Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className="space-y-1 text-[11px] text-muted-foreground">
            <span>Revenue/appt (AED)</span>
            <input
              type="number"
              value={revenuePerAppointment}
              onChange={(e) => setRevenuePerAppointment(Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className="space-y-1 text-[11px] text-muted-foreground">
            <span>No-show rate (%)</span>
            <input
              type="number"
              value={noShowRate}
              onChange={(e) => setNoShowRate(Number(e.target.value))}
              className={inputClass}
            />
          </label>
        </div>

        <div className="space-y-3">
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3">
            <p className="text-[11px] text-muted-foreground mb-0.5">
              Chair-time loss/month
            </p>
            <p className="text-xl font-black text-destructive">
              AED {results.monthlyLoss.toLocaleString()}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              AED {results.yearlyLoss.toLocaleString()}/year
            </p>
          </div>

          <div className="bg-success/10 border border-success/20 rounded-xl p-3">
            <p className="text-[11px] text-muted-foreground mb-0.5">
              Guaranteed recovery/month (50%+)
            </p>
            <p className="text-xl font-black text-success">
              AED {results.recoveryMin.toLocaleString()} - {results.recoveryMax.toLocaleString()}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Guaranteed minimum 50% recovery with our system.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={copySummary}
            className="flex-1 px-2.5 py-2 text-xs border border-border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-foreground"
          >
            Copy summary
          </button>
          <button
            onClick={resetDefaults}
            className="flex-1 px-2.5 py-2 text-xs border border-border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-foreground"
          >
            Reset
          </button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Guaranteed 50%+ recovery when our system is fully deployed.
        </p>
      </div>
    </div>
  );
}
