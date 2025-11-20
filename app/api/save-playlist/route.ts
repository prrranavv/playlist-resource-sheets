import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Helper function to generate URL-safe slug
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

// Helper to ensure unique slug
async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from('playlists')
      .select('id')
      .eq('slug', slug)
      .single();

    if (error && error.code === 'PGRST116') {
      // No rows found, slug is unique
      return slug;
    }

    if (data) {
      // Slug exists, try with counter
      slug = `${baseSlug}-${counter}`;
      counter++;
    } else if (error) {
      // Some other error occurred
      throw error;
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      youtubePlaylistId,
      title,
      description,
      channelTitle,
      thumbnailUrl,
      grade,
      subject,
      videos
    } = body;

    if (!youtubePlaylistId || !title || !videos || !Array.isArray(videos)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if playlist already exists
    const { data: existingPlaylist } = await supabaseAdmin
      .from('playlists')
      .select('*')
      .eq('youtube_playlist_id', youtubePlaylistId)
      .single();

    let playlist;
    let slug;

    if (existingPlaylist) {
      console.log('[api:save-playlist] Updating existing playlist:', existingPlaylist.id);
      
      // Update existing playlist
      const { data: updatedPlaylist, error: updateError } = await supabaseAdmin
        .from('playlists')
        .update({
          title,
          description: description || null,
          channel_title: channelTitle || null,
          thumbnail_url: thumbnailUrl || null,
          grade: grade || null,
          subject: subject || null,
          video_count: videos.length,
        })
        .eq('id', existingPlaylist.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating playlist:', updateError);
        return NextResponse.json(
          { error: 'Failed to update playlist', details: updateError.message },
          { status: 500 }
        );
      }

      playlist = updatedPlaylist;
      slug = existingPlaylist.slug;

      // Delete existing videos for this playlist
      await supabaseAdmin
        .from('playlist_videos')
        .delete()
        .eq('playlist_id', playlist.id);

    } else {
      console.log('[api:save-playlist] Creating new playlist');
      
      // Generate unique slug
      const baseSlug = generateSlug(title);
      slug = await ensureUniqueSlug(baseSlug);

      // Insert new playlist
      const { data: newPlaylist, error: playlistError } = await supabaseAdmin
        .from('playlists')
        .insert({
          youtube_playlist_id: youtubePlaylistId,
          title,
          description: description || null,
          channel_title: channelTitle || null,
          thumbnail_url: thumbnailUrl || null,
          grade: grade || null,
          subject: subject || null,
          video_count: videos.length,
          slug
        })
        .select()
        .single();

      if (playlistError) {
        console.error('Error inserting playlist:', playlistError);
        return NextResponse.json(
          { error: 'Failed to save playlist', details: playlistError.message },
          { status: 500 }
        );
      }

      playlist = newPlaylist;
    }

    // Prepare video records
    const videoRecords = videos.map((video: {
      youtubeVideoId: string;
      title: string;
      thumbnailUrl?: string;
      assessmentQuizId?: string;
      assessmentLink?: string;
      interactiveVideoQuizId?: string;
      interactiveVideoLink?: string;
      orderIndex: number;
    }) => ({
      playlist_id: playlist.id,
      youtube_video_id: video.youtubeVideoId,
      title: video.title,
      thumbnail_url: video.thumbnailUrl || null,
      assessment_quiz_id: video.assessmentQuizId || null,
      assessment_link: video.assessmentLink || null,
      interactive_video_quiz_id: video.interactiveVideoQuizId || null,
      interactive_video_link: video.interactiveVideoLink || null,
      order_index: video.orderIndex
    }));

    // Insert all videos
    const { error: videosError } = await supabaseAdmin
      .from('playlist_videos')
      .insert(videoRecords);

    if (videosError) {
      console.error('Error inserting videos:', videosError);
      
      return NextResponse.json(
        { error: 'Failed to save videos', details: videosError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      playlistId: playlist.id,
      slug: playlist.slug,
      url: `/playlist/${slug}`
    });

  } catch (error) {
    console.error('Error in save-playlist:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

