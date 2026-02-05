# Social Media Scheduler Integration

This document describes the BullMQ + Redis based scheduler integration for social media posts.

## Architecture Overview

The scheduler system consists of:

1. **Database Schemas** (MongoDB)
   - `scheduled_posts` - Stores posts scheduled for future publishing
   - `posted_contents` - Stores history of all published posts

2. **BullMQ Queue** - Manages job scheduling with delayed execution
3. **Worker** - Processes scheduled jobs when their time arrives
4. **REST API** - Endpoints for managing scheduled and posted content

## Prerequisites

### Redis Server

BullMQ requires a Redis server. Install and run Redis:

```bash
# macOS (using Homebrew)
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# Docker
docker run -d --name redis -p 6379:6379 redis
```

### Environment Variables

Add these to your `.env` file in `ingents-be`:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=          # Optional, leave empty if no password

# Existing social media configs should already be set
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
FACEBOOK_REDIRECT_URI=

INSTAGRAM_CLIENT_ID=
INSTAGRAM_CLIENT_SECRET=
INSTAGRAM_REDIRECT_URI=

YT_CLIENT_ID=
YT_CLIENT_SECRET=
YT_REDIRECT_URI=

X_CLIENT_ID=
X_CLIENT_SECRET=
X_REDIRECT_URI=
```

## Database Schemas

### ScheduledPost Schema

```typescript
{
  user_id: ObjectId,           // Reference to user
  platform: 'facebook' | 'instagram' | 'youtube' | 'x',
  content: string,             // Post content
  media_urls: string[],        // URLs of media to post
  media_type: 'image' | 'video' | 'text',
  hashtags: string[],
  scheduled_at: Date,          // When to post
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled',
  job_id: string,              // BullMQ job ID
  page_id: string,             // Facebook page ID (if applicable)
  channel_id: string,          // YouTube channel ID (if applicable)
  platform_specific_data: object,
  error_message: string,       // Error details if failed
  retry_count: number,
  max_retries: number
}
```

### PostedContent Schema

```typescript
{
  user_id: ObjectId,
  scheduled_post_id: ObjectId, // Reference to scheduled post (if scheduled)
  platform: 'facebook' | 'instagram' | 'youtube' | 'x',
  content: string,
  media_urls: string[],
  media_type: 'image' | 'video' | 'text',
  hashtags: string[],
  posted_at: Date,
  platform_post_id: string,    // ID returned by the platform
  platform_response: object,   // Full response from platform
  engagement: {
    likes: number,
    comments: number,
    shares: number,
    views: number
  },
  is_scheduled: boolean,       // Was this a scheduled post?
  status: 'published' | 'failed',
  error_message: string
}
```

## API Endpoints

### Schedule Posts

```
POST /api/v1/scheduler/schedule
```

Request body:
```json
{
  "user_id": "user_object_id",
  "platform": "facebook",
  "content": "Your post content here",
  "media_urls": ["https://example.com/image.jpg"],
  "media_type": "image",
  "hashtags": ["marketing", "socialmedia"],
  "scheduled_at": "2026-02-07T10:00:00Z",
  "page_id": "facebook_page_id",
  "platform_specific_data": {}
}
```

### Bulk Schedule Posts

```
POST /api/v1/scheduler/schedule/bulk
```

Request body:
```json
{
  "posts": [
    { ...post1 },
    { ...post2 }
  ]
}
```

### Get Scheduled Posts

```
GET /api/v1/scheduler/scheduled/:userId
GET /api/v1/scheduler/scheduled/:userId?status=pending&platform=facebook
```

### Get Single Scheduled Post

```
GET /api/v1/scheduler/scheduled/post/:postId
```

### Update Scheduled Post

```
PUT /api/v1/scheduler/scheduled/:postId
```

### Reschedule Post

```
PUT /api/v1/scheduler/scheduled/:postId/reschedule
```

Request body:
```json
{
  "scheduled_at": "2026-02-08T15:00:00Z"
}
```

### Cancel Scheduled Post

```
DELETE /api/v1/scheduler/scheduled/:postId
```

### Get Posted Content History

```
GET /api/v1/scheduler/posted/:userId
GET /api/v1/scheduler/posted/:userId?platform=facebook&limit=10
```

### Get Single Posted Content

```
GET /api/v1/scheduler/posted/post/:postId
```

### Get Queue Status (Admin)

```
GET /api/v1/scheduler/queue/status
```

Response:
```json
{
  "success": true,
  "data": {
    "waiting": 5,
    "active": 1,
    "completed": 100,
    "failed": 2,
    "delayed": 10
  }
}
```

## Frontend Usage

The frontend includes:

1. **PostComposer** - Updated to support scheduling with the new backend
2. **ScheduledPosts** - View, edit, reschedule, and cancel scheduled posts
3. **PostedContentHistory** - View history of published posts with engagement metrics

### Scheduler Service

```typescript
import { 
  schedulePost, 
  getScheduledPosts, 
  cancelScheduledPost, 
  reschedulePost,
  getPostedContent 
} from '@/service/scheduler/scheduler.service';

// Schedule a post
const result = await schedulePost({
  user_id: 'user_id',
  platform: 'facebook',
  content: 'Hello World!',
  scheduled_at: '2026-02-07T10:00:00Z',
  page_id: 'page_id'
});

// Get scheduled posts
const posts = await getScheduledPosts(userId, { status: 'pending' });

// Cancel a scheduled post
await cancelScheduledPost(postId);

// Reschedule a post
await reschedulePost(postId, '2026-02-08T15:00:00Z');

// Get posting history
const history = await getPostedContent(userId, { platform: 'facebook', limit: 20 });
```

## How It Works

1. **Scheduling**: When a user schedules a post:
   - A record is created in `scheduled_posts` collection
   - A delayed job is added to BullMQ queue with the calculated delay

2. **Processing**: When the scheduled time arrives:
   - BullMQ worker picks up the job
   - The worker calls the appropriate platform's posting function
   - On success, status is updated to 'completed' and a record is added to `posted_contents`
   - On failure, the job is retried up to 3 times with exponential backoff

3. **Cancellation**: Users can cancel pending posts:
   - The job is removed from BullMQ queue
   - The status is updated to 'cancelled'

## Error Handling

- Failed posts are automatically retried up to 3 times
- Exponential backoff is used between retries (5s, 10s, 20s)
- After max retries, the post is marked as 'failed' with error details
- Failed posts appear in the Posted Content History with error messages

## Monitoring

Use the Queue Status endpoint to monitor:
- **waiting**: Jobs waiting to be processed
- **active**: Jobs currently being processed
- **completed**: Successfully processed jobs
- **failed**: Jobs that failed after all retries
- **delayed**: Scheduled jobs waiting for their time

## Best Practices

1. Always validate scheduled time is in the future before scheduling
2. For Facebook, schedule at least 10 minutes in advance (platform requirement)
3. Upload media to S3 before scheduling to ensure URLs remain valid
4. Monitor the queue status regularly to catch issues early
5. Set up alerts for high failure rates
