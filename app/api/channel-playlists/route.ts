import { NextResponse } from "next/server";

type YouTubePlaylist = {
  id: string;
  title: string;
  thumbnailUrl: string;
  videoCount: number;
  publishedAt: string;
};

async function fetchChannelPlaylists(channelId: string, apiKey: string, maxResults: number = 5, offset: number = 0): Promise<YouTubePlaylist[]> {
  console.log(`[api:channel-playlists] Fetching playlists for channel: ${channelId}, maxResults: ${maxResults}, offset: ${offset}`);
  
  const allPlaylists: YouTubePlaylist[] = [];
  let pageToken: string | undefined = undefined;
  let pagesFetched = 0;
  const maxPages = 10; // Allow more pages for pagination

  // First, fetch enough playlists to cover the offset + maxResults
  while (pagesFetched < maxPages && allPlaylists.length < offset + maxResults) {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlists");
    url.searchParams.set("part", "snippet,contentDetails");
    url.searchParams.set("channelId", channelId);
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", apiKey);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const text = await res.text();
      console.error(`[api:channel-playlists] YouTube API error: ${res.status} - ${text.substring(0, 200)}`);
      break;
    }

    const data = await res.json();
    const items = data.items || [];

    for (const item of items) {
      const snippet = item.snippet;
      const contentDetails = item.contentDetails;
      
      if (!snippet) continue;

      const thumbnailUrl = snippet.thumbnails?.high?.url 
        || snippet.thumbnails?.medium?.url 
        || snippet.thumbnails?.default?.url 
        || "";

      allPlaylists.push({
        id: item.id,
        title: snippet.title || "",
        thumbnailUrl,
        videoCount: parseInt(contentDetails?.itemCount || "0", 10),
        publishedAt: snippet.publishedAt || "",
      });
    }

    pageToken = data.nextPageToken;
    pagesFetched++;
    
    if (!pageToken) break;
  }

  // Apply offset and limit
  const playlists = allPlaylists.slice(offset, offset + maxResults);
  console.log(`[api:channel-playlists] Fetched ${playlists.length} playlists (offset: ${offset}, total available: ${allPlaylists.length})`);
  return playlists;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");
    const maxResults = parseInt(searchParams.get("maxResults") || "5", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    if (!channelId) {
      return NextResponse.json({ error: "channelId query parameter required" }, { status: 400 });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      console.error('[api:channel-playlists] Error: YOUTUBE_API_KEY not configured');
      return NextResponse.json({ error: "Server missing YOUTUBE_API_KEY env var" }, { status: 500 });
    }

    const playlists = await fetchChannelPlaylists(channelId, apiKey, maxResults, offset);
    
    return NextResponse.json({ playlists });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[api:channel-playlists] Error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

