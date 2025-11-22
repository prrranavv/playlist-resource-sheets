# Claude Code - Development Notes & Implementation Knowledge Base

## Overview

This is a Next.js application that creates Wayground assessments and interactive videos from YouTube playlists. It automates the entire workflow from playlist import to resource creation, publishing, and database storage.

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

```env
# YouTube API
YOUTUBE_API_KEY=<your-youtube-api-key>

# Wayground (optional, can use browser cookies)
WAYGROUND_COOKIE=<session-cookie>
WAYGROUND_CSRF=<csrf-token>

# Supabase
SUPABASE_URL=<supabase-project-url>
SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>

# Google OAuth (for Sheets export)
GOOGLE_CLIENT_ID=<google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>
NEXTAUTH_URL=<your-app-url>
NEXTAUTH_SECRET=<nextauth-secret>
```

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

## Future Considerations

- Batch fetching if API supports multiple quiz IDs per request
- Monitor rate limit responses and adjust base delay if needed
- Add Cloudinary integration for image optimization
- Consider WebSocket for real-time progress updates
- Add unit tests for critical mapping logic

---

*Last Updated: December 2025*
