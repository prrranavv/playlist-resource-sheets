import { NextResponse } from "next/server";

const SEARCH_ENDPOINT = "https://wayground.com/_sserverv2/main/v3/search/my-library";

export async function POST(request: Request) {
  try {
    const headerCookie = request.headers.get("x-wayground-cookie") || process.env.WAYGROUND_COOKIE || "";
    const url = new URL(SEARCH_ENDPOINT);
    url.searchParams.set("from", "0");
    url.searchParams.set("size", "100");

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json",
        cookie: headerCookie,
        origin: "https://wayground.com",
        referer: "https://wayground.com/admin/my-library/createdByMe?activityStatus=draft&activityType=[%22video-quiz%22]",
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
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

    const text = await res.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { return new NextResponse(text, { status: res.status }); }

    const interactive: Array<{ quizId: string; title: string; draftVersion?: string | null }> = [];
    const seen = new Set<string>();
    const collect = (obj: unknown) => {
      if (!obj) return;
      if (Array.isArray(obj)) { obj.forEach(collect); return; }
      if (typeof obj !== "object") return;
      const anyObj = obj as Record<string, unknown>;
      const quiz = (anyObj["quiz"] as Record<string, unknown> | undefined) || anyObj;
      const type = quiz["type"] || anyObj["activityType"];
      const id = (quiz["_id"] || quiz["id"] || anyObj["quizId"] || anyObj["_id"] || anyObj["id"]) as string | undefined;
      const title = ((anyObj?.draft as Record<string, unknown>)?.name as string | undefined) || ((quiz as Record<string, unknown>)?.name as string | undefined) || (anyObj["name"] as string | undefined) || (anyObj["title"] as string | undefined) || "";
      const draftVersion = ((quiz as Record<string, unknown>)?.draftVersion as string | undefined) || ((anyObj as Record<string, unknown>)?.draftVersion as string | undefined) || null;
      if (type === "video-quiz" && id && /^[a-f0-9]{24}$/i.test(id) && !seen.has(id)) {
        seen.add(id);
        interactive.push({ quizId: id, title: title || "", draftVersion: typeof draftVersion === "string" ? draftVersion : null });
      }
      for (const v of Object.values(anyObj)) collect(v);
    };
    collect(data);

    return NextResponse.json({ interactive, quizIds: interactive.map(i => i.quizId) }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


