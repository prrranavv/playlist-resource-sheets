import { NextResponse } from "next/server";

const PUBLISH_BASE = "https://wayground.com/_quizserver/main/v2/quiz";

const HARDCODED_COOKIE = `quizizz_uid=df0761ef-a8fd-4ef4-ad92-e1011b55c1a6; QUIZIZZ_EXP_SLOT=21; QUIZIZZ_EXP_NAME=main_main; QUIZIZZ_EXP_LEVEL=live; QUIZIZZ_EXP_VERSION=v2; country=US; _fw_crm_v=429bd5b1-aa2c-422d-ccdc-85895d23ab43; featureUpdatedTime=2025-09-19%2B09%253A56%253A50.542%2B%252B0000%2BUTC; featureHash=755e6bf10e954fa1b7e54936686c4b59e90e98cbbada73159044f364363badb6; featureUUID=239b27e1-4104-4272-8426-0a1688b702f3; quizizz_uid=ec0b84de-1843-4449-80e6-f8682deb6fad; QUIZIZZ_EXP_NAME=main_main; QUIZIZZ_EXP_SLOT=21; QUIZIZZ_EXP_VERSION=v2; locale=en; x-csrf-token=3xHamJ3szMhUH68u0CggmCSZ9xo; aws-waf-token=9e270ceb-364b-44e6-87c0-670066eb989d:EQoAv71B2GAnAAAA:xJuZcaicyr74/uFccGeMSBrW3jSWeHWKx31gAT7zKTsUDC1SX7fveV2LjFxjQtz3EwFqs3iVayjTb70ZgDfEosbLoHfQma2FT3kI8w5dvEH2ZnaO8jMDt7cXNbcYWkj7p0NVr5gj/Avz/Y195Mi5CYy9up0dKK7+wY13XV39k0VIQNvwK0K+o6soUdoBsxQw; q-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InByYW5hdi5nb3lhbEBxdWl6aXp6LmNvbSIsImV4cCI6MTc1OTg2MDMxM30.wDt5CebgFCbQv3OkcOiz28au36bsxA-aXYXGikALSxQ; QUIZIZZ_EXP_LEVEL=live; _sid=oHYUmG7GMhyG7l3BW6LeYV_TmSw3cmpSyDdRboxBOT-qgac9j--oGZN-6asdyLKi-r4tPfN3O0gyyjgVmuNw8FMu-5W-DnKbNFJCzROila7_TNIOS-93YIGFdhMuoBJnZIGPwzes9U7oIsbTXhofqw6XoMpudmPEyPVt.v3H3d5gUoHEctSjB1CxuqQ.6QvEQDfIYuZklzQM; suid=0b67fa4f-a15e-4c3d-8da3-dc2b9773544f; _sid=tQvMJbP2G6hZLo7-DjIqBRIvM__zqY_VrHc8DQW0d-4IXU8erEtt56CD1jFkUwHSm7ZDkxSdo4BMXCCqE0MtAFyiYwUi4sOycim9e3MSvVxjRZJbs48YeT5OUHbq3M6dhCyu_jK79B7V2gNZXzA8mnbJuqODLIpJ65tpaIFWbvAkfdJPyxSqEAc8vTr8YaYijwLW8Xi7vTRfyrmw8sO_cw43Pl6MmdPq.6lIY-I2ltOMV-gWXUtecxQ.ogYkGtJ0FqV4TuAz; _csrf=3xHamJ3szMhUH68u0CggmCSZ9xo; x-csrf-token=3xHamJ3szMhUH68u0CggmCSZ9xo; ab.storage.deviceId.fda15891-26c0-43f0-aa55-6f8d885d4a4c=g%3A295ef169-1cd7-4d50-dee6-edd6dbec1233%7Ce%3Aundefined%7Cc%3A1757580569741%7Cl%3A1759851151444; ab.storage.userId.fda15891-26c0-43f0-aa55-6f8d885d4a4c=g%3A68e5130148be54b62144a6ab%7Ce%3Aundefined%7Cc%3A1759851151443%7Cl%3A1759851151444; ab.storage.sessionId.fda15891-26c0-43f0-aa55-6f8d885d4a4c=g%3Aa7648dfc-1fa3-a353-7510-859b7bebaa22%7Ce%3A1759858351446%7Cc%3A1759851151443%7Cl%3A1759851151446; first_session=%7B%22visits%22%3A841%2C%22start%22%3A1757580570525%2C%22last_visit%22%3A1759851165115%2C%22url%22%3A%22https%3A%2F%2Fwayground.com%2Fadmin%22%2C%22path%22%3A%22%2Fadmin%22%2C%22referrer%22%3A%22https%3A%2F%2Fwayground.com%2Fadmin%22%2C%22referrer_info%22%3A%7B%22host%22%3A%22wayground.com%22%2C%22path%22%3A%22%2Fadmin%22%2C%22protocol%22%3A%22https%3A%22%2C%22port%22%3A80%2C%22search%22%3A%22%22%2C%22query%22%3A%7B%7D%7D%2C%22search%22%3A%7B%22engine%22%3Anull%2C%22query%22%3Anull%7D%2C%22prev_visit%22%3A1759851159031%2C%22time_since_last_visit%22%3A6084%2C%22version%22%3A0.4%7D`;
const CSRF = "3xHamJ3szMhUH68u0CggmCSZ9xo";

export async function POST(request: Request) {
  try {
    const { quizId, draftVersion, cookie: cookieBody, csrf: csrfBody } = await request.json();
    if (!quizId || !draftVersion) {
      return NextResponse.json({ error: "quizId and draftVersion required" }, { status: 400 });
    }
    const headerCookie = request.headers.get("x-wayground-cookie");
    const cookieHeader = (typeof cookieBody === "string" && cookieBody.trim()) ? cookieBody.trim() : (headerCookie?.trim() || process.env.WAYGROUND_COOKIE || HARDCODED_COOKIE);
    const headerCsrf = request.headers.get("x-wayground-csrf");
    const csrfToken = (typeof csrfBody === "string" && csrfBody.trim()) ? csrfBody.trim() : (headerCsrf?.trim() || CSRF);
    const url = `${PUBLISH_BASE}/${encodeURIComponent(quizId)}/version/${encodeURIComponent(draftVersion)}/publish`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/plain, */*",
        origin: "https://wayground.com",
        referer: `https://wayground.com/admin/quiz/${encodeURIComponent(quizId)}/edit`,
        cookie: cookieHeader,
        "x-csrf-token": csrfToken,
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        priority: "u=1, i",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "sec-fetch-dest": "empty",
        "sec-ch-ua": '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sentry-trace": "7f4bc57f4dbc4d3ea02fa0faa688d4e3-bf9b3c01c461e337-0",
        baggage:
          "sentry-environment=production,sentry-release=62fa76ad0f82c4a9149d0215ff19cd2bc0b6ec76,sentry-public_key=f4055af1be6347b5a3b645683a6b50ff,sentry-trace_id=7f4bc57f4dbc4d3ea02fa0faa688d4e3,sentry-sample_rate=0.05,sentry-transaction=admin-quiz-quizId-edit,sentry-sampled=false",
        "x-amzn-trace-id": "Root=1-68e532ab-cbd65c47be408c9e60f1236d;Parent=8bc38b97c5f86d29;Sampled=1",
        "x-component-type": "adminv3",
        "x-q-request-context-path": "QuizPage",
        "x-q-traceid": "Root=1-68e532ab-cbd65c47be408c9e60f1236d;Parent=8bc38b97c5f86d29;Sampled=1",
      },
      body: JSON.stringify({ premiumUse: false }),
    });
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data, { status: res.status });
    } catch {
      return new NextResponse(text, { status: res.status });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


