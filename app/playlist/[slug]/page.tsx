import { supabaseAdmin } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import PlaylistActions from './PlaylistActions';

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

  return (
    <div className="min-h-screen font-sans p-6 sm:p-10">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Playlist Card with Videos */}
        <Card>
          <CardContent className="py-0">
            <div className="flex gap-4">
              {/* Playlist Thumbnail */}
              {playlist.thumbnail_url && (
                <div className="relative h-32 w-48 shrink-0 overflow-hidden rounded-lg bg-muted">
                  <Image 
                    src={playlist.thumbnail_url} 
                    alt={playlist.title} 
                    fill 
                    sizes="192px"
                    className="object-cover" 
                  />
                </div>
              )}
              
              {/* Playlist Info */}
              <div className="flex-1 min-w-0 space-y-3">
                {playlist.channel_title && (
                  <div className="flex items-center gap-2">
                    <Image 
                      src="/youtube.png" 
                      alt="YouTube" 
                      width={20}
                      height={20}
                      className="h-5 w-5"
                    />
                    <p className="text-sm font-medium text-muted-foreground">
                      {playlist.channel_title}
                    </p>
                  </div>
                )}
                
                <h1 className="text-2xl font-bold leading-tight">
                  {playlist.title}
                </h1>
                
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {playlist.subject && (
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                        {playlist.subject}
                      </span>
                    )}
                    {playlist.grade && (
                      <span className="inline-flex items-center rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                        {playlist.grade}
                      </span>
                    )}
                    <span className="text-sm text-muted-foreground">
                      • {playlist.video_count} videos
                    </span>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="shrink-0">
                    <PlaylistActions 
                      playlistUrl={`/playlist/${playlist.slug}`}
                      playlistTitle={playlist.title}
                      playlistId={playlist.youtube_playlist_id}
                      videos={videos || []}
                      googleSheetUrl={playlist.google_sheet_url}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>

          {/* Videos List */}
          {videos && videos.length > 0 && (
            <div className="divide-y border-t">
              {videos.map((video) => {
                const assessmentLink = video.assessment_link || "";
                const ivLink = video.interactive_video_link || "";
                
                return (
                  <div key={video.id} className="p-2 hover:bg-muted">
                    <div className="flex items-center justify-between gap-3 min-w-0">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-xs text-muted-foreground w-6 shrink-0">
                          {video.order_index + 1}.
                        </span>
                        <a 
                          href={`https://www.youtube.com/watch?v=${video.youtube_video_id}`}
                          target="_blank" 
                          rel="noreferrer" 
                          className="flex items-center gap-3 min-w-0 flex-1"
                        >
                          {video.thumbnail_url ? (
                            <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded bg-muted">
                              <Image 
                                src={video.thumbnail_url} 
                                alt={video.title} 
                                fill 
                                sizes="64px" 
                                className="object-cover" 
                              />
                            </div>
                          ) : (
                            <div className="h-10 w-16 shrink-0 rounded bg-muted" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{video.title}</p>
                          </div>
                        </a>
                      </div>
                      {(assessmentLink || ivLink) && (
                        <div className="flex items-center gap-2 shrink-0">
                          {assessmentLink && (
                            <a 
                              href={assessmentLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="relative group"
                              title="Open Assessment"
                            >
                              <Image 
                                src="https://cf.quizizz.com/image/Assessment.png" 
                                alt="Assessment" 
                                width={32} 
                                height={32}
                                className="hover:opacity-80 transition-opacity"
                                unoptimized
                              />
                              <span className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                Open Assessment
                              </span>
                            </a>
                          )}
                          {ivLink && (
                            <a 
                              href={ivLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="relative group"
                              title="Open Interactive Video"
                            >
                              <Image 
                                src="https://cf.quizizz.com/image/Video.png" 
                                alt="Interactive Video" 
                                width={32} 
                                height={32}
                                className="hover:opacity-80 transition-opacity"
                                unoptimized
                              />
                              <span className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                Open Interactive Video
                              </span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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
    </div>
  );
}

