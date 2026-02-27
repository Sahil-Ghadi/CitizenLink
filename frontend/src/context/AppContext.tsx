import React, { createContext, useContext, useState, ReactNode } from "react";

type Role = "citizen" | "agent";

interface AppContextType {
  role: Role;
  setRole: (role: Role) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (v: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<Role>("citizen");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <AppContext.Provider value={{ role, setRole, isLoggedIn, setIsLoggedIn }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
};
