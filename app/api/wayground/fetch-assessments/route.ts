import { NextResponse } from "next/server";

const SEARCH_ENDPOINT = "https://wayground.com/_sserverv2/main/v3/search/my-library";

// Hardcoded headers/cookies from provided curl for drafts listing
const HARDCODED_COOKIE = `quizizz_uid=df0761ef-a8fd-4ef4-ad92-e1011b55c1a6; QUIZIZZ_EXP_SLOT=21; QUIZIZZ_EXP_NAME=main_main; QUIZIZZ_EXP_LEVEL=live; QUIZIZZ_EXP_VERSION=v2; country=US; _fw_crm_v=429bd5b1-aa2c-422d-ccdc-85895d23ab43; featureUpdatedTime=2025-09-19%2B09%253A56%253A50.542%2B%252B0000%2BUTC; featureHash=755e6bf10e954fa1b7e54936686c4b59e90e98cbbada73159044f364363badb6; featureUUID=239b27e1-4104-4272-8426-0a1688b702f3; quizizz_uid=ec0b84de-1843-4449-80e6-f8682deb6fad; QUIZIZZ_EXP_NAME=main_main; QUIZIZZ_EXP_SLOT=21; QUIZIZZ_EXP_VERSION=v2; locale=en; x-csrf-token=nRinBo6L-Q9iD74EZRk3w8O9x_6-X_u0cmR8; aws-waf-token=9e270ceb-364b-44e6-87c0-670066eb989d:EQoAv71B2GAnAAAA:xJuZcaicyr74/uFccGeMSBrW3jSWeHWKx31gAT7zKTsUDC1SX7fveV2LjFxjQtz3EwFqs3iVayjTb70ZgDfEosbLoHfQma2FT3kI8w5dvEH2ZnaO8jMDt7cXNbcYWkj7p0NVr5gj/Avz/Y195Mi5CYy9up0dKK7+wY13XV39k0VIQNvwK0K+o6soUdoBsxQw; q-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InByYW5hdi5nb3lhbEBxdWl6aXp6LmNvbSIsImV4cCI6MTc1OTg2MDMxM30.wDt5CebgFCbQv3OkcOiz28au36bsxA-aXYXGikALSxQ; QUIZIZZ_EXP_LEVEL=live; ab.storage.deviceId.fda15891-26c0-43f0-aa55-6f8d885d4a4c=g%3A295ef169-1cd7-4d50-dee6-edd6dbec1233%7Ce%3Aundefined%7Cc%3A1757580569741%7Cl%3A1759843286276; ab.storage.userId.fda15891-26c0-43f0-aa55-6f8d885d4a4c=g%3A68e5130148be54b62144a6ab%7Ce%3Aundefined%7Cc%3A1759843286275%7Cl%3A1759843286277; _sid=oHYUmG7GMhyG7l3BW6LeYV_TmSw3cmpSyDdRboxBOT-qgac9j--oGZN-6asdyLKi-r4tPfN3O0gyyjgVmuNw8FMu-5W-DnKbNFJCzROila7_TNIOS-93YIGFdhMuoBJnZIGPwzes9U7oIsbTXhofqw6XoMpudmPEyPVt.v3H3d5gUoHEctSjB1CxuqQ.6QvEQDfIYuZklzQM; first_session=%7B%22visits%22%3A808%2C%22start%22%3A1757580570525%2C%22last_visit%22%3A1759846887859%2C%22url%22%3A%22https%3A%2F%2Fwayground.com%2Fadmin%22%2C%22path%22%3A%22%2Fadmin%22%2C%22referrer%22%3A%22https%3A%2F%2Fwayground.com%2Fadmin%22%2C%22referrer_info%22%3A%7B%22host%22%3A%22wayground.com%22%2C%22path%22%3A%22%2Fadmin%22%2C%22protocol%22%3A%22https%3A%22%2C%22port%22%3A80%2C%22search%22%3A%22%22%2C%22query%22%3A%7B%7D%7D%2C%22search%22%3A%7B%22engine%22%3Anull%2C%22query%22%3Anull%7D%2C%22prev_visit%22%3A1759846879129%2C%22time_since_last_visit%22%3A8730%2C%22version%22%3A0.4%7D; suid=cbccfe08-29fe-491c-bfbf-07faa7486fb0; _csrf=8-kxnR3tzNUhRsmaWpsq71BrXk8; x-csrf-token=8-kxnR3tzNUhRsmaWpsq71BrXk8; ab.storage.sessionId.fda15891-26c0-43f0-aa55-6f8d885d4a4c=g%3A242ecbb5-58fe-41e1-44b4-e8704ab252ad%7Ce%3A1759854456125%7Cc%3A1759843286276%7Cl%3A1759847256125`;
const HARDCODED_CSRF = "8-kxnR3tzNUhRsmaWpsq71BrXk8";

type QuizSummary = { id: string; title: string };

function pushIfValid(results: Map<string, QuizSummary>, id: unknown, title: unknown) {
  if (typeof id === "string" && /^[a-f0-9]{24}$/i.test(id) && typeof title === "string" && title.length > 0) {
    if (!results.has(id)) results.set(id, { id, title });
  }
}

function collectQuizSummaries(value: unknown, results: Map<string, QuizSummary>) {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const v of value) collectQuizSummaries(v, results);
    return;
  }
  if (typeof value !== "object") return;

  const obj: Record<string, unknown> = value as Record<string, unknown>;
  // Prefer explicit quiz/draft structures if present
  const quizObj = obj["quiz"] as Record<string, unknown> | undefined;
  if (quizObj && typeof quizObj === "object") {
    const id = (quizObj as any)._id || (quizObj as any).id;
    const draftObj = obj["draft"] as Record<string, unknown> | undefined;
    const title = (draftObj as any)?.name || (quizObj as any).name || (obj as any).name || (obj as any).title;
    pushIfValid(results, id, title);
  }
  const draftObj2 = obj["draft"] as Record<string, unknown> | undefined;
  if (draftObj2 && typeof draftObj2 === "object") {
    const title = (draftObj2 as any).name || (obj as any).name || (obj as any).title;
    const quizObj2 = obj["quiz"] as Record<string, unknown> | undefined;
    const id = (quizObj2 as any)?._id || (quizObj2 as any)?.id || (obj as any)._id || (obj as any).id;
    pushIfValid(results, id, title);
  }
  // Fallback: only when object looks like a quiz doc
  if ((obj as any).type === "quiz" || (obj as any).hasDraftVersion === true) {
    pushIfValid(results, (obj as any)._id || (obj as any).id, (obj as any).name || (obj as any).title);
  }

  for (const v of Object.values(obj)) collectQuizSummaries(v, results);
}

export async function POST() {
  try {
    const url = new URL(SEARCH_ENDPOINT);
    url.searchParams.set("from", "0");
    url.searchParams.set("size", "100");

    const body = {
      searchTerm: "",
      sortBy: "createdAt",
      sortOrder: "desc",
      activityTypes: ["quiz"],
      tab: "drafts",
      _: "uqF9It",
    };

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/plain, */*",
        origin: "https://wayground.com",
        referer: "https://wayground.com/admin/my-library/createdByMe?activityStatus=draft",
        cookie: HARDCODED_COOKIE,
        "x-csrf-token": HARDCODED_CSRF,
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        "accept-language": "en-US,en;q=0.9",
        priority: "u=1, i",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "sec-fetch-dest": "empty",
        "sec-ch-ua": '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sentry-trace": "779477c69e394065b4c9218cf8c2c067-9a27227c92496252-0",
        baggage:
          "sentry-environment=production,sentry-release=23830a981692412e5b89fbcbf8e2a7d28bbb7319,sentry-public_key=f4055af1be6347b5a3b645683a6b50ff,sentry-trace_id=779477c69e394065b4c9218cf8c2c067,sentry-sample_rate=0.05,sentry-transaction=admin-my-library-createdbyme,sentry-sampled=false",
        "x-amzn-trace-id": "Root=1-68e52359-ae9ad25174541c7b1cfefbf8;Parent=9b63a65568d31119;Sampled=1",
        "x-q-traceid": "Root=1-68e52359-ae9ad25174541c7b1cfefbf8;Parent=9b63a65568d31119;Sampled=1",
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let data: unknown = null;
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      return new NextResponse(text, { status: res.status });
    }

    const map = new Map<string, QuizSummary>();
    collectQuizSummaries(data, map);
    const quizzes = Array.from(map.values()).slice(0, 100);
    return NextResponse.json({ quizIds: quizzes.map(q => q.id), quizzes, raw: data }, { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


