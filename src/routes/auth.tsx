import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useStore, type Role } from "@/lib/app-store";
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
        content: "Role-based sign in for farmers, veterinarians, cooperative admins and animal health authorities.",
      },
      { property: "og:title", content: "Sign in — MastiGuard" },
      { property: "og:description", content: "Role-based access for the MastiGuard mastitis platform." },
    ],
  }),
  component: AuthPage,
});

const ROLES: Role[] = ["Farmer", "Veterinarian", "Cooperative Admin", "Animal Health Authority"];

function AuthPage() {
  const { role, setRole, setSignedIn, signedIn } = useStore();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");

  return (
    <div className="mx-auto max-w-md space-y-5 py-6">
      <div className="text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <ShieldCheck className="size-7" />
        </span>
        <h1 className="mt-3 text-2xl font-bold">Sign in to MastiGuard</h1>
        <p className="text-sm text-muted-foreground">Demo sign-in — pick the role you want to explore.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Mobile number</Label>
            <Input
              className="h-12 text-base"
              inputMode="tel"
              placeholder="+91 98xxx xxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <div className="grid gap-2">
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`min-h-12 rounded-xl border px-4 text-left text-sm font-semibold transition-colors ${
                    role === r ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <Button
            className="min-h-12 w-full text-base"
            onClick={() => {
              setSignedIn(true);
              toast.success(`Signed in as ${role}`);
              void navigate({ to: "/" });
            }}
          >
            {signedIn ? "Continue" : "Sign in"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
