import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// POST - Save quiz key to database
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { youtube_video_id, quiz_gen_key } = body;

    if (!youtube_video_id || !quiz_gen_key) {
      return NextResponse.json(
        { error: "Missing youtube_video_id or quiz_gen_key" },
        { status: 400 }
      );
    }

    console.log(`[api:video-quiz-keys:POST] Saving quiz key for video ${youtube_video_id}`);

    // Upsert the quiz key (insert or update if exists)
    const { data, error } = await supabaseAdmin
      .from("video_quiz_keys")
      .upsert(
        {
          youtube_video_id,
          quiz_gen_key,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "youtube_video_id",
        }
      )
      .select()
      .single();

    if (error) {
      console.error(`[api:video-quiz-keys:POST] Error:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[api:video-quiz-keys:POST] Success for video ${youtube_video_id}`);
    return NextResponse.json({ data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[api:video-quiz-keys:POST] Error:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - Fetch quiz keys from database
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const videoIds = searchParams.get("videoIds");

    if (!videoIds) {
      return NextResponse.json(
        { error: "Missing videoIds parameter" },
        { status: 400 }
      );
    }

    const videoIdArray = videoIds.split(",");
    console.log(`[api:video-quiz-keys:GET] Fetching quiz keys for ${videoIdArray.length} videos`);

    const { data, error } = await supabaseAdmin
      .from("video_quiz_keys")
      .select("youtube_video_id, quiz_gen_key")
      .in("youtube_video_id", videoIdArray);

    if (error) {
      console.error(`[api:video-quiz-keys:GET] Error:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Convert to a map for easier access
    const quizKeyMap: Record<string, string> = {};
    data?.forEach((item) => {
      quizKeyMap[item.youtube_video_id] = item.quiz_gen_key;
    });

    console.log(`[api:video-quiz-keys:GET] Found ${data?.length || 0} quiz keys`);
    return NextResponse.json({ quizKeyMap });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[api:video-quiz-keys:GET] Error:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
