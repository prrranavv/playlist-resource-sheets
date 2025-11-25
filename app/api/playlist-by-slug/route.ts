import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ error: "Missing slug parameter" }, { status: 400 });
    }

    console.log(`[api:playlist-by-slug] Fetching playlist with slug: ${slug}`);

    const { data: playlist, error } = await supabaseAdmin
      .from("playlists")
      .select("id, youtube_playlist_id, title, slug, subject, grade")
      .eq("slug", slug)
      .single();

    if (error || !playlist) {
      console.error(`[api:playlist-by-slug] Error:`, error);
      return NextResponse.json(
        { error: "Playlist not found" },
        { status: 404 }
      );
    }

    console.log(`[api:playlist-by-slug] Found playlist: ${playlist.title} (ID: ${playlist.youtube_playlist_id})`);

    return NextResponse.json({
      playlistId: playlist.youtube_playlist_id,
      title: playlist.title,
      slug: playlist.slug,
      subject: playlist.subject,
      grade: playlist.grade,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[api:playlist-by-slug] Error:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

