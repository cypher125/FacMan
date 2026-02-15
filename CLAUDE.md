# FacMan - Facebook Page Management Platform

## What Is This Project?

FacMan is a web application for managing multiple Facebook Pages through a unified dashboard. It uses Facebook's OAuth 2.0 and Graph API (v18.0) to provide page management, content publishing, engagement monitoring, analytics, and messaging.

**Current status:** Backend API is largely built. All seven Django apps are implemented with models, views, serializers, and URLs. Authentication supports both standalone email/password and Facebook OAuth. No frontend code yet.

## Tech Stack

- **Backend:** Django 5.1.5 + Django REST Framework 3.15.0
- **Auth:** django-allauth 0.61.0, social-auth-app-django, PyJWT
- **Facebook:** facebook-sdk 3.1.0, requests-oauthlib
- **Database:** SQLite3 (dev), PostgreSQL (prod via psycopg2-binary)
- **Cache/Broker:** Redis 5.0.1 + django-redis
- **Task Queue:** Celery 5.3.4 + django-celery-beat
- **API Docs:** drf-yasg (Swagger/OpenAPI)
- **Frontend:** Not yet started (planned Next.js + TypeScript + Tailwind CSS at localhost:3000)
- **Code Quality:** black, flake8, isort, pytest + pytest-django

## Project Structure

```
FacMan/
├── CLAUDE.md                 # This file
├── README.md                 # Project documentation
├── .env.example              # Environment variable template (71 vars)
├── requirements.txt          # Python dependencies (46 packages)
├── backend/                  # Django project root
│   ├── manage.py
│   ├── backend/              # Django config package
│   │   ├── settings.py       # DRF, CORS, allauth, token auth configured
│   │   ├── urls.py           # Root URL config with Swagger docs
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── accounts/             # User auth (email/password) & profiles
│   ├── facebook_auth/        # Facebook OAuth integration
│   ├── pages/                # Facebook page management
│   ├── posts/                # Content creation & publishing
│   ├── analytics/            # Insights & analytics
│   ├── messaging/            # Comments, conversations, notifications
│   └── scheduler/            # Bulk scheduling, calendar, team
├── docs/
│   ├── PROJECT_PLAN.md       # Full project plan with 6 phases
│   └── FACEBOOK_API_REFERENCE.md  # Graph API endpoint reference
└── venv/                     # Python virtual environment
```

## App Architecture

Seven Django apps are implemented:

```
backend/
├── accounts/          # User authentication (email/password + profiles)
├── facebook_auth/     # Facebook OAuth integration
├── pages/             # Facebook page management
├── posts/             # Content creation & scheduling
├── analytics/         # Insights & analytics
├── messaging/         # Comments & messages
└── scheduler/         # Post scheduling with Celery
```

## Core Data Models

- **User (AbstractUser):** facebook_user_id, access_token (encrypted), token_expires_at, permissions (JSON), profile_picture_url
- **FacebookPage:** page_id, name, access_token, category, user (FK), is_active, fan_count, about, link, picture_url
- **Post:** page (FK), user (FK), content, media_urls (JSON), post_type (text/photo/video/link), facebook_post_id, scheduled_time, status (draft/scheduled/published/failed), engagement_metrics (JSON)
- **PageInsight:** page (FK), metric_type, value, date, period (day/week/days_28)
- **Comment:** page (FK), post (FK), facebook_comment_id, message, from_name, from_id, like_count, is_reply
- **Conversation/Message:** page (FK), participant info, message history
- **Notification:** user (FK), page (FK), notification_type, title, body, is_read
- **BulkSchedule/BulkScheduleItem:** bulk scheduling with per-item status tracking
- **TeamMember:** user (FK), page (FK), role (admin/editor/analyst/viewer)

## Key API Endpoints

- `/admin/` - Django admin
- `/docs/` - Swagger UI, `/docs/redoc/` - ReDoc, `/docs/json/` - OpenAPI JSON
- `/api/auth/register/` - Email/password registration (public)
- `/api/auth/login/` - Email/password login (public)
- `/api/auth/logout/` - Delete auth token
- `/api/auth/change-password/` - Change password
- `/api/auth/me/` - User profile (GET/PATCH)
- `/api/auth/facebook/login/` - Facebook OAuth URL
- `/api/auth/facebook/callback/` - Facebook OAuth callback
- `/api/pages/` - Page management (list, sync, detail, activate)
- `/api/posts/` - Content publishing & scheduling
- `/api/analytics/` - Insights data, summary, CSV export
- `/api/messages/` - Comments, conversations, notifications
- `/api/scheduler/` - Bulk scheduling, calendar, team, advanced analytics

## Facebook Integration Details

- **Graph API v18.0** base URL: `https://graph.facebook.com/v18.0/`
- **OAuth callback:** `http://localhost:8000/auth/facebook/callback`
- **9 required scopes:** pages_show_list, pages_read_engagement, pages_manage_posts, pages_manage_metadata, pages_manage_engagement, pages_messaging, pages_read_user_content, public_profile, email
- **Rate limits:** 200 calls/hour/user, max 50 batch requests
- **Token lifecycle:** User tokens ~60 days, page tokens extendable to never expire
- **Constraints:** Schedule posts 10min-30days ahead, max 300 unpublished, images max 10MB, videos max 10GB

## Environment Configuration

See `.env.example` for all required variables. Key groups:
- Django settings (SECRET_KEY, DEBUG, ALLOWED_HOSTS)
- Database (PostgreSQL connection)
- Facebook App (APP_ID, APP_SECRET, scopes)
- Redis (host, port, db)
- Celery (broker, result backend)
- CORS/CSRF origins
- Email (Gmail SMTP)
- Encryption key (for token storage)
- Webhook config
- ngrok (dev HTTPS tunneling)

## Implementation Phases

1. **Auth & Setup** - Django config, Facebook App, OAuth flow, user model, frontend scaffold
2. **Page Management** - List/connect pages, page switching, info display, permissions
3. **Content Publishing** - Post composer, text/image/video posts, scheduling
4. **Analytics** - Insights API, dashboard, visualization, export
5. **Engagement** - Comments, messages, notifications, real-time updates
6. **Advanced** - Bulk scheduling, content calendar, team collaboration, advanced analytics

## Development Notes

- `settings.py` is configured with DRF, CORS, allauth, token auth, and all custom apps
- `urls.py` routes all API endpoints plus Swagger/ReDoc docs
- All seven Django apps are created and have models, views, serializers, and URLs
- Authentication supports both email/password (standalone) and Facebook OAuth
- The virtual environment (`venv/`) exists but verify dependencies are installed
- Use `python-decouple` or `python-dotenv` for env var loading (both are in requirements)
- Development uses ngrok for HTTPS (required by Facebook OAuth in some flows)
- Frontend expected at localhost:3000, backend at localhost:8000

## Code Conventions

- **Formatter:** black
- **Linter:** flake8
- **Import sorter:** isort
- **Testing:** pytest with pytest-django and pytest-cov
- Follow standard Django patterns: models.py, views.py, serializers.py, urls.py per app
- Encrypted token storage in database
- REST API with JSON request/response
