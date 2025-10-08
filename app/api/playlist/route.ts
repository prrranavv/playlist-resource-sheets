import { NextResponse } from "next/server";

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

    const res = await fetch(url.toString());
    if (!res.ok) {
      const text = await res.text();
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
    if (!pageToken) break;
  }

  return collected;
}

async function fetchPlaylistTitle(playlistId: string, apiKey: string): Promise<string | null> {
  const url = new URL("https://www.googleapis.com/youtube/v3/playlists");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("id", playlistId);
  url.searchParams.set("key", apiKey);
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = await res.json();
  const title = data?.items?.[0]?.snippet?.title as string | undefined;
  return title ?? null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const urlOrId = searchParams.get("url") || searchParams.get("playlistId");
  if (!urlOrId) {
    return NextResponse.json({ error: "Missing 'url' or 'playlistId' query parameter" }, { status: 400 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Server missing YOUTUBE_API_KEY env var" }, { status: 500 });
  }

  const playlistId = extractPlaylistId(urlOrId);
  if (!playlistId) {
    return NextResponse.json({ error: "Invalid playlist URL or ID" }, { status: 400 });
  }

  try {
    const [items, title] = await Promise.all([
      fetchAllPlaylistItems(playlistId, apiKey),
      fetchPlaylistTitle(playlistId, apiKey),
    ]);
    return NextResponse.json({ playlistId, playlistTitle: title, items });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


