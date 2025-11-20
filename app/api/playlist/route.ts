import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

type YouTubePlaylistItem = {
  id: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
  position: number;
  videoUrl: string;
};

function extractPlaylistId(input: string): string | null {
  try {
    // If it's a URL with list query param
    if (input.includes("list=")) {
      const url = new URL(input);
      const listParam = url.searchParams.get("list");
      if (listParam) return listParam;
    }
  } catch {
    // not a URL, fall through and treat as possible ID
  }
  // If input looks like a raw playlist id
  if (/^[A-Za-z0-9_-]{10,100}$/.test(input)) {
    return input;
  }
  return null;
}

async function fetchAllPlaylistItems(playlistId: string, apiKey: string): Promise<YouTubePlaylistItem[]> {
  console.log(`[api:playlist:fetchItems] Starting fetch for playlist: ${playlistId}`);
  const collected: YouTubePlaylistItem[] = [];
  let pageToken: string | undefined = undefined;
  // Fetch up to a reasonable number of pages to avoid runaway usage
  const maxPages = 50; // 50 pages * 50 results = 2500 max safeguard
  let pagesFetched = 0;

  while (pagesFetched < maxPages) {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", apiKey);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    console.log(`[api:playlist:fetchItems] Fetching page ${pagesFetched + 1}/${maxPages}`);
    const res = await fetch(url.toString());
    if (!res.ok) {
      const text = await res.text();
      console.error(`[api:playlist:fetchItems] YouTube API error: ${res.status} - ${text.substring(0, 200)}`);
      throw new Error(`YouTube API error: ${res.status} ${res.statusText} - ${text}`);
    }
    const data = await res.json();

    type YouTubeApiItem = {
      snippet?: {
        resourceId?: { videoId?: string };
        title?: string;
        thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
        publishedAt?: string;
        position?: number | string;
      };
    };
    const items = (data.items ?? []) as YouTubeApiItem[];
    for (const item of items) {
      const snippet = item.snippet;
      if (!snippet) continue;
      const videoId = snippet.resourceId?.videoId as string | undefined;
      if (!videoId) continue;
      const thumb = snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || "";
      collected.push({
        id: videoId,
        title: snippet.title as string,
        thumbnailUrl: thumb,
        publishedAt: snippet.publishedAt as string,
        position: typeof snippet.position === "number" ? snippet.position : Number(snippet.position) || collected.length,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}`,
      });
    }

    pageToken = data.nextPageToken as string | undefined;
    pagesFetched += 1;
    console.log(`[api:playlist:fetchItems] Page ${pagesFetched} collected ${items.length} items (total: ${collected.length})`);
    if (!pageToken) {
      console.log(`[api:playlist:fetchItems] No more pages, fetch complete`);
      break;
    }
  }

  console.log(`[api:playlist:fetchItems] Total items fetched: ${collected.length}`);
  return collected;
}

async function fetchPlaylistMeta(
  playlistId: string,
  apiKey: string
): Promise<{ title: string | null; channelTitle: string | null }> {
  const url = new URL("https://www.googleapis.com/youtube/v3/playlists");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("id", playlistId);
  url.searchParams.set("key", apiKey);
  const res = await fetch(url.toString());
  if (!res.ok) return { title: null, channelTitle: null };
  const data = await res.json();
  const snippet = data?.items?.[0]?.snippet as
    | { title?: string; channelTitle?: string }
    | undefined;
  return {
    title: snippet?.title ?? null,
    channelTitle: snippet?.channelTitle ?? null,
  };
}

export async function GET(request: Request) {
  console.log('[api:playlist] Request received');
  const { searchParams } = new URL(request.url);
  const urlOrId = searchParams.get("url") || searchParams.get("playlistId");
  
  if (!urlOrId) {
    console.log('[api:playlist] Error: Missing URL or playlist ID parameter');
    return NextResponse.json({ error: "Missing 'url' or 'playlistId' query parameter" }, { status: 400 });
  }

  console.log(`[api:playlist] Input: ${urlOrId.substring(0, 100)}`);

  const playlistId = extractPlaylistId(urlOrId);
  if (!playlistId) {
    console.log('[api:playlist] Error: Invalid playlist URL or ID format');
    return NextResponse.json({ error: "Invalid playlist URL or ID" }, { status: 400 });
  }

  console.log(`[api:playlist] Extracted playlist ID: ${playlistId}`);

  // Check if playlist already exists in Supabase
  try {
    console.log('[api:playlist] Checking if playlist exists in Supabase...');
    const { data: existingPlaylist, error: playlistError } = await supabaseAdmin
      .from('playlists')
      .select('*')
      .eq('youtube_playlist_id', playlistId)
      .single();

    if (existingPlaylist && !playlistError) {
      console.log(`[api:playlist] Found existing playlist in Supabase: ${existingPlaylist.title}`);
      
      // Fetch associated videos
      const { data: videos, error: videosError } = await supabaseAdmin
        .from('playlist_videos')
        .select('*')
        .eq('playlist_id', existingPlaylist.id)
        .order('order_index', { ascending: true });

      if (videosError) {
        console.error('[api:playlist] Error fetching videos from Supabase:', videosError);
      } else if (videos) {
        console.log(`[api:playlist] Found ${videos.length} videos in Supabase`);
        
        // Transform Supabase data to match YouTube API response format
        const items = videos.map(video => ({
          id: video.youtube_video_id,
          title: video.title,
          thumbnailUrl: video.thumbnail_url || '',
          publishedAt: video.created_at,
          position: video.order_index,
          videoUrl: `https://www.youtube.com/watch?v=${video.youtube_video_id}&list=${playlistId}`,
          // Include the assessment and IV data
          assessmentQuizId: video.assessment_quiz_id,
          assessmentLink: video.assessment_link,
          interactiveVideoQuizId: video.interactive_video_quiz_id,
          interactiveVideoLink: video.interactive_video_link,
        }));

        return NextResponse.json({
          playlistId,
          playlistTitle: existingPlaylist.title,
          channelTitle: existingPlaylist.channel_title,
          grade: existingPlaylist.grade,
          subject: existingPlaylist.subject,
          slug: existingPlaylist.slug, // Include the slug for the correct URL
          items,
          fromDatabase: true, // Flag to indicate this came from the database
        });
      }
    } else {
      console.log('[api:playlist] Playlist not found in Supabase, fetching from YouTube...');
    }
  } catch (dbError) {
    console.error('[api:playlist] Error checking Supabase:', dbError);
    // Continue to YouTube API if Supabase check fails
  }

  // If not in Supabase, fetch from YouTube API
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error('[api:playlist] Error: YOUTUBE_API_KEY not configured');
    return NextResponse.json({ error: "Server missing YOUTUBE_API_KEY env var" }, { status: 500 });
  }

  try {
    console.log('[api:playlist] Fetching playlist data from YouTube API');
    const [items, meta] = await Promise.all([
      fetchAllPlaylistItems(playlistId, apiKey),
      fetchPlaylistMeta(playlistId, apiKey),
    ]);
    console.log(`[api:playlist] Success: Fetched ${items.length} items, title="${meta.title}", channel="${meta.channelTitle}"`);
    return NextResponse.json({ 
      playlistId, 
      playlistTitle: meta.title, 
      channelTitle: meta.channelTitle, 
      items,
      fromDatabase: false, // Flag to indicate this is fresh from YouTube
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[api:playlist] Error fetching playlist: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


