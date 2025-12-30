import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SkeletonAuth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");

  const handleContinue = () => {
    navigate("/app");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-6 py-20">
      <div className="mx-auto max-w-lg">
        <Card className="border-border/70 bg-card/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.45)]">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-sm text-muted-foreground">
              This is a placeholder login. You will go straight into the dashboard.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" placeholder="you@clinic.com" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" />
            </div>
            <Button className="btn-gradient w-full" onClick={handleContinue}>
              {mode === "login" ? "Log in" : "Sign up"}
            </Button>
          </div>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? "New clinic?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="font-semibold text-primary hover:underline"
            >
              {mode === "login" ? "Sign up" : "Log in"}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SkeletonAuth;
