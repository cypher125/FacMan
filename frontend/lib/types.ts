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
  [metric_type: string]: number;
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
  name: string;
  status: string;
  total_posts: number;
  successful_posts: number;
  failed_posts: number;
  items?: BulkScheduleItem[];
  created_at: string;
  updated_at: string;
}

export interface BulkScheduleItem {
  id: number;
  page: number;
  page_name: string;
  post: number | null;
  content: string;
  post_type: "text" | "photo" | "video" | "link";
  media_url: string;
  link_url: string;
  scheduled_time: string;
  status: "pending" | "scheduled" | "published" | "failed";
  error_message: string;
  created_at: string;
}

export interface TeamMember {
  id: number;
  user: number;
  username: string;
  email: string;
  page: number;
  role: "admin" | "editor" | "analyst" | "viewer";
  invited_by: number | null;
  invited_by_username: string;
  created_at: string;
  updated_at: string;
}

export interface PageAnalytics {
  page_id: string;
  page_name: string;
  fan_count: number;
  total_posts: number;
  published: number;
  scheduled: number;
  failed: number;
  total_reactions: number;
  total_comments: number;
  total_shares: number;
  total_engagement: number;
}

export interface TopPost {
  id: number;
  page_id: string;
  page_name: string;
  content: string;
  post_type: string;
  facebook_post_id: string;
  published_at: string | null;
  engagement_metrics: Record<string, number>;
  total_engagement: number;
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

export interface APIKey {
  id: number;
  name: string;
  prefix: string;
  key?: string;
  scopes: string[];
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

export interface ApiError {
  detail?: string;
  [key: string]: unknown;
}
