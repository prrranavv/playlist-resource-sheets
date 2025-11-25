import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ error: "Missing slug parameter" }, { status: 400 });
    }

    console.log(`[api:delete-playlist] Deleting playlist with slug: ${slug}`);

    // First, get the playlist ID
    const { data: playlist, error: playlistError } = await supabaseAdmin
      .from("playlists")
      .select("id")
      .eq("slug", slug)
      .single();

    if (playlistError || !playlist) {
      console.error(`[api:delete-playlist] Error finding playlist:`, playlistError);
      return NextResponse.json(
        { error: "Playlist not found" },
        { status: 404 }
      );
    }

    const playlistId = playlist.id;

    // Delete all associated videos first (due to foreign key constraint)
    const { error: videosError } = await supabaseAdmin
      .from("playlist_videos")
      .delete()
      .eq("playlist_id", playlistId);

    if (videosError) {
      console.error(`[api:delete-playlist] Error deleting videos:`, videosError);
      return NextResponse.json(
        { error: "Failed to delete playlist videos" },
        { status: 500 }
      );
    }

    console.log(`[api:delete-playlist] Deleted videos for playlist: ${playlistId}`);

    // Now delete the playlist
    const { error: deleteError } = await supabaseAdmin
      .from("playlists")
      .delete()
      .eq("id", playlistId);

    if (deleteError) {
      console.error(`[api:delete-playlist] Error deleting playlist:`, deleteError);
      return NextResponse.json(
        { error: "Failed to delete playlist" },
        { status: 500 }
      );
    }

    console.log(`[api:delete-playlist] Successfully deleted playlist: ${slug}`);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[api:delete-playlist] Error:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
