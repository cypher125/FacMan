# FacMan - Facebook Page Management Tool

## Project Overview

FacMan is a web application that enables users to manage multiple Facebook Pages through a unified dashboard. It leverages Facebook's OAuth 2.0 and Graph API to provide comprehensive page management capabilities.

## Facebook Graph API Research & Requirements

### 1. Authentication Requirements

#### OAuth 2.0 Flow
- **App Type**: Web Application
- **Login Flow**: Facebook Login for Business
- **Redirect URI**: Must be HTTPS in production
- **Required Permissions**:
  - `pages_show_list` - View list of pages managed
  - `pages_read_engagement` - Read page posts and comments
  - `pages_manage_posts` - Create and delete posts
  - `pages_manage_metadata` - Update page info
  - `pages_manage_engagement` - Like and reply to comments
  - `pages_messaging` - Send and receive messages
  - `pages_read_user_content` - Read user generated content
  - `public_profile` - Basic user info
  - `email` - User's email address

### 2. Graph API Endpoints We'll Use

#### Pages Management
- `GET /me/accounts` - List all pages user manages
- `GET /{page-id}` - Get page details
- `GET /{page-id}/feed` - Get page posts
- `POST /{page-id}/feed` - Create new post
- `GET /{page-id}/insights` - Get page analytics

#### Content Management
- `POST /{page-id}/photos` - Upload photos
- `POST /{page-id}/videos` - Upload videos
- `DELETE /{post-id}` - Delete posts
- `POST /{post-id}` - Update posts

#### Engagement
- `GET /{post-id}/comments` - Get comments on a post
- `POST /{post-id}/comments` - Reply to comments
- `GET /{page-id}/conversations` - Get messages
- `POST /{conversation-id}/messages` - Send messages

#### Analytics
- `GET /{page-id}/insights/page_impressions`
- `GET /{page-id}/insights/page_engaged_users`
- `GET /{page-id}/insights/page_fan_adds`
- `GET /{page-id}/insights/page_views_total`

### 3. App Review Requirements

For production, the app needs Facebook App Review for:
- Pages access permissions
- Extended permissions beyond basic access
- Public usage (non-development mode)

## System Architecture

### Backend (Django)

#### 1. Apps Structure
```
backend/
├── accounts/          # User authentication and profiles
├── facebook_auth/     # Facebook OAuth integration
├── pages/            # Facebook page management
├── posts/            # Content creation and scheduling
├── analytics/        # Insights and analytics
├── messaging/        # Comments and messages
└── scheduler/        # Post scheduling with Celery
```

#### 2. Database Models

##### User Model Extension
```python
- facebook_user_id
- access_token (encrypted)
- token_expires_at
- permissions (JSON)
```

##### FacebookPage Model
```python
- page_id
- name
- access_token
- category
- user (ForeignKey)
- is_active
```

##### Post Model
```python
- page (ForeignKey)
- content
- media_urls (JSON)
- post_type (text/photo/video)
- facebook_post_id
- scheduled_time
- status (draft/scheduled/published)
- engagement_metrics (JSON)
```

##### Analytics Model
```python
- page (ForeignKey)
- metric_type
- value
- date
- period (day/week/month)
```

### Frontend (React/Vue.js)

#### 1. Key Components
- **AuthFlow**: Facebook login integration
- **Dashboard**: Overview of all pages
- **PageSelector**: Switch between pages
- **PostComposer**: Create and schedule posts
- **MediaUploader**: Handle images/videos
- **AnalyticsChart**: Visualize insights
- **CommentManager**: View and reply to comments
- **MessageInbox**: Page messaging interface

#### 2. State Management
- User authentication state
- Selected page context
- Posts queue
- Real-time notifications

### Security Considerations

1. **Token Storage**
   - Store access tokens encrypted in database
   - Use environment variables for app credentials
   - Implement token refresh mechanism

2. **API Security**
   - Rate limiting on API endpoints
   - CORS configuration
   - Input validation and sanitization

3. **User Permissions**
   - Role-based access control
   - Page-level permissions
   - Audit logging

## Implementation Phases

### Phase 1: Authentication & Basic Setup (Week 1)
- [ ] Django project configuration
- [ ] Facebook App creation and configuration
- [ ] OAuth 2.0 flow implementation
- [ ] User model and authentication
- [ ] Basic frontend setup

### Phase 2: Page Management (Week 2)
- [ ] List and connect Facebook pages
- [ ] Page switching functionality
- [ ] Basic page information display
- [ ] Page permissions verification

### Phase 3: Content Publishing (Week 3)
- [ ] Post composer interface
- [ ] Text post creation
- [ ] Image upload and posting
- [ ] Video upload support
- [ ] Post scheduling system

### Phase 4: Analytics Integration (Week 4)
- [ ] Insights API integration
- [ ] Analytics dashboard
- [ ] Data visualization
- [ ] Export functionality

### Phase 5: Engagement Features (Week 5)
- [ ] Comments viewing and replying
- [ ] Message inbox
- [ ] Notification system
- [ ] Real-time updates

### Phase 6: Advanced Features (Week 6)
- [ ] Bulk post scheduling
- [ ] Content calendar view
- [ ] Team collaboration features
- [ ] Advanced analytics

## Development Environment Setup

1. **Facebook App Setup**
   - Create app at developers.facebook.com
   - Add Facebook Login product
   - Configure OAuth redirect URIs
   - Add test users for development

2. **Local Development**
   - Use ngrok for HTTPS tunnel
   - Configure test app for development
   - Set up environment variables

3. **Testing Strategy**
   - Unit tests for API endpoints
   - Integration tests for Facebook API
   - Mock Facebook API responses
   - End-to-end testing

## API Rate Limits & Best Practices

1. **Rate Limiting**
   - 200 calls per hour per user
   - Batch requests when possible
   - Implement caching strategy

2. **Error Handling**
   - Handle expired tokens
   - API error responses
   - Network failures
   - Permission errors

3. **Performance Optimization**
   - Cache frequently accessed data
   - Implement pagination
   - Lazy loading for media
   - Background job processing

## Deployment Considerations

1. **Infrastructure**
   - HTTPS required for OAuth
   - Redis for caching and Celery
   - PostgreSQL for production
   - Static file storage (S3)

2. **Monitoring**
   - API usage tracking
   - Error logging (Sentry)
   - Performance monitoring
   - User activity tracking

## Legal & Compliance

1. **Facebook Platform Policies**
   - Follow Platform Terms
   - Implement data deletion
   - Privacy policy required
   - Terms of service

2. **Data Protection**
   - GDPR compliance
   - User data encryption
   - Data retention policies
   - User consent management