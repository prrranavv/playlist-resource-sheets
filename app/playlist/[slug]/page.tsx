import { supabaseAdmin } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import PlaylistActions from './PlaylistActions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getSubjectIcon } from '@/lib/icons';
import { getYouTubeThumbnailUrl } from '@/lib/utils';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function PlaylistPage({ params }: PageProps) {
  const { slug } = await params;

  console.log('[PlaylistPage] Loading playlist with slug:', slug);

  // Fetch playlist data
  const { data: playlist, error: playlistError } = await supabaseAdmin
    .from('playlists')
    .select('*')
    .eq('slug', slug)
    .single();

  if (playlistError) {
    console.error('[PlaylistPage] Error fetching playlist:', playlistError);
    notFound();
  }

  if (!playlist) {
    console.error('[PlaylistPage] No playlist found for slug:', slug);
    notFound();
  }

  console.log('[PlaylistPage] Playlist found:', playlist.id, playlist.title);

  // Fetch videos for this playlist
  const { data: videos, error: videosError } = await supabaseAdmin
    .from('playlist_videos')
    .select('*')
    .eq('playlist_id', playlist.id)
    .order('order_index', { ascending: true });

  if (videosError) {
    console.error('[PlaylistPage] Error fetching videos:', videosError);
  }

  console.log('[PlaylistPage] Videos fetched:', videos?.length || 0);

  // Fetch other playlists (excluding current one)
  const { data: otherPlaylists, error: otherPlaylistsError } = await supabaseAdmin
    .from('playlists')
    .select('id, title, slug, thumbnail_url, video_count, channel_title, channel_thumbnail, channel_id, subject, grade')
    .neq('id', playlist.id);

  if (otherPlaylistsError) {
    console.error('[PlaylistPage] Error fetching other playlists:', otherPlaylistsError);
  }

  console.log('[PlaylistPage] Other playlists fetched:', otherPlaylists?.length || 0);

  // Sort and group playlists: Same channel > Same subject > Others
  const sameChannelPlaylists = otherPlaylists?.filter(p => p.channel_id === playlist.channel_id) || [];
  const sameSubjectPlaylists = otherPlaylists?.filter(p => p.channel_id !== playlist.channel_id && p.subject === playlist.subject) || [];
  const otherSubjectPlaylists = otherPlaylists?.filter(p => p.channel_id !== playlist.channel_id && p.subject !== playlist.subject) || [];

  // Group by subject for sections
  const groupedPlaylists: Array<{ section: string; icon: string; playlists: typeof otherPlaylists }> = [];
  
  // Same channel section
  if (sameChannelPlaylists.length > 0) {
    groupedPlaylists.push({
      section: `More from ${playlist.channel_title}`,
      icon: 'channel',
      playlists: sameChannelPlaylists
    });
  }

  // Same subject section
  if (sameSubjectPlaylists.length > 0) {
    groupedPlaylists.push({
      section: playlist.subject || 'Other',
      icon: 'subject',
      playlists: sameSubjectPlaylists
    });
  }

  // Other subjects grouped
  const otherSubjectsGrouped = otherSubjectPlaylists.reduce((acc, p) => {
    const subject = p.subject || 'Other';
    if (!acc[subject]) {
      acc[subject] = [];
    }
    acc[subject].push(p);
    return acc;
  }, {} as Record<string, typeof otherPlaylists>);

  Object.entries(otherSubjectsGrouped).forEach(([subject, playlists]) => {
    groupedPlaylists.push({
      section: subject,
      icon: 'subject',
      playlists
    });
  });

  // Fetch all unique channels
  const { data: allPlaylists, error: allPlaylistsError } = await supabaseAdmin
    .from('playlists')
    .select('channel_id, channel_title, channel_thumbnail');

  if (allPlaylistsError) {
    console.error('[PlaylistPage] Error fetching all playlists for channels:', allPlaylistsError);
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
                  {sortedChannels.map((channel) => (
                    <Link
                      key={channel.channel_id}
                      href={`/channel/${channel.channel_id}`}
                      className={`block group rounded-lg p-2.5 transition-all duration-200 hover:bg-muted ${
                        channel.channel_id === playlist.channel_id ? 'bg-muted/50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Channel thumbnail */}
                        {channel.channel_thumbnail ? (
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted ring-2 ring-border">
                            <Image 
                              src={channel.channel_thumbnail} 
                              alt={channel.channel_title || ''} 
                              fill 
                              sizes="40px"
                              className="object-cover" 
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
                                  {channel.channel_title}
                                </h3>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{channel.channel_title}</p>
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
        {/* Playlist Card with Videos */}
        <Card>
          <CardContent className="py-0">
            <div className="flex gap-4">
              {/* Playlist Thumbnail */}
              {(() => {
                // For playlist thumbnail, try to use the first video's thumbnail
                const firstVideoId = videos && videos.length > 0 ? videos[0].youtube_video_id : null;
                const thumbnailUrl = getYouTubeThumbnailUrl(playlist.thumbnail_url, firstVideoId);
                return thumbnailUrl ? (
                  <a 
                    href={`https://www.youtube.com/playlist?list=${playlist.youtube_playlist_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative h-32 w-48 shrink-0 overflow-hidden rounded-lg bg-muted hover:opacity-80 transition-opacity"
                  >
                    <Image 
                      src={thumbnailUrl} 
                      alt={playlist.title} 
                      fill 
                      sizes="192px"
                      className="object-cover" 
                    />
                  </a>
                ) : null;
              })()}
              
              {/* Playlist Info */}
              <div className="flex-1 min-w-0 space-y-3">
                {playlist.channel_title && (
                  <a 
                    href={playlist.channel_id ? `https://www.youtube.com/channel/${playlist.channel_id}` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  >
                    {playlist.channel_thumbnail ? (
                      <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-muted">
                        <Image 
                          src={playlist.channel_thumbnail} 
                          alt={playlist.channel_title} 
                          fill 
                          sizes="24px"
                          className="object-cover" 
                        />
                      </div>
                    ) : (
                      <Image 
                        src="/youtube.png" 
                        alt="YouTube" 
                        width={20}
                        height={20}
                        className="h-5 w-5"
                      />
                    )}
                    <p className="text-sm font-medium text-muted-foreground">
                      {playlist.channel_title}
                    </p>
                  </a>
                )}
                
                <h1 className="text-2xl font-bold leading-tight">
                  {playlist.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-2">
                  {playlist.subject && (
                    <span className="inline-flex items-center rounded-md bg-transparent px-2.5 py-1 text-xs font-medium text-black border border-black">
                      {playlist.subject}
                    </span>
                  )}
                  {playlist.grade && (
                    <span className="inline-flex items-center rounded-md bg-transparent px-2.5 py-1 text-xs font-medium text-black border border-black">
                      {playlist.grade}
                    </span>
                  )}
                  <span className="text-sm text-muted-foreground">
                    • {playlist.video_count} videos
                  </span>
                </div>
              </div>
            </div>
          </CardContent>

          {/* Action Buttons - Copy Link and Export */}
          {videos && videos.length > 0 && (
            <div className="border-t border-b bg-muted/60">
              <div className="grid grid-cols-2 divide-x">
                <PlaylistActions 
                  playlistUrl={`/playlist/${playlist.slug}`}
                  playlistTitle={playlist.title}
                  playlistId={playlist.youtube_playlist_id}
                  videos={videos || []}
                  googleSheetUrl={playlist.google_sheet_url}
                  channelTitle={playlist.channel_title}
                />
              </div>
            </div>
          )}

          {/* Videos List */}
          {videos && videos.length > 0 && (
            <div className="border-b">
              <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead className="max-w-0">YouTube Video</TableHead>
                      <TableHead className="w-24 text-center">Assessment</TableHead>
                      <TableHead className="w-32 text-center">Interactive Video</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {videos.map((video) => {
                      const utmParams = `utm_source=community&utm_medium=appplaylistpage&utm_term=${encodeURIComponent(playlist.title || '')}`;
                      const assessmentLink = video.assessment_link ? `${video.assessment_link}${video.assessment_link.includes('?') ? '&' : '?'}${utmParams}` : "";
                      const ivLink = video.interactive_video_link ? `${video.interactive_video_link}${video.interactive_video_link.includes('?') ? '&' : '?'}${utmParams}` : "";
                      
                      return (
                        <TableRow key={video.id}>
                          <TableCell className="text-xs text-muted-foreground">
                            {video.order_index + 1}.
                          </TableCell>
                          <TableCell className="max-w-0">
                            <a 
                              href={`https://www.youtube.com/watch?v=${video.youtube_video_id}`}
                              target="_blank" 
                              rel="noreferrer" 
                              className="flex items-center gap-3 hover:underline min-w-0"
                            >
                              {(() => {
                                const thumbnailUrl = getYouTubeThumbnailUrl(video.thumbnail_url, video.youtube_video_id);
                                return thumbnailUrl ? (
                                  <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded bg-muted">
                                    <Image 
                                      src={thumbnailUrl} 
                                      alt={video.title} 
                                      fill 
                                      sizes="64px" 
                                      className="object-cover" 
                                    />
                                  </div>
                                ) : (
                                  <div className="h-10 w-16 shrink-0 rounded bg-muted" />
                                );
                              })()}
                               <TooltipProvider>
                                 <Tooltip>
                                   <TooltipTrigger asChild>
                                     <span className="text-sm font-medium truncate">{video.title}</span>
                                   </TooltipTrigger>
                                   <TooltipContent>
                                     <p className="max-w-xs">{video.title}</p>
                                   </TooltipContent>
                                 </Tooltip>
                               </TooltipProvider>
                             </a>
                           </TableCell>
                          <TableCell className="text-center w-24">
                            {assessmentLink && (
                              <a 
                                href={assessmentLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-block relative group"
                                title="Open Assessment"
                              >
                                <Image 
                                  src="https://cf.quizizz.com/image/Assessment.png" 
                                  alt="Assessment" 
                                  width={32} 
                                  height={32}
                                  className="hover:opacity-80 transition-opacity mx-auto"
                                  unoptimized
                                />
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                  Open Assessment
                                </span>
                              </a>
                            )}
                          </TableCell>
                          <TableCell className="text-center w-32">
                            {ivLink && (
                              <a 
                                href={ivLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-block relative group"
                                title="Open Interactive Video"
                              >
                                <Image 
                                  src="https://cf.quizizz.com/image/Video.png" 
                                  alt="Interactive Video" 
                                  width={32} 
                                  height={32}
                                  className="hover:opacity-80 transition-opacity mx-auto"
                                  unoptimized
                                />
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                  Open Interactive Video
                                </span>
                              </a>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        {(!videos || videos.length === 0) && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No videos found for this playlist.
            </CardContent>
          </Card>
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

          {/* Sidebar - Other Playlists */}
          {otherPlaylists && otherPlaylists.length > 0 && groupedPlaylists && (
            <aside className="w-full lg:w-64 shrink-0 order-3">
              <div className="sticky top-6 flex flex-col max-h-[calc(100vh-3rem)]">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <h2 className="text-lg font-semibold">Other Playlists</h2>
                </div>
                
                <div className="overflow-y-auto space-y-5 pr-2 scrollbar-thin">
                  {groupedPlaylists.map((group, groupIndex) => (
                    <div key={groupIndex} className="space-y-3">
                      {/* Section header with icon */}
                      <div className="flex items-center gap-2 px-0.5">
                        {group.icon === 'channel' ? (
                          <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        ) : (
                          getSubjectIcon(group.section, "w-4 h-4 text-muted-foreground")
                        )}
                        <h3 className="text-sm font-medium text-muted-foreground">
                          {group.section}
                        </h3>
                      </div>
                      
                      {/* Playlists in this group */}
                      <div className="space-y-3">
                        {group.playlists?.map((otherPlaylist) => (
                          <Link
                            key={otherPlaylist.id}
                            href={`/playlist/${otherPlaylist.slug}`}
                            className="block group"
                          >
                            <div className="relative pb-4">
                              {/* Stack effect layers - more subtle */}
                              <div className="absolute bottom-0 left-4 right-4 h-4 bg-muted-foreground/27 rounded-lg" />
                              <div className="absolute bottom-2 left-2 right-2 h-3 bg-muted-foreground/36 rounded-lg" />
                              
                              {/* Thumbnail container */}
                              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-muted transition-all duration-200 group-hover:scale-[1.03] group-hover:shadow-lg shadow-sm">
                                {(() => {
                                  const thumbnailUrl = getYouTubeThumbnailUrl(otherPlaylist.thumbnail_url);
                                  return thumbnailUrl ? (
                                    <Image
                                      src={thumbnailUrl}
                                      alt={otherPlaylist.title}
                                      fill
                                      sizes="256px"
                                      className="object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-muted">
                                      <Image 
                                        src="/youtube.png" 
                                        alt="YouTube" 
                                        width={28}
                                        height={28}
                                        className="opacity-30"
                                      />
                                    </div>
                                  );
                                })()}
                                
                                {/* Video count badge - top right with icon */}
                                {otherPlaylist.video_count && (
                                  <div className="absolute top-2 right-2 bg-background/95 backdrop-blur-sm text-foreground text-[11px] font-medium px-2 py-1 rounded-md border border-border shadow-sm flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                                    </svg>
                                    {otherPlaylist.video_count}
                                  </div>
                                )}
                                
                                {/* Info overlay - bottom with enhanced visibility */}
                                <div className="absolute bottom-0 left-0 right-0 p-2">
                                  <div className="bg-background/98 backdrop-blur-md rounded-md p-2 border-2 border-border shadow-lg">
                                    <div className="flex items-center gap-2">
                                      {/* Channel thumbnail */}
                                      {otherPlaylist.channel_thumbnail ? (
                                        <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-muted ring-2 ring-border">
                                          <Image 
                                            src={otherPlaylist.channel_thumbnail} 
                                            alt={otherPlaylist.channel_title || ''} 
                                            fill 
                                            sizes="24px"
                                            className="object-cover" 
                                          />
                                        </div>
                                      ) : (
                                        <div className="h-6 w-6 shrink-0 rounded-full bg-muted flex items-center justify-center ring-2 ring-border">
                                          <Image 
                                            src="/youtube.png" 
                                            alt="YouTube" 
                                            width={12}
                                            height={12}
                                            className="opacity-50"
                                          />
                                        </div>
                                      )}
                                      
                                      {/* Text content - larger and single line */}
                                      <div className="flex-1 min-w-0">
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <h3 className="text-sm font-semibold truncate text-foreground">
                                                {otherPlaylist.title}
                                              </h3>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p className="max-w-xs">{otherPlaylist.title}</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                        {otherPlaylist.channel_title && (
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <p className="text-[13px] text-muted-foreground truncate">
                                                  {otherPlaylist.channel_title}
                                                </p>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>{otherPlaylist.channel_title}</p>
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
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

