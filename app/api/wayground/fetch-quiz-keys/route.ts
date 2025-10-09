import { NextResponse } from "next/server";

const QUIZ_BASE = "https://wayground.com/quiz/";

// Reuse cookie from prior calls (kept for authenticated fetch)
const HARDCODED_COOKIE = `quizizz_uid=df0761ef-a8fd-4ef4-ad92-e1011b55c1a6; QUIZIZZ_EXP_SLOT=21; QUIZIZZ_EXP_NAME=main_main; QUIZIZZ_EXP_LEVEL=live; QUIZIZZ_EXP_VERSION=v2; country=US; _fw_crm_v=429bd5b1-aa2c-422d-ccdc-85895d23ab43; featureUpdatedTime=2025-09-19%2B09%253A56%253A50.542%2B%252B0000%2BUTC; featureHash=755e6bf10e954fa1b7e54936686c4b59e90e98cbbada73159044f364363badb6; featureUUID=239b27e1-4104-4272-8426-0a1688b702f3; quizizz_uid=ec0b84de-1843-4449-80e6-f8682deb6fad; QUIZIZZ_EXP_NAME=main_main; QUIZIZZ_EXP_SLOT=21; QUIZIZZ_EXP_VERSION=v2; locale=en; x-csrf-token=nRinBo6L-Q9iD74EZRk3w8O9x_6-X_u0cmR8; aws-waf-token=9e270ceb-364b-44e6-87c0-670066eb989d:EQoAv71B2GAnAAAA:xJuZcaicyr74/uFccGeMSBrW3jSWeHWKx31gAT7zKTsUDC1SX7fveV2LjFxjQtz3EwFqs3iVayjTb70ZgDfEosbLoHfQma2FT3kI8w5dvEH2ZnaO8jMDt7cXNbcYWkj7p0NVr5gj/Avz/Y195Mi5CYy9up0dKK7+wY13XV39k0VIQNvwK0K+o6soUdoBsxQw; q-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InByYW5hdi5nb3lhbEBxdWl6aXp6LmNvbSIsImV4cCI6MTc1OTg2MDMxM30.wDt5CebgFCbQv3OkcOiz28au36bsxA-aXYXGikALSxQ; QUIZIZZ_EXP_LEVEL=live; ab.storage.deviceId.fda15891-26c0-43f0-aa55-6f8d885d4a4c=g%3A295ef169-1cd7-4d50-dee6-edd6dbec1233%7Ce%3Aundefined%7Cc%3A1757580569741%7Cl%3A1759843286276; ab.storage.userId.fda15891-26c0-43f0-aa55-6f8d885d4a4c=g%3A68e5130148be54b62144a6ab%7Ce%3Aundefined%7Cc%3A1759843286275%7Cl%3A1759843286277; _sid=oHYUmG7GMhyG7l3BW6LeYV_TmSw3cmpSyDdRboxBOT-qgac9j--oGZN-6asdyLKi-r4tPfN3O0gyyjgVmuNw8FMu-5W-DnKbNFJCzROila7_TNIOS-93YIGFdhMuoBJnZIGPwzes9U7oIsbTXhofqw6XoMpudmPEyPVt.v3H3d5gUoHEctSjB1CxuqQ.6QvEQDfIYuZklzQM; first_session=%7B%22visits%22%3A808%2C%22start%22%3A1757580570525%2C%22last_visit%22%3A1759846887859%2C%22url%22%3A%22https%3A%2F%2Fwayground.com%2Fadmin%22%2C%22path%22%3A%22%2Fadmin%22%2C%22referrer%22%3A%22https%3A%2F%2Fwayground.com%2Fadmin%22%2C%22referrer_info%22%3A%7B%22host%22%3A%22wayground.com%22%2C%22path%22%3A%22%2Fadmin%22%2C%22protocol%22%3A%22https%3A%22%2C%22port%22%3A80%2C%22search%22%3A%22%22%2C%22query%22%3A%7B%7D%7D%2C%22search%22%3A%7B%22engine%22%3Anull%2C%22query%22%3Anull%7D%2C%22prev_visit%22%3A1759846879129%2C%22time_since_last_visit%22%3A8730%2C%22version%22%3A0.4%7D; suid=cbccfe08-29fe-491c-bfbf-07faa7486fb0; _csrf=8-kxnR3tzNUhRsmaWpsq71BrXk8; x-csrf-token=8-kxnR3tzNUhRsmaWpsq71BrXk8; ab.storage.sessionId.fda15891-26c0-43f0-aa55-6f8d885d4a4c=g%3A242ecbb5-58fe-41e1-44b4-e8704ab252ad%7Ce%3A1759854456125%7Cc%3A1759843286276%7Cl%3A1759847256125`;

export async function POST(request: Request) {
  try {
    const headerCookie = request.headers.get("x-wayground-cookie") || undefined;
    const { quizIds, cookieOverride } = await request.json();
    if (!Array.isArray(quizIds) || quizIds.length === 0) {
      return NextResponse.json({ error: "quizIds array required" }, { status: 400 });
    }

    const results: Record<string, string | null> = {};
    const versions: Record<string, string | null> = {};
    for (const id of quizIds.slice(0, 100)) {
      const res = await fetch(QUIZ_BASE + encodeURIComponent(id), {
        headers: {
          accept: "application/json, text/plain, */*",
          cookie: (typeof headerCookie === "string" && headerCookie.trim()) ? headerCookie.trim() : ((typeof cookieOverride === "string" && cookieOverride.trim()) ? cookieOverride.trim() : (process.env.WAYGROUND_COOKIE || HARDCODED_COOKIE)),
          "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        },
      });
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        const key = (data?.data?.draft?.aiCreateMeta?.quizGenKey || data?.draft?.aiCreateMeta?.quizGenKey || data?.aiCreateMeta?.quizGenKey) as string | undefined;
        results[id] = key ?? null;
        const version = (data?.data?.quiz?.draftVersion || data?.quiz?.draftVersion) as string | undefined;
        versions[id] = version ?? null;
      } catch {
        results[id] = null;
        versions[id] = null;
      }
    }

    return NextResponse.json({ quizGenKeysById: results, draftVersionById: versions });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}