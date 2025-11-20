import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Fetch all playlists with channel information
    const { data: playlists, error } = await supabaseAdmin
      .from('playlists')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[api:explore] Error fetching playlists:', error);
      return NextResponse.json(
        { error: 'Failed to fetch playlists' },
        { status: 500 }
      );
    }

    // Group playlists by channel
    const channelsMap = new Map<string, {
      channel_id: string;
      channel_title: string | null;
      channel_thumbnail: string | null;
      playlists: typeof playlists;
    }>();

    playlists?.forEach(playlist => {
      const channelId = playlist.channel_id || 'unknown';
      
      if (!channelsMap.has(channelId)) {
        channelsMap.set(channelId, {
          channel_id: channelId,
          channel_title: playlist.channel_title,
          channel_thumbnail: playlist.channel_thumbnail,
          playlists: []
        });
      }
      
      channelsMap.get(channelId)!.playlists.push(playlist);
    });

    const channels = Array.from(channelsMap.values());

    // Sort channels by playlist count (most playlists first)
    channels.sort((a, b) => b.playlists.length - a.playlists.length);

    // Group channels by subject
    const subjectMap = new Map<string, typeof channels>();
    
    channels.forEach(channel => {
      // Get all unique subjects from the channel's playlists
      const subjects = new Set<string>();
      channel.playlists.forEach(playlist => {
        if (playlist.subject) {
          subjects.add(playlist.subject);
        }
      });
      
      // Add channel to each subject it has playlists in
      subjects.forEach(subject => {
        if (!subjectMap.has(subject)) {
          subjectMap.set(subject, []);
        }
        subjectMap.get(subject)!.push(channel);
      });
      
      // If no subjects, add to "Other" category
      if (subjects.size === 0) {
        if (!subjectMap.has('Other')) {
          subjectMap.set('Other', []);
        }
        subjectMap.get('Other')!.push(channel);
      }
    });

    // Convert to array and sort by number of channels (most channels first)
    const sections = Array.from(subjectMap.entries()).map(([subject, channels]) => ({
      subject,
      channels
    })).sort((a, b) => {
      // Put "Other" at the end
      if (a.subject === 'Other') return 1;
      if (b.subject === 'Other') return -1;
      // Sort by number of channels (descending)
      return b.channels.length - a.channels.length;
    });

    return NextResponse.json({
      sections,
      totalPlaylists: playlists?.length || 0
    });

  } catch (error) {
    console.error('[api:explore] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

