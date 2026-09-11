"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { Profile } from "@/servers/profile/types";
import { useGetProfileQuery } from "@/lib/features/profile/profile-api";

type ProfileContextValue = {
  profile: Profile;
  updateProfile: (profile: Profile) => void;
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({
  profile: initialProfile,
  children,
}: {
  profile: Profile;
  children: ReactNode;
}) {
  const [currentProfile, setCurrentProfile] = useState(initialProfile);
  const query = useGetProfileQuery();
  const profile = query.data ?? currentProfile;

  return (
    <ProfileContext.Provider
      value={{
        profile,
        updateProfile: setCurrentProfile,
        isLoading: query.isLoading,
        isError: query.isError,
        retry: () => void query.refetch(),
      }}
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
