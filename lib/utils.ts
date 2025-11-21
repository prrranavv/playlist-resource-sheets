import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts a thumbnail URL to a direct YouTube image URL.
 * For videos: uses the video ID to generate the thumbnail URL.
 * For other URLs: returns the URL as-is if it's already a YouTube URL, otherwise returns null.
 * 
 * @param thumbnailUrl - The thumbnail URL (may be stored locally or from YouTube)
 * @param videoId - Optional video ID to generate YouTube thumbnail URL
 * @returns YouTube thumbnail URL or null if unable to convert
 */
export function getYouTubeThumbnailUrl(thumbnailUrl: string | null | undefined, videoId?: string | null): string | null {
  // If no URL provided, return null
  if (!thumbnailUrl) return null;
  
  // If we have a video ID, always use the YouTube direct URL format
  if (videoId) {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  }
  
  // If it's already a YouTube URL (i.ytimg.com or img.youtube.com), return as-is
  if (thumbnailUrl.includes('i.ytimg.com') || thumbnailUrl.includes('img.youtube.com') || thumbnailUrl.includes('yt3.ggpht.com')) {
    return thumbnailUrl;
  }
  
  // If it's a local/stored URL (like from Vercel or Supabase storage), try to extract video ID from the URL
  // This handles cases where the stored URL might contain the video ID
  const videoIdMatch = thumbnailUrl.match(/[\/=]([a-zA-Z0-9_-]{11})(?:[\/\.]|$)/);
  if (videoIdMatch && videoIdMatch[1]) {
    return `https://i.ytimg.com/vi/${videoIdMatch[1]}/hqdefault.jpg`;
  }
  
  // If we can't convert it, return null (will fall back to placeholder)
  return null;
}
