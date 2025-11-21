import { supabaseAdmin } from '@/lib/supabase';
import { notFound } from 'next/navigation';
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
import { getYouTubeThumbnailUrl } from '@/lib/utils';

interface PageProps {
  params: Promise<{
    channelId: string;
  }>;
}

export default async function ChannelPage({ params }: PageProps) {
  const { channelId } = await params;

  console.log('[ChannelPage] Loading channel with ID:', channelId);

  // Fetch playlists for this channel
  const { data: playlists, error: playlistsError } = await supabaseAdmin
    .from('playlists')
    .select('*')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false });

  if (playlistsError) {
    console.error('[ChannelPage] Error fetching playlists:', playlistsError);
    notFound();
  }

  if (!playlists || playlists.length === 0) {
    console.error('[ChannelPage] No playlists found for channel:', channelId);
    notFound();
  }

  const channel = {
    channel_id: playlists[0].channel_id,
    channel_title: playlists[0].channel_title,
    channel_thumbnail: playlists[0].channel_thumbnail
  };

  console.log('[ChannelPage] Channel found:', channel.channel_title, 'with', playlists.length, 'playlists');

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
                <h1 className="text-3xl font-bold">{channel.channel_title}</h1>
                <p className="text-muted-foreground">{playlists.length} playlists</p>
              </div>
            </div>

            {/* Playlists Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {playlists.map((playlist) => (
                <Link
                  key={playlist.id}
                  href={`/playlist/${playlist.slug}`}
                  className="block group"
                >
                  <div className="relative pb-3">
                    {/* Stack effect layers */}
                    <div className="absolute bottom-0 left-3 right-3 h-3 bg-muted-foreground/27 rounded-lg" />
                    <div className="absolute bottom-1.5 left-1.5 right-1.5 h-2.5 bg-muted-foreground/36 rounded-lg" />
                    
                    {/* Thumbnail container */}
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted transition-all duration-200 group-hover:scale-[1.03] group-hover:shadow-lg shadow-sm">
                      {(() => {
                        const thumbnailUrl = getYouTubeThumbnailUrl(playlist.thumbnail_url);
                        return thumbnailUrl ? (
                          <Image
                            src={thumbnailUrl}
                            alt={playlist.title}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <Image 
                              src="/youtube.png" 
                              alt="YouTube" 
                              width={48}
                              height={48}
                              className="opacity-30"
                            />
                          </div>
                        );
                      })()}
                      
                      {/* Video count badge - top right with icon */}
                      {playlist.video_count && (
                        <div className="absolute top-1.5 right-1.5 bg-background/95 backdrop-blur-sm text-foreground text-[10px] font-medium px-1.5 py-0.5 rounded border border-border shadow-sm flex items-center gap-0.5">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                          </svg>
                          {playlist.video_count}
                        </div>
                      )}
                      
                      {/* Info overlay - bottom */}
                      <div className="absolute bottom-0 left-0 right-0 p-1.5">
                        <div className="bg-background/98 backdrop-blur-md rounded p-1.5 border border-border shadow-lg">
                          <div className="flex items-center gap-1.5">
                            {/* Channel thumbnail */}
                            {playlist.channel_thumbnail ? (
                              <div className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border">
                                <Image 
                                  src={playlist.channel_thumbnail} 
                                  alt={playlist.channel_title || ''} 
                                  fill 
                                  sizes="20px"
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div className="h-5 w-5 shrink-0 rounded-full bg-muted flex items-center justify-center ring-1 ring-border">
                                <Image 
                                  src="/youtube.png" 
                                  alt="YouTube" 
                                  width={10}
                                  height={10}
                                  className="opacity-50"
                                />
                              </div>
                            )}
                            
                            {/* Text content */}
                            <div className="flex-1 min-w-0">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <h3 className="text-sm font-semibold truncate text-foreground leading-tight">
                                      {playlist.title}
                                    </h3>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">{playlist.title}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              {playlist.channel_title && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <p className="text-[13px] text-muted-foreground truncate leading-tight">
                                        {playlist.channel_title}
                                      </p>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{playlist.channel_title}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

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

