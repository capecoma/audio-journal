import type { User as DBUser } from "@db/schema";

// Frontend-specific user type
export interface User extends Omit<DBUser, 'password'> {
  username: string;
  email: string;
  preferences: {
    aiJournalingEnabled: boolean;
  };
}

export type UserContextType = {
  user: User | null;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
};
