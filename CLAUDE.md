# Claude Code - Development Notes

## Recent Optimizations (November 2025)

### Resource Fetching Flow Optimization

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

#### Technical Details

**Time-based Filtering:**
- Window: `150s + (numVideosInPlaylist * 2)` seconds
- Accounts for 2s gap between each video creation call
- Applied consistently to both assessments and interactive videos

**Retry Logic:**
- Up to 3 retries per resource
- Exponential backoff on rate limits
- Adaptive delays: base 2s + (consecutiveRateLimits * 2s), capped at 30s

**State Management:**
- Quiz gen keys stored in database immediately after assessment creation
- All metadata collected before publishing phase
- Proper mapping between YouTube videos, assessments, and IVs

#### Files Modified

1. `app/page.tsx`
   - `fetchAssessments()` - Lines 1466-1509
   - `fetchInteractivesAndUpdate()` - Lines 275-305
   - `createResources()` - Lines 438-710

2. `lib/supabase.ts`
   - No changes (database schema already supported quiz key storage)

3. `app/api/wayground/create-assessment/route.ts`
   - Already saving quiz gen keys to database (no changes needed)

#### Performance Impact

- **Reduced total fetching time**: ~4x faster with 2s gaps vs 8s gaps
- **Better rate limit compliance**: Adaptive delays prevent excessive retries
- **Simplified code**: Cleaner separation of filtering and fetching logic
- **More predictable**: Single unified phase easier to debug and monitor

#### Future Considerations

- Consider batch fetching if API supports multiple quiz IDs per request
- Monitor rate limit responses and adjust base delay if needed
- Could add Cloudinary integration for image optimization (planned but not implemented)

---

## Architecture Notes

### Resource Creation Flow

The application creates Wayground assessments and interactive videos from YouTube playlists:

1. **YouTube Data**: Fetch playlist and video metadata via YouTube Data API
2. **Resource Creation**: Create assessments and interactive videos on Wayground
3. **Metadata Fetching**: Retrieve quiz gen keys, video IDs, and draft versions
4. **Publishing**: Publish resources and make them public
5. **Storage**: Save to Supabase database with Google Sheets integration

### Key Components

- **Frontend**: Next.js 15.5.4 with React, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes proxying to Wayground API
- **Database**: Supabase (PostgreSQL) for persistent storage
- **External APIs**: YouTube Data API v3, Wayground API, Google Sheets API

### Environment Variables Required

```env
YOUTUBE_API_KEY=<your-youtube-api-key>
WAYGROUND_COOKIE=<session-cookie>
WAYGROUND_CSRF=<csrf-token>
SUPABASE_URL=<supabase-project-url>
SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
GOOGLE_CLIENT_ID=<google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>
```

---

## Development Guidelines

### Code Style
- Use TypeScript strict mode
- Follow Next.js 15 App Router conventions
- Prefer server components, use client components only when needed
- Comprehensive console logging for debugging

### API Route Patterns
- Always log request/response for debugging
- Handle errors gracefully with proper HTTP status codes
- Use descriptive console log prefixes: `[api:route-name]`

### State Management
- Use React hooks for local state
- Minimize global state
- Keep state updates atomic and predictable

---

## Testing Notes

### Manual Testing Checklist
- [ ] Playlist import from YouTube
- [ ] Assessment creation (all videos)
- [ ] Interactive video creation (all videos)
- [ ] Unified metadata fetching with 2s gaps
- [ ] Publishing workflow
- [ ] Google Sheets export
- [ ] Supabase data persistence

### Known Issues
- None currently documented

---

*Last Updated: November 21, 2025*
