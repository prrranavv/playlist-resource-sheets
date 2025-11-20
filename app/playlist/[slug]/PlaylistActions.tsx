'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface Video {
  id: string;
  youtube_video_id: string;
  title: string;
  assessment_quiz_id: string | null;
  assessment_link: string | null;
  interactive_video_quiz_id: string | null;
  interactive_video_link: string | null;
  order_index: number;
}

interface PlaylistActionsProps {
  playlistUrl: string;
  playlistTitle: string;
  playlistId: string;
  videos: Video[];
}

export default function PlaylistActions({ playlistUrl, playlistTitle, playlistId, videos }: PlaylistActionsProps) {
  const [linkCopied, setLinkCopied] = useState(false);

  async function copyPlaylistLink() {
    try {
      const fullUrl = `${window.location.origin}${playlistUrl}`;
      await navigator.clipboard.writeText(fullUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  }

  function exportCsv() {
    const rows: Array<string[]> = [];
    rows.push([
      "YouTube Playlist Name",
      "YouTube Playlist Link",
      "YouTube Video Title",
      "YouTube Video ID",
      "YouTube Video Link",
      "Wayground Assessment Title",
      "Wayground Assessment Link",
      "Wayground Assessment Quiz ID",
      "Wayground IV Title",
      "Wayground IV Link",
      "Wayground IV Quiz ID",
    ]);
    
    const playlistLink = `https://www.youtube.com/playlist?list=${playlistId}`;
    
    for (const video of videos) {
      const videoLink = `https://www.youtube.com/watch?v=${video.youtube_video_id}`;
      const assessmentLink = video.assessment_link || "";
      const assessmentQuizId = video.assessment_quiz_id || "";
      const ivLink = video.interactive_video_link || "";
      const ivQuizId = video.interactive_video_quiz_id || "";
      
      rows.push([
        playlistTitle,
        playlistLink,
        video.title,
        video.youtube_video_id,
        videoLink,
        video.title, // Assessment title (same as video)
        assessmentLink,
        assessmentQuizId,
        video.title, // IV title (same as video)
        ivLink,
        ivQuizId,
      ]);
    }

    const csvContent = rows.map(row => 
      row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${playlistTitle.replace(/[^a-z0-9]/gi, '_')}_wayground_resources.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="flex items-center gap-3">
      <Button 
        size="sm" 
        variant="outline"
        onClick={copyPlaylistLink}
        className="gap-2"
      >
        {linkCopied ? (
          <>
            ✓ Link Copied!
          </>
        ) : (
          <>
            🔗 Share? Copy link
          </>
        )}
      </Button>
      <Button size="sm" variant="default" onClick={exportCsv}>
        Export CSV
      </Button>
    </div>
  );
}

