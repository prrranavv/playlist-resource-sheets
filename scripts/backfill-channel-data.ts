import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const youtubeApiKey = process.env.YOUTUBE_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fetchChannelInfo(playlistId: string) {
  try {
    // Fetch playlist metadata
    const playlistUrl = new URL("https://www.googleapis.com/youtube/v3/playlists");
    playlistUrl.searchParams.set("part", "snippet");
    playlistUrl.searchParams.set("id", playlistId);
    playlistUrl.searchParams.set("key", youtubeApiKey);
    
    const res = await fetch(playlistUrl.toString());
    if (!res.ok) {
      console.error(`Failed to fetch playlist ${playlistId}: ${res.status}`);
      return null;
    }
    
    const data = await res.json();
    const snippet = data?.items?.[0]?.snippet;
    
    if (!snippet) {
      console.error(`No snippet found for playlist ${playlistId}`);
      return null;
    }
    
    const channelId = snippet.channelId;
    const channelTitle = snippet.channelTitle;
    
    // Fetch channel thumbnail
    let channelThumbnail = null;
    if (channelId) {
      const channelUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
      channelUrl.searchParams.set("part", "snippet");
      channelUrl.searchParams.set("id", channelId);
      channelUrl.searchParams.set("key", youtubeApiKey);
      
      const channelRes = await fetch(channelUrl.toString());
      if (channelRes.ok) {
        const channelData = await channelRes.json();
        const channelSnippet = channelData?.items?.[0]?.snippet;
        channelThumbnail = channelSnippet?.thumbnails?.medium?.url || channelSnippet?.thumbnails?.default?.url || null;
      }
    }
    
    return {
      channelId,
      channelTitle,
      channelThumbnail,
    };
  } catch (error) {
    console.error(`Error fetching channel info for ${playlistId}:`, error);
    return null;
  }
}

async function updatePlaylistChannelData(youtubePlaylistId: string) {
  console.log(`\nProcessing playlist: ${youtubePlaylistId}`);
  
  // Fetch channel info from YouTube
  const channelInfo = await fetchChannelInfo(youtubePlaylistId);
  
  if (!channelInfo) {
    console.error(`❌ Failed to fetch channel info for ${youtubePlaylistId}`);
    return;
  }
  
  console.log(`✓ Found channel: ${channelInfo.channelTitle}`);
  console.log(`  Channel ID: ${channelInfo.channelId}`);
  console.log(`  Thumbnail: ${channelInfo.channelThumbnail ? 'Yes' : 'No'}`);
  
  // Update the database
  const { error } = await supabase
    .from('playlists')
    .update({
      channel_id: channelInfo.channelId,
      channel_name: channelInfo.channelTitle,
      channel_thumbnail: channelInfo.channelThumbnail,
    })
    .eq('youtube_playlist_id', youtubePlaylistId);
  
  if (error) {
    console.error(`❌ Failed to update database for ${youtubePlaylistId}:`, error);
  } else {
    console.log(`✓ Database updated successfully`);
  }
}

async function main() {
  console.log('Starting channel data backfill...\n');
  
  const playlistIds = [
    'PLSQl0a2vh4HAei_k1w8rMpxsWXpMNa87J',
    'PLv0-Bu_HF0SL1fxsnbUhN21reneNj7-Bm',
    'PLwL0Myd7Dk1GNmS-BqgKHB0Due2phZ-Dg',
  ];
  
  for (const playlistId of playlistIds) {
    await updatePlaylistChannelData(playlistId);
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n✅ Backfill complete!');
}

main().catch(console.error);

