"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type PlaylistItem = {
  id: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
  position: number;
  videoUrl: string;
};

export default function Home() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const [playlistTitle, setPlaylistTitle] = useState<string | null>(null);
  const [grade, setGrade] = useState<string>("6");
  const [subject, setSubject] = useState<string>("Science");
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [quizKeyById, setQuizKeyById] = useState<Record<string, string>>({});
  const [bulkCreating, setBulkCreating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{done:number; total:number}>({ done: 0, total: 0 });
  const [fetchedQuizIds, setFetchedQuizIds] = useState<string[]>([]);
  const [fetchingAssessments, setFetchingAssessments] = useState(false);
  const [quizMetaById, setQuizMetaById] = useState<Record<string, { title: string; quizGenKey?: string | null }>>({});
  const [draftVersionById, setDraftVersionById] = useState<Record<string, string | null>>({});
  const [publishing, setPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState<{done:number; total:number}>({ done: 0, total: 0 });
  const [phase, setPhase] = useState<"idle"|"videos"|"creating"|"waiting"|"can_fetch"|"fetched"|"published">("idle");
  const [waitRemaining, setWaitRemaining] = useState<number>(0);
  const [publishedDone, setPublishedDone] = useState(false);
  const [creatingInteractiveId, setCreatingInteractiveId] = useState<string | null>(null);
  const [bulkCreatingInteractive, setBulkCreatingInteractive] = useState(false);
  const [interactiveProgress, setInteractiveProgress] = useState<{done:number; total:number}>({ done: 0, total: 0 });
  const [interactiveCreatedById, setInteractiveCreatedById] = useState<Record<string, boolean>>({});
  const [interactiveInfoByVideoId, setInteractiveInfoByVideoId] = useState<Record<string, { quizId: string; draftVersion: string }>>({});
  const [interactiveMetaByVideoId, setInteractiveMetaByVideoId] = useState<Record<string, { quizId: string; draftVersion: string; title: string }>>({});
  const [fetchingInteractive, setFetchingInteractive] = useState(false);
  const [interactivePhase, setInteractivePhase] = useState<"idle"|"waiting"|"can_fetch">("idle");
  const [interactiveWaitRemaining, setInteractiveWaitRemaining] = useState<number>(0);
  const [publishingIVs, setPublishingIVs] = useState(false);
  const [publishIVProgress, setPublishIVProgress] = useState<{done:number; total:number}>({ done: 0, total: 0 });

  function buildAssessmentPublishPairs(): Array<{ quizId: string; draftVersion: string }> {
    const pairs: Array<{ quizId: string; draftVersion: string }> = [];
    for (const it of items) {
      const vKey = quizKeyById[it.id];
      if (!vKey) continue;
      const entry = Object.entries(quizMetaById).find(([, m]) => m.quizGenKey === vKey);
      if (!entry) continue;
      const [qId] = entry;
      const dV = draftVersionById[qId];
      if (qId && dV) pairs.push({ quizId: qId, draftVersion: dV });
    }
    return pairs;
  }

  async function publishAssessmentsAll() {
    const pairs = buildAssessmentPublishPairs();
    if (pairs.length === 0) return;
    setPublishing(true);
    setPublishProgress({ done: 0, total: pairs.length });
    for (const p of pairs) {
      try {
        await fetch("/api/wayground/publish-quiz", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(p),
        });
        await fetch("/api/wayground/make-public", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ quizId: p.quizId }),
        });
      } catch {}
      setPublishProgress((s) => ({ ...s, done: s.done + 1 }));
    }
    setPublishing(false);
    setPhase("published");
    setPublishedDone(true);
  }

  function startInteractiveWaitCountdown(seconds: number = 60) {
    // Always restart to ensure countdown is from the last request
    setInteractivePhase("waiting");
    setInteractiveWaitRemaining(seconds);
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const remaining = Math.max(seconds - elapsed, 0);
      setInteractiveWaitRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setInteractivePhase("can_fetch");
      }
    }, 1000);
  }

  async function fetchPlaylist() {
    setError(null);
    setItems([]);
    setLoading(true);
    try {
      const res = await fetch(`/api/playlist?url=${encodeURIComponent(input)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch playlist");
      }
      setPlaylistId(data.playlistId as string);
      setPlaylistTitle((data.playlistTitle as string) || null);
      setItems((data.items as PlaylistItem[]).sort((a, b) => a.position - b.position));
      setPhase("videos");
    } catch (e: unknown) {
      const msg = typeof e === "object" && e && "message" in e ? String((e as { message?: string }).message) : "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function findQuizGenKey(value: unknown): string | undefined {
    if (!value) return undefined;
    if (typeof value === "object") {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (k === "quizGenKey" && typeof v === "string") return v;
        const nested = findQuizGenKey(v);
        if (nested) return nested;
      }
    }
    return undefined;
  }

  function startWaitCountdown(seconds: number = 90) {
    if (phase === "waiting" || phase === "can_fetch" || phase === "fetched" || phase === "published") return;
    setPhase("waiting");
    setWaitRemaining(seconds);
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const remaining = Math.max(seconds - elapsed, 0);
      setWaitRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setPhase("can_fetch");
      }
    }, 1000);
  }

  async function createAssessment(item: PlaylistItem, startWait: boolean = true): Promise<boolean> {
    setCreatingId(item.id);
    if (phase === "videos") setPhase("creating");
    try {
      const res = await fetch("/api/wayground/create-assessment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          videoUrl: item.videoUrl,
          grade,
          subject,
          duration: 0,
          videoId: item.id,
        }),
      });
      const cloned = res.clone();
      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        data = await cloned.text();
      }
      if (!res.ok) {
        throw new Error(typeof data === "string" ? data : JSON.stringify(data));
      }
      const key = findQuizGenKey(data);
      if (key) {
        setQuizKeyById((prev) => ({ ...prev, [item.id]: key }));
      }
      if (startWait) startWaitCountdown(90);
      return true;
    } catch (e: unknown) {
      console.error(e);
      setError("Failed to create assessment. See console for details.");
      return false;
    } finally {
      setCreatingId(null);
    }
  }

  async function createAssessmentsBulk() {
    if (items.length === 0) return;
    setBulkCreating(true);
    setBulkProgress({ done: 0, total: items.length });
    setError(null);
    setPhase("creating");
    for (const item of items) {
      if (quizKeyById[item.id]) {
        setBulkProgress((p) => ({ ...p, done: p.done + 1 }));
        continue;
      }
      await createAssessment(item, false);
      setBulkProgress((p) => ({ ...p, done: p.done + 1 }));
    }
    setBulkCreating(false);
    startWaitCountdown(90);
  }

  async function createInteractive(item: PlaylistItem): Promise<boolean> {
    setCreatingInteractiveId(item.id);
    try {
      // Start wait window from the time the request is made
      startInteractiveWaitCountdown(60);
      const res = await fetch("/api/wayground/create-interactive", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          videoUrl: item.videoUrl,
          grade,
          subject,
          videoId: item.id,
          duration: 0,
        }),
      });
      const cloned = res.clone();
      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        data = await cloned.text();
      }
      if (!res.ok) {
        throw new Error(typeof data === "string" ? data : JSON.stringify(data));
      }
      return true;
    } catch (e: unknown) {
      console.error(e);
      setError("Failed to create interactive video. See console for details.");
      return false;
    } finally {
      setCreatingInteractiveId(null);
    }
  }

  async function createInteractivesBulk() {
    if (items.length === 0) return;
    setBulkCreatingInteractive(true);
    setInteractiveProgress({ done: 0, total: items.length });
    setError(null);
    for (const item of items) {
      if (interactiveCreatedById[item.id]) {
        setInteractiveProgress((p) => ({ ...p, done: p.done + 1 }));
        continue;
      }
      await createInteractive(item);
      setInteractiveProgress((p) => ({ ...p, done: p.done + 1 }));
    }
    setBulkCreatingInteractive(false);
    // Ensure at least 60s wait after the last create in bulk
    startInteractiveWaitCountdown(60);
  }

  async function fetchAssessments() {
    setFetchingAssessments(true);
    setError(null);
    try {
      const res = await fetch("/api/wayground/fetch-assessments", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to fetch assessments");
      const ids = Array.isArray(data?.quizIds) ? (data.quizIds as string[]) : [];
      setFetchedQuizIds(ids);
      const quizTitleMap: Record<string, { title: string }> = {};
      if (Array.isArray(data?.quizzes)) {
        for (const q of data.quizzes as Array<{ id: string; title: string }>) {
          if (q?.id) quizTitleMap[q.id] = { title: q.title };
        }
      }
      setQuizMetaById((prev) => ({ ...prev, ...quizTitleMap }));

      if (ids.length > 0) {
        const res2 = await fetch("/api/wayground/fetch-quiz-keys", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ quizIds: ids }),
        });
        const data2 = await res2.json();
        if (res2.ok && data2?.quizGenKeysById) {
          const keyed: Record<string, { title: string; quizGenKey?: string | null }> = {};
          for (const [id, key] of Object.entries<string | null>(data2.quizGenKeysById)) {
            const existing = quizTitleMap[id] || {};
            keyed[id] = { title: existing.title || "", quizGenKey: key };
          }
          setQuizMetaById((prev) => ({ ...prev, ...keyed }));
          if (data2?.draftVersionById) setDraftVersionById(data2.draftVersionById as Record<string, string | null>);
        }
      }
      setPhase("fetched");
    } catch (e: unknown) {
      console.error(e);
      const msg = typeof e === "object" && e && "message" in e ? String((e as { message?: string }).message) : "Failed to fetch assessments";
      setError(msg);
    } finally {
      setFetchingAssessments(false);
    }
  }

  return (
    <div className="min-h-screen font-sans p-6 sm:p-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Fetch YouTube Playlist Videos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Paste YouTube playlist URL or ID"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <Button onClick={fetchPlaylist} disabled={!input || loading}>
                {loading ? "Loading..." : "Show Videos"}
              </Button>
              {(() => {
                const matchedVideoIds = Object.keys(interactiveInfoByVideoId);
                const hasAny = matchedVideoIds.some((vid) => interactiveCreatedById[vid]);
                const onPublishAllIVs = async () => {
                  const pairs: Array<{ quizId: string; draftVersion: string }> = [];
                  for (const [videoId, info] of Object.entries(interactiveInfoByVideoId)) {
                    if (!interactiveCreatedById[videoId]) continue;
                    if (info?.quizId && info?.draftVersion) pairs.push({ quizId: info.quizId, draftVersion: info.draftVersion });
                  }
                  if (pairs.length === 0) return;
                  setPublishingIVs(true);
                  setPublishIVProgress({ done: 0, total: pairs.length });
                  for (const p of pairs) {
                    try {
                      await fetch("/api/wayground/publish-interactive", {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify(p),
                      });
                      await fetch("/api/wayground/make-public", {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ quizId: p.quizId }),
                      });
                    } catch {}
                    setPublishIVProgress((s) => ({ ...s, done: s.done + 1 }));
                  }
                  setPublishingIVs(false);
                };
                return (
                  <Button size="sm" variant="secondary" data-publish-ivs onClick={onPublishAllIVs} disabled={!hasAny || publishingIVs}>
                    {publishingIVs ? `Publishing IVs (${publishIVProgress.done}/${publishIVProgress.total})` : "Publish IVs"}
                  </Button>
                );
              })()}
            </div>
            {error && (
              <p className="text-sm text-red-600 mt-3">{error}</p>
            )}
            {playlistId && !error && (
              <p className="text-xs text-muted-foreground mt-3">Playlist ID: {playlistId}{playlistTitle ? ` • ${playlistTitle}` : ""}</p>
            )}
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">Subject</span>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Subject" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Math">Math</SelectItem>
                    <SelectItem value="ELA">ELA</SelectItem>
                    <SelectItem value="Science">Science</SelectItem>
                    <SelectItem value="Social Studies">Social Studies</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Grade</span>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger className="w-[120px]"><SelectValue placeholder="Grade" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6</SelectItem>
                    <SelectItem value="7">7</SelectItem>
                    <SelectItem value="8">8</SelectItem>
                    <SelectItem value="9">9</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="11">11</SelectItem>
                    <SelectItem value="12">12</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              {/* Row 1: Assessments actions */}
              <Button size="sm" variant="default" onClick={createAssessmentsBulk} disabled={loading || bulkCreating || items.length === 0}>
                {bulkCreating ? `Creating (${bulkProgress.done}/${bulkProgress.total})` : "Create all assessments"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={fetchAssessments}
                disabled={fetchingAssessments || !(phase === "can_fetch" || phase === "fetched" || phase === "published")}
              >
                {phase === "waiting" ? `Wait ${waitRemaining}s` : fetchingAssessments ? "Fetching..." : "Fetch Assessments"}
              </Button>
              <Button size="sm" variant="secondary" onClick={publishAssessmentsAll} disabled={publishing || buildAssessmentPublishPairs().length === 0}>
                {publishing ? `Publishing (${publishProgress.done}/${publishProgress.total})` : "Publish assessments"}
              </Button>

              {/* Row 2: Interactive actions */}
              <Button
                size="sm"
                variant="secondary"
                onClick={createInteractivesBulk}
                disabled={bulkCreatingInteractive || items.length === 0}
              >
                {bulkCreatingInteractive ? `Creating interactives (${interactiveProgress.done}/${interactiveProgress.total})` : "Create all IVs"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  setFetchingInteractive(true);
                  try {
                    const res = await fetch("/api/wayground/fetch-interactive-map", { method: "POST" });
                    const data = await res.json();
                    if (res.ok && Array.isArray(data?.interactive)) {
                      const setMap: Record<string, boolean> = {};
                      const infoMap: Record<string, { quizId: string; draftVersion: string }> = {};
                      const metaMap: Record<string, { quizId: string; draftVersion: string; title: string }> = {};
                      for (const it of data.interactive as Array<{ quizId: string; title: string; videoId: string; draftVersion?: string | null }>) {
                        setMap[it.videoId] = true;
                        if (it.draftVersion) {
                          infoMap[it.videoId] = { quizId: it.quizId, draftVersion: it.draftVersion };
                          metaMap[it.videoId] = { quizId: it.quizId, draftVersion: it.draftVersion, title: it.title };
                        }
                      }
                      setInteractiveCreatedById((prev) => ({ ...prev, ...setMap }));
                      setInteractiveInfoByVideoId((prev) => ({ ...prev, ...infoMap }));
                      setInteractiveMetaByVideoId((prev) => ({ ...prev, ...metaMap }));
                    } else {
                      console.error(data?.error || "Failed to fetch interactive map");
                    }
      } catch (e: unknown) {
                    console.error(e);
                  } finally {
                    setFetchingInteractive(false);
                  }
                }}
                disabled={fetchingInteractive || interactivePhase === "waiting"}
              >
                {interactivePhase === "waiting" ? `Wait ${interactiveWaitRemaining}s` : (fetchingInteractive ? "Fetching Interactives..." : "Fetch IVs")}
              </Button>
              
              {(() => {
                let matched = 0;
                const pairs: Array<{quizId: string; draftVersion: string}> = [];
                for (const it of items) {
                  const vKey = quizKeyById[it.id];
                  if (!vKey) continue;
                  const entry = Object.entries(quizMetaById).find(([, m]) => m.quizGenKey === vKey);
                  if (!entry) continue;
                  const [qId] = entry;
                  const dV = draftVersionById[qId];
                  if (qId && dV) {
                    matched += 1;
                    pairs.push({ quizId: qId, draftVersion: dV });
                  }
                }
                const onPublishAll = async () => {
                  if (pairs.length === 0) return;
                  setPublishing(true);
                  setPublishProgress({ done: 0, total: pairs.length });
                  for (const p of pairs) {
                    try {
                      await fetch("/api/wayground/publish-quiz", {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify(p),
                      });
                      await fetch("/api/wayground/make-public", {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ quizId: p.quizId }),
                      });
                    } catch {}
                    setPublishProgress((s) => ({ ...s, done: s.done + 1 }));
                  }
                  setPublishing(false);
                  setPhase("published");
                  setPublishedDone(true);
                };
                const onExport = () => {
                  const rows: Array<string[]> = [];
                  rows.push([
                    "YouTube Playlist Name",
                    "YouTube Playlist Link",
                    "YouTube Video Title",
                    "YouTube Video ID",
                    "YouTube Video Link",
                    "Wayground Assessment Title",
                    "Wayground Assessment Link",
                    "Wayground Assessment Quiz ID",
                    "Wayground IV Title",
                    "Wayground IV Link",
                    "Wayground IV Quiz ID",
                  ]);
                  const playlistLink = playlistId ? `https://www.youtube.com/playlist?list=${playlistId}` : "";
                  for (const it of items) {
                    const vKey = quizKeyById[it.id];
                    if (!vKey) continue;
                    const entry = Object.entries(quizMetaById).find(([, m]) => m.quizGenKey === vKey);
                    if (!entry) continue;
                    const [qId, meta] = entry as [string, { title: string }];
                    const videoLink = `https://www.youtube.com/watch?v=${it.id}`;
                    const assessmentLink = `https://wayground.com/admin/quiz/${qId}`;
                    const ivMeta = interactiveMetaByVideoId[it.id];
                    const ivTitle = ivMeta?.title || "";
                    const ivLink = ivMeta?.quizId ? `https://wayground.com/admin/quiz/${ivMeta.quizId}` : "";
                    const ivId = ivMeta?.quizId || "";
                    rows.push([
                      playlistTitle || "",
                      playlistLink,
                      it.title,
                      it.id,
                      videoLink,
                      meta.title || "",
                      assessmentLink,
                      qId,
                      ivTitle,
                      ivLink,
                      ivId,
                    ]);
                  }
                  const csv = rows.map(r => r.map((v) => `"${(v || "").replace(/"/g, '""')}"`).join(",")).join("\n");
                  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${(playlistTitle || 'playlist').replace(/[^a-z0-9-_ ]/gi, '').trim() || 'playlist'}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                };
                return (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => {
                      // Trigger the top Publish IVs handler programmatically to avoid duplication
                      const btn = document.querySelector('[data-publish-ivs]') as HTMLButtonElement | null;
                      btn?.click();
                    }}>Publish IVs</Button>
                    <Button size="sm" variant="secondary" onClick={onExport} disabled={pairs.length === 0}>Export CSV</Button>
                  </>
                );
              })()}
              {phase === "waiting" && (
                <span className="text-xs text-muted-foreground">Waiting for assessments to generate… {waitRemaining}s</span>
              )}
            </div>
            
            {(phase === "fetched" || phase === "published") && (
              <div className="mt-2 flex justify-end">
                <span className="text-xs text-muted-foreground">
                  {(() => {
                    let matched = 0;
                    for (const it of items) {
                      const vKey = quizKeyById[it.id];
                      if (!vKey) continue;
                      const entry = Object.entries(quizMetaById).find(([, m]) => m.quizGenKey === vKey);
                      if (entry) matched += 1;
                    }
                    return `${matched}/${items.length} assessments created!`;
                  })()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {items.length > 0 && (
          <div className="space-y-2">
            <div className="rounded-md border divide-y">
              {items.map((item) => {
                const videoKey = quizKeyById[item.id];
                const matchedId = videoKey ? Object.entries(quizMetaById).find(([, meta]) => meta.quizGenKey === videoKey)?.[0] : undefined;
                const matched = matchedId ? quizMetaById[matchedId] : undefined;
                return (
                  <div key={item.id} className="flex items-center justify-between p-2 hover:bg-muted">
                    <a href={item.videoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-xs text-muted-foreground w-6 shrink-0">{item.position + 1}.</span>
                      {item.thumbnailUrl ? (
                        <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded bg-muted">
                          <Image src={item.thumbnailUrl} alt={item.title} fill sizes="64px" className="object-cover" />
                        </div>
                      ) : (
                        <div className="h-10 w-16 shrink-0 rounded bg-muted" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        {interactiveCreatedById[item.id] && (
                          <div className="flex items-center gap-2 text-xs text-green-600">
                            <span>Interactive video created!</span>
                            <span>✓</span>
                          </div>
                        )}
                        {(() => {
                          const matchedId = quizKeyById[item.id] ? Object.entries(quizMetaById).find(([, m]) => m.quizGenKey === quizKeyById[item.id])?.[0] : undefined;
                          if (!matchedId) return null;
                          return (
                            <div className="flex items-center gap-2 text-xs text-green-600">
                              <span>Assessment created</span>
                              <span>✓</span>
                            </div>
                          );
                        })()}
                      </div>
                    </a>
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => createAssessment(item)} disabled={!!creatingId || !!quizKeyById[item.id]}>
                        {creatingId === item.id ? "Creating..." : "Create"}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => createInteractive(item)} disabled={!!creatingInteractiveId || !!interactiveCreatedById[item.id]}>
                        {creatingInteractiveId === item.id ? "Creating..." : (!!interactiveCreatedById[item.id] ? "Interactive ✓" : "Interactive")}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </div>
    </div>
  );
}
