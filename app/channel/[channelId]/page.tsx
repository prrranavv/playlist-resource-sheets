import { supabaseAdmin } from '@/lib/supabase';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import PlaylistCard from './PlaylistCard';
import LoadMorePlaylists from './LoadMorePlaylists';

interface PageProps {
  params: Promise<{
    channelId: string;
  }>;
}

export default async function ChannelPage({ params }: PageProps) {
  const { channelId } = await params;

  console.log('[ChannelPage] Loading channel with ID:', channelId);

  // Fetch playlists for this channel
  const { data: playlistsData, error: playlistsError } = await supabaseAdmin
    .from('playlists')
    .select('*')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false });

  if (playlistsError) {
    console.error('[ChannelPage] Error fetching playlists:', playlistsError);
  }

  const playlists = playlistsData || [];

  // If no playlists in database, try to get channel info from YouTube API
  let channel = {
    channel_id: channelId,
    channel_title: null as string | null,
    channel_thumbnail: null as string | null
  };

  if (playlists && playlists.length > 0) {
    channel = {
      channel_id: playlists[0].channel_id,
      channel_title: playlists[0].channel_title,
      channel_thumbnail: playlists[0].channel_thumbnail
    };
    console.log('[ChannelPage] Channel found:', channel.channel_title, 'with', playlists.length, 'playlists');
  } else {
    console.log('[ChannelPage] No playlists in database, will fetch from YouTube');
    
    // Try to get channel info from YouTube API
    try {
      const apiKey = process.env.YOUTUBE_API_KEY;
      if (apiKey) {
        const channelUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
        channelUrl.searchParams.set("part", "snippet");
        channelUrl.searchParams.set("id", channelId);
        channelUrl.searchParams.set("key", apiKey);
        
        const channelRes = await fetch(channelUrl.toString(), { cache: 'no-store' });
        if (channelRes.ok) {
          const channelData = await channelRes.json();
          const channelSnippet = channelData?.items?.[0]?.snippet;
          if (channelSnippet) {
            channel.channel_title = channelSnippet.title || null;
            channel.channel_thumbnail = channelSnippet.thumbnails?.medium?.url || channelSnippet.thumbnails?.default?.url || null;
            console.log('[ChannelPage] Fetched channel info from YouTube:', channel.channel_title);
          }
        }
      }
    } catch (err) {
      console.error('[ChannelPage] Error fetching channel info:', err);
    }
  }

  // Fetch additional playlists from YouTube API
  const youtubePlaylists: Array<{
    id: string;
    title: string;
    thumbnailUrl: string;
    videoCount: number;
    publishedAt: string;
  }> = [];

  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (apiKey && channelId) {
      const url = new URL("https://www.googleapis.com/youtube/v3/playlists");
      url.searchParams.set("part", "snippet,contentDetails");
      url.searchParams.set("channelId", channelId);
      url.searchParams.set("maxResults", "50");
      url.searchParams.set("key", apiKey);

      const res = await fetch(url.toString(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        
        // Get existing playlist IDs to filter them out
        const existingPlaylistIds = new Set(playlists.map(p => p.youtube_playlist_id));
        
        for (const item of items) {
          if (youtubePlaylists.length >= 5) break;
          if (existingPlaylistIds.has(item.id)) continue; // Skip existing playlists
          
          const snippet = item.snippet;
          const contentDetails = item.contentDetails;
          if (!snippet) continue;

          const thumbnailUrl = snippet.thumbnails?.high?.url 
            || snippet.thumbnails?.medium?.url 
            || snippet.thumbnails?.default?.url 
            || "";

          youtubePlaylists.push({
            id: item.id,
            title: snippet.title || "",
            thumbnailUrl,
            videoCount: parseInt(contentDetails?.itemCount || "0", 10),
            publishedAt: snippet.publishedAt || "",
          });
        }
        
        console.log('[ChannelPage] Fetched', youtubePlaylists.length, 'additional playlists from YouTube');
      }
    }
  } catch (err) {
    console.error('[ChannelPage] Error fetching YouTube playlists:', err);
  }

  // Fetch all unique channels for sidebar
  const { data: allPlaylists, error: allPlaylistsError } = await supabaseAdmin
    .from('playlists')
    .select('channel_id, channel_title, channel_thumbnail');

  if (allPlaylistsError) {
    console.error('[ChannelPage] Error fetching all playlists for channels:', allPlaylistsError);
  }

  // Get unique channels with playlist counts
  const channelsMap = new Map<string, { channel_id: string; channel_title: string; channel_thumbnail: string; playlistCount: number }>();
  allPlaylists?.forEach(p => {
    if (p.channel_id) {
      if (!channelsMap.has(p.channel_id)) {
        channelsMap.set(p.channel_id, {
          channel_id: p.channel_id,
          channel_title: p.channel_title,
          channel_thumbnail: p.channel_thumbnail,
          playlistCount: 1
        });
      } else {
        const existing = channelsMap.get(p.channel_id)!;
        existing.playlistCount++;
      }
    }
  });

  const allChannels = Array.from(channelsMap.values());
  
  // Sort channels by playlist count descending
  const sortedChannels = allChannels.sort((a, b) => {
    return b.playlistCount - a.playlistCount;
  });

  return (
    <div className="min-h-screen font-sans p-6 sm:p-10">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar - Channels */}
          {sortedChannels && sortedChannels.length > 0 && (
            <aside className="w-full lg:w-56 shrink-0 order-2 lg:order-1">
              <div className="sticky top-6 flex flex-col max-h-[calc(100vh-3rem)]">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <h2 className="text-lg font-semibold">Channels</h2>
                </div>
                
                <div className="overflow-y-auto space-y-1.5 pr-2 scrollbar-thin">
                  {sortedChannels.map((ch) => (
                    <Link
                      key={ch.channel_id}
                      href={`/channel/${ch.channel_id}`}
                      className={`block group rounded-lg p-2.5 transition-all duration-200 hover:bg-muted ${
                        ch.channel_id === channelId ? 'bg-muted/50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Channel thumbnail */}
                        {ch.channel_thumbnail ? (
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted ring-2 ring-border">
                            <Image 
                              src={ch.channel_thumbnail} 
                              alt={ch.channel_title || ''} 
                              fill 
                              sizes="40px"
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="h-10 w-10 shrink-0 rounded-full bg-muted flex items-center justify-center ring-2 ring-border">
                            <Image 
                              src="/youtube.png" 
                              alt="YouTube" 
                              width={20}
                              height={20}
                              className="opacity-50"
                            />
                          </div>
                        )}
                        
                        {/* Channel name */}
                        <div className="flex-1 min-w-0">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <h3 className="text-sm font-medium truncate text-foreground group-hover:text-primary transition-colors">
                                  {ch.channel_title}
                                </h3>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{ch.channel_title}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          )}

          {/* Main Content */}
          <div className="flex-1 space-y-6 min-w-0 order-1 lg:order-2">
            {/* Channel Header */}
            <div className="flex items-center gap-4 pb-4 border-b">
              {channel.channel_thumbnail ? (
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-muted ring-2 ring-border">
                  <Image 
                    src={channel.channel_thumbnail} 
                    alt={channel.channel_title || ''} 
                    fill 
                    sizes="80px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="h-20 w-20 shrink-0 rounded-full bg-muted flex items-center justify-center ring-2 ring-border">
                  <Image 
                    src="/youtube.png" 
                    alt="YouTube" 
                    width={40}
                    height={40}
                    className="opacity-50"
                  />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold">{channel.channel_title || 'Channel'}</h1>
                <p className="text-muted-foreground">
                  {playlists.length > 0 ? `${playlists.length} playlists` : 'No playlists yet'}
                  {youtubePlaylists.length > 0 && ` • ${youtubePlaylists.length} more available`}
                </p>
              </div>
            </div>

            {/* Existing Playlists on Wayground */}
            {playlists.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h2 className="text-xl font-semibold">Existing on Wayground</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {playlists.map((playlist) => (
                    <PlaylistCard
                      key={playlist.id}
                      playlist={{
                        id: playlist.id,
                        title: playlist.title,
                        thumbnailUrl: playlist.thumbnail_url,
                        videoCount: playlist.video_count,
                        channelThumbnail: playlist.channel_thumbnail,
                        channelTitle: playlist.channel_title,
                        slug: playlist.slug,
                      }}
                      showCreateOverlay={false}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Other Playlists from This Creator */}
            {youtubePlaylists.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <h2 className="text-xl font-semibold">Other Playlists from This Creator</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <LoadMorePlaylists
                    channelId={channelId}
                    existingPlaylistIds={new Set(playlists.map(p => p.youtube_playlist_id))}
                    channelThumbnail={channel.channel_thumbnail}
                    channelTitle={channel.channel_title}
                    initialPlaylists={youtubePlaylists}
                  />
                </div>
              </div>
            )}

            {/* Call to Action Banner */}
            <Card className="border-2 border-dashed border-muted-foreground/25 bg-muted/30">
              <CardContent className="py-10">
                <div className="flex flex-col items-center justify-center gap-4 text-center">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Image 
                      src="/youtube.png" 
                      alt="YouTube" 
                      width={32}
                      height={32}
                      className="h-8 w-8"
                    />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">
                      Found it useful?
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Create Wayground assessments and interactive videos from your own YouTube playlists
                    </p>
                  </div>
                  <Link href="/">
                    <Button size="lg" className="gap-2">
                      Try with your playlist
                      <span>→</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

