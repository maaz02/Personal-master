export function WhatsAppDashboardPreview() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-6 rounded-[32px] bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 blur-2xl" />
      <div className="relative rounded-3xl border border-border/70 bg-card/70 p-5 shadow-[0_30px_80px_rgba(2,6,23,0.55)]">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          <span>Live preview</span>
          <span className="inline-flex items-center gap-2 text-[10px] font-semibold text-foreground/70">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Online
          </span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div
            className="relative overflow-hidden rounded-2xl border border-border/70 bg-[#0b141a] p-4"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxODAnIGhlaWdodD0nMTgwJyB2aWV3Qm94PScwIDAgMTgwIDE4MCc+CiAgPGcgc3Ryb2tlPSdyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpJyBzdHJva2Utd2lkdGg9JzEnIGZpbGw9J25vbmUnIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcgc3Ryb2tlLWxpbmVqb2luPSdyb3VuZCc+CiAgICA8cGF0aCBkPSdNMjAgMzBoMjBtLTEwLTEwdjIwJy8+CiAgICA8Y2lyY2xlIGN4PSc3MCcgY3k9JzQwJyByPSc2Jy8+CiAgICA8cGF0aCBkPSdNMTIwIDMwbDEwIDEwbC0xMCAxMGwtMTAtMTB6Jy8+CiAgICA8cGF0aCBkPSdNMzAgOTBoMjRtLTEyLTEydjI0Jy8+CiAgICA8Y2lyY2xlIGN4PSc5MCcgY3k9JzEwMCcgcj0nNScvPgogICAgPHBhdGggZD0nTTE0MCA5MGwxMiAxMmwtMTIgMTJsLTEyLTEyeicvPgogICAgPHBhdGggZD0nTTIwIDE0MGgxOG0tOS05djE4Jy8+CiAgICA8Y2lyY2xlIGN4PSc3MCcgY3k9JzE1MCcgcj0nNScvPgogICAgPHBhdGggZD0nTTEyMCAxNDBsMTAgMTBsLTEwIDEwbC0xMC0xMHonLz4KICA8L2c+Cjwvc3ZnPg==\")",
              backgroundSize: "180px 180px",
              backgroundRepeat: "repeat",
            }}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div>
                  <div className="text-sm font-semibold text-foreground">WhatsApp flow</div>
                  <div className="text-[11px] text-muted-foreground">Confirmations + reschedules</div>
                </div>
                <div className="rounded-full border border-border/70 bg-card/70 px-2 py-1 text-[10px] font-semibold text-foreground/80">
                  2 chats live
                </div>
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <div
                  className="max-w-[85%] rounded-2xl border border-border/60 bg-muted/40 px-3 py-2 text-foreground/80 animate-chat-bubble motion-reduce:animate-none"
                  style={{ animationDelay: "0ms" }}
                >
                  Hi Maaz, please confirm your appointment with Dr Ahmed at 2:00 PM tomorrow.
                  <div className="mt-1 text-[10px] text-muted-foreground">10:41 AM</div>
                </div>
                <div
                  className="ml-auto max-w-[85%] rounded-2xl bg-gradient-to-r from-primary to-secondary px-3 py-2 text-primary-foreground animate-chat-bubble motion-reduce:animate-none"
                  style={{ animationDelay: "200ms" }}
                >
                  Confirmed. See you then.
                  <div className="mt-1 text-[10px] text-primary-foreground/70">10:42 AM</div>
                </div>
                <div
                  className="max-w-[85%] rounded-2xl border border-border/60 bg-muted/40 px-3 py-2 text-foreground/80 animate-chat-bubble motion-reduce:animate-none"
                  style={{ animationDelay: "400ms" }}
                >
                  Sara asked to reschedule. Can we offer Thursday at 4:00 PM?
                  <div className="mt-1 text-[10px] text-muted-foreground">10:43 AM</div>
                </div>
                <div
                  className="ml-auto max-w-[85%] rounded-2xl bg-gradient-to-r from-primary to-secondary px-3 py-2 text-primary-foreground animate-chat-bubble motion-reduce:animate-none"
                  style={{ animationDelay: "600ms" }}
                >
                  Yes, Thursday 4:00 PM works.
                  <div className="mt-1 text-[10px] text-primary-foreground/70">10:44 AM</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-foreground">Front desk queue</div>
                <div className="text-[11px] text-muted-foreground">Ready to send now</div>
              </div>
              <div className="rounded-full border border-primary/40 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                <span className="inline-flex items-center gap-1 animate-ready-pulse motion-reduce:animate-none">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  2 ready
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="rounded-xl border border-border/60 bg-card/60 p-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-foreground">Maaz</div>
                  <div className="rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                    Confirm booking
                  </div>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">Dr Ahmed · Tue 2:00 PM</div>
                <button className="mt-3 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-primary to-secondary px-3 py-1 text-[11px] font-semibold text-primary-foreground shadow-[0_12px_30px_rgba(14,165,233,0.35)]">
                  Send WhatsApp
                </button>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/60 p-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-foreground">Sara</div>
                  <div className="rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                    Reschedule
                  </div>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">Awaiting new slot</div>
                <div className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold text-foreground/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                  Message ready
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
