// strict types for DB and UI shapes
export type AccountStatus = 'ENABLED' | 'DISABLED';

export interface DbUser {
  id_user: number;
  name: string;
  email: string;
  phone_number?: string | null;
  account_status: AccountStatus;
  is_admin: boolean;
  created_at?: string;
  updated_at?: string;
}

/** UI-friendly */
export interface User {
  id: number;
  fullName: string;
  email: string;
  phone?: string | null;
  enabled: boolean;
  isAdmin: boolean;
  roles?: string[]; // optional: backend may provide roles later
}
