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
    <div className="flex items-center gap-2 flex-wrap">
      <Button 
        size="sm" 
        variant="outline"
        onClick={copyPlaylistLink}
      >
        {linkCopied ? '✓ Link Copied!' : '🔗 Copy link'}
      </Button>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            size="sm" 
            variant="default" 
            disabled={exporting}
            className="gap-1.5"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
              <path d="M3.5 2C3.22386 2 3 2.22386 3 2.5V12.5C3 12.7761 3.22386 13 3.5 13H11.5C11.7761 13 12 12.7761 12 12.5V4.70711L9.29289 2H3.5ZM2 2.5C2 1.67157 2.67157 1 3.5 1H9.5C9.63261 1 9.75979 1.05268 9.85355 1.14645L12.8536 4.14645C12.9473 4.24021 13 4.36739 13 4.5V12.5C13 13.3284 12.3284 14 11.5 14H3.5C2.67157 14 2 13.3284 2 12.5V2.5ZM4.75 7.5C4.75 7.22386 4.97386 7 5.25 7H7V5.25C7 4.97386 7.22386 4.75 7.5 4.75C7.77614 4.75 8 4.97386 8 5.25V7H9.75C10.0261 7 10.25 7.22386 10.25 7.5C10.25 7.77614 10.0261 8 9.75 8H8V9.75C8 10.0261 7.77614 10.25 7.5 10.25C7.22386 10.25 7 10.0261 7 9.75V8H5.25C4.97386 8 4.75 7.77614 4.75 7.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
            </svg>
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          <DropdownMenuItem onClick={handleOpenInNewTab} disabled={exporting}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4">
              <path d="M3 2C2.44772 2 2 2.44772 2 3V12C2 12.5523 2.44772 13 3 13H12C12.5523 13 13 12.5523 13 12V8.5C13 8.22386 12.7761 8 12.5 8C12.2239 8 12 8.22386 12 8.5V12H3V3L6.5 3C6.77614 3 7 2.77614 7 2.5C7 2.22386 6.77614 2 6.5 2H3ZM12.8536 2.14645C12.9015 2.19439 12.9377 2.24964 12.9621 2.30861C12.9861 2.36669 12.9996 2.4303 13 2.497L13 2.5V2.50049V5.5C13 5.77614 12.7761 6 12.5 6C12.2239 6 12 5.77614 12 5.5V3.70711L6.85355 8.85355C6.65829 9.04882 6.34171 9.04882 6.14645 8.85355C5.95118 8.65829 5.95118 8.34171 6.14645 8.14645L11.2929 3H9.5C9.22386 3 9 2.77614 9 2.5C9 2.22386 9.22386 2 9.5 2H12.4999H12.5C12.5678 2 12.6324 2.01349 12.6914 2.03794C12.7504 2.06234 12.8056 2.09851 12.8536 2.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
            </svg>
            View Google Sheet
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyToDrive} disabled={exporting}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4">
              <path d="M1 9.50006C1 10.3285 1.67157 11.0001 2.5 11.0001H4L4 10.0001H2.5C2.22386 10.0001 2 9.7762 2 9.50006L2 2.50006C2 2.22392 2.22386 2.00006 2.5 2.00006L9.5 2.00006C9.77614 2.00006 10 2.22392 10 2.50006V4.00002H11V2.50006C11 1.67163 10.3284 1.00006 9.5 1.00006H2.5C1.67157 1.00006 1 1.67163 1 2.50006V9.50006ZM5.5 4.00002C4.67157 4.00002 4 4.67159 4 5.50002V12.5C4 13.3284 4.67157 14 5.5 14H12.5C13.3284 14 14 13.3284 14 12.5V5.50002C14 4.67159 13.3284 4.00002 12.5 4.00002H5.5ZM5 5.50002C5 5.22388 5.22386 5.00002 5.5 5.00002H12.5C12.7761 5.00002 13 5.22388 13 5.50002V12.5C13 12.7762 12.7761 13 12.5 13H5.5C5.22386 13 5 12.7762 5 12.5V5.50002Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
            </svg>
            Copy to my Drive
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportCsv}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4">
              <path d="M7.50005 1.04999C7.74858 1.04999 7.95005 1.25146 7.95005 1.49999V8.41359L10.1819 6.18179C10.3576 6.00605 10.6425 6.00605 10.8182 6.18179C10.994 6.35753 10.994 6.64245 10.8182 6.81819L7.81825 9.81819C7.64251 9.99392 7.35759 9.99392 7.18185 9.81819L4.18185 6.81819C4.00611 6.64245 4.00611 6.35753 4.18185 6.18179C4.35759 6.00605 4.64251 6.00605 4.81825 6.18179L7.05005 8.41359V1.49999C7.05005 1.25146 7.25152 1.04999 7.50005 1.04999ZM2.5 10C2.77614 10 3 10.2239 3 10.5V12C3 12.5539 3.44565 13 3.99635 13H11.0012C11.5529 13 12 12.5528 12 12V10.5C12 10.2239 12.2239 10 12.5 10C12.7761 10 13 10.2239 13 10.5V12C13 13.1041 12.1062 14 11.0012 14H3.99635C2.89019 14 2 13.103 2 12V10.5C2 10.2239 2.22386 10 2.5 10Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
            </svg>
            Download CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

