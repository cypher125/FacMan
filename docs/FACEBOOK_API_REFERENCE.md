# Facebook Graph API Reference for FacMan

## API Version
Current Version: v18.0 (as of 2024)

## Base URL
```
https://graph.facebook.com/v18.0/
```

## Authentication

### OAuth 2.0 URLs
```
Authorization: https://www.facebook.com/v18.0/dialog/oauth
Token Exchange: https://graph.facebook.com/v18.0/oauth/access_token
```

### Required Parameters
```
client_id={app-id}
redirect_uri={redirect-uri}
state={state-param}
scope=pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_metadata,pages_manage_engagement,pages_messaging,pages_read_user_content,public_profile,email
```

## Core API Endpoints

### 1. User & Authentication

#### Get User Profile
```
GET /me
Response:
{
  "id": "USER_ID",
  "name": "John Doe",
  "email": "john@example.com"
}
```

#### Get User's Pages
```
GET /me/accounts
Response:
{
  "data": [
    {
      "access_token": "PAGE_ACCESS_TOKEN",
      "category": "Brand",
      "category_list": [{"id": "1234", "name": "Brand"}],
      "name": "My Business Page",
      "id": "PAGE_ID",
      "tasks": ["ANALYZE", "CREATE_CONTENT", "MODERATE"]
    }
  ],
  "paging": {}
}
```

### 2. Page Management

#### Get Page Details
```
GET /{page-id}?fields=id,name,about,category,fan_count,link,picture
Response:
{
  "id": "PAGE_ID",
  "name": "Page Name",
  "about": "Page description",
  "category": "Business",
  "fan_count": 1234,
  "link": "https://www.facebook.com/pagename",
  "picture": {
    "data": {
      "url": "https://..."
    }
  }
}
```

### 3. Content Publishing

#### Create Text Post
```
POST /{page-id}/feed
Body:
{
  "message": "Hello World!",
  "link": "https://example.com" (optional),
  "published": true
}
Response:
{
  "id": "POST_ID"
}
```

#### Upload Photo
```
POST /{page-id}/photos
Body:
{
  "url": "IMAGE_URL" or "source": binary_data,
  "message": "Photo caption",
  "published": true
}
Response:
{
  "id": "PHOTO_ID",
  "post_id": "POST_ID"
}
```

#### Upload Video
```
POST /{page-id}/videos
Body:
{
  "source": binary_data,
  "description": "Video description",
  "title": "Video Title"
}
Response:
{
  "id": "VIDEO_ID"
}
```

#### Schedule Post
```
POST /{page-id}/feed
Body:
{
  "message": "Scheduled post",
  "published": false,
  "scheduled_publish_time": 1234567890
}
```

### 4. Content Management

#### Get Page Posts
```
GET /{page-id}/feed?fields=id,message,created_time,permalink_url,shares,reactions.summary(true),comments.summary(true)
Response:
{
  "data": [
    {
      "id": "POST_ID",
      "message": "Post content",
      "created_time": "2024-01-01T12:00:00+0000",
      "permalink_url": "https://...",
      "shares": {
        "count": 10
      },
      "reactions": {
        "summary": {
          "total_count": 100
        }
      },
      "comments": {
        "summary": {
          "total_count": 25
        }
      }
    }
  ]
}
```

#### Update Post
```
POST /{post-id}
Body:
{
  "message": "Updated message"
}
```

#### Delete Post
```
DELETE /{post-id}
Response:
{
  "success": true
}
```

### 5. Engagement

#### Get Post Comments
```
GET /{post-id}/comments?fields=id,message,from,created_time,like_count
Response:
{
  "data": [
    {
      "id": "COMMENT_ID",
      "message": "Great post!",
      "from": {
        "name": "User Name",
        "id": "USER_ID"
      },
      "created_time": "2024-01-01T12:00:00+0000",
      "like_count": 5
    }
  ]
}
```

#### Reply to Comment
```
POST /{comment-id}/comments
Body:
{
  "message": "Thank you for your feedback!"
}
```

#### Like/Unlike
```
POST /{object-id}/likes   # Like
DELETE /{object-id}/likes # Unlike
```

### 6. Analytics & Insights

#### Page Insights Overview
```
GET /{page-id}/insights?metric=page_impressions,page_engaged_users,page_fans,page_views_total&period=day&since=2024-01-01&until=2024-01-31
```

#### Available Metrics
- `page_impressions` - Number of times any content was shown
- `page_engaged_users` - Number of unique users who engaged
- `page_fans` - Total page likes
- `page_fan_adds` - New page likes
- `page_fan_removes` - Page unlikes
- `page_views_total` - Total page views
- `page_posts_impressions` - Post reach
- `page_video_views` - Video views

#### Response Format
```
{
  "data": [
    {
      "name": "page_impressions",
      "period": "day",
      "values": [
        {
          "value": 1234,
          "end_time": "2024-01-01T08:00:00+0000"
        }
      ],
      "title": "Page Impressions",
      "description": "The number of times any content..."
    }
  ]
}
```

### 7. Messaging

#### Get Conversations
```
GET /{page-id}/conversations?fields=participants,updated_time,messages{message,from,created_time}
```

#### Send Message
```
POST /{page-id}/messages
Body:
{
  "recipient": {"id": "RECIPIENT_ID"},
  "message": {"text": "Hello!"}
}
```

## Error Handling

### Common Error Codes
```json
{
  "error": {
    "message": "Error message",
    "type": "OAuthException",
    "code": 190,
    "error_subcode": 460,
    "fbtrace_id": "TRACE_ID"
  }
}
```

### Error Types
- **190**: Invalid OAuth access token
- **200**: Permissions error
- **100**: Invalid parameter
- **10**: Application does not have permission
- **4**: Application request limit reached
- **17**: User request limit reached

## Rate Limiting

### Headers to Monitor
```
X-App-Usage: {"call_count":10,"total_time":5,"total_cputime":3}
X-Page-Usage: {"call_count":5,"total_time":2,"total_cputime":1}
X-Ad-Account-Usage: {"acc_id_util_pct":0.5}
```

### Best Practices
1. Batch requests when possible
2. Use field expansion to minimize calls
3. Cache responses appropriately
4. Implement exponential backoff for rate limits

## Webhooks

### Page Subscriptions
```
POST /{app-id}/subscriptions
Body:
{
  "object": "page",
  "callback_url": "https://yourdomain.com/webhook",
  "fields": "feed,messages,message_reactions",
  "verify_token": "YOUR_VERIFY_TOKEN"
}
```

### Webhook Events
- `feed` - New posts, comments
- `messages` - New messages
- `message_reactions` - Message reactions
- `mention` - Page mentions

## Testing

### Test Users
Create test users in App Dashboard for development

### Graph API Explorer
Use https://developers.facebook.com/tools/explorer/ for testing

### Access Token Debugger
https://developers.facebook.com/tools/debug/accesstoken/

## Important Notes

1. **Token Expiration**
   - User tokens: ~60 days
   - Page tokens: Can be extended to never expire
   - App tokens: Never expire

2. **Media Upload Limits**
   - Images: Max 10MB, JPG/PNG/GIF
   - Videos: Max 10GB, MP4/MOV

3. **Post Limits**
   - Message length: 63,206 characters
   - Batch requests: Max 50 requests

4. **Scheduling**
   - Posts can be scheduled 10 minutes to 30 days in advance
   - Max 300 unpublished posts at once