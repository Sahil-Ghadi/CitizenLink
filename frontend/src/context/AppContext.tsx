"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "firebase/auth";
import { onAuthStateChanged, auth, signOut as firebaseSignOut, getIdToken } from "@/lib/auth";

type Role = "citizen" | "agent";

interface AuthContextType {
  user: User | null;
  role: Role;
  setRole: (role: Role) => void;
  loading: boolean;
  isLoggedIn: boolean;
  needsOnboarding: boolean;
  setNeedsOnboarding: (v: boolean) => void;
  signOut: () => Promise<void>;
  // Legacy compat
  setIsLoggedIn: (v: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>("citizen");
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const res = await fetch(`${BACKEND_URL}/auth/me?uid=${firebaseUser.uid}`);
          if (res.ok) {
            const profile = await res.json();
            setRole(profile.role || "citizen");
            // If phone is missing, user hasn't completed onboarding
            setNeedsOnboarding(!profile.phone);
          }
        } catch {
          // Backend offline — assume onboarding not needed for returning users
        }
      } else {
        setNeedsOnboarding(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await firebaseSignOut();
    setUser(null);
    setRole("citizen");
    setNeedsOnboarding(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        setRole,
        loading,
        isLoggedIn: !!user,
        needsOnboarding,
        setNeedsOnboarding,
        signOut: handleSignOut,
        setIsLoggedIn: () => { },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAppContext must be used within AuthProvider");
  return ctx;
};

export const useAuth = useAppContext;
