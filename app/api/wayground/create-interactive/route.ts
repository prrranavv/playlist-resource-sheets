import { NextResponse } from "next/server";

const ENDPOINT = "https://wayground.com/_aiserver/main/public/v1/socket/video/create-quiz-from-youtube-video";

// Exact headers/cookies per the user's latest curl
const CURL_COOKIE = `quizizz_uid=df0761ef-a8fd-4ef4-ad92-e1011b55c1a6; QUIZIZZ_EXP_SLOT=21; QUIZIZZ_EXP_NAME=main_main; QUIZIZZ_EXP_LEVEL=live; QUIZIZZ_EXP_VERSION=v2; country=US; _fw_crm_v=429bd5b1-aa2c-422d-ccdc-85895d23ab43; featureUpdatedTime=2025-09-19%2B09%253A56%253A50.542%2B%252B0000%2BUTC; featureHash=755e6bf10e954fa1b7e54936686c4b59e90e98cbbada73159044f364363badb6; featureUUID=239b27e1-4104-4272-8426-0a1688b702f3; quizizz_uid=ec0b84de-1843-4449-80e6-f8682deb6fad; QUIZIZZ_EXP_NAME=main_main; QUIZIZZ_EXP_SLOT=21; QUIZIZZ_EXP_VERSION=v2; locale=en; aws-waf-token=9e270ceb-364b-44e6-87c0-670066eb989d:EQoAv71B2GAnAAAA:xJuZcaicyr74/uFccGeMSBrW3jSWeHWKx31gAT7zKTsUDC1SX7fveV2LjFxjQtz3EwFqs3iVayjTb70ZgDfEosbLoHfQma2FT3kI8w5dvEH2ZnaO8jMDt7cXNbcYWkj7p0NVr5gj/Avz/Y195Mi5CYy9up0dKK7+wY13XV39k0VIQNvwK0K+o6soUdoBsxQw; q-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InByYW5hdi5nb3lhbEBxdWl6aXp6LmNvbSIsImV4cCI6MTc1OTg2MDMxM30.wDt5CebgFCbQv3OkcOiz28au36bsxA-aXYXGikALSxQ; _sid=EFRyx-ED5gWSoX_Gd7lrT5D4Qnf4WYIfDyfB--xeJd6gKGNRAqf19lekZSQUn0vqG4z3w6q2LA5SpmXjZZRXnoi80WxpgzdS1SQlecssHSpcNWTAN9l-L2Aj9lmWMEH8vK9Gk2cuxQpx1_wSw-QxOgmTLczl2jFlqEIy.vf4NI0P91_xSs5pO-FkZDQ.FP2rgJBJeQ2IXVHO; x-csrf-token=Y1mHRsKn-QS9Y7fwqLbzCKBIWnSB-kd6QSWQ; _csrf=ldmnYv_p5rKQIyZllAiwypxrHQ8; x-csrf-token=ldmnYv_p5rKQIyZllAiwypxrHQ8; QUIZIZZ_EXP_LEVEL=live; ab.storage.sessionId.fda15891-26c0-43f0-aa55-6f8d885d4a4c=g%3A57544bb1-b76f-16d0-869c-d2cdc8e5e5f2%7Ce%3A1759907468910%7Cc%3A1759900268910%7Cl%3A1759900268910; ab.storage.deviceId.fda15891-26c0-43f0-aa55-6f8d885d4a4c=g%3A295ef169-1cd7-4d50-dee6-edd6dbec1233%7Ce%3Aundefined%7Cc%3A1757580569741%7Cl%3A1759900268910; ab.storage.userId.fda15891-26c0-43f0-aa55-6f8d885d4a4c=g%3A68e5130148be54b62144a6ab%7Ce%3Aundefined%7Cc%3A1759851151443%7Cl%3A1759900268911; suid=818668e0-2439-4623-902d-fab3425e50f0; first_session=%7B%22visits%22%3A888%2C%22start%22%3A1757580570525%2C%22last_visit%22%3A1759900360332%2C%22url%22%3A%22https%3A%2F%2Fwayground.com%2Fadmin%22%2C%22path%22%3A%22%2Fadmin%22%2C%22referrer%22%3A%22https%3A%2F%2Fwayground.com%2Fadmin%22%2C%22referrer_info%22%3A%7B%22host%22%3A%22wayground.com%22%2C%22path%22%3A%22%2Fadmin%22%2C%22protocol%22%3A%22https%3A%22%2C%22port%22%3A80%2C%22search%22%3A%22%22%2C%22query%22%3A%7B%7D%7D%2C%22search%22%3A%7B%22engine%22%3Anull%2C%22query%22%3Anull%7D%2C%22prev_visit%22%3A1759900321109%2C%22time_since_last_visit%22%3A39223%2C%22version%22%3A0.4%7D`;
const CURL_CSRF = "ldmnYv_p5rKQIyZllAiwypxrHQ8";

function extractCsrfFromCookie(cookie?: string): string | undefined {
  if (!cookie) return undefined;
  const m = cookie.match(/(?:^|;\s*)x-csrf-token=([^;]+)/i) || cookie.match(/(?:^|;\s*)_csrf=([^;]+)/i);
  return m ? decodeURIComponent(m[1]) : undefined;
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
  console.log('[api:wayground:create-interactive] Request received');
  try {
    const body = await request.json();
    const { videoUrl, videoId, duration, grade, subject } = body ?? {};
    if (!videoUrl || !videoId) {
      console.log('[api:wayground:create-interactive] Error: Missing videoUrl or videoId');
      return NextResponse.json({ error: "Missing videoUrl or videoId" }, { status: 400 });
    }

    console.log(`[api:wayground:create-interactive] Video: ${videoId}, Grade: ${grade || '6'}, Subject: ${subject || 'Science'}`);

    let durationSeconds: number = typeof duration === "number" ? duration : 0;
    if (!durationSeconds || durationSeconds <= 0) {
      console.log('[api:wayground:create-interactive] Fetching video duration from YouTube API');
      const apiKey = process.env.YOUTUBE_API_KEY;
      const fetched = await getYouTubeDurationSeconds(String(videoId), apiKey);
      if (typeof fetched === "number" && fetched > 0) {
        durationSeconds = fetched;
        console.log(`[api:wayground:create-interactive] Duration fetched: ${durationSeconds}s`);
      }
    }

    const payload = {
      videoUrl: String(videoUrl),
      params: {
        grade: String(grade ?? "6th Grade"),
        subject: String(subject ?? "Science"),
        language: "English",
        numQuestions: 0,
        videoMeta: {
          duration: durationSeconds,
          startTime: 0,
          endTime: durationSeconds,
          videoId: String(videoId),
        },
        createInteractiveVideo: true,
      },
      meta: {
        uid: "68e5f2cb0658bdf85f62b2a9",
        quizGenView: "USING_YOUTUBE_LINK",
        genProcess: "GENERATE_FROM_CONTENT",
        skills: [],
        subtopics: [],
        source: "youtube",
      },
    } as const;

    const headerCookie = request.headers.get("x-wayground-cookie");
    const cookieHeader = (typeof body?.cookie === "string" && body.cookie.trim()) ? body.cookie.trim() : (headerCookie?.trim() || process.env.WAYGROUND_COOKIE || CURL_COOKIE);
    const headerCsrf = request.headers.get("x-wayground-csrf");
    const csrfToken = (typeof body?.csrf === "string" && body.csrf.trim()) ? body.csrf.trim() : (headerCsrf?.trim() || extractCsrfFromCookie(cookieHeader) || CURL_CSRF);

    console.log('[api:wayground:create-interactive] Sending request to Wayground API');
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        baggage:
          "sentry-environment=production,sentry-release=62fa76ad0f82c4a9149d0215ff19cd2bc0b6ec76,sentry-public_key=f4055af1be6347b5a3b645683a6b50ff,sentry-trace_id=1e77c1f0aee140e3817bb4bf3acf11ec,sentry-sample_rate=0.05,sentry-transaction=admin-assessment,sentry-sampled=false",
        "content-type": "application/json",
        cookie: cookieHeader,
        origin: "https://wayground.com",
        priority: "u=1, i",
        referer: "https://wayground.com/admin/assessment",
        "sec-ch-ua": '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "sentry-trace": "1e77c1f0aee140e3817bb4bf3acf11ec-b960a994ff32973d-0",
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        "x-amzn-trace-id": "Root=1-68e5f2e9-8ceccc46e06d9a102f4b2f66;Parent=a01bce81d90e1f7b;Sampled=1",
        "x-component-type": "adminv3",
        "x-csrf-token": csrfToken,
        "x-q-request-context-path": "FeaturedPage",
        "x-q-traceid": "Root=1-68e5f2e9-8ceccc46e06d9a102f4b2f66;Parent=a01bce81d90e1f7b;Sampled=1",
      },
      body: JSON.stringify(payload),
    });

    console.log(`[api:wayground:create-interactive] Response status: ${res.status}`);
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      console.log('[api:wayground:create-interactive] Success - interactive video creation initiated');
      return NextResponse.json(data, { status: res.status });
    } catch {
      console.log('[api:wayground:create-interactive] Response not JSON, returning as text');
      return new NextResponse(text, { status: res.status });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[api:wayground:create-interactive] Error: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


