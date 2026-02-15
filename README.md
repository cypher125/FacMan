# FacMan - Facebook Page Management Platform

A web application for managing multiple Facebook Pages through a unified dashboard. Built with Django REST Framework and integrated with Facebook's Graph API v18.0.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [What's Been Built](#whats-been-built)
  - [Authentication](#authentication)
  - [Page Management](#page-management)
  - [Content Publishing](#content-publishing)
  - [Analytics](#analytics)
  - [Messaging & Comments](#messaging--comments)
  - [Scheduler & Team](#scheduler--team)
  - [API Documentation](#api-documentation)
- [Data Models](#data-models)
- [API Endpoints](#api-endpoints)
- [What's Planned](#whats-planned)
  - [Standalone Authentication](#1-standalone-authentication)
  - [Multi-Account Facebook Connections](#2-multi-account-facebook-connections)
  - [Frontend Application](#3-frontend-application)
  - [Celery Task Queue](#4-celery-task-queue)
  - [Webhook Support](#5-webhook-support)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)

---

## Overview

FacMan allows users to:

- Connect and manage multiple Facebook Pages from one dashboard
- Create, schedule, and publish posts (text, photo, video, link)
- Monitor engagement metrics and page analytics
- Manage comments and conversations
- Bulk schedule posts across multiple pages
- Collaborate with team members on page management
- Export analytics data as CSV

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Django 5.1.5, Django REST Framework 3.15.0 |
| Auth | django-allauth, Token Authentication |
| Facebook | facebook-sdk 3.1.0, Graph API v18.0 |
| Database | SQLite3 (dev), PostgreSQL (prod) |
| Cache/Broker | Redis 5.0.1, django-redis |
| Task Queue | Celery 5.3.4, django-celery-beat |
| API Docs | drf-yasg (Swagger/OpenAPI) |
| Security | cryptography (encrypted token storage) |
| Frontend | Planned (Next.js, TypeScript, Tailwind CSS) |

---

## Project Structure

```
FacMan/
├── README.md                    # This file
├── CLAUDE.md                    # AI assistant project context
├── InstallationGuide.md         # VPS deployment guide
├── .env.example                 # Environment variable template
├── requirements.txt             # Python dependencies
├── backend/                     # Django project root
│   ├── manage.py
│   ├── backend/                 # Django config
│   │   ├── settings.py
│   │   ├── urls.py              # Root URL config with Swagger docs
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── accounts/                # User accounts & profiles
│   │   ├── models.py            # Custom User model
│   │   ├── views.py             # Profile CRUD
│   │   ├── serializers.py
│   │   └── urls.py
│   ├── facebook_auth/           # Facebook OAuth integration
│   │   ├── views.py             # Login, callback, logout
│   │   ├── services.py          # OAuth token exchange, Graph API calls
│   │   ├── utils.py             # Token encryption/decryption
│   │   └── urls.py
│   ├── pages/                   # Facebook page management
│   │   ├── models.py            # FacebookPage model
│   │   ├── views.py             # List, sync, detail, activate
│   │   ├── serializers.py
│   │   ├── services.py          # Graph API page fetching
│   │   └── urls.py
│   ├── posts/                   # Content creation & publishing
│   │   ├── models.py            # Post model with status tracking
│   │   ├── views.py             # CRUD, publish, schedule, sync
│   │   ├── serializers.py
│   │   ├── services.py          # Graph API post operations
│   │   └── urls.py
│   ├── analytics/               # Insights & analytics
│   │   ├── models.py            # PageInsight model
│   │   ├── views.py             # Sync, list, summary, CSV export
│   │   ├── serializers.py
│   │   ├── services.py          # Graph API insights fetching
│   │   └── urls.py
│   ├── messaging/               # Comments, messages & notifications
│   │   ├── models.py            # Comment, Conversation, Message, Notification
│   │   ├── views.py             # Sync, list, reply, like, send
│   │   ├── serializers.py
│   │   ├── services.py          # Graph API messaging operations
│   │   └── urls.py
│   └── scheduler/               # Bulk scheduling & team collaboration
│       ├── models.py            # BulkSchedule, BulkScheduleItem, TeamMember
│       ├── views.py             # Bulk ops, calendar, team, advanced analytics
│       ├── serializers.py
│       └── urls.py
├── docs/
│   ├── PROJECT_PLAN.md          # Original 6-phase project plan
│   └── FACEBOOK_API_REFERENCE.md # Graph API endpoint reference
└── venv/                        # Python virtual environment
```

---

## What's Been Built

### Authentication

Facebook OAuth 2.0 login flow with token-based API authentication.

- **OAuth Login** - Generates Facebook authorization URL with required scopes
- **OAuth Callback** - Exchanges authorization code for access tokens, creates user accounts automatically
- **Logout** - Deletes API authentication token
- **User Profile** - Get and update the authenticated user's profile

9 Facebook permission scopes are requested: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `pages_manage_metadata`, `pages_manage_engagement`, `pages_messaging`, `pages_read_user_content`, `public_profile`, `email`

### Page Management

Connect, sync, and switch between Facebook Pages.

- **Sync Pages** - Fetches all pages the user manages from Facebook Graph API
- **List Pages** - Shows all connected pages with metadata (name, category, fan count, picture)
- **Page Detail** - View detailed information for a specific page
- **Activate Page** - Set one page as the active working page (only one at a time)

### Content Publishing

Create, manage, and schedule posts across connected pages.

- **Create Posts** - Publish text, photo, video, or link posts to Facebook
- **Schedule Posts** - Schedule posts for future publication (10 min to 30 days ahead)
- **Update Posts** - Edit content of published posts on Facebook
- **Delete Posts** - Remove posts from Facebook and local database
- **Sync Posts** - Fetch existing published posts from Facebook with engagement metrics
- **Filter Posts** - List posts filtered by page and/or status (draft, scheduled, published, failed)

Post types supported:
| Type | Fields |
|---|---|
| `text` | content |
| `link` | content, link_url |
| `photo` | content, media_url |
| `video` | content, media_url, video_title |

### Analytics

Fetch, store, query, and export Facebook Page insights.

- **Sync Insights** - Pull page-level metrics from Facebook (impressions, engagement, fan counts)
- **List Insights** - Query stored insights with filters (metric type, period, date range)
- **Insights Summary** - Aggregated statistics (sum, average, min, max) grouped by metric type
- **Export CSV** - Download insights data as a CSV file

Supported periods: `day`, `week`, `days_28`

### Messaging & Comments

Manage comments, conversations, and notifications.

**Comments:**
- Sync comments from Facebook for any post
- List comments per post
- Reply to comments as the page
- Like/unlike comments

**Conversations:**
- Sync Messenger conversations from Facebook
- List conversations with participant info and last message preview
- View full conversation with message history
- Send messages to users via the page

**Notifications:**
- List notifications with optional filters (unread only, by page)
- Mark individual notifications as read
- Mark all notifications as read

Notification types: `new_comment`, `comment_reply`, `new_message`, `new_like`, `page_mention`

### Scheduler & Team

Bulk operations, content calendar, team collaboration, and advanced analytics.

**Bulk Scheduling:**
- Create multiple scheduled posts in a single request
- Track overall and per-item status (pending, scheduled, published, failed)
- View bulk schedule details with all items

**Content Calendar:**
- Get posts organized by date for calendar display
- Filter by date range and page
- Defaults to current month if no range specified

**Team Collaboration:**
- Add team members to pages with roles (admin, editor, analyst, viewer)
- Update team member roles
- Remove team members

**Advanced Analytics:**
- Cross-page analytics comparison (post counts, engagement totals per page)
- Top performing posts ranked by total engagement (reactions + comments + shares)
- Date range filtering

### API Documentation

Interactive API documentation powered by Swagger/OpenAPI.

- **Swagger UI** at `/docs/` - Interactive API explorer with "Try it out" functionality
- **ReDoc** at `/docs/redoc/` - Alternative documentation view
- **JSON Schema** at `/docs/json/` - Raw OpenAPI specification

All 39+ endpoints are fully documented with:
- Operation summaries and descriptions
- Request body schemas with field descriptions
- Query parameter and path parameter documentation
- Response schemas for all status codes
- Example responses

---

## Data Models

### User (extends AbstractUser)
| Field | Type | Description |
|---|---|---|
| facebook_user_id | CharField | Facebook user ID (unique) |
| facebook_access_token | TextField | Encrypted Facebook access token |
| token_expires_at | DateTimeField | Token expiration timestamp |
| facebook_permissions | JSONField | Granted Facebook permissions |
| profile_picture_url | URLField | Facebook profile picture URL |

### FacebookPage
| Field | Type | Description |
|---|---|---|
| user | FK → User | Page owner |
| page_id | CharField | Facebook page ID (unique) |
| name | CharField | Page name |
| access_token | TextField | Encrypted page access token |
| category | CharField | Page category |
| about | TextField | Page description |
| fan_count | IntegerField | Number of fans/followers |
| link | URLField | Page URL |
| picture_url | URLField | Page profile picture |
| tasks | JSONField | Facebook page tasks |
| is_active | BooleanField | Whether this is the active page |

### Post
| Field | Type | Description |
|---|---|---|
| user | FK → User | Post creator |
| page | FK → FacebookPage | Target page |
| content | TextField | Post text content |
| media_urls | JSONField | Attached media URLs |
| post_type | CharField | text, photo, video, link |
| facebook_post_id | CharField | Facebook post ID |
| link_url | URLField | Link URL (for link posts) |
| scheduled_time | DateTimeField | Scheduled publish time |
| published_at | DateTimeField | Actual publish time |
| status | CharField | draft, scheduled, published, failed |
| engagement_metrics | JSONField | Reactions, comments, shares |
| error_message | TextField | Error details if failed |

### PageInsight
| Field | Type | Description |
|---|---|---|
| page | FK → FacebookPage | Source page |
| metric_type | CharField | Metric name (e.g., page_impressions) |
| value | IntegerField | Metric value |
| date | DateField | Data point date |
| period | CharField | day, week, month |
| title | CharField | Human-readable metric title |
| description | TextField | Metric description |

### Comment
| Field | Type | Description |
|---|---|---|
| page | FK → FacebookPage | Source page |
| post | FK → Post | Parent post (nullable) |
| facebook_comment_id | CharField | Facebook comment ID (unique) |
| facebook_post_id | CharField | Facebook post ID |
| parent_comment_id | CharField | Parent comment (for replies) |
| message | TextField | Comment text |
| from_name | CharField | Author name |
| from_id | CharField | Author Facebook ID |
| like_count | IntegerField | Number of likes |
| is_reply | BooleanField | Whether this is a reply |
| comment_time | DateTimeField | When the comment was posted |

### Conversation
| Field | Type | Description |
|---|---|---|
| page | FK → FacebookPage | Source page |
| facebook_conversation_id | CharField | Facebook conversation ID (unique) |
| participant_name | CharField | Other participant's name |
| participant_id | CharField | Other participant's Facebook ID |
| updated_time | DateTimeField | Last activity time |

### Message
| Field | Type | Description |
|---|---|---|
| conversation | FK → Conversation | Parent conversation |
| facebook_message_id | CharField | Facebook message ID (unique) |
| message | TextField | Message text |
| from_name | CharField | Sender name |
| from_id | CharField | Sender Facebook ID |
| message_time | DateTimeField | When the message was sent |

### Notification
| Field | Type | Description |
|---|---|---|
| user | FK → User | Recipient user |
| page | FK → FacebookPage | Related page |
| notification_type | CharField | new_comment, comment_reply, new_message, new_like, page_mention |
| title | CharField | Notification title |
| body | TextField | Notification body |
| reference_id | CharField | Related object ID |
| is_read | BooleanField | Read status |

### BulkSchedule
| Field | Type | Description |
|---|---|---|
| user | FK → User | Schedule creator |
| name | CharField | Schedule name |
| status | CharField | pending, processing, completed, partial, failed |
| total_posts | IntegerField | Total items in schedule |
| successful_posts | IntegerField | Successfully scheduled items |
| failed_posts | IntegerField | Failed items |

### BulkScheduleItem
| Field | Type | Description |
|---|---|---|
| bulk_schedule | FK → BulkSchedule | Parent schedule |
| page | FK → FacebookPage | Target page |
| post | FK → Post | Created post (nullable) |
| content | TextField | Post content |
| post_type | CharField | text, photo, video, link |
| media_url | URLField | Media URL |
| link_url | URLField | Link URL |
| scheduled_time | DateTimeField | Scheduled publish time |
| status | CharField | pending, published, scheduled, failed |
| error_message | TextField | Error details if failed |

### TeamMember
| Field | Type | Description |
|---|---|---|
| user | FK → User | Team member |
| page | FK → FacebookPage | Page they have access to |
| role | CharField | admin, editor, analyst, viewer |
| invited_by | FK → User | Who added them |

---

## API Endpoints

All endpoints require `Authorization: Token <your-token>` unless marked as public.

### Authentication
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/auth/facebook/login/` | Get Facebook OAuth URL | Public |
| GET | `/api/auth/facebook/callback/` | OAuth callback handler | Public |
| POST | `/api/auth/facebook/logout/` | Delete auth token | Required |
| GET | `/api/auth/me/` | Get user profile | Required |
| PATCH | `/api/auth/me/` | Update user profile | Required |

### Pages
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/pages/` | List connected pages |
| POST | `/api/pages/sync/` | Sync pages from Facebook |
| GET | `/api/pages/{page_id}/` | Get page details |
| POST | `/api/pages/{page_id}/activate/` | Set page as active |

### Posts
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/posts/?page_id=&status=` | List posts (filterable) |
| POST | `/api/posts/create/` | Create and publish a post |
| GET | `/api/posts/{id}/` | Get post details |
| PATCH | `/api/posts/{id}/update/` | Update post content |
| DELETE | `/api/posts/{id}/delete/` | Delete a post |
| POST | `/api/posts/sync/{page_id}/` | Sync posts from Facebook |

### Analytics
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/analytics/{page_id}/sync/` | Sync insights from Facebook |
| GET | `/api/analytics/{page_id}/?metric=&period=&since=&until=` | List insights |
| GET | `/api/analytics/{page_id}/summary/` | Aggregated insights summary |
| GET | `/api/analytics/{page_id}/export/` | Export insights as CSV |

### Comments
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/messages/comments/{page_id}/{post_fb_id}/sync/` | Sync comments |
| GET | `/api/messages/comments/{page_id}/{post_fb_id}/` | List comments |
| POST | `/api/messages/comments/{page_id}/{comment_fb_id}/reply/` | Reply to comment |
| POST | `/api/messages/comments/{page_id}/{comment_fb_id}/like/` | Like a comment |
| DELETE | `/api/messages/comments/{page_id}/{comment_fb_id}/like/` | Unlike a comment |

### Messaging
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/messages/conversations/{page_id}/sync/` | Sync conversations |
| GET | `/api/messages/conversations/{page_id}/` | List conversations |
| GET | `/api/messages/conversations/{page_id}/{id}/` | Get conversation with messages |
| POST | `/api/messages/conversations/{page_id}/send/` | Send a message |

### Notifications
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/messages/notifications/?unread=&page_id=` | List notifications |
| POST | `/api/messages/notifications/{id}/read/` | Mark as read |
| POST | `/api/messages/notifications/read-all/` | Mark all as read |

### Scheduler
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/scheduler/bulk/` | List bulk schedules |
| POST | `/api/scheduler/bulk/create/` | Create bulk schedule |
| GET | `/api/scheduler/bulk/{id}/` | Get bulk schedule details |
| GET | `/api/scheduler/calendar/?start=&end=&page_id=` | Content calendar |

### Team
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/scheduler/team/{page_id}/` | List team members |
| POST | `/api/scheduler/team/{page_id}/add/` | Add team member |
| PATCH | `/api/scheduler/team/{page_id}/{id}/update/` | Update member role |
| DELETE | `/api/scheduler/team/{page_id}/{id}/remove/` | Remove team member |

### Advanced Analytics
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/scheduler/advanced-analytics/?since=&until=` | Cross-page analytics |
| GET | `/api/scheduler/top-posts/?page_id=&limit=` | Top posts by engagement |

---

## What's Planned

### 1. Standalone Authentication

**Current state:** Users can only log in via Facebook OAuth. No FacMan account exists without Facebook.

**Planned changes:**
- Email + password registration and login
- Separate FacMan user accounts from Facebook connections
- New endpoints:

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register/` | Register with email, username, password |
| POST | `/api/auth/login/` | Login with credentials, returns token |
| POST | `/api/auth/change-password/` | Change password |

### 2. Multi-Account Facebook Connections

**Current state:** One user = one Facebook account. Facebook fields live on the User model.

**Planned changes:**
- New `FacebookAccount` model separate from `User`
- One FacMan user can connect multiple Facebook accounts
- Each Facebook account has its own access token and pages
- Connect/disconnect flow while already logged in

New model:
```
FacebookAccount:
  - user (FK → User)
  - facebook_user_id (unique)
  - facebook_access_token (encrypted)
  - token_expires_at
  - profile_name
  - profile_picture_url
  - is_active
```

New endpoints:

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/auth/facebook/connect/` | Get OAuth URL (must be logged in) |
| GET | `/api/auth/facebook/callback/` | Links Facebook account to FacMan user |
| POST | `/api/auth/facebook/disconnect/` | Unlink a Facebook account |
| GET | `/api/auth/facebook/accounts/` | List connected Facebook accounts |

Updated flow:
```
Register/Login to FacMan
  → Connect Facebook Account A → Pages from Account A
  → Connect Facebook Account B → Pages from Account B
  → Manage all pages from one dashboard
```

### 3. Frontend Application

**Current state:** Backend API only. No frontend exists.

**Tech:** Next.js, TypeScript, Tailwind CSS

**Planned:**
- Next.js app at `localhost:3000`
- Dashboard with page overview and quick stats
- Post composer with media upload and scheduling
- Content calendar with drag-and-drop
- Analytics charts and visualizations
- Conversation inbox for messages
- Team management panel

### 4. Celery Task Queue

**Current state:** Celery and django-celery-beat are in dependencies but not configured.

**Planned:**
- Background processing for Facebook API sync operations
- Automatic post publishing at scheduled times
- Periodic insight data refreshing
- Rate limit management (200 calls/hour/user)
- Retry logic for failed Facebook API calls

### 5. Webhook Support

**Current state:** Webhook config variables exist in `.env.example` but no webhook handler is implemented.

**Planned:**
- Facebook webhook endpoint for real-time updates
- Instant notification on new comments and messages
- Post engagement updates in real-time
- Page activity monitoring

---

## Setup & Installation

### Prerequisites

- Python 3.10+
- PostgreSQL (production) or SQLite (development)
- Redis (for Celery)

### Local Development

```bash
# Clone the repository
git clone <repo-url>
cd FacMan

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Run migrations
cd backend
python manage.py migrate
python manage.py createsuperuser

# Start the server
python manage.py runserver
```

Visit:
- API: `http://localhost:8000/api/`
- Swagger Docs: `http://localhost:8000/docs/`
- Admin: `http://localhost:8000/admin/`

---

## Environment Variables

Key variables in `.env`:

```bash
# Django
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (SQLite for dev, PostgreSQL for prod)
DB_ENGINE=django.db.backends.sqlite3
DB_NAME=db.sqlite3

# Facebook App (required for OAuth)
FACEBOOK_APP_ID=your-app-id
FACEBOOK_APP_SECRET=your-app-secret
FACEBOOK_REDIRECT_URI=http://localhost:8000/api/auth/facebook/callback/

# Redis & Celery
REDIS_HOST=localhost
REDIS_PORT=6379
CELERY_BROKER_URL=redis://localhost:6379/0

# Security
ENCRYPTION_KEY=your-encryption-key
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

See `.env.example` for the full list of 71 variables.

---

## Deployment

See [InstallationGuide.md](InstallationGuide.md) for a complete guide covering:

- Ubuntu VPS initial setup and security hardening
- Dedicated user creation
- PostgreSQL, Redis, Nginx installation
- Gunicorn systemd service configuration
- Celery worker and beat services
- Nginx reverse proxy setup
- SSL certificate with Let's Encrypt
- Domain configuration

---

## Facebook API Constraints

- **Rate limits:** 200 calls/hour/user
- **Scheduling window:** 10 minutes to 30 days ahead
- **Max unpublished posts:** 300 per page
- **Max batch requests:** 50 per API call
- **Image size limit:** 10 MB
- **Video size limit:** 10 GB
- **User tokens:** Expire after ~60 days
- **Page tokens:** Can be extended to never expire
- **App Review:** Required for production page management permissions

---

## License

Proprietary
