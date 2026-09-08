"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { UserDetail } from "@/servers/user/types";

type UserContextValue = {
  user: UserDetail;
  updateUser: (user: UserDetail) => void;
};

const UserContext = createContext<UserContextValue | null>(null);

type UserProviderProps = {
  user: UserDetail;
  children: ReactNode;
};

export function UserProvider({ user, children }: UserProviderProps) {
  const [currentUser, setCurrentUser] = useState(user);

  return (
    <UserContext.Provider
      value={{ user: currentUser, updateUser: setCurrentUser }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useUser ต้องถูกเรียกภายใน UserProvider");
  }

  return context;
}
