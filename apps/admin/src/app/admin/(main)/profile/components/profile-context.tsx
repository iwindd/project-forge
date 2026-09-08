"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { Profile } from "@/servers/profile/types";

type ProfileContextValue = {
  profile: Profile;
  updateProfile: (profile: Profile) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({
  profile,
  children,
}: {
  profile: Profile;
  children: ReactNode;
}) {
  const [currentProfile, setCurrentProfile] = useState(profile);

  return (
    <ProfileContext.Provider
      value={{ profile: currentProfile, updateProfile: setCurrentProfile }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);

  if (!context) {
    throw new Error("useProfile ต้องถูกเรียกภายใน ProfileProvider");
  }

  return context;
}
