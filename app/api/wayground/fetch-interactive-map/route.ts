import { NextResponse } from "next/server";

const SEARCH_ENDPOINT = "https://wayground.com/_sserverv2/main/v3/search/my-library";
const QUIZ_BASE = "https://wayground.com/quiz/";

// Use the interactive videos curl cookies and token
const HARDCODED_COOKIE = "";
const CSRF = "";

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, json: JSON.parse(text) }; } catch { return { ok: res.ok, status: res.status, text }; }
}

export async function POST(request: Request) {
  try {
    const headerCookie = request.headers.get("x-wayground-cookie") || process.env.WAYGROUND_COOKIE || HARDCODED_COOKIE;
    const headerCsrf = request.headers.get("x-wayground-csrf");
    const csrfToken = headerCsrf || CSRF || "Y1mHRsKn-QS9Y7fwqLbzCKBIWnSB-kd6QSWQ";
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
          cookie: headerCookie,
          "x-csrf-token": csrfToken,
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
        const q = (anyObj["quiz"] as Record<string, unknown> | undefined) || anyObj;
        const type = (q as Record<string, unknown>)["type"] || anyObj["activityType"];
        const id = (q as Record<string, unknown>)["_id"] || (q as Record<string, unknown>)["id"] || anyObj["quizId"] || anyObj["_id"] || anyObj["id"];
        const dV = (q as Record<string, unknown>)["draftVersion"] || anyObj["draftVersion"] || null;
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
      type PageJson = { hits?: unknown[] };
      const hitsLen = (pageRes.json as PageJson)?.hits?.length as number | undefined;
      if (hitsLen !== undefined && hitsLen < size) break;
    }

    const quizIds = Array.from(candidates.keys());

    // Step 2: fetch each quiz json and extract youtube videoId
    const interactive: Array<{ quizId: string; title: string; videoId: string; draftVersion?: string | null }> = [];
    const idsToProcess = quizIds.slice(0, 100);
    const BATCH = 10;
    for (let i = 0; i < idsToProcess.length; i += BATCH) {
      const group = idsToProcess.slice(i, i + BATCH);
      await Promise.all(group.map(async (id) => {
        const res = await fetchJson(QUIZ_BASE + encodeURIComponent(id), {
          headers: { accept: "application/json, text/plain, */*", cookie: headerCookie },
        });
        if (!res.ok || !res.json) return;
        const data = res.json;
        const type = data?.data?.quiz?.type || data?.quiz?.type;
        if (type !== "video-quiz") return;
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
      }));
    }
    return NextResponse.json({ interactive });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


