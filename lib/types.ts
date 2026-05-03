export type Plan = 'free' | 'pro' | 'premium' | 'premium_plus';

export type VaultFile = {
  id: string;
  user_id: string;
  folder_id: string | null;
  name: string;
  type: string;
  size: number;
  storage_path: string;
  public_url: string | null;
  is_trashed: boolean;
  created_at: string;
  updated_at: string;
};

export type Folder = {
  id: string;
  user_id: string;
  name: string;
  parent_folder_id: string | null;
  created_at: string;
};

export type ActivityLog = {
  id: string;
  user_id: string;
  action: string;
  metadata: Record<string, string>;
  created_at: string;
};
