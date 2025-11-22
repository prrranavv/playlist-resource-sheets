"use client";

import Image from 'next/image';
import Link from 'next/link';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { getYouTubeThumbnailUrl } from '@/lib/utils';

interface PlaylistCardProps {
  playlist: {
    id: string;
    title: string;
    thumbnailUrl: string | null;
    videoCount?: number;
    channelThumbnail?: string | null;
    channelTitle?: string | null;
    slug?: string;
    youtubePlaylistId?: string;
  };
  onClick?: () => void;
  showCreateOverlay?: boolean;
}

export default function PlaylistCard({ playlist, onClick, showCreateOverlay = false }: PlaylistCardProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    } else if (!playlist.slug && playlist.youtubePlaylistId) {
      // For YouTube playlists, open homepage with playlist URL in new tab
      e.preventDefault();
      const playlistUrl = `https://www.youtube.com/playlist?list=${playlist.youtubePlaylistId}`;
      const baseUrl = window.location.origin;
      const homepageUrl = `${baseUrl}/?url=${encodeURIComponent(playlistUrl)}`;
      window.open(homepageUrl, '_blank');
    }
  };

  const playlistUrl = playlist.slug 
    ? `/playlist/${playlist.slug}`
    : '#';

  return (
    <Link
      href={playlistUrl}
      onClick={handleClick}
      className="block group"
    >
      <div className="relative pb-2">
        {/* Stack effect layers */}
        <div className="absolute bottom-0 left-2 right-2 h-2 bg-muted-foreground/27 rounded-lg" />
        <div className="absolute bottom-1 left-1 right-1 h-1.5 bg-muted-foreground/36 rounded-lg" />
        
        {/* Thumbnail container */}
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted transition-all duration-200 group-hover:scale-[1.03] group-hover:shadow-lg shadow-sm">
          {(() => {
            // For YouTube playlists, use the thumbnail URL directly if provided
            // For existing playlists, use the utility function
            let thumbnailUrl: string | null = null;
            if (playlist.youtubePlaylistId && playlist.thumbnailUrl) {
              // YouTube API already provides valid thumbnail URLs
              thumbnailUrl = playlist.thumbnailUrl;
            } else {
              // For existing playlists, use the utility function
              thumbnailUrl = getYouTubeThumbnailUrl(playlist.thumbnailUrl);
            }
            
            return thumbnailUrl ? (
              <Image
                src={thumbnailUrl}
                alt={playlist.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
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
          
          {/* +Create Overlay for YouTube playlists */}
          {showCreateOverlay && (
            <>
              {/* White overlay - always visible */}
              <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] rounded-lg" />
              
              {/* Create badge overlay - visible on hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg z-10">
                <Badge variant="default" className="px-4 py-2 text-sm font-semibold shadow-lg">
                  Create
                </Badge>
              </div>
            </>
          )}
          
          {/* Video count badge - top right with icon */}
          {playlist.videoCount && (
            <div className="absolute top-1.5 right-1.5 bg-background/95 backdrop-blur-sm text-foreground text-[10px] font-medium px-1.5 py-0.5 rounded border border-border shadow-sm flex items-center gap-0.5 z-10">
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
              {playlist.videoCount}
            </div>
          )}
          
          {/* Info overlay - bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-1.5">
            <div className="bg-background/98 backdrop-blur-md rounded p-1.5 border border-border shadow-lg">
              {/* Text content */}
              <div className="flex-1 min-w-0">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <h3 className="text-base font-semibold truncate text-foreground leading-tight">
                        {playlist.title}
                      </h3>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{playlist.title}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

