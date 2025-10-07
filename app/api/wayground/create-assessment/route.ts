import { NextResponse } from "next/server";

const WAYGROUND_ENDPOINT = "https://wayground.com/_aiserver/main/public/v1/socket/video/create-quiz-from-youtube-video";

// Hardcoded credentials/headers copied from your latest curl. Replace as needed.
const HARDCODED_COOKIE = `quizizz_uid=df0761ef-a8fd-4ef4-ad92-e1011b55c1a6; QUIZIZZ_EXP_SLOT=21; QUIZIZZ_EXP_NAME=main_main; QUIZIZZ_EXP_LEVEL=live; QUIZIZZ_EXP_VERSION=v2; country=US; _fw_crm_v=429bd5b1-aa2c-422d-ccdc-85895d23ab43; featureUpdatedTime=2025-09-19%2B09%253A56%253A50.542%2B%252B0000%2BUTC; featureHash=755e6bf10e954fa1b7e54936686c4b59e90e98cbbada73159044f364363badb6; featureUUID=239b27e1-4104-4272-8426-0a1688b702f3; quizizz_uid=ec0b84de-1843-4449-80e6-f8682deb6fad; QUIZIZZ_EXP_NAME=main_main; QUIZIZZ_EXP_SLOT=21; QUIZIZZ_EXP_VERSION=v2; locale=en; x-csrf-token=-RqEDm1ASRndM77chNvWdnrH3Kk; aws-waf-token=9e270ceb-364b-44e6-87c0-670066eb989d:EQoAv71B2GAnAAAA:xJuZcaicyr74/uFccGeMSBrW3jSWeHWKx31gAT7zKTsUDC1SX7fveV2LjFxjQtz3EwFqs3iVayjTb70ZgDfEosbLoHfQma2FT3kI8w5dvEH2ZnaO8jMDt7cXNbcYWkj7p0NVr5gj/Avz/Y195Mi5CYy9up0dKK7+wY13XV39k0VIQNvwK0K+o6soUdoBsxQw; q-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InByYW5hdi5nb3lhbEBxdWl6aXp6LmNvbSIsImV4cCI6MTc1OTg2MDMxM30.wDt5CebgFCbQv3OkcOiz28au36bsxA-aXYXGikALSxQ; QUIZIZZ_EXP_LEVEL=live; ab.storage.deviceId.fda15891-26c0-43f0-aa55-6f8d885d4a4c=g%3A295ef169-1cd7-4d50-dee6-edd6dbec1233%7Ce%3Aundefined%7Cc%3A1757580569741%7Cl%3A1759843286276; ab.storage.userId.fda15891-26c0-43f0-aa55-6f8d885d4a4c=g%3A68e5130148be54b62144a6ab%7Ce%3Aundefined%7Cc%3A1759843286275%7Cl%3A1759843286277; _sid=oHYUmG7GMhyG7l3BW6LeYV_TmSw3cmpSyDdRboxBOT-qgac9j--oGZN-6asdyLKi-r4tPfN3O0gyyjgVmuNw8FMu-5W-DnKbNFJCzROila7_TNIOS-93YIGFdhMuoBJnZIGPwzes9U7oIsbTXhofqw6XoMpudmPEyPVt.v3H3d5gUoHEctSjB1CxuqQ.6QvEQDfIYuZklzQM; _csrf=-RqEDm1ASRndM77chNvWdnrH3Kk; x-csrf-token=-RqEDm1ASRndM77chNvWdnrH3Kk; ab.storage.sessionId.fda15891-26c0-43f0-aa55-6f8d885d4a4c=g%3A242ecbb5-58fe-41e1-44b4-e8704ab252ad%7Ce%3A1759852291701%7Cc%3A1759843286276%7Cl%3A1759845091701; first_session=%7B%22visits%22%3A797%2C%22start%22%3A1757580570525%2C%22last_visit%22%3A1759845099615%2C%22url%22%3A%22https%3A%2F%2Fwayground.com%2Fadmin%22%2C%22path%22%3A%22%2Fadmin%22%2C%22referrer%22%3A%22https%3A%2F%2Fwayground.com%2Fadmin%22%2C%22referrer_info%22%3A%7B%22host%22%3A%22wayground.com%22%2C%22path%22%3A%22%2Fadmin%22%2C%22protocol%22%3A%22https%3A%22%2C%22port%22%3A80%2C%22search%22%3A%22%22%2C%22query%22%3A%7B%7D%7D%2C%22search%22%3A%7B%22engine%22%3Anull%2C%22query%22%3Anull%7D%2C%22prev_visit%22%3A1759845087593%2C%22time_since_last_visit%22%3A12022%2C%22version%22%3A0.4%7D; suid=7ee425aa-4b8b-48ea-af1e-eac7894af16f`;
const HARDCODED_CSRF = "-RqEDm1ASRndM77chNvWdnrH3Kk";

function mapSubjectToWayground(subject: string): string {
  if (subject === "Math") return "Mathematics";
  return subject;
}

async function getYouTubeDurationSeconds(videoId: string, apiKey?: string): Promise<number | null> {
  if (!apiKey) return null;
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "contentDetails");
    url.searchParams.set("id", videoId);
    url.searchParams.set("key", apiKey);
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = await res.json();
    const iso: string | undefined = data?.items?.[0]?.contentDetails?.duration;
    if (!iso) return null;
    const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso);
    if (!match) return null;
    const hours = parseInt(match[1] || "0", 10);
    const minutes = parseInt(match[2] || "0", 10);
    const seconds = parseInt(match[3] || "0", 10);
    return hours * 3600 + minutes * 60 + seconds;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { videoUrl, grade, subject, duration, videoId } = body ?? {};
    if (!videoUrl || !grade || !subject || !videoId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Allow overriding via request body, else fall back to hardcoded values
    const cookieHeader: string = body?.cookie || HARDCODED_COOKIE;
    const csrfToken: string = body?.csrf || HARDCODED_CSRF;

    // Construct minimal payload matching the provided curl, keeping numQuestions = 0
    let durationSeconds: number = typeof duration === "number" ? duration : 0;
    if (!durationSeconds || durationSeconds <= 0) {
      const apiKey = process.env.YOUTUBE_API_KEY;
      const fetched = await getYouTubeDurationSeconds(String(videoId), apiKey);
      if (typeof fetched === "number" && fetched > 0) durationSeconds = fetched;
    }

    const payload = {
      videoUrl,
      params: {
        grade: String(grade),
        subject: mapSubjectToWayground(String(subject)),
        language: "English",
        numQuestions: 0,
        videoMeta: {
          duration: durationSeconds,
          startTime: 0,
          endTime: durationSeconds,
          videoId: String(videoId),
        },
        createInteractiveVideo: false,
      },
      meta: {
        uid: "68e51aed4e056e0b8daf16cb",
        quizGenView: "USING_YOUTUBE_LINK",
        genProcess: "GENERATE_FROM_CONTENT",
        skills: [],
        subtopics: [],
        source: "youtube",
      },
    };

    // Forward request to Wayground with headers from provided curl
    const res = await fetch(WAYGROUND_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/plain, */*",
        origin: "https://wayground.com",
        referer: "https://wayground.com/admin/assessment",
        "x-csrf-token": csrfToken,
        cookie: cookieHeader,
        // Additional curl headers that may help mimic the browser
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        "accept-language": "en-US,en;q=0.9",
        priority: "u=1, i",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "sec-fetch-dest": "empty",
        "sec-ch-ua": '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sentry-trace": "80db6695b777420db7f8c8a61900b158-839cb0844f48521a-0",
        baggage:
          "sentry-environment=production,sentry-release=23830a981692412e5b89fbcbf8e2a7d28bbb7319,sentry-public_key=f4055af1be6347b5a3b645683a6b50ff,sentry-trace_id=a0ebf273277849b1931954826b092c86,sentry-sample_rate=0.05,sentry-transaction=admin,sentry-sampled=false",
        "x-amzn-trace-id": "Root=1-68e51af6-ea14baa5fe6f83922276c4e0;Parent=37c9fa24fa8794dc;Sampled=1",
        "x-component-type": "adminv3",
        "x-q-request-context-path": "FeaturedPage",
        "x-q-traceid": "Root=1-68e51af6-ea14baa5fe6f83922276c4e0;Parent=37c9fa24fa8794dc;Sampled=1",
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    const headers = {
      "x-upstream-status": String(res.status),
    };
    // Try to parse JSON; if fails, return plain text with status
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data, { status: res.status, headers });
    } catch {
      return new NextResponse(text, { status: res.status, headers });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


