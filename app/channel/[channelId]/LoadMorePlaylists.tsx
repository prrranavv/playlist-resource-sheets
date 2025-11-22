"use client";

import { useState } from 'react';
import PlaylistCard from './PlaylistCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface YouTubePlaylist {
  id: string;
  title: string;
  thumbnailUrl: string;
  videoCount: number;
  publishedAt: string;
}

interface LoadMorePlaylistsProps {
  channelId: string;
  existingPlaylistIds: Set<string>;
  channelThumbnail: string | null;
  channelTitle: string | null;
  initialPlaylists: YouTubePlaylist[];
}

export default function LoadMorePlaylists({
  channelId,
  existingPlaylistIds,
  channelThumbnail,
  channelTitle,
  initialPlaylists,
}: LoadMorePlaylistsProps) {
  const [playlists, setPlaylists] = useState<YouTubePlaylist[]>(initialPlaylists);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      // Fetch 5 more playlists starting from current count
      const res = await fetch(`/api/channel-playlists?channelId=${channelId}&maxResults=5&offset=${playlists.length}`);
      const data = await res.json();

      if (res.ok && data.playlists && data.playlists.length > 0) {
        // Filter out playlists that already exist in database
        const newPlaylists = data.playlists.filter(
          (p: YouTubePlaylist) => !existingPlaylistIds.has(p.id)
        );

        if (newPlaylists.length > 0) {
          setPlaylists([...playlists, ...newPlaylists]);
        }
        
        // If we got less than 5 playlists total, there might not be more
        if (data.playlists.length < 5) {
          setHasMore(false);
        }
      } else {
        // No more playlists available
        setHasMore(false);
      }
    } catch (err) {
      console.error('[LoadMorePlaylists] Error loading more playlists:', err);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {playlists.map((playlist) => (
        <PlaylistCard
          key={playlist.id}
          playlist={{
            id: playlist.id,
            title: playlist.title,
            thumbnailUrl: playlist.thumbnailUrl,
            videoCount: playlist.videoCount,
            channelThumbnail,
            channelTitle,
            youtubePlaylistId: playlist.id,
          }}
          showCreateOverlay={true}
        />
      ))}
      
      {hasMore && (
        <Card className="relative aspect-video w-full overflow-hidden border-2 border-dashed hover:border-primary/50 transition-all duration-200 hover:shadow-lg group cursor-pointer">
          <Button
            onClick={loadMore}
            disabled={loading}
            variant="ghost"
            className="w-full h-full p-0 hover:bg-transparent"
          >
            <CardContent className="flex items-center justify-center h-full p-6">
              <div className="text-center space-y-3">
                {loading ? (
                  <>
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm font-medium text-muted-foreground">Loading...</p>
                  </>
                ) : (
                  <>
                    <div className="rounded-full bg-primary/10 p-3 mx-auto group-hover:bg-primary/20 transition-colors w-fit">
                      <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      Load more playlists
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Button>
        </Card>
      )}
    </>
  );
}

