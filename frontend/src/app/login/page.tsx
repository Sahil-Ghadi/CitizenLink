"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Chrome, KeyRound, Lock } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInWithGoogle, getIdToken } from "@/lib/auth";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const AGENT_CODE = "AGT-4X92K";

const Login = () => {
  const { setRole } = useAppContext();
  const router = useRouter();
  const [mode, setMode] = useState<"citizen" | "agent">("citizen");
  const [agentCode, setAgentCode] = useState("");
  const [agentStep, setAgentStep] = useState<"code" | "google">("code");
  const [codeError, setCodeError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSignIn = async (role: "citizen" | "agent") => {
    setSigningIn(true);
    setError("");
    try {
      await signInWithGoogle();
      const idToken = await getIdToken();
      if (!idToken) throw new Error("Failed to get ID token");

      // Sync with backend Firestore
      let isNewUser = true;
      try {
        const res = await fetch(`${BACKEND_URL}/auth/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_token: idToken, role }),
        });
        if (res.ok) {
          const profile = await res.json();
          // If phone is already set, user has completed onboarding before
          isNewUser = !profile.phone;
        }
      } catch {
        console.warn("Backend unreachable, proceeding with Firebase auth only.");
      }

      setRole(role);
      if (isNewUser) {
        router.replace("/onboarding");
      } else {
        router.replace(role === "agent" ? "/agent" : "/dashboard");
      }
    } catch (err: any) {
      if (err?.code === "auth/popup-closed-by-user") {
        setError("Sign-in cancelled.");
      } else {
        setError("Sign-in failed. Please try again.");
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleAgentCode = () => {
    if (agentCode.toUpperCase() === AGENT_CODE) {
      setAgentStep("google");
      setCodeError("");
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 3) {
        setLocked(true);
      } else {
        setCodeError(`Invalid code. ${3 - newAttempts} attempts remaining.`);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="glass-card-elevated p-8">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary flex items-center justify-center"
            >
              <Shield className="w-10 h-10 text-primary-foreground" />
            </motion.div>
            <h1 className="text-2xl font-display font-bold text-foreground">CitizenPortal</h1>
            <p className="text-sm text-muted-foreground mt-1">Smart Government. Responsive Services.</p>
          </div>

          {/* Role tabs */}
          <div className="flex bg-secondary rounded-xl p-1 mb-6 gap-0.5">
            <button
              onClick={() => { setMode("citizen"); setAgentStep("code"); setCodeError(""); setLocked(false); setAttempts(0); setError(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${mode === "citizen" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              Citizen
            </button>
            <button
              onClick={() => { setMode("agent"); setError(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${mode === "agent" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              Agent Access
            </button>
          </div>

          {error && (
            <p className="text-xs text-destructive text-center mb-4">{error}</p>
          )}

          <AnimatePresence mode="wait">
            {mode === "citizen" ? (
              <motion.div key="citizen" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
                <Button
                  onClick={() => handleGoogleSignIn("citizen")}
                  disabled={signingIn}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-medium gap-2"
                >
                  <Chrome className="w-5 h-5" />
                  {signingIn ? "Signing in…" : "Continue with Google"}
                </Button>
                <p className="text-center text-xs text-muted-foreground mt-4">
                  By continuing, you agree to our Terms of Service
                </p>
              </motion.div>
            ) : (
              <motion.div key="agent" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                {locked ? (
                  <div className="text-center py-6">
                    <Lock className="w-12 h-12 mx-auto text-destructive mb-3" />
                    <h3 className="font-semibold text-foreground">Account Locked</h3>
                    <p className="text-sm text-muted-foreground mt-1">Too many failed attempts. Contact your supervisor.</p>
                  </div>
                ) : agentStep === "code" ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">Agent Access Code</label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          value={agentCode}
                          onChange={(e) => setAgentCode(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAgentCode()}
                          placeholder="AGT-XXXXX"
                          className="pl-10 h-12 rounded-xl font-mono tracking-widest text-center uppercase"
                          maxLength={9}
                        />
                      </div>
                      {codeError && <p className="text-xs text-destructive mt-1">{codeError}</p>}
                    </div>
                    <Button onClick={handleAgentCode} className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl">
                      Verify Code
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">Hint: AGT-4X92K</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center p-3 bg-status-resolved/10 rounded-xl border border-status-resolved/20">
                      <p className="text-sm font-medium text-foreground">✓ Code verified</p>
                    </div>
                    <Button
                      onClick={() => handleGoogleSignIn("agent")}
                      disabled={signingIn}
                      className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-2"
                    >
                      <Chrome className="w-5 h-5" />
                      {signingIn ? "Signing in…" : "Continue with Google"}
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
