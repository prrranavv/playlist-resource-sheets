import { NextResponse } from "next/server";

const SEARCH_ENDPOINT = "https://wayground.com/_sserverv2/main/v3/search/my-library";
const QUIZ_BASE = "https://wayground.com/quiz/";

// Use the interactive videos curl cookies and token
const HARDCODED_COOKIE = `quizizz_uid=df0761ef-a8fd-4ef4-ad92-e1011b55c1a6; QUIZIZZ_EXP_SLOT=21; QUIZIZZ_EXP_NAME=main_main; QUIZIZZ_EXP_LEVEL=live; QUIZIZZ_EXP_VERSION=v2; country=US; _fw_crm_v=429bd5b1-aa2c-422d-ccdc-85895d23ab43; featureUpdatedTime=2025-09-19%2B09%253A56%253A50.542%2B%252B0000%2BUTC; featureHash=755e6bf10e954fa1b7e54936686c4b59e90e98cbbada73159044f364363badb6; featureUUID=239b27e1-4104-4272-8426-0a1688b702f3; quizizz_uid=ec0b84de-1843-4449-80e6-f8682deb6fad; QUIZIZZ_EXP_NAME=main_main; QUIZIZZ_EXP_SLOT=21; QUIZIZZ_EXP_VERSION=v2; locale=en; aws-waf-token=9e270ceb-364b-44e6-87c0-670066eb989d:EQoAv71B2GAnAAAA:xJuZcaicyr74/uFccGeMSBrW3jSWeHWKx31gAT7zKTsUDC1SX7fveV2LjFxjQtz3EwFqs3iVayjTb70ZgDfEosbLoHfQma2FT3kI8w5dvEH2ZnaO8jMDt7cXNbcYWkj7p0NVr5gj/Avz/Y195Mi5CYy9up0dKK7+wY13XV39k0VIQNvwK0K+o6soUdoBsxQw; q-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InByYW5hdi5nb3lhbEBxdWl6aXp6LmNvbSIsImV4cCI6MTc1OTg2MDMxM30.wDt5CebgFCbQv3OkcOiz28au36bsxA-aXYXGikALSxQ; _sid=EFRyx-ED5gWSoX_Gd7lrT5D4Qnf4WYIfDyfB--xeJd6gKGNRAqf19lekZSQUn0vqG4z3w6q2LA5SpmXjZZRXnoi80WxpgzdS1SQlecssHSpcNWTAN9l-L2Aj9lmWMEH8vK9Gk2cuxQpx1_wSw-QxOgmTLczl2jFlqEIy.vf4NI0P91_xSs5pO-FkZDQ.FP2rgJBJeQ2IXVHO; x-csrf-token=Y1mHRsKn-QS9Y7fwqLbzCKBIWnSB-kd6QSWQ; QUIZIZZ_EXP_LEVEL=live; ab.storage.deviceId.fda15891-26c0-43f0-aa55-6f8d885d4a4c=g%3A295ef169-1cd7-4d50-dee6-edd6dbec1233%7Ce%3Aundefined%7Cc%3A1757580569741%7Cl%3A1759900268910; ab.storage.userId.fda15891-26c0-43f0-aa55-6f8d885d4a4c=g%3A68e5130148be54b62144a6ab%7Ce%3Aundefined%7Cc%3A1759851151443%7Cl%3A1759900268911; suid=23c655cc-2448-4b7c-a560-03b9e2b01bef; _csrf=-uuNzq9YcqdMBH_S4G5pXQN3rjY; x-csrf-token=-uuNzq9YcqdMBH_S4G5pXQN3rjY; ab.storage.sessionId.fda15891-26c0-43f0-aa55-6f8d885d4a4c=g%3A57544bb1-b76f-16d0-869c-d2cdc8e5e5f2%7Ce%3A1759908338348%7Cc%3A1759900268910%7Cl%3A1759901138348; first_session=%7B%22visits%22%3A891%2C%22start%22%3A1757580570525%2C%22last_visit%22%3A1759901144169%2C%22url%22%3A%22https%3A%2F%2Fwayground.com%2Fadmin%22%2C%22path%22%3A%22%2Fadmin%22%2C%22referrer%22%3A%22https%3A%2F%2Fwayground.com%2Fadmin%22%2C%22referrer_info%22%3A%7B%22host%22%3A%22wayground.com%22%2C%22path%22%3A%22%2Fadmin%22%2C%22protocol%22%3A%22https%3A%22%2C%22port%22%3A80%2C%22search%22%3A%22%22%2C%22query%22%3A%7B%7D%7D%2C%22search%22%3A%7B%22engine%22%3Anull%2C%22query%22%3Anull%7D%2C%22prev_visit%22%3A1759900753961%2C%22time_since_last_visit%22%3A390208%2C%22version%22%3A0.4%7D`;
const CSRF = "-uuNzq9YcqdMBH_S4G5pXQN3rjY";

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, json: JSON.parse(text) }; } catch { return { ok: res.ok, status: res.status, text }; }
}

export async function POST() {
  try {
    // Step 1: paginate through drafts with activityTypes:["video-quiz"] and collect quiz ids + draft versions robustly
    const candidates = new Map<string, string | null>(); // quizId -> draftVersion
    let from = 0;
    const size = 100;
    let pagesFetched = 0;
    while (pagesFetched < 20) { // up to 2000 items
      const url = new URL(SEARCH_ENDPOINT);
      url.searchParams.set("from", String(from));
      url.searchParams.set("size", String(size));
      const pageRes = await fetchJson(url.toString(), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/plain, */*",
          origin: "https://wayground.com",
          referer: "https://wayground.com/admin/my-library/createdByMe?activityStatus=draft&activityType=[%22video-quiz%22]",
          cookie: HARDCODED_COOKIE,
          "x-csrf-token": CSRF,
        },
        body: JSON.stringify({
          searchTerm: "",
          sortBy: "createdAt",
          sortOrder: "desc",
          activityTypes: ["video-quiz"],
          tab: "drafts",
          _: "uqF9It",
        }),
      });
      if (!pageRes.ok || !pageRes.json) break;

      const collect = (obj: unknown) => {
        if (!obj) return;
        if (Array.isArray(obj)) { obj.forEach(collect); return; }
        if (typeof obj !== "object") return;

        // Common shapes to look for
        const anyObj = obj as Record<string, unknown>;
        const q = (anyObj as any).quiz || anyObj;
        const type = (q as any)?.type || (anyObj as any)?.activityType;
        const id = (q as any)?._id || (q as any)?.id || (anyObj as any)?.quizId || (anyObj as any)?._id || (anyObj as any)?.id;
        const dV = (q as any)?.draftVersion || (anyObj as any)?.draftVersion || null;
        if (typeof id === "string" && /^[a-f0-9]{24}$/i.test(id) && (type === "video-quiz")) {
          if (!candidates.has(id)) candidates.set(id, typeof dV === "string" ? dV : null);
        }
        for (const v of Object.values(anyObj)) collect(v);
      };
      collect(pageRes.json);

      const pageSize = size;
      pagesFetched += 1;
      from += pageSize;

      // Heuristic stop: if this page added nothing, or page smaller than requested
      // Try to read hits length if available
      const hitsLen = (pageRes as any)?.json?.hits?.length as number | undefined;
      if (hitsLen !== undefined && hitsLen < size) break;
    }

    const quizIds = Array.from(candidates.keys());

    // Step 2: fetch each quiz json and extract youtube videoId
    const interactive: Array<{ quizId: string; title: string; videoId: string; draftVersion?: string | null }> = [];
    for (const id of quizIds) {
      const res = await fetchJson(QUIZ_BASE + encodeURIComponent(id), {
        headers: { accept: "application/json, text/plain, */*", cookie: HARDCODED_COOKIE },
      });
      if (!res.ok || !res.json) continue;
      const data = res.json;
      const type = data?.data?.quiz?.type || data?.quiz?.type;
      if (type !== "video-quiz") continue;
      const title = data?.data?.draft?.name || data?.draft?.name || data?.data?.quiz?.name || data?.quiz?.name || "";
      const draftVersion = data?.data?.quiz?.draftVersion || data?.quiz?.draftVersion || candidates.get(id) || null;
      const media = data?.data?.draft?.questions?.[0]?.structure?.query?.media?.[0] || data?.draft?.questions?.[0]?.structure?.query?.media?.[0];
      let videoId = media?.meta?.videoId as string | undefined;
      const urlStr = media?.url as string | undefined;
      if (!videoId && urlStr) {
        try {
          const u = new URL(urlStr.startsWith("http") ? urlStr : `https://${urlStr}`);
          const v = u.searchParams.get("v");
          if (v) videoId = v;
        } catch {}
      }
      if (videoId) interactive.push({ quizId: id, title, videoId, draftVersion });
    }
    return NextResponse.json({ interactive });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


