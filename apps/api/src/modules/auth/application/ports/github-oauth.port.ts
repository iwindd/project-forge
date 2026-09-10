export type GithubProfile = {
  id: number;
  login: string;
  name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
  emailVerified?: boolean;
};
