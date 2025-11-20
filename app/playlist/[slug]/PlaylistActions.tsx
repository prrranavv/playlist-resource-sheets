'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  googleSheetUrl?: string | null;
  channelTitle?: string | null;
}

export default function PlaylistActions({ playlistUrl, playlistTitle, playlistId, videos, googleSheetUrl, channelTitle }: PlaylistActionsProps) {
  const [linkCopied, setLinkCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Initialize with pre-created sheet URLs if they exist
  const [sheetUrl, setSheetUrl] = useState<string | null>(googleSheetUrl || null);
  const [copyUrl, setCopyUrl] = useState<string | null>(() => {
    if (googleSheetUrl) {
      const spreadsheetId = googleSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1];
      return spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/copy` : null;
    }
    return null;
  });

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

  async function exportToGoogleSheets() {
    setExporting(true);
    
    try {
      const response = await fetch('/api/export-to-sheets-oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlistTitle,
          playlistId,
          channelTitle,
          videos,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to export to Google Sheets');
      }

      setSheetUrl(data.url);
      setCopyUrl(data.copyUrl);
      
      // Return the URLs for immediate use
      return { url: data.url, copyUrl: data.copyUrl };
    } catch (error) {
      console.error('Error exporting to Google Sheets:', error);
      alert(error instanceof Error ? error.message : 'Failed to export to Google Sheets');
      return null;
    } finally {
      setExporting(false);
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

  const handleOpenInNewTab = async () => {
    console.log('[PlaylistActions:handleOpenInNewTab] Starting...');
    const url = sheetUrl;
    console.log('[PlaylistActions:handleOpenInNewTab] Current url from state:', url);
    
    if (url) {
      // Sheet already exists, open it directly
      console.log('[PlaylistActions:handleOpenInNewTab] Opening pre-created sheet:', url);
      window.open(url, '_blank');
    } else {
      // Fallback: Sheet doesn't exist yet, create it now
      console.log('[PlaylistActions:handleOpenInNewTab] Sheet not created yet, opening blank window first...');
      const newWindow = window.open('about:blank', '_blank');
      
      console.log('[PlaylistActions:handleOpenInNewTab] Calling exportToGoogleSheets...');
      const result = await exportToGoogleSheets();
      console.log('[PlaylistActions:handleOpenInNewTab] Got result:', result);
      
      if (result && result.url && newWindow) {
        console.log('[PlaylistActions:handleOpenInNewTab] Navigating window to:', result.url);
        newWindow.location.href = result.url;
      } else if (newWindow) {
        console.error('[PlaylistActions:handleOpenInNewTab] No URL available, closing window');
        newWindow.close();
      }
    }
  };

  const handleCopyToDrive = async () => {
    console.log('[PlaylistActions:handleCopyToDrive] Starting...');
    const url = copyUrl;
    console.log('[PlaylistActions:handleCopyToDrive] Current url from state:', url);
    
    if (url) {
      // Sheet already exists, open copy URL directly
      console.log('[PlaylistActions:handleCopyToDrive] Opening pre-created copy URL:', url);
      window.open(url, '_blank');
    } else {
      // Fallback: Sheet doesn't exist yet, create it now
      console.log('[PlaylistActions:handleCopyToDrive] Sheet not created yet, opening blank window first...');
      const newWindow = window.open('about:blank', '_blank');
      
      console.log('[PlaylistActions:handleCopyToDrive] Calling exportToGoogleSheets...');
      const result = await exportToGoogleSheets();
      console.log('[PlaylistActions:handleCopyToDrive] Got result:', result);
      
      if (result && result.copyUrl && newWindow) {
        console.log('[PlaylistActions:handleCopyToDrive] Navigating window to:', result.copyUrl);
        newWindow.location.href = result.copyUrl;
      } else if (newWindow) {
        console.error('[PlaylistActions:handleCopyToDrive] No URL available, closing window');
        newWindow.close();
      }
    }
  };

  return (
    <>
      {/* Copy Link Button - Left Half */}
      <Button 
        variant="ghost"
        onClick={copyPlaylistLink}
        className="w-full h-10 rounded-none justify-center gap-2 hover:bg-muted"
      >
        {linkCopied ? (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Link Copied!
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Copy link
          </>
        )}
      </Button>
      
      {/* Export Button - Right Half */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost"
            disabled={exporting}
            className="w-full h-10 rounded-none justify-center gap-2 hover:bg-muted"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{exporting ? 'Exporting...' : 'Export to Sheets'}</span>
            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          <DropdownMenuItem onClick={handleOpenInNewTab} disabled={exporting}>
            <svg className="mr-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View Google Sheet
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyToDrive} disabled={exporting}>
            <svg className="mr-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy to my Drive
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportCsv}>
            <svg className="mr-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            Download CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

