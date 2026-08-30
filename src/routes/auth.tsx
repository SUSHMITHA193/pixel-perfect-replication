import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type DbRole } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — MastiGuard" },
      {
        name: "description",
        content:
          "Sign in to MastiGuard with email or mobile OTP as a farmer, veterinarian, cooperative admin or animal health authority.",
      },
      { property: "og:title", content: "Sign in — MastiGuard" },
      { property: "og:description", content: "Role-based access for the MastiGuard mastitis platform." },
    ],
  }),
  component: AuthPage,
});

const ROLES: { id: DbRole; label: string }[] = [
  { id: "farmer", label: "Farmer" },
  { id: "veterinarian", label: "Veterinarian" },
  { id: "coop_admin", label: "Cooperative Admin" },
  { id: "authority", label: "Animal Health Authority" },
];

type Mode = "signin" | "signup" | "otp";

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading, signOut, role, profile } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dbRole, setDbRole] = useState<DbRole>("farmer");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (!loading && user && mode !== "otp") {
      // already signed in — nothing to do
    }
  }, [loading, user, mode]);

  const handleSignIn = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Signed in");
    void navigate({ to: "/" });
  };

  const handleSignUp = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName, phone, role: dbRole },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created — check your email if confirmation is required.");
    void navigate({ to: "/" });
  };

  const sendOtp = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { data: { full_name: fullName, role: dbRole } },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setOtpSent(true);
    toast.success("OTP sent to your mobile");
  };

  const verifyOtp = async () => {
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Signed in");
    void navigate({ to: "/" });
  };

  if (user) {
    return (
      <div className="mx-auto max-w-md space-y-5 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Signed in</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              {profile?.full_name || user.email || user.phone} · <span className="font-semibold">{role}</span>
            </p>
            <Button className="min-h-12 w-full" onClick={() => void navigate({ to: "/" })}>
              Go to dashboard
            </Button>
            <Button
              variant="outline"
              className="min-h-12 w-full"
              onClick={() => {
                void signOut();
                toast.success("Signed out");
              }}
            >
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-5 py-6">
      <div className="text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <ShieldCheck className="size-7" />
        </span>
        <h1 className="mt-3 text-2xl font-bold">Sign in to MastiGuard</h1>
        <p className="text-sm text-muted-foreground">Email or mobile OTP — field-friendly access.</p>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-xl border p-1">
        {(
          [
            ["signin", "Sign in"],
            ["signup", "Create account"],
            ["otp", "Mobile OTP"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`min-h-10 rounded-lg text-xs font-semibold transition-colors ${
              mode === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          {mode !== "otp" && (
            <>
              <div>
                <Label>Email</Label>
                <Input
                  className="h-12 text-base"
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  className="h-12 text-base"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </>
          )}

          {mode !== "signin" && (
            <>
              <div>
                <Label>Full name</Label>
                <Input className="h-12 text-base" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <Label>Mobile number</Label>
                <Input
                  className="h-12 text-base"
                  inputMode="tel"
                  placeholder="+9198xxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="grid gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setDbRole(r.id)}
                      className={`min-h-12 rounded-xl border px-4 text-left text-sm font-semibold transition-colors ${
                        dbRole === r.id ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {mode === "otp" && otpSent && (
            <div>
              <Label>6-digit code</Label>
              <Input
                className="h-12 text-base tracking-widest"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>
          )}

          <Button
            className="min-h-12 w-full text-base"
            disabled={busy}
            onClick={() => {
              if (mode === "signin") void handleSignIn();
              else if (mode === "signup") void handleSignUp();
              else if (!otpSent) void sendOtp();
              else void verifyOtp();
            }}
          >
            {mode === "signin"
              ? "Sign in"
              : mode === "signup"
                ? "Create account"
                : otpSent
                  ? "Verify code"
                  : "Send OTP"}
          </Button>

          {mode === "otp" && (
            <p className="text-xs text-muted-foreground">
              Mobile OTP requires an SMS provider to be configured for this project.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
