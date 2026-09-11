export type Profile = {
  id: string;
  name: string;
  email: string | null;
  role: "ADMIN" | "EDITOR";
  createdAt: string;
  updatedAt: string;
  avatarUrl?: string | null;
  bio?: string | null;
  timezone?: string | null;
  connections: Array<{
    id: string;
    provider: string;
    username: string | null;
    email: string | null;
    connectedAt: string;
  }>;
};
