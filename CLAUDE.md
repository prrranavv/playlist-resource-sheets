# Claude Code - Development Notes & Implementation Knowledge Base

## Overview

This is a Next.js application that creates Wayground assessments and interactive videos from YouTube playlists. It automates the entire workflow from playlist import to resource creation, publishing, and database storage.

---

## Claude Agent Memory & Guidelines

### Git Workflow Rules
**IMPORTANT**: These rules MUST be followed for all Git operations:

1. **Push to GitHub ONLY when explicitly asked** by the user
   - Never push automatically or proactively
   - Always confirm before pushing

2. **Check for build/deployment errors before pushing**
   - Run `npm run build` to verify the build succeeds
   - Check for TypeScript errors
   - Review any linting issues
   - Only push if build is successful

3. **Plan and confirm with user before executing changes**
   - For complex changes, create a plan first
   - Get user approval before implementing
   - Break down large tasks into smaller steps
   - Keep user informed of progress

4. **Delete one-time scripts and documents after use**
   - Ask for user confirmation before deletion
   - Clean up temporary files once their purpose is fulfilled
   - Examples: test scripts, migration scripts, temporary documentation

### Development Workflow
- Always read files before editing them
- Use comprehensive logging with clear prefixes
- Test changes thoroughly before committing
- Document significant changes in this file

---

## Recent Optimizations (November 2025)

### 1. Cache Hit Signal Optimization (December 2025)

**Date**: December 2025  
**Objective**: Skip unnecessary 2-second delays when quiz keys/video IDs come from database cache.

#### Problem Statement
When quiz gen keys or video IDs were fetched from the database cache, the frontend still waited 2 seconds before processing the next item, even though no API call was made. This slowed down processing when many resources were already cached.

#### Solution Implemented

**API Endpoints Updated:**
- `app/api/wayground/fetch-quiz-keys/route.ts`
- `app/api/wayground/fetch-iv-video-ids/route.ts`

**Changes:**
1. Added `fromCache` tracking: `Record<string, boolean>` to mark which quiz IDs came from cache vs API
2. Return `fromCache` in API response: `{ quizGenKeysById, draftVersionById, fromCache }`
3. Frontend checks `data?.fromCache?.[quizId]` to determine cache status
4. Skip 2s delay when `wasCached === true`

**Frontend Changes:**
- `app/page.tsx`: Added `wasCached` flag tracking
- Skip delay: `if (processed < totalResources && !wasCached) { await delay }`
- Added `[CACHED]` indicator to console logs

**Impact:**
- Cached requests process instantly without waiting
- Significantly faster when processing many cached quiz IDs
- No impact on API calls (still uses 2s delay)

---

### 2. Resource Fetching Flow Optimization (November 2025)

**Date**: November 21, 2025  
**Objective**: Optimize the Wayground resource creation flow to reduce API calls and improve efficiency.

#### Problem Statement
The previous implementation was fetching quiz gen keys for assessments and video IDs for interactive videos in separate phases with 8-second gaps between requests. This resulted in:
- Redundant filtering logic across multiple functions
- Inefficient rate limiting with 8s delays
- Complex state management across multiple phases

#### Solution Implemented

**Refactored Functions:**

1. **`fetchAssessments(numVideosInPlaylist)`** (app/page.tsx:1466)
   - **Before**: Fetched filtered assessments AND their quiz gen keys
   - **After**: Only fetches and filters assessments by time window (150s + N*2s)
   - **Returns**: `{ filteredQuizIds: string[], quizTitleMap: Record<string, { title: string }> }`

2. **`fetchInteractivesAndUpdate(numVideosInPlaylist)`** (app/page.tsx:275)
   - **Before**: Fetched filtered IVs AND their video IDs
   - **After**: Only fetches and filters IVs by time window (150s + N*2s)
   - **Returns**: `{ filteredIVs: Array<{ quizId, draftVersion, title }> }`

3. **Unified Fetching Phase in `createResources()`** (app/page.tsx:449-596)
   - **New Phase 7**: Single unified fetching phase for all resources
   - Fetches quiz gen keys for ALL filtered assessments
   - Fetches video IDs for ALL filtered IVs
   - Uses consistent **2s gaps** between all requests (reduced from 8s)
   - Better progress tracking: `(processed/totalResources)`

#### Flow Comparison

**Previous Flow:**
```
1. Create assessments sequentially
2. Wait 100s
3. Fetch filtered assessments → fetch keys (8s gaps each)
4. Create IVs sequentially
5. Wait 100s
6. Fetch filtered IVs → fetch video IDs (8s gaps each)
```

**Optimized Flow:**
```
1. Create assessments sequentially
2. Create interactive videos sequentially
3. Wait 150s (single wait period)
4. Fetch quiz keys from database
5. Fetch filtered assessments (IDs only)
6. Fetch filtered IVs (IDs only)
7. Unified fetching: ALL assessment keys + ALL IV video IDs (2s gaps)
```

#### Key Improvements

✅ **Single time-based filter window** (150s + N*2s) applied once  
✅ **Reduced delay**: 2s gaps instead of 8s between requests  
✅ **Unified sequential fetching**: Single phase for all resource metadata  
✅ **Better progress tracking**: Combined counter for all resources  
✅ **Cleaner separation of concerns**: Filtering vs. fetching separated  
✅ **More efficient rate limit management**: Adaptive delays with retry logic  

---

### 3. Playlist Regenerate Feature (December 2025)

**Date**: December 2025  
**Objective**: Allow regenerating playlists from the playlist page to create fresh assessments and IVs.

#### Implementation

**New Routes:**
- `app/playlist/[slug]/regenerate/page.tsx` - Regenerate page that redirects to homepage
- `app/api/playlist-by-slug/route.ts` - API to fetch playlist by slug

**Flow:**
1. User visits `/playlist/{slug}/regenerate`
2. Page fetches playlist slug → gets YouTube playlist ID
3. Redirects to homepage with `?url={playlistUrl}&regenerate=true`
4. Homepage fetches fresh videos from YouTube (skips database check)
5. Automatically triggers `createResources()` to create assessments and IVs
6. Updates database with new resources via existing `saveToSupabase()` flow

**API Changes:**
- `app/api/playlist/route.ts`: Added `regenerate` query parameter support
  - When `regenerate=true`, skips database check and fetches fresh from YouTube API
- `app/page.tsx`: Detects `regenerate=true` query parameter
  - Skips redirect to playlist page in regenerate mode
  - Auto-triggers resource creation after videos are loaded

---

## Architecture Overview

### Tech Stack

- **Framework**: Next.js 15.5.4 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **External APIs**: 
  - YouTube Data API v3
  - Wayground API
  - Google Sheets API

### Key Components

#### Frontend (`app/page.tsx`)
- Main homepage with playlist import
- Resource creation workflow
- State management for assessments, IVs, and metadata
- Auto-publishing and Google Sheets export

#### API Routes

**Wayground Integration:**
- `/api/wayground/create-assessment` - Create assessment from video
- `/api/wayground/create-interactive` - Create interactive video
- `/api/wayground/fetch-quiz-keys` - Fetch quiz gen keys (with cache support)
- `/api/wayground/fetch-iv-video-ids` - Fetch video IDs from IVs (with cache support)
- `/api/wayground/fetch-assessments` - Fetch filtered assessments
- `/api/wayground/fetch-interactive-map` - Fetch all interactive videos
- `/api/wayground/publish-quiz` - Publish assessment
- `/api/wayground/publish-interactive` - Publish interactive video
- `/api/wayground/make-public` - Make resource public
- `/api/wayground/update-name` - Update resource name
- `/api/wayground/login` - Authenticate with Wayground
- `/api/wayground/auto-login` - Auto-login with stored credentials

**Playlist Management:**
- `/api/playlist` - Fetch playlist from YouTube or database
- `/api/playlist-by-slug` - Fetch playlist by slug
- `/api/save-playlist` - Save playlist to database
- `/api/video-quiz-keys` - Manage video-to-quiz-key mappings

**Other:**
- `/api/channel-playlists` - Fetch playlists for a channel
- `/api/explore` - Explore playlists by subject
- `/api/export-to-sheets-oauth` - Export to Google Sheets

---

## Database Schema

### Tables

#### `playlists`
Stores playlist metadata:
- `id` (UUID, primary key)
- `youtube_playlist_id` (text, unique)
- `title` (text)
- `slug` (text, unique)
- `description` (text, nullable)
- `channel_id`, `channel_title`, `channel_thumbnail` (text, nullable)
- `thumbnail_url` (text, nullable)
- `video_count` (integer)
- `grade`, `subject` (text, nullable)
- `google_sheet_url` (text, nullable)
- `created_at`, `updated_at` (timestamps)

#### `playlist_videos`
Stores videos in playlists:
- `id` (UUID, primary key)
- `playlist_id` (UUID, foreign key → playlists.id)
- `youtube_video_id` (text)
- `title` (text)
- `thumbnail_url` (text, nullable)
- `order_index` (integer)
- `assessment_quiz_id`, `assessment_link` (text, nullable)
- `interactive_video_quiz_id`, `interactive_video_link` (text, nullable)
- `created_at` (timestamp)

#### `video_quiz_keys`
Maps YouTube video IDs to quiz gen keys:
- `id` (UUID, primary key)
- `youtube_video_id` (text, unique)
- `quiz_gen_key` (text)
- `created_at`, `updated_at` (timestamps)

#### `quiz_metadata`
Caches quiz metadata for faster lookups:
- `id` (UUID, primary key)
- `quiz_id` (text, unique) - Wayground quiz ID
- `quiz_gen_key` (text, nullable) - For assessments
- `youtube_video_id` (text, nullable) - For interactive videos
- `created_at`, `updated_at` (timestamps)

**Note**: For assessments, `quiz_gen_key` is populated and `youtube_video_id` is null. For IVs, `youtube_video_id` is populated and `quiz_gen_key` is null.

---

## API Routes Documentation

### Wayground Integration APIs

#### 1. `/api/wayground/create-assessment` (POST)
**Purpose**: Creates a Wayground assessment (quiz) from a YouTube video.

**Request Body**:
```typescript
{
  videoUrl: string;        // YouTube video URL
  videoId: string;         // YouTube video ID
  grade: string;           // Grade level (e.g., "6th Grade")
  subject: string;         // Subject (e.g., "Science", "Math")
  duration?: number;       // Video duration in seconds (optional, fetched if not provided)
  cookie?: string;         // Optional Wayground session cookie
  csrf?: string;           // Optional CSRF token
}
```

**Response**:
```typescript
{
  data?: {
    quizGenKey: string;    // Generated quiz key for tracking
  };
  // or error response
  error?: string;
}
```

**Behavior**:
- Fetches video duration from YouTube API if not provided
- Automatically saves quiz_gen_key to `video_quiz_keys` table
- Uses environment variables or headers for authentication
- Maps subjects to Wayground-compatible format

---

#### 2. `/api/wayground/create-interactive` (POST)
**Purpose**: Creates a Wayground interactive video from a YouTube video.

**Request Body**:
```typescript
{
  videoUrl: string;        // YouTube video URL
  videoId: string;         // YouTube video ID
  grade?: string;          // Grade level (defaults to "6th Grade")
  subject?: string;        // Subject (defaults to "Science")
  duration?: number;       // Video duration in seconds
  cookie?: string;         // Optional Wayground session cookie
  csrf?: string;           // Optional CSRF token
}
```

**Response**:
```typescript
{
  data?: {
    // Wayground response data
  };
  error?: string;
}
```

**Behavior**:
- Similar to create-assessment but with `createInteractiveVideo: true`
- Fetches duration from YouTube if not provided
- Does NOT save to video_quiz_keys (IVs don't use quiz_gen_keys)

---

#### 3. `/api/wayground/fetch-quiz-keys` (POST)
**Purpose**: Fetches quiz generation keys for assessments with database caching.

**Request Body**:
```typescript
{
  quizIds: string[];       // Array of Wayground quiz IDs (max 1 per call)
  cookieOverride?: string; // Optional cookie override
}
```

**Response**:
```typescript
{
  quizGenKeysById: Record<string, string | null>;  // quizId -> quizGenKey
  draftVersionById: Record<string, string | null>; // quizId -> draftVersion
  fromCache: Record<string, boolean>;              // quizId -> cached flag
}
```

**Behavior**:
- Checks `quiz_metadata` table first for cached keys
- If cached: returns immediately with `fromCache[quizId] = true`
- If not cached: fetches from Wayground API, stores in database
- Processes only 1 quiz ID per call to avoid rate limiting
- Uses 2-second delay between requests (skipped for cached items)

---

#### 4. `/api/wayground/fetch-iv-video-ids` (POST)
**Purpose**: Fetches YouTube video IDs from interactive videos with database caching.

**Request Body**:
```typescript
{
  quizIds: string[];       // Array of interactive video quiz IDs (max 1 per call)
}
```

**Response**:
```typescript
{
  videoIdsById: Record<string, string | null>;  // quizId -> youtubeVideoId
  titlesById: Record<string, string | null>;    // quizId -> title
  fromCache: Record<string, boolean>;           // quizId -> cached flag
}
```

**Behavior**:
- Checks `quiz_metadata` table first for cached video IDs
- If cached: returns immediately with `fromCache[quizId] = true`
- If not cached: fetches from Wayground API, stores in database
- Extracts video ID from first question's media field
- Processes only 1 quiz ID per call to avoid rate limiting

---

#### 5. `/api/wayground/fetch-assessments` (POST)
**Purpose**: Fetches all draft assessments from Wayground user's library.

**Request Body**: None (uses headers for auth)

**Response**:
```typescript
{
  quizIds: string[];       // Array of quiz IDs
  quizzes: Array<{         // Array of quiz summaries
    id: string;
    title: string;
    createdAt?: string;
  }>;
  raw: any;                // Raw API response for debugging
}
```

**Behavior**:
- Fetches from Wayground search endpoint with filters:
  - `activityTypes: ["quiz"]`
  - `tab: "drafts"`
  - `sortBy: "createdAt"`
  - `sortOrder: "desc"`
- Returns up to 2000 assessments
- Recursively searches JSON for quiz structures

---

#### 6. `/api/wayground/fetch-interactive-map` (POST)
**Purpose**: Fetches all draft interactive videos from Wayground user's library.

**Request Body**: None (uses headers for auth)

**Response**:
```typescript
{
  interactive: Array<{
    quizId: string;
    draftVersion: string | null;
    createdAt?: string;
    title?: string;
  }>;
}
```

**Behavior**:
- Paginates through Wayground library with filters:
  - `activityTypes: ["video-quiz"]`
  - `tab: "drafts"`
  - `sortBy: "createdAt"`
  - `sortOrder: "desc"`
- Fetches up to 20 pages (2000 items max)
- Recursively searches JSON for video-quiz structures

---

#### 7. `/api/wayground/publish-quiz` (POST)
**Purpose**: Publishes a draft assessment to make it playable.

**Request Body**:
```typescript
{
  quizId: string;
  draftVersion: string;
  cookie?: string;
  csrf?: string;
}
```

**Response**:
```typescript
{
  // Wayground API response
}
```

**Behavior**:
- Posts to `/quiz/{quizId}/version/{draftVersion}/publish`
- Sets `premiumUse: false` in payload
- Returns Wayground's publish response

---

#### 8. `/api/wayground/publish-interactive` (POST)
**Purpose**: Publishes a draft interactive video to make it playable.

**Request Body**:
```typescript
{
  quizId: string;
  draftVersion: string;
  cookie?: string;
  csrf?: string;
}
```

**Response**:
```typescript
{
  // Wayground API response
}
```

**Behavior**:
- Same as publish-quiz but for interactive videos
- Posts to same endpoint with same payload format

---

#### 9. `/api/wayground/make-public` (POST)
**Purpose**: Makes a quiz publicly visible (sets visibility flag).

**Request Body**:
```typescript
{
  quizId: string;
  cookie?: string;
  csrf?: string;
}
```

**Response**:
```typescript
{
  // Wayground API response
}
```

**Behavior**:
- Uses `/quiz/{quizId}/quickEdit` endpoint
- Modifies metadata: `{ meta: { visibility: true } }`

---

#### 10. `/api/wayground/update-name` (POST)
**Purpose**: Updates the name/title of a quiz or interactive video.

**Request Body**:
```typescript
{
  quizId: string;
  name: string;
  cookie?: string;
  csrf?: string;
}
```

**Response**:
```typescript
{
  // Wayground API response
}
```

**Behavior**:
- Uses `/quiz/{quizId}/quickEdit` endpoint
- Modifies metadata: `{ meta: { name: "new name" } }`

---

#### 11. `/api/wayground/login` (POST)
**Purpose**: Authenticates with Wayground and returns session cookies.

**Request Body**:
```typescript
{
  username: string;
  password: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  data?: any;
  cookies: string;         // Formatted cookie string
  csrfToken: string | null; // Extracted CSRF token
}
```

**Behavior**:
- Authenticates with Wayground auth server
- Parses Set-Cookie headers from response
- Returns formatted cookie string for subsequent requests
- Extracts CSRF token from cookies

---

#### 12. `/api/wayground/auto-login` (POST)
**Purpose**: Auto-login using environment variable credentials.

**Request Body**: None

**Response**:
```typescript
{
  success: boolean;
  data?: any;
  cookies: string;
  csrfToken: string | null;
}
```

**Behavior**:
- Uses `WAYGROUND_USERNAME` and `WAYGROUND_PASSWORD` from env
- Same logic as `/api/wayground/login`
- Used for automated workflows

---

### Playlist Management APIs

#### 13. `/api/playlist` (GET)
**Purpose**: Fetches playlist data from YouTube API or Supabase database.

**Query Parameters**:
```typescript
{
  url?: string;            // YouTube playlist URL
  playlistId?: string;     // YouTube playlist ID
  regenerate?: boolean;    // Skip database check if true
}
```

**Response**:
```typescript
{
  playlistId: string;
  playlistTitle: string;
  channelTitle: string;
  channelId: string;
  channelName: string;
  channelThumbnail: string;
  grade?: string;          // Only if from database
  subject?: string;        // Only if from database
  slug?: string;           // Only if from database
  googleSheetUrl?: string; // Only if from database
  items: Array<{
    id: string;            // YouTube video ID
    title: string;
    thumbnailUrl: string;
    publishedAt: string;
    position: number;
    videoUrl: string;
    // If from database:
    assessmentQuizId?: string;
    assessmentLink?: string;
    interactiveVideoQuizId?: string;
    interactiveVideoLink?: string;
  }>;
  fromDatabase: boolean;   // Flag indicating data source
}
```

**Behavior**:
- If `regenerate=true`: skips database, fetches from YouTube
- If not regenerate: checks Supabase first, returns if exists
- If not in Supabase: fetches from YouTube API
- Paginates through all playlist items (up to 50 pages, 2500 videos max)
- Fetches channel thumbnail separately

---

#### 14. `/api/playlist-by-slug` (GET)
**Purpose**: Fetches playlist metadata by URL slug.

**Query Parameters**:
```typescript
{
  slug: string;            // Playlist slug from URL
}
```

**Response**:
```typescript
{
  playlistId: string;      // YouTube playlist ID
  title: string;
  slug: string;
  subject: string;
  grade: string;
}
```

**Behavior**:
- Queries `playlists` table by slug
- Returns 404 if not found
- Used for regenerate feature

---

#### 15. `/api/save-playlist` (POST)
**Purpose**: Saves or updates playlist and videos in Supabase.

**Request Body**:
```typescript
{
  youtubePlaylistId: string;
  title: string;
  description?: string;
  channelTitle?: string;
  channelId?: string;
  channelName?: string;
  channelThumbnail?: string;
  thumbnailUrl?: string;
  grade?: string;
  subject?: string;
  videos: Array<{
    youtubeVideoId: string;
    title: string;
    thumbnailUrl?: string;
    assessmentQuizId?: string;
    assessmentLink?: string;
    interactiveVideoQuizId?: string;
    interactiveVideoLink?: string;
    orderIndex: number;
  }>;
}
```

**Response**:
```typescript
{
  success: boolean;
  playlistId: string;      // Supabase UUID
  slug: string;
  url: string;             // Playlist page URL
}
```

**Behavior**:
- Checks if playlist exists by `youtube_playlist_id`
- If exists: updates playlist, deletes old videos, inserts new videos
- If not exists: generates unique slug, inserts playlist and videos
- Uses transactions for data integrity

---

#### 16. `/api/delete-playlist` (DELETE)
**Purpose**: Deletes a playlist and all its videos from Supabase.

**Query Parameters**:
```typescript
{
  slug: string;
}
```

**Response**:
```typescript
{
  success: boolean;
}
```

**Behavior**:
- Finds playlist by slug
- Deletes all associated videos first (foreign key constraint)
- Deletes playlist record
- Returns 404 if playlist not found

---

#### 17. `/api/video-quiz-keys` (GET & POST)
**Purpose**: Manages video-to-quiz-key mappings.

**GET - Fetch quiz keys**:
Query Parameters:
```typescript
{
  videoIds: string;        // Comma-separated video IDs
}
```

Response:
```typescript
{
  quizKeyMap: Record<string, string>; // videoId -> quizGenKey
}
```

**POST - Save quiz key**:
Request Body:
```typescript
{
  youtube_video_id: string;
  quiz_gen_key: string;
}
```

Response:
```typescript
{
  data: {
    id: string;
    youtube_video_id: string;
    quiz_gen_key: string;
    created_at: string;
    updated_at: string;
  };
}
```

**Behavior**:
- GET: Queries `video_quiz_keys` table for multiple video IDs
- POST: Upserts (insert or update) quiz key for a video
- Used for mapping assessments back to source videos

---

### Other APIs

#### 18. `/api/export-to-sheets-oauth` (POST)
**Purpose**: Exports playlist data to Google Sheets using OAuth.

**Request Body**:
```typescript
{
  playlistTitle: string;
  playlistId: string;
  channelTitle?: string;
  videos: Array<{
    youtube_video_id: string;
    title: string;
    assessment_link?: string;
    assessment_quiz_id?: string;
    interactive_video_link?: string;
    interactive_video_quiz_id?: string;
  }>;
}
```

**Response**:
```typescript
{
  success: boolean;
  spreadsheetId: string;
  url: string;
  message: string;
}
```

**Behavior**:
- Copies template spreadsheet (ID: `1wy8QCQhr6cAIoJdvvvAwmy6FF0_XIKvtBGtN1-QAE8A`)
- Inserts data into columns G:Q
- Formats header row with blue background
- Auto-resizes columns
- Deletes unused rows
- Makes sheet publicly viewable
- Saves sheet URL to `playlists.google_sheet_url`
- Uses `GOOGLE_ACCESS_TOKEN` and `GOOGLE_REFRESH_TOKEN` from env

---

#### 19. `/api/channel-playlists` (GET)
**Purpose**: Fetches all public playlists for a YouTube channel.

**Query Parameters**:
```typescript
{
  channelId: string;       // YouTube channel ID
}
```

**Response**:
```typescript
{
  channelId: string;
  channelTitle: string;
  playlists: Array<{
    id: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    videoCount: number;
  }>;
}
```

**Behavior**:
- Fetches from YouTube Data API v3
- Paginates through all playlists (up to 50 pages)
- Returns playlist metadata without video details

---

#### 20. `/api/explore` (GET)
**Purpose**: Explores playlists from Supabase filtered by subject/grade.

**Query Parameters**:
```typescript
{
  subject?: string;        // Filter by subject
  grade?: string;          // Filter by grade
}
```

**Response**:
```typescript
{
  playlists: Array<{
    id: string;
    youtube_playlist_id: string;
    title: string;
    description: string;
    channel_title: string;
    thumbnail_url: string;
    video_count: number;
    grade: string;
    subject: string;
    slug: string;
    created_at: string;
  }>;
}
```

**Behavior**:
- Queries `playlists` table with optional filters
- Orders by created_at descending
- Used for browse/discovery page

---

## Key Flows

### 1. Playlist Import & Resource Creation Flow

```
1. User enters YouTube playlist URL
2. Fetch playlist from YouTube API (or database if exists)
3. Display videos
4. User clicks "Create Resources"
5. Phase 1: Create assessments sequentially (2s gaps)
6. Phase 2: Create interactive videos sequentially (2s gaps)
7. Phase 3: Wait 150s for processing
8. Phase 4: Fetch quiz keys from video_quiz_keys table
9. Phase 5: Fetch filtered assessments (time-based filter)
10. Phase 6: Fetch filtered interactive videos (time-based filter)
11. Phase 7: Fetch quiz gen keys and video IDs (2s gaps, skip if cached)
12. Phase 8: Publish all resources
13. Phase 9: Save to Supabase database
14. Phase 10: Export to Google Sheets
```

### 2. Quiz Gen Key Mapping Flow

**How quiz gen keys map to video IDs:**

1. **Phase 4**: Fetch from `video_quiz_keys` table
   - Returns: `localQuizKeyById = { videoId -> quizGenKey }`

2. **Phase 7**: Fetch quiz gen keys from assessments
   - Calls `/api/wayground/fetch-quiz-keys` with `quizIds`
   - Returns: `allKeys = { quizId -> quizGenKey }`
   - Stored in: `assessmentMetaById = { quizId -> { title, quizGenKey } }`

3. **Mapping Logic**:
   ```typescript
   for (const video of items) {
     const quizGenKey = localQuizKeyById[videoId];
     // Find quizId where assessmentMetaById[quizId].quizGenKey === quizGenKey
     const quizEntry = Object.entries(assessmentMetaById).find(
       ([, meta]) => meta.quizGenKey === quizGenKey
     );
   }
   ```

**Cache Support:**
- When `fetch-quiz-keys` returns cached values, structure is identical: `{ quizId -> quizGenKey }`
- Mapping logic works the same whether cached or from API
- Flow: `videoId -> quizGenKey -> quizId` works correctly in both cases

### 3. Regenerate Flow

```
1. User visits /playlist/{slug}/regenerate
2. Fetch playlist by slug → get YouTube playlist ID
3. Redirect to homepage: /?url={playlistUrl}&regenerate=true
4. Homepage detects regenerate flag
5. Fetch fresh videos from YouTube (skip database)
6. Auto-trigger createResources()
7. Create new assessments and IVs
8. Update database with new resources
```

---

## Caching Strategy

### Database Caching

**Tables Used:**
- `quiz_metadata` - Caches quiz gen keys and video IDs
- `video_quiz_keys` - Maps video IDs to quiz gen keys

**Cache Check Flow:**
1. API endpoint checks database first
2. If found → return cached value, mark `fromCache: true`
3. If not found → fetch from Wayground API, store in database
4. Frontend skips delay when `fromCache === true`

**Benefits:**
- Avoids unnecessary API calls
- Faster responses for cached data
- Reduces rate limiting issues
- No mapping issues - cached values maintain same structure

---

## Rate Limiting & Error Handling

### Rate Limiting Strategy

- **Base delay**: 2 seconds between requests
- **Adaptive delays**: Increases with consecutive rate limits
- **Max delay**: 30 seconds
- **Retry logic**: Up to 3 retries per resource
- **Exponential backoff**: `baseDelay * Math.pow(2, retryCount)`

### Error Handling

- All API routes log errors with descriptive prefixes
- Frontend retries failed requests up to 3 times
- Graceful degradation - continues processing other items on failure
- Comprehensive console logging for debugging

---

## Environment Variables

### Required Environment Variables

```env
# YouTube Data API v3 (Required)
YOUTUBE_API_KEY=<your-youtube-api-key>
# Get from: https://console.cloud.google.com/apis/credentials

# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
# Get from: Supabase project settings > API

# Wayground Authentication (Choose one approach)

# Option 1: Static Credentials (for auto-login)
WAYGROUND_USERNAME=<your-wayground-email>
WAYGROUND_PASSWORD=<your-wayground-password>

# Option 2: Session Cookies (for manual login)
WAYGROUND_COOKIE=<session-cookie-string>
WAYGROUND_CSRF=<csrf-token>

# Google Sheets Export (Required for export feature)
GOOGLE_CLIENT_ID=<oauth-client-id>
GOOGLE_CLIENT_SECRET=<oauth-client-secret>
GOOGLE_REDIRECT_URI=<redirect-uri>
GOOGLE_ACCESS_TOKEN=<your-access-token>
GOOGLE_REFRESH_TOKEN=<your-refresh-token>
# Get from: https://console.cloud.google.com/apis/credentials
```

### Authentication Flow

#### Wayground Authentication

**Method 1: Auto-Login (Recommended)**
1. Set `WAYGROUND_USERNAME` and `WAYGROUND_PASSWORD` in `.env`
2. Call `/api/wayground/auto-login` to get session cookies
3. Use returned cookies for subsequent Wayground API calls

**Method 2: Manual Login**
1. Call `/api/wayground/login` with username/password
2. Store returned cookies and CSRF token
3. Pass cookies in request headers or body for Wayground API calls

**Method 3: Static Session Cookies**
1. Login to Wayground in browser
2. Copy cookies from DevTools Network tab
3. Set `WAYGROUND_COOKIE` and `WAYGROUND_CSRF` in `.env`
4. Note: Cookies expire after some time, need to refresh

#### Cookie Priority (for Wayground APIs)
All Wayground APIs check for authentication in this order:
1. Request body: `cookie` and `csrf` fields
2. Request headers: `x-wayground-cookie` and `x-wayground-csrf`
3. Environment variables: `WAYGROUND_COOKIE` and `WAYGROUND_CSRF`
4. Hardcoded fallback (empty by default)

---

## Authentication & Cookie Management

### How Wayground Authentication Works

1. **Login Endpoint** (`/api/wayground/login` or `/api/wayground/auto-login`)
   - Authenticates with Wayground auth server
   - Returns session cookies and CSRF token
   - Cookies include: `_sid`, `x-csrf-token`, `_csrf`, `q-token`, etc.

2. **Cookie Extraction**
   - Parses `Set-Cookie` headers from auth response
   - Filters out expired cookies (Max-Age=0)
   - Combines into single cookie string: `name1=value1; name2=value2`
   - Extracts CSRF token from `x-csrf-token` cookie

3. **Using Cookies in API Calls**
   - Pass full cookie string in `Cookie` header
   - Pass CSRF token in `x-csrf-token` header
   - Both are required for authenticated Wayground API calls

4. **Cookie Lifecycle**
   - Session cookies typically last 24-48 hours
   - After expiration, need to re-authenticate
   - Auto-login can refresh cookies automatically

### Frontend Cookie Storage

The frontend (`app/page.tsx`) stores cookies in React state:
```typescript
const [wayCookie, setWayCookie] = useState<string>("");
const [wayCsrf, setWayCsrf] = useState<string>("");
```

Cookies are:
- Obtained via auto-login on component mount
- Passed to all Wayground API calls
- Refreshed when expired (detected by 401 responses)

---

## Development Guidelines

### Code Style
- Use TypeScript strict mode
- Follow Next.js 15 App Router conventions
- Prefer server components, use client components only when needed
- Comprehensive console logging for debugging
- Use descriptive log prefixes: `[api:route-name]` or `[ui:function-name]`

### API Route Patterns
- Always log request/response for debugging
- Handle errors gracefully with proper HTTP status codes
- Use `supabaseAdmin` for database operations (service role)
- Return consistent response formats

### State Management
- Use React hooks for local state
- Minimize global state
- Keep state updates atomic and predictable
- Use sessionStorage for temporary flags (e.g., auto-regenerate)

---

## Testing Checklist

### Manual Testing
- [ ] Playlist import from YouTube
- [ ] Assessment creation (all videos)
- [ ] Interactive video creation (all videos)
- [ ] Unified metadata fetching with 2s gaps
- [ ] Cache hit detection and delay skipping
- [ ] Publishing workflow
- [ ] Google Sheets export
- [ ] Supabase data persistence
- [ ] Regenerate playlist flow
- [ ] Quiz gen key mapping (cached and fresh)

### Known Issues
- None currently documented

---

## Frontend Architecture

### Main Application (`app/page.tsx`)

The homepage is a client component that handles the entire workflow from playlist import to resource creation and export.

#### Key State Variables

```typescript
// Playlist Data
const [playlistData, setPlaylistData] = useState<PlaylistData | null>(null);
const [items, setItems] = useState<VideoItem[]>([]);

// Authentication
const [wayCookie, setWayCookie] = useState<string>("");
const [wayCsrf, setWayCsrf] = useState<string>("");

// UI State
const [loading, setLoading] = useState<boolean>(false);
const [creating, setCreating] = useState<boolean>(false);
const [statusMessage, setStatusMessage] = useState<string>("");
const [errorMessage, setErrorMessage] = useState<string>("");

// Grade & Subject Selection
const [selectedGrade, setSelectedGrade] = useState<string>("");
const [selectedSubject, setSelectedSubject] = useState<string>("");

// Metadata Tracking
const [assessmentMetaById, setAssessmentMetaById] = useState<Record<string, AssessmentMeta>>({});
const [interactiveMetaById, setInteractiveMetaById] = useState<Record<string, InteractiveMeta>>({});
const [localQuizKeyById, setLocalQuizKeyById] = useState<Record<string, string>>({});
```

#### Main Functions

**1. `fetchPlaylist(url: string)`**
- Calls `/api/playlist` with YouTube URL
- Handles regenerate mode
- Updates state with playlist and video data
- Shows error messages on failure

**2. `createResources()`**
- Main workflow orchestrator (10 phases)
- Phase 1-2: Create assessments and IVs sequentially
- Phase 3: Wait 150s for processing
- Phase 4: Fetch quiz keys from database
- Phase 5-6: Fetch filtered assessments and IVs
- Phase 7: Fetch metadata (quiz keys, video IDs) with caching
- Phase 8: Publish all resources
- Phase 9: Save to Supabase
- Phase 10: Export to Google Sheets

**3. `fetchLocalQuizKeys(videoIds: string[])`**
- Fetches quiz_gen_keys from `video_quiz_keys` table
- Returns mapping: `{ videoId -> quizGenKey }`
- Used to link assessments back to videos

**4. `fetchAssessments(numVideos: number)`**
- Fetches all draft assessments from Wayground
- Filters by time window: `currentTime - (150s + numVideos * 2s)`
- Returns quiz IDs and titles

**5. `fetchInteractivesAndUpdate(numVideos: number)`**
- Fetches all draft interactive videos from Wayground
- Filters by same time window
- Returns quiz IDs, draft versions, and titles

**6. `saveToSupabase()`**
- Saves playlist and all video data to Supabase
- Includes quiz IDs and links for assessments/IVs
- Returns slug for playlist URL

**7. `exportToGoogleSheets()`**
- Exports playlist data to Google Sheets
- Uses OAuth credentials from environment
- Returns sheet URL

#### Component Lifecycle

```typescript
useEffect(() => {
  // On mount:
  1. Check for URL parameter in query string
  2. Call auto-login to get Wayground cookies
  3. If regenerate mode, auto-trigger createResources()
}, []);
```

#### Error Handling

- All async functions wrapped in try/catch
- Errors displayed in UI via `setErrorMessage()`
- Rate limit errors trigger exponential backoff
- Failed requests retried up to 3 times
- Graceful degradation: continues on individual failures

#### Progress Tracking

- Uses `statusMessage` state for user feedback
- Console logging with descriptive prefixes
- Phase-by-phase progress updates
- Shows completion percentage for long operations

---

### Playlist Page (`app/playlist/[slug]/page.tsx`)

Displays saved playlist with all videos and their resources.

**Features**:
- Shows all videos in playlist
- Displays assessment and IV links for each video
- Allows regenerating playlist
- Shows Google Sheet link if available
- Delete playlist option

---

### Regenerate Page (`app/playlist/[slug]/regenerate/page.tsx`)

Redirects to homepage with regenerate flag.

**Flow**:
1. Fetches playlist by slug
2. Gets YouTube playlist ID
3. Redirects to `/?url={playlistUrl}&regenerate=true`
4. Homepage automatically creates new resources

---

## Data Flow Diagrams

### Resource Creation Flow

```
User Input (YouTube URL)
    ↓
Fetch Playlist (API or DB)
    ↓
User Selects Grade/Subject
    ↓
Click "Create Resources"
    ↓
┌─────────────────────────────────┐
│ Phase 1: Create Assessments     │ → Wayground API (2s delays)
│ Phase 2: Create IVs             │ → Wayground API (2s delays)
│ Phase 3: Wait 150s              │ → Processing delay
│ Phase 4: Fetch Quiz Keys        │ → video_quiz_keys table
│ Phase 5: Fetch Assessments      │ → Wayground API
│ Phase 6: Fetch IVs              │ → Wayground API
│ Phase 7: Fetch Metadata         │ → Quiz keys + Video IDs (cache check)
│ Phase 8: Publish Resources      │ → Wayground API
│ Phase 9: Save to Supabase       │ → Database insert/update
│ Phase 10: Export to Sheets      │ → Google Sheets API
└─────────────────────────────────┘
    ↓
Redirect to Playlist Page
```

### Mapping Flow (Assessment → Video)

```
Video ID (from YouTube)
    ↓
Create Assessment
    ↓
Quiz Gen Key saved to video_quiz_keys
    ↓
[Wait 150s]
    ↓
Fetch Quiz Gen Keys from Assessments
    ↓
Match: quizGenKey → quizId
    ↓
Update items with assessment links
```

---

## Database Relationships

```
playlists (1) ←──────┐
    ↓                  │
    │ (1:N)            │
    ↓                  │
playlist_videos (N)   │
    ↓                  │
    │                  │
    ├─ youtube_video_id (FK to video_quiz_keys)
    ├─ assessment_quiz_id
    └─ interactive_video_quiz_id
            ↓
            │
    ┌───────┴────────┐
    ↓                ↓
video_quiz_keys   quiz_metadata
(videoId→key)     (quizId→key/videoId)
```

---

## Common Debugging Scenarios

### Issue: Resources not showing up after creation
**Solution**:
- Check time window calculation (150s + N*2s)
- Verify quiz gen keys saved to database
- Check console logs for API errors

### Issue: Rate limiting errors
**Solution**:
- Increase base delay between requests
- Check if too many concurrent requests
- Verify retry logic is working

### Issue: Mapping fails (assessment not linked to video)
**Solution**:
- Verify quiz_gen_key saved during creation
- Check Phase 4 fetches keys correctly
- Ensure Phase 7 matches keys correctly

### Issue: Authentication expired
**Solution**:
- Re-run auto-login
- Check cookie expiration
- Update environment variables

### Issue: Google Sheets export fails
**Solution**:
- Verify OAuth tokens in environment
- Check if tokens expired (refresh needed)
- Ensure template spreadsheet accessible

---

## Future Considerations

### Performance Optimizations
- Batch fetching if Wayground API supports multiple quiz IDs per request
- Implement WebSocket for real-time progress updates
- Add Redis caching layer for frequently accessed data
- Optimize database queries with proper indexes

### Feature Enhancements
- Add Cloudinary integration for image optimization
- Support for playlist folders/categories
- Bulk operations (delete, regenerate multiple playlists)
- Advanced filtering and search
- Analytics dashboard

### Code Quality
- Add unit tests for critical mapping logic
- Integration tests for API routes
- E2E tests for main user flows
- Add TypeScript strict mode enforcement
- Implement proper error boundaries

### Monitoring
- Add application performance monitoring (APM)
- Track API rate limit usage
- Monitor database query performance
- Log aggregation and analysis
- Alert system for critical errors

---

## Troubleshooting Guide

### Build Errors

**TypeScript Errors**:
```bash
npm run lint
npm run build
```
Fix type errors before pushing to GitHub.

**Missing Environment Variables**:
- Check `.env.local` file exists
- Verify all required variables are set
- Use `.env.example` as reference

### Runtime Errors

**Database Connection Issues**:
- Verify Supabase credentials
- Check network connectivity
- Ensure service role key has proper permissions

**YouTube API Quota Exceeded**:
- YouTube API has daily quota limits
- Monitor usage in Google Cloud Console
- Consider requesting quota increase

**Wayground API Errors**:
- Check if cookies expired
- Verify CSRF token is valid
- Ensure rate limiting delays are sufficient

---

## Quick Reference

### Useful Commands
```bash
# Development
npm run dev              # Start dev server

# Build & Deploy
npm run build            # Build for production
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint

# Database Scripts
npm run backfill-channels # Backfill channel data
```

### Important URLs
- **Local Dev**: http://localhost:3000
- **Wayground**: https://wayground.com
- **YouTube API Console**: https://console.cloud.google.com/apis/api/youtube.googleapis.com
- **Supabase Dashboard**: https://supabase.com/dashboard

### Key Files
- `/app/page.tsx` - Main application logic
- `/app/api/wayground/**` - Wayground API integration
- `/app/api/playlist/route.ts` - Playlist fetching
- `/lib/supabase.ts` - Database client and types
- `/CLAUDE.md` - This documentation file

---

*Last Updated: December 2025*
*Document Version: 2.0*
*Maintained by: Claude Agent*
