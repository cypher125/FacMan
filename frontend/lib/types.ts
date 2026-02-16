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

export interface PageInsight {
  id: number;
  page: number;
  metric_type: string;
  value: number;
  date: string;
  period: "day" | "week" | "days_28";
}

export interface InsightsSummary {
  total_page_views: number;
  total_page_impressions: number;
  total_post_engagements: number;
  total_new_fans: number;
  [key: string]: number;
}

export interface Comment {
  id: number;
  page: number;
  post: number;
  facebook_comment_id: string;
  message: string;
  from_name: string;
  from_id: string;
  like_count: number;
  is_reply: boolean;
  created_at: string;
}

export interface Conversation {
  id: number;
  page: number;
  participant_name: string;
  participant_id: string;
  facebook_conversation_id: string;
  updated_time: string;
  message_count: number;
}

export interface Message {
  id: number;
  conversation: number;
  message: string;
  from_name: string;
  from_id: string;
  created_time: string;
}

export interface Notification {
  id: number;
  user: number;
  page: number | null;
  notification_type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export interface BulkSchedule {
  id: number;
  user: number;
  name: string;
  created_at: string;
  items: BulkScheduleItem[];
}

export interface BulkScheduleItem {
  id: number;
  page: number;
  content: string;
  post_type: "text" | "photo" | "video" | "link";
  media_urls: string[];
  scheduled_time: string;
  status: "pending" | "scheduled" | "published" | "failed";
}

export interface TeamMember {
  id: number;
  user: number;
  user_email: string;
  user_username: string;
  page: number;
  role: "admin" | "editor" | "analyst" | "viewer";
  created_at: string;
}

export interface CalendarPost {
  id: number;
  page: number;
  page_name: string;
  content: string;
  post_type: string;
  scheduled_time: string;
  status: string;
}

export interface ApiError {
  detail?: string;
  [key: string]: unknown;
}
