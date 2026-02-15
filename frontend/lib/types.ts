export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
  facebook_user_id: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface FacebookPage {
  id: number;
  page_id: string;
  name: string;
  category: string;
  is_active: boolean;
  fan_count: number;
  about: string;
  link: string;
  picture_url: string;
}

export interface Post {
  id: number;
  page: number;
  user: number;
  content: string;
  media_urls: string[];
  post_type: "text" | "photo" | "video" | "link";
  facebook_post_id: string | null;
  scheduled_time: string | null;
  status: "draft" | "scheduled" | "published" | "failed";
  engagement_metrics: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface ApiError {
  detail?: string;
  [key: string]: unknown;
}
