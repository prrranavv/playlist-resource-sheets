"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Image from "next/image";
import { Combobox } from "@/components/ui/combobox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { getSubjectIcon } from "@/lib/icons";
import { getYouTubeThumbnailUrl } from "@/lib/utils";

type PlaylistItem = {
  id: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
  position: number;
  videoUrl: string;
};

export default function Home() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const [playlistTitle, setPlaylistTitle] = useState<string | null>(null);
  const [channelTitle, setChannelTitle] = useState<string | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [channelThumbnail, setChannelThumbnail] = useState<string | null>(null);
  const [grade, setGrade] = useState<string>("6th Grade");
  const [subject, setSubject] = useState<string>("Science");
  const [, setCreatingId] = useState<string | null>(null);
  const [quizKeyById, setQuizKeyById] = useState<Record<string, string>>({});
  const [, setBulkCreating] = useState(false);
  const [, setBulkProgress] = useState<{done:number; total:number}>({ done: 0, total: 0 });
  const [, setFetchedQuizIds] = useState<string[]>([]);
  const [, setFetchingAssessments] = useState(false);
  const [quizMetaById, setQuizMetaById] = useState<Record<string, { title: string; quizGenKey?: string | null }>>({});
  const [, setDraftVersionById] = useState<Record<string, string | null>>({});
  const [publishing, setPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState<{done:number; total:number}>({ done: 0, total: 0 });
  const [phase, setPhase] = useState<"idle"|"videos"|"creating"|"waiting"|"can_fetch"|"fetched"|"published">("idle");
  const [waitRemaining, setWaitRemaining] = useState<number>(0);
  // const [_publishedDone, setPublishedDone] = useState(false);
  const [, setCreatingInteractiveId] = useState<string | null>(null);
  const [, setBulkCreatingInteractive] = useState(false);
  const [, setInteractiveProgress] = useState<{done:number; total:number}>({ done: 0, total: 0 });
  const [interactiveCreatedById, setInteractiveCreatedById] = useState<Record<string, boolean>>({});
  const [, setInteractiveInfoByVideoId] = useState<Record<string, { quizId: string; draftVersion: string }>>({});
  const [interactiveMetaByVideoId, setInteractiveMetaByVideoId] = useState<Record<string, { quizId: string; draftVersion: string; title: string }>>({});
  // const [_fetchingInteractive, _setFetchingInteractive] = useState(false);
  const [, setInteractivePhase] = useState<"idle"|"waiting"|"can_fetch">("idle");
  const [interactiveWaitRemaining, setInteractiveWaitRemaining] = useState<number>(0);
  const [publishingIVs, setPublishingIVs] = useState(false);
  const [publishIVProgress, setPublishIVProgress] = useState<{done:number; total:number}>({ done: 0, total: 0 });
  const [generatingSheet, setGeneratingSheet] = useState(false);
  const [createFlowStatus, setCreateFlowStatus] = useState<
    | "idle"
    | "creatingA"
    | "waitingA"
    | "fetchingA"
    | "doneA"
    | "creatingIV"
    | "waitingIV"
    | "fetchingIV"
    | "doneIV"
    | "fetchingKeys"
  >("idle");
  const [, setAssessmentMatchedCount] = useState<number>(0);
  const [, setIvMatchedCount] = useState<number>(0);
  const [, setReadyToPublish] = useState(false);
  const [resourcesPublished, setResourcesPublished] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [savingToSupabase, setSavingToSupabase] = useState(false);
  const [supabaseSaved, setSupabaseSaved] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null);
  const [wasLoadedFromDatabase, setWasLoadedFromDatabase] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [exportingSheets, setExportingSheets] = useState(false);
  const [exportedSheetUrl, setExportedSheetUrl] = useState<string | null>(null);
  const [exportedCopyUrl, setExportedCopyUrl] = useState<string | null>(null);
  const [exploreSections, setExploreSections] = useState<Array<{
    subject: string;
    channels: Array<{
      channel_id: string;
      channel_title: string | null;
      channel_thumbnail: string | null;
      playlists: Array<{
        id: string;
        title: string;
        slug: string;
        thumbnail_url: string | null;
        video_count: number;
        channel_title: string | null;
        channel_thumbnail: string | null;
      }>;
    }>;
  }>>([]);
  const [loadingExplore, setLoadingExplore] = useState(true);

  // Subject options
  const subjectOptions = [
    { value: "Mathematics", label: "Mathematics" },
    { value: "Science", label: "Science" },
    { value: "English", label: "English" },
    { value: "World Languages", label: "World Languages" },
    { value: "Physics", label: "Physics" },
    { value: "Chemistry", label: "Chemistry" },
    { value: "Biology", label: "Biology" },
    { value: "Social Studies", label: "Social Studies" },
    { value: "Geography", label: "Geography" },
    { value: "History", label: "History" },
    { value: "Arts", label: "Arts" },
    { value: "Computers", label: "Computers" },
    { value: "Physical Ed", label: "Physical Ed" },
    { value: "Fun", label: "Fun" },
    { value: "Professional Development", label: "Professional Development" },
    { value: "Architecture", label: "Architecture" },
    { value: "Business", label: "Business" },
    { value: "Design", label: "Design" },
    { value: "Education", label: "Education" },
    { value: "Instructional Technology", label: "Instructional Technology" },
    { value: "Journalism", label: "Journalism" },
    { value: "Life Skills", label: "Life Skills" },
    { value: "Moral Science", label: "Moral Science" },
    { value: "Philosophy", label: "Philosophy" },
    { value: "Performing Arts", label: "Performing Arts" },
    { value: "Religious Studies", label: "Religious Studies" },
    { value: "Special Education", label: "Special Education" },
    { value: "Specialty", label: "Specialty" },
    { value: "Financial Education", label: "Financial Education" },
    { value: "Life Project", label: "Life Project" },
    { value: "Health Sciences", label: "Health Sciences" },
    { value: "Engineering", label: "Engineering" },
    { value: "Construction", label: "Construction" },
    { value: "Information Technology (IT)", label: "Information Technology (IT)" },
    { value: "Hospitality and Catering", label: "Hospitality and Catering" },
    { value: "Other", label: "Other" },
  ];

  // Grade options
  const gradeOptions = [
    { value: "Kindergarten", label: "Kindergarten" },
    { value: "Elementary (1st - 5th)", label: "Elementary (1st - 5th)" },
    { value: "1st Grade", label: "1st Grade" },
    { value: "2nd Grade", label: "2nd Grade" },
    { value: "3rd Grade", label: "3rd Grade" },
    { value: "4th Grade", label: "4th Grade" },
    { value: "5th Grade", label: "5th Grade" },
    { value: "Middle School (6th - 8th)", label: "Middle School (6th - 8th)" },
    { value: "6th Grade", label: "6th Grade" },
    { value: "7th Grade", label: "7th Grade" },
    { value: "8th Grade", label: "8th Grade" },
    { value: "High School (9th - 12th)", label: "High School (9th - 12th)" },
    { value: "9th Grade", label: "9th Grade" },
    { value: "10th Grade", label: "10th Grade" },
    { value: "11th Grade", label: "11th Grade" },
    { value: "12th Grade", label: "12th Grade" },
    { value: "University", label: "University" },
    { value: "Professional Development", label: "Professional Development" },
    { value: "Vocational training", label: "Vocational training" },
  ];

  // Auto-login on component mount to get fresh cookies
  useEffect(() => {
    console.log('[ui:mount] Component mounted, initiating auto-login');
    async function autoLogin() {
      try {
        console.log('[ui:auto-login] Starting auto-login');
        // Use auto-login endpoint that reads credentials from environment variables
        const res = await fetch("/api/wayground/auto-login", {
          method: "POST",
          headers: { "content-type": "application/json" },
        });
        
        const data = await res.json();
        
        if (res.ok && data.success && data.cookies) {
          // Store cookies in localStorage
          if (typeof window !== "undefined") {
            localStorage.setItem("waygroundCookie", data.cookies);
          }
          console.log("[ui:auto-login] Success - fresh cookies loaded");
        } else {
          console.error("[ui:auto-login] Failed:", data.error);
        }
      } catch (err) {
        console.error("[ui:auto-login] Error:", err);
      }
    }
    
    autoLogin();
  }, []); // Empty dependency array - runs once on mount

  // Fetch explore data on mount
  useEffect(() => {
    async function fetchExploreData() {
      try {
        setLoadingExplore(true);
        const res = await fetch('/api/explore');
        const data = await res.json();
        
        if (res.ok && data.sections) {
          setExploreSections(data.sections);
          console.log('[ui:explore] Loaded', data.sections.length, 'subject sections');
        } else {
          console.error('[ui:explore] Failed to fetch explore data:', data.error);
        }
      } catch (err) {
        console.error('[ui:explore] Error fetching explore data:', err);
      } finally {
        setLoadingExplore(false);
      }
    }
    
    fetchExploreData();
  }, []);

  // function buildAssessmentPublishPairs(): Array<{ quizId: string; draftVersion: string }> {
  //   const pairs: Array<{ quizId: string; draftVersion: string }> = [];
  //   for (const it of items) {
  //     const vKey = quizKeyById[it.id];
  //     if (!vKey) continue;
  //     const entry = Object.entries(quizMetaById).find(([, m]) => m.quizGenKey === vKey);
  //     if (!entry) continue;
  //     const [qId] = entry;
  //     const dV = draftVersionById[qId];
  //     if (qId && dV) pairs.push({ quizId: qId, draftVersion: dV });
  //   }
  //   return pairs;
  // }

  function pause(ms: number) { return new Promise<void>((res) => setTimeout(res, ms)); }

  function computeAssessmentMatchCount(): number {
    const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
    let matched = 0;
    for (const it of items) {
      const vKey = quizKeyById[it.id];
      let isMatch = false;
      if (vKey) {
        const entry = Object.entries(quizMetaById).find(([, m]) => m.quizGenKey === vKey);
        if (entry) isMatch = true;
      }
      if (!isMatch) {
        // Fallback: title match if quizGenKey not available yet
        const itNorm = normalize(it.title);
        for (const meta of Object.values(quizMetaById)) {
          if (meta?.title && normalize(meta.title) === itNorm) {
            isMatch = true;
            break;
          }
        }
      }
      if (isMatch) matched += 1;
    }
    return matched;
  }

  async function fetchInteractivesAndUpdate(numVideosInPlaylist: number): Promise<{ filteredIVs: Array<{ quizId: string; draftVersion: string | null; title: string }> }> {
    console.log(`[ui:fetchInteractives] Starting interactive video fetch for playlist with ${numVideosInPlaylist} videos`);
    const res = await fetch("/api/wayground/fetch-interactive-map", { method: "POST", headers: cookieHeader() });
    const data = await res.json();
    if (res.ok && Array.isArray(data?.interactive)) {
      const allIVs = data.interactive as Array<{ quizId: string; draftVersion?: string | null; createdAt?: string; title?: string }>;

      // Filter for IVs created in the last 150s + N*2s (where N = number of videos in playlist)
      const filterWindowMs = (150 + numVideosInPlaylist * 2) * 1000;
      const cutoffTime = Date.now() - filterWindowMs;
      const recentIVs = allIVs.filter(iv => {
        if (!iv.createdAt) return false;
        const createdTime = new Date(iv.createdAt).getTime();
        return createdTime >= cutoffTime;
      });

      console.log(`[ui:fetchInteractives] Found ${allIVs.length} total IVs, ${recentIVs.length} created in last ${filterWindowMs/1000}s (150s + ${numVideosInPlaylist}*2s)`);

      // Return filtered IVs with basic info (without fetching video IDs yet)
      const filteredIVs = recentIVs.map(iv => ({
        quizId: iv.quizId,
        draftVersion: iv.draftVersion || null,
        title: iv.title || ""
      }));

      console.log('[ui:fetchInteractives] Complete - returning filtered IVs');
      return { filteredIVs };
    }
    console.log('[ui:fetchInteractives] API call failed');
    return { filteredIVs: [] };
  }
  function cookieHeader(): Record<string, string> {
    const cookie = (typeof window !== "undefined") ? (localStorage.getItem("waygroundCookie") || "") : "";
    return cookie ? { "x-wayground-cookie": cookie } : {};
  }

  // function extractCookieFromText(text: string): string | null {
  //   if (!text) return null;
  //   // -b 'cookie-string' or --cookie "cookie-string"
  //   const m1 = text.match(/(?:\s|^)\-b\s+['\"]([^'\"\n]+)['\"]/i);
  //   if (m1?.[1]) return m1[1];
  //   const m2 = text.match(/(?:\s|^)\-\-cookie\s+['\"]([^'\"\n]+)['\"]/i);
  //   if (m2?.[1]) return m2[1];
  //   // -H 'cookie: ...' or -H "Cookie: ..."
  //   const m3 = text.match(/\-H\s+['\"][Cc]ookie:\s*([^'\"\n]+)['\"]/i);
  //   if (m3?.[1]) return m3[1];
  //   // Any standalone line starting with Cookie:
  //   const m4 = text.match(/^[Cc]ookie:\s*(.+)$/im);
  //   if (m4?.[1]) return m4[1].trim();
  //   return null;
  // }

  // function openAuthModal() {
  //   setAuthOpen(true);
  //   setAuthError(null);
  // }

  async function handleLogin() {
    if (!email || !password) {
      setAuthError("Email and password are required");
      return;
    }
    
    setAuthLoading(true);
    setAuthError(null);
    
    try {
      const res = await fetch("/api/wayground/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: email, password }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.success && data.cookies) {
        // Store cookies in localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("waygroundCookie", data.cookies);
        }
        setAuthOpen(false);
        setEmail("");
        setPassword("");
        setAuthError(null);
      } else {
        setAuthError(data.error || "Login failed. Please check your credentials.");
      }
    } catch {
      setAuthError("Network error. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  }


  async function createResources() {
    if (items.length === 0) return;
    console.log(`[ui:createResources] Starting full resource creation flow for ${items.length} videos`);
    setReadyToPublish(false);
    setResourcesPublished(false);
    // initialize progress for both
    setBulkProgress({ done: 0, total: items.length });
    setInteractiveProgress({ done: 0, total: items.length });
    setError(null);

    console.log('[ui:createResources] Phase 1: Creating assessments');
    setCreateFlowStatus("creatingA");
    setBulkCreating(true);

    const assessmentWorker = async (it: PlaylistItem) => {
      await createAssessmentAndGetKey(it);
    };
    const assessmentInc = () => setBulkProgress((p) => ({ ...p, done: Math.min(p.done + 1, p.total) }));

    // Create assessments sequentially
    for (const it of items) {
      await assessmentWorker(it);
      assessmentInc();
    }
    console.log(`[ui:createResources] All assessments created`);
    setBulkCreating(false);

    // Create IVs sequentially (no wait between assessments and IVs)
    console.log('[ui:createResources] Phase 2: Creating interactive videos');
    setCreateFlowStatus("creatingIV");
    setBulkCreatingInteractive(true);
    for (const it of items) {
      if (!interactiveCreatedById[it.id]) {
        await createInteractive(it);
      } else {
        console.log(`[ui:createResources] Skipping IV for ${it.id} - already created`);
      }
      setInteractiveProgress((p) => ({ ...p, done: Math.min(p.done + 1, p.total) }));
    }
    console.log('[ui:createResources] All interactive videos created');
    setBulkCreatingInteractive(false);

    // Wait 150s for processing
    const waitTime = 150;
    console.log(`[ui:createResources] Phase 3: Waiting ${waitTime}s for resource processing`);
    setCreateFlowStatus("waitingA");
    startWaitCountdown(waitTime);
    await pause(waitTime * 1000);

    // Fetch quiz keys from database
    console.log('[ui:createResources] Phase 4: Fetching quiz keys from database...');
    setCreateFlowStatus("fetchingA");
    const localQuizKeyById: Record<string, string> = {};
    try {
      const videoIds = items.map(it => it.id).join(',');
      const res = await fetch(`/api/video-quiz-keys?videoIds=${encodeURIComponent(videoIds)}`);
      const data = await res.json();
      if (res.ok && data.quizKeyMap) {
        Object.assign(localQuizKeyById, data.quizKeyMap);
        console.log(`[ui:createResources] Fetched ${Object.keys(localQuizKeyById).length} quiz keys from database`);
        setAssessmentMatchedCount(Object.keys(localQuizKeyById).length);
      } else {
        console.error('[ui:createResources] Failed to fetch quiz keys from database:', data.error);
      }
    } catch (err) {
      console.error('[ui:createResources] Error fetching quiz keys from database:', err);
    }

    // Fetch last 2000 draft assessments and filter for ones created in last 150s + N*2s
    console.log('[ui:createResources] Phase 5: Fetching filtered assessments');
    const { filteredQuizIds, quizTitleMap } = await fetchAssessments(items.length);
    console.log(`[ui:createResources] Filtered ${filteredQuizIds.length} assessments`);

    // Fetch all IVs and filter for ones created in last 150s + N*2s
    console.log('[ui:createResources] Phase 6: Fetching filtered interactive videos');
    setCreateFlowStatus("fetchingIV");
    const { filteredIVs } = await fetchInteractivesAndUpdate(items.length);
    console.log(`[ui:createResources] Filtered ${filteredIVs.length} IVs`);

    // Phase 7: Unified fetching - fetch keys for ALL assessments and video IDs for ALL IVs with 2s gaps
    console.log('[ui:createResources] Phase 7: Fetching quiz keys and video IDs for all filtered resources');
    setCreateFlowStatus("fetchingKeys");

    const allKeys: Record<string, string | null> = {};
    const allVersions: Record<string, string | null> = {};
    const ivVideoIdMap: Record<string, string> = {}; // quizId -> videoId
    const ivTitleMap: Record<string, string> = {}; // quizId -> title

    const totalResources = filteredQuizIds.length + filteredIVs.length;
    let processed = 0;
    let consecutiveRateLimits = 0;
    const baseDelay = 2000; // 2 seconds gap

    // Fetch assessment keys
    for (const quizId of filteredQuizIds) {
      let retryCount = 0;
      let success = false;

      while (!success && retryCount < 3) {
        try {
          const res = await fetch("/api/wayground/fetch-quiz-keys", {
            method: "POST",
            headers: { "content-type": "application/json", ...cookieHeader() },
            body: JSON.stringify({ quizIds: [quizId] }),
          });
          const data = await res.json();

          if (data?.error?.includes?.("TOO_MANY_REQUESTS") || data?.error?.includes?.("rateLimiter")) {
            consecutiveRateLimits++;
            const retryDelay = Math.min(30000, baseDelay * Math.pow(2, retryCount));
            console.log(`[ui:createResources] Rate limited on assessment ${quizId}, waiting ${retryDelay}ms (retry ${retryCount + 1}/3)`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            retryCount++;
            continue;
          }

          if (res.ok && data?.quizGenKeysById) {
            Object.assign(allKeys, data.quizGenKeysById);
            if (data?.draftVersionById) Object.assign(allVersions, data.draftVersionById);
            consecutiveRateLimits = 0;
            console.log(`[ui:createResources] Fetched keys for assessment ${quizId} (${processed + 1}/${totalResources})`);
          }
          success = true;
        } catch (err) {
          console.error(`[ui:createResources] Failed to fetch quiz key for ${quizId}:`, err);
          retryCount++;
          if (retryCount < 3) await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      processed++;
      if (processed < totalResources) {
        const delay = Math.min(baseDelay + (consecutiveRateLimits * 2000), 30000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Fetch IV video IDs
    for (const iv of filteredIVs) {
      // Preserve title from fetch-interactive-map
      if (iv.title) ivTitleMap[iv.quizId] = iv.title;

      let retryCount = 0;
      let success = false;

      while (!success && retryCount < 3) {
        try {
          const res = await fetch("/api/wayground/fetch-iv-video-ids", {
            method: "POST",
            headers: { "content-type": "application/json", ...cookieHeader() },
            body: JSON.stringify({ quizIds: [iv.quizId] }),
          });
          const data = await res.json();

          if (data?.error?.includes?.("TOO_MANY_REQUESTS") || data?.error?.includes?.("rateLimiter")) {
            consecutiveRateLimits++;
            const retryDelay = Math.min(30000, baseDelay * Math.pow(2, retryCount));
            console.log(`[ui:createResources] Rate limited on IV ${iv.quizId}, waiting ${retryDelay}ms (retry ${retryCount + 1}/3)`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            retryCount++;
            continue;
          }

          if (res.ok && data?.videoIdsById) {
            const videoId = data.videoIdsById[iv.quizId];
            const title = data.titlesById?.[iv.quizId];
            if (videoId) {
              ivVideoIdMap[iv.quizId] = videoId;
              console.log(`[ui:createResources] Fetched video ID for IV ${iv.quizId} (${processed + 1}/${totalResources})`);
            }
            if (title) ivTitleMap[iv.quizId] = title;
            consecutiveRateLimits = 0;
          }
          success = true;
        } catch (err) {
          console.error(`[ui:createResources] Failed to fetch video ID for IV ${iv.quizId}:`, err);
          retryCount++;
          if (retryCount < 3) await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      processed++;
      if (processed < totalResources) {
        const delay = Math.min(baseDelay + (consecutiveRateLimits * 2000), 30000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.log(`[ui:createResources] Fetched ${Object.keys(allKeys).length} assessment keys and ${Object.keys(ivVideoIdMap).length} IV video IDs`);

    // Update state with fetched data
    const assessmentMetaById: Record<string, { title: string; quizGenKey?: string | null }> = {};
    for (const [id, key] of Object.entries<string | null>(allKeys)) {
      const existing = quizTitleMap[id] || {};
      assessmentMetaById[id] = { title: existing.title || "", quizGenKey: key };
    }
    setQuizMetaById((prev) => ({ ...prev, ...assessmentMetaById }));
    if (Object.keys(allVersions).length > 0) setDraftVersionById(allVersions);

    // Update IV state
    const setMap: Record<string, boolean> = {};
    const infoMap: Record<string, { quizId: string; draftVersion: string }> = {};
    const metaMap: Record<string, { quizId: string; draftVersion: string; title: string }> = {};

    for (const [quizId, videoId] of Object.entries(ivVideoIdMap)) {
      setMap[videoId] = true;
      const iv = filteredIVs.find(i => i.quizId === quizId);
      const title = ivTitleMap[quizId] || "";
      if (iv?.draftVersion) {
        infoMap[videoId] = { quizId, draftVersion: iv.draftVersion };
        metaMap[videoId] = { quizId, draftVersion: iv.draftVersion, title };
      }
    }

    setInteractiveCreatedById((prev) => ({ ...prev, ...setMap }));
    setInteractiveInfoByVideoId((prev) => ({ ...prev, ...infoMap }));
    setInteractiveMetaByVideoId((prev) => ({ ...prev, ...metaMap }));

    // Update match counts
    setAssessmentMatchedCount(Object.keys(allKeys).length);
    let ivMatched = 0;
    for (const it of items) if (setMap[it.id]) ivMatched += 1;
    setIvMatchedCount(ivMatched);

    setCreateFlowStatus("doneIV");
    setReadyToPublish(true);
    console.log('[ui:createResources] All resources created and fetched');

    // Wait for state updates to propagate
    await pause(3000);

    // Automatically publish resources
    console.log("[ui:createResources] Phase 8: Auto-publishing all resources");
    const assessmentPairs = buildAssessmentPublishPairsWithData(assessmentMetaById, allVersions);

    // Build IV pairs from fetched data
    const ivPairsForPublish: Array<{ quizId: string; draftVersion: string }> = [];
    for (const [videoId, info] of Object.entries(infoMap)) {
      if (info.quizId && info.draftVersion) {
        ivPairsForPublish.push({ quizId: info.quizId, draftVersion: info.draftVersion });
      }
    }

    console.log(`[ui:createResources] Assessment pairs to publish: ${assessmentPairs.length}`);
    console.log(`[ui:createResources] IV pairs to publish: ${ivPairsForPublish.length}`);

    // Create a map from quizId to YouTube video title
    const quizIdToYouTubeTitle: Record<string, string> = {};

    // Map assessments: Use quiz keys from database to match
    for (const video of items) {
      const videoId = video.id;
      const quizGenKey = localQuizKeyById[videoId];

      if (quizGenKey) {
        // Find the quizId that has this quizGenKey
        const quizEntry = Object.entries(assessmentMetaById).find(([, meta]) => meta.quizGenKey === quizGenKey);
        if (quizEntry) {
          const [quizId] = quizEntry;
          quizIdToYouTubeTitle[quizId] = video.title;
          console.log(`[ui:createResources] Mapped assessment ${quizId} (key: ${quizGenKey}) to YouTube: "${video.title.substring(0, 50)}..."`);
        }
      }
    }

    // Map IVs: Find YouTube video title by matching videoId
    for (const [videoId, info] of Object.entries(infoMap)) {
      const video = items.find(it => it.id === videoId);
      if (video) {
        quizIdToYouTubeTitle[info.quizId] = video.title;
        console.log(`[ui:createResources] Mapped IV ${info.quizId} to YouTube title: "${video.title.substring(0, 50)}..."`);
      }
    }
    
    console.log(`[ui:createResources] Mapped ${Object.keys(quizIdToYouTubeTitle).length} quiz IDs to YouTube titles`);
    
    setPublishing(true);
    setPublishProgress({ done: 0, total: assessmentPairs.length });
    for (const p of assessmentPairs) {
      try {
        console.log(`[ui:publish] Publishing assessment ${p.quizId} v${p.draftVersion}`);
        await fetch("/api/wayground/publish-quiz", { method: "POST", headers: { "content-type": "application/json", ...cookieHeader() }, body: JSON.stringify(p) });
        await fetch("/api/wayground/make-public", { method: "POST", headers: { "content-type": "application/json", ...cookieHeader() }, body: JSON.stringify({ quizId: p.quizId }) });
        
        // Update name to match YouTube video title
        const videoTitle = quizIdToYouTubeTitle[p.quizId];
        if (videoTitle) {
          console.log(`[ui:publish] Updating assessment name: ${p.quizId} → "${videoTitle.substring(0, 50)}..."`);
          await fetch("/api/wayground/update-name", { method: "POST", headers: { "content-type": "application/json", ...cookieHeader() }, body: JSON.stringify({ quizId: p.quizId, name: videoTitle }) });
        } else {
          console.log(`[ui:publish] No YouTube title found for assessment ${p.quizId}`);
        }
        console.log(`[ui:publish] Assessment ${p.quizId} completed`);
      } catch (err) {
        console.error(`[ui:publish] Failed to publish assessment ${p.quizId}:`, err);
      }
      setPublishProgress((s) => ({ ...s, done: s.done + 1 }));
    }
    console.log(`[ui:publish] All ${assessmentPairs.length} assessments published`);
    setPublishing(false);
    setPublishingIVs(true);
    setPublishIVProgress({ done: 0, total: ivPairsForPublish.length });
    for (const p of ivPairsForPublish) {
      try {
        console.log(`[ui:publish] Publishing IV ${p.quizId} v${p.draftVersion}`);
        await fetch("/api/wayground/publish-interactive", { method: "POST", headers: { "content-type": "application/json", ...cookieHeader() }, body: JSON.stringify(p) });
        await fetch("/api/wayground/make-public", { method: "POST", headers: { "content-type": "application/json", ...cookieHeader() }, body: JSON.stringify({ quizId: p.quizId }) });

        // Update name to match YouTube video title
        const videoTitle = quizIdToYouTubeTitle[p.quizId];
        if (videoTitle) {
          console.log(`[ui:publish] Updating IV name: ${p.quizId} → "${videoTitle.substring(0, 50)}..."`);
          await fetch("/api/wayground/update-name", { method: "POST", headers: { "content-type": "application/json", ...cookieHeader() }, body: JSON.stringify({ quizId: p.quizId, name: videoTitle }) });
        } else {
          console.log(`[ui:publish] No YouTube title found for IV ${p.quizId}`);
        }
        console.log(`[ui:publish] IV ${p.quizId} completed`);
      } catch (err) {
        console.error(`[ui:publish] Failed to publish IV ${p.quizId}:`, err);
      }
      setPublishIVProgress((s) => ({ ...s, done: s.done + 1 }));
    }
    console.log(`[ui:publish] All ${ivPairsForPublish.length} IVs published`);
    setPublishingIVs(false);

    // Build IV pairs with video IDs for saveToSupabase
    const ivPairsForSave: Array<{ quizId: string; draftVersion: string; videoId: string; title: string }> = [];
    for (const [videoId, info] of Object.entries(infoMap)) {
      const metaInfo = metaMap[videoId];
      if (info.quizId && info.draftVersion && metaInfo?.title) {
        ivPairsForSave.push({
          quizId: info.quizId,
          draftVersion: info.draftVersion,
          videoId: videoId,
          title: metaInfo.title
        });
      }
    }

    // Save to Supabase with the actual data FIRST
    await saveToSupabase(assessmentMetaById, ivPairsForSave, localQuizKeyById);
    
    // THEN mark as complete and show output (sheet will already be created by saveToSupabase)
    setResourcesPublished(true);
    setShowOutput(true);
    console.log("[ui:createResources] COMPLETE - All resources created, published, and sheet generated! Output displayed.");
  }

  async function copyPlaylistLink() {
    if (!playlistUrl) return;
    
    try {
      const fullUrl = `${window.location.origin}${playlistUrl}`;
      await navigator.clipboard.writeText(fullUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  }

  async function saveToSupabase(
    assessmentMetaById: Record<string, { title: string; quizGenKey?: string | null }>,
    ivPairs: Array<{ quizId: string; draftVersion: string; videoId: string; title: string }>,
    videoIdToQuizKey: Record<string, string>
  ) {
    try {
      setSavingToSupabase(true);
      console.log("[ui:saveToSupabase] Starting Supabase save...");
      console.log("[ui:saveToSupabase] Assessment metadata keys:", Object.keys(assessmentMetaById));
      console.log("[ui:saveToSupabase] IV pairs count:", ivPairs.length);
      console.log("[ui:saveToSupabase] Video to quiz key mappings:", Object.keys(videoIdToQuizKey).length);

      // Build a map from videoId to assessment quizId
      const videoIdToAssessmentId: Record<string, string> = {};
      for (const [videoId, quizGenKey] of Object.entries(videoIdToQuizKey)) {
        // Find the assessment quiz ID that has this quizGenKey
        const entry = Object.entries(assessmentMetaById).find(([, meta]) => meta.quizGenKey === quizGenKey);
        if (entry) {
          videoIdToAssessmentId[videoId] = entry[0];
          console.log(`[ui:saveToSupabase] Mapped video ${videoId} to assessment ${entry[0]}`);
        }
      }

      // Build a map from videoId to IV quizId
      const videoIdToIVId: Record<string, string> = {};
      for (const iv of ivPairs) {
        videoIdToIVId[iv.videoId] = iv.quizId;
        console.log(`[ui:saveToSupabase] Mapped video ${iv.videoId} to IV ${iv.quizId}`);
      }

      // Prepare video data
      const videos = items.map((item, index) => {
        const assessmentQuizId = videoIdToAssessmentId[item.id] || null;
        const assessmentLink = assessmentQuizId 
          ? `https://wayground.com/admin/quiz/${assessmentQuizId}`
          : null;
        
        const interactiveVideoQuizId = videoIdToIVId[item.id] || null;
        const interactiveVideoLink = interactiveVideoQuizId 
          ? `https://wayground.com/admin/quiz/${interactiveVideoQuizId}`
          : null;

        console.log(`[ui:saveToSupabase] Video ${item.id}: assessment=${assessmentQuizId}, iv=${interactiveVideoQuizId}`);

        return {
          youtubeVideoId: item.id,
          title: item.title,
          thumbnailUrl: item.thumbnailUrl,
          assessmentQuizId,
          assessmentLink,
          interactiveVideoQuizId,
          interactiveVideoLink,
          orderIndex: index
        };
      });

      // Save to Supabase
      const response = await fetch('/api/save-playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtubePlaylistId: playlistId || '',
          title: playlistTitle || 'Untitled Playlist',
          description: null,
          channelTitle: channelTitle || null,
          channelId: channelId || null,
          channelName: channelTitle || null,
          channelThumbnail: channelThumbnail || null,
          thumbnailUrl: items[0]?.thumbnailUrl || null,
          grade: grade,
          subject: subject,
          videos
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save to Supabase');
      }

      console.log("[ui:saveToSupabase] Successfully saved to Supabase:", result);
      setSupabaseSaved(true);
      setPlaylistUrl(result.url);
      console.log(`[ui:saveToSupabase] Playlist available at: ${result.url}`);

      // Automatically create Google Sheet and WAIT for it to complete
      console.log("[ui:saveToSupabase] Creating Google Sheet...");
      await createGoogleSheetInBackground(videos);
      console.log("[ui:saveToSupabase] Google Sheet creation complete!");

      // Redirect to the playlist page
      console.log(`[ui:saveToSupabase] Redirecting to: ${result.url}`);
      router.push(result.url);

    } catch (err) {
      console.error("[ui:saveToSupabase] Error saving to Supabase:", err);
      // Don't block the flow if Supabase save fails
      // Just log the error
    } finally {
      setSavingToSupabase(false);
    }
  }

  async function createGoogleSheetInBackground(videos: Array<{
    youtubeVideoId: string;
    title: string;
    thumbnailUrl?: string;
    assessmentQuizId: string | null;
    assessmentLink: string | null;
    interactiveVideoQuizId: string | null;
    interactiveVideoLink: string | null;
    orderIndex: number;
  }>) {
    try {
      setGeneratingSheet(true);
      console.log('[ui:createGoogleSheetInBackground] Creating Google Sheet automatically...');
      
      const response = await fetch('/api/export-to-sheets-oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlistTitle: playlistTitle || 'Untitled Playlist',
          playlistId: playlistId || '',
          channelTitle: channelTitle || 'Unknown Channel',
          videos: videos.map(v => ({
            youtube_video_id: v.youtubeVideoId,
            title: v.title,
            assessment_quiz_id: v.assessmentQuizId,
            assessment_link: v.assessmentLink,
            interactive_video_quiz_id: v.interactiveVideoQuizId,
            interactive_video_link: v.interactiveVideoLink,
            order_index: v.orderIndex,
          })),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setExportedSheetUrl(data.url);
        setExportedCopyUrl(data.copyUrl);
        console.log('[ui:createGoogleSheetInBackground] Google Sheet created successfully:', data.url);
      } else {
        console.error('[ui:createGoogleSheetInBackground] Failed to create sheet:', data.error);
      }
    } catch (error) {
      console.error('[ui:createGoogleSheetInBackground] Error creating sheet:', error);
      // Don't fail the flow if sheet creation fails
    } finally {
      setGeneratingSheet(false);
    }
  }

  function buildAssessmentPublishPairsWithData(
    fetchedQuizMetaById: Record<string, { title: string; quizGenKey?: string | null }>,
    fetchedDraftVersionById: Record<string, string | null>
  ): Array<{ quizId: string; draftVersion: string }> {
    const pairs: Array<{ quizId: string; draftVersion: string }> = [];
    console.log("Building pairs with data:");
    console.log("- fetchedQuizMetaById keys:", Object.keys(fetchedQuizMetaById));
    console.log("- fetchedDraftVersionById keys:", Object.keys(fetchedDraftVersionById));
    
    // Match each quiz metadata with its draft version
    for (const [quizId, meta] of Object.entries(fetchedQuizMetaById)) {
      const dV = fetchedDraftVersionById[quizId];
      if (quizId && dV) {
        pairs.push({ quizId, draftVersion: dV });
        console.log(`Added pair: ${quizId} v${dV} (title: ${meta.title})`);
      } else {
        console.log(`Skipping ${quizId} - missing draft version`);
      }
    }
    return pairs;
  }

  // function buildIvPublishPairs(): Array<{ quizId: string; draftVersion: string }> {
  //   const pairs: Array<{ quizId: string; draftVersion: string }> = [];
  //   for (const [videoId, info] of Object.entries(interactiveInfoByVideoId)) {
  //     if (!interactiveCreatedById[videoId]) continue;
  //     if (info?.quizId && info?.draftVersion) pairs.push({ quizId: info.quizId, draftVersion: info.draftVersion });
  //   }
  //   return pairs;
  // }

  // function findVideoTitleForAssessment(quizId: string): string | null {
  //   // Find the quizGenKey for this assessment
  //   const meta = quizMetaById[quizId];
  //   if (!meta?.quizGenKey) return null;
  //   
  //   // Find the video that has this quizGenKey
  //   const videoId = Object.entries(quizKeyById).find(([, key]) => key === meta.quizGenKey)?.[0];
  //   if (!videoId) return null;
  //   
  //   // Find the video title from items
  //   const video = items.find(item => item.id === videoId);
  //   return video?.title || null;
  // }

  // function findVideoTitleForIV(quizId: string): string | null {
  //   // Find the video ID that maps to this IV quizId
  //   const videoId = Object.entries(interactiveInfoByVideoId).find(([, info]) => info.quizId === quizId)?.[0];
  //   if (!videoId) return null;
  //   
  //   // Find the video title from items
  //   const video = items.find(item => item.id === videoId);
  //   return video?.title || null;
  // }

  async function exportToGoogleSheets() {
    console.log(`[ui:exportToGoogleSheets] Exporting to Google Sheets for ${items.length} videos`);
    setExportingSheets(true);

    try {
      // Build videos array with same structure as database
      const videosForExport = items.map((item, index) => {
        const vKey = quizKeyById[item.id];
        let assessmentQuizId = null;
        let assessmentLink = null;
        
        if (vKey) {
          const entry = Object.entries(quizMetaById).find(([, m]) => m.quizGenKey === vKey);
          if (entry) {
            const [qId] = entry;
            assessmentQuizId = qId;
            assessmentLink = `https://wayground.com/admin/quiz/${qId}`;
          }
        }

        const ivMeta = interactiveMetaByVideoId[item.id];
        const interactiveVideoQuizId = ivMeta?.quizId || null;
        const interactiveVideoLink = interactiveVideoQuizId ? `https://wayground.com/admin/quiz/${interactiveVideoQuizId}` : null;

        return {
          youtube_video_id: item.id,
          title: item.title,
          assessment_quiz_id: assessmentQuizId,
          assessment_link: assessmentLink,
          interactive_video_quiz_id: interactiveVideoQuizId,
          interactive_video_link: interactiveVideoLink,
          order_index: index,
        };
      });

      const response = await fetch('/api/export-to-sheets-oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlistTitle: playlistTitle || 'Untitled Playlist',
          playlistId: playlistId || '',
          videos: videosForExport,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to export to Google Sheets');
      }

      setExportedSheetUrl(data.url);
      setExportedCopyUrl(data.copyUrl);
      
      console.log(`[ui:exportToGoogleSheets] Successfully exported. Copy URL: ${data.copyUrl}`);
      
      // Return the URLs for immediate use
      return { url: data.url, copyUrl: data.copyUrl };
    } catch (error) {
      console.error('[ui:exportToGoogleSheets] Error:', error);
      alert(error instanceof Error ? error.message : 'Failed to export to Google Sheets');
      return null;
    } finally {
      setExportingSheets(false);
    }
  }

  const handleOpenInNewTab = async () => {
    console.log('[handleOpenInNewTab] Starting...');
    const sheetUrl = exportedSheetUrl;
    console.log('[handleOpenInNewTab] Current sheetUrl from state:', sheetUrl);
    
    if (sheetUrl) {
      // Sheet already exists, open it directly
      console.log('[handleOpenInNewTab] Opening pre-created sheet:', sheetUrl);
      window.open(sheetUrl, '_blank');
    } else {
      // Fallback: Sheet doesn't exist yet, create it now
      console.log('[handleOpenInNewTab] Sheet not created yet, opening blank window first...');
      const newWindow = window.open('about:blank', '_blank');
      
      console.log('[handleOpenInNewTab] Calling exportToGoogleSheets...');
      const result = await exportToGoogleSheets();
      console.log('[handleOpenInNewTab] Got result:', result);
      
      if (result && result.url && newWindow) {
        console.log('[handleOpenInNewTab] Navigating window to:', result.url);
        newWindow.location.href = result.url;
      } else if (newWindow) {
        console.error('[handleOpenInNewTab] No URL available, closing window');
        newWindow.close();
      }
    }
  };

  const handleCopyToDrive = async () => {
    console.log('[handleCopyToDrive] Starting...');
    const copyUrl = exportedCopyUrl;
    console.log('[handleCopyToDrive] Current copyUrl from state:', copyUrl);
    
    if (copyUrl) {
      // Sheet already exists, open copy URL directly
      console.log('[handleCopyToDrive] Opening pre-created copy URL:', copyUrl);
      window.open(copyUrl, '_blank');
    } else {
      // Fallback: Sheet doesn't exist yet, create it now
      console.log('[handleCopyToDrive] Sheet not created yet, opening blank window first...');
      const newWindow = window.open('about:blank', '_blank');
      
      console.log('[handleCopyToDrive] Calling exportToGoogleSheets...');
      const result = await exportToGoogleSheets();
      console.log('[handleCopyToDrive] Got result:', result);
      
      if (result && result.copyUrl && newWindow) {
        console.log('[handleCopyToDrive] Navigating window to:', result.copyUrl);
        newWindow.location.href = result.copyUrl;
      } else if (newWindow) {
        console.error('[handleCopyToDrive] No URL available, closing window');
        newWindow.close();
      }
    }
  };

  async function exportCsv() {
    console.log(`[ui:exportCsv] Exporting CSV for ${items.length} videos`);
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
      const [qId] = entry as [string, { title: string }];
      const videoLink = `https://www.youtube.com/watch?v=${it.id}`;
      const assessmentLink = `https://wayground.com/admin/quiz/${qId}`;
      const ivMeta = interactiveMetaByVideoId[it.id];
      const ivLink = ivMeta?.quizId ? `https://wayground.com/admin/quiz/${ivMeta.quizId}` : "";
      const ivId = ivMeta?.quizId || "";
      
      // Use YouTube video title for both assessment and IV titles (matching the updated names on Wayground)
      const assessmentTitle = it.title;
      const ivTitle = it.title;
      
      rows.push([
        playlistTitle || "",
        playlistLink,
        it.title,
        it.id,
        videoLink,
        assessmentTitle,
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
    const filename = `${(playlistTitle || 'playlist').replace(/[^a-z0-9-_ ]/gi, '').trim() || 'playlist'}.csv`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(`[ui:exportCsv] CSV exported: ${filename}`);
  }

  // Unused - kept for reference
  // async function publishResources() {
  //   const assessmentPairs = buildAssessmentPublishPairs();
  //   const ivPairs = buildIvPublishPairs();
  //   console.log("Assessment pairs to publish:", assessmentPairs.length, assessmentPairs);
  //   console.log("IV pairs to publish:", ivPairs.length, ivPairs);
  //   setPublishing(true);
  //   setPublishProgress({ done: 0, total: assessmentPairs.length });
  //   for (const p of assessmentPairs) {
  //     try {
  //       await fetch("/api/wayground/publish-quiz", { method: "POST", headers: { "content-type": "application/json", ...cookieHeader() }, body: JSON.stringify(p) });
  //       await fetch("/api/wayground/make-public", { method: "POST", headers: { "content-type": "application/json", ...cookieHeader() }, body: JSON.stringify({ quizId: p.quizId }) });
  //       
  //       // Update name to match YouTube video title
  //       const videoTitle = findVideoTitleForAssessment(p.quizId);
  //       if (videoTitle) {
  //         await fetch("/api/wayground/update-name", { method: "POST", headers: { "content-type": "application/json", ...cookieHeader() }, body: JSON.stringify({ quizId: p.quizId, name: videoTitle }) });
  //       }
  //     } catch {}
  //     setPublishProgress((s) => ({ ...s, done: s.done + 1 }));
  //   }
  //   setPublishing(false);
  //   setPublishingIVs(true);
  //   setPublishIVProgress({ done: 0, total: ivPairs.length });
  //   for (const p of ivPairs) {
  //     try {
  //       await fetch("/api/wayground/publish-interactive", { method: "POST", headers: { "content-type": "application/json", ...cookieHeader() }, body: JSON.stringify(p) });
  //       await fetch("/api/wayground/make-public", { method: "POST", headers: { "content-type": "application/json", ...cookieHeader() }, body: JSON.stringify({ quizId: p.quizId }) });
  //       
  //       // Update name to match YouTube video title
  //       const videoTitle = findVideoTitleForIV(p.quizId);
  //       if (videoTitle) {
  //         await fetch("/api/wayground/update-name", { method: "POST", headers: { "content-type": "application/json", ...cookieHeader() }, body: JSON.stringify({ quizId: p.quizId, name: videoTitle }) });
  //       }
  //     } catch {}
  //     setPublishIVProgress((s) => ({ ...s, done: s.done + 1 }));
  //   }
  //   setPublishingIVs(false);
  //   setResourcesPublished(true);
  // }

  // Unused - output is shown automatically after resource creation
  // function showOutputLinks() {
  //   // Just show output links in the video table
  //   setShowOutput(true);
  // }
  // Unused for now - kept for future bulk publish feature
  // async function publishAssessmentsAll() {
  //   const pairs = buildAssessmentPublishPairs();
  //   if (pairs.length === 0) return;
  //   setPublishing(true);
  //   setPublishProgress({ done: 0, total: pairs.length });
  //   for (const p of pairs) {
  //     try {
  //       await fetch("/api/wayground/publish-quiz", {
  //         method: "POST",
  //         headers: { "content-type": "application/json" },
  //         body: JSON.stringify(p),
  //       });
  //       await fetch("/api/wayground/make-public", {
  //         method: "POST",
  //         headers: { "content-type": "application/json" },
  //         body: JSON.stringify({ quizId: p.quizId }),
  //       });
  //     } catch {}
  //     setPublishProgress((s) => ({ ...s, done: s.done + 1 }));
  //   }
  //   setPublishing(false);
  //   setPhase("published");
  //   setPublishedDone(true);
  // }

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
    console.log(`[ui:fetchPlaylist] Fetching playlist: ${input.substring(0, 100)}`);
    setError(null);
    setItems([]);
    setLoading(true);
    try {
      const res = await fetch(`/api/playlist?url=${encodeURIComponent(input)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch playlist");
      }
      
      console.log(`[ui:fetchPlaylist] Success: ${data.items.length} videos, playlist="${data.playlistTitle}"`);
      setPlaylistId(data.playlistId as string);
      setPlaylistTitle((data.playlistTitle as string) || null);
      setChannelTitle((data.channelTitle as string) || null);
      setChannelId((data.channelId as string) || null);
      setChannelThumbnail((data.channelThumbnail as string) || null);
      
      // Check if this data is from the database (already generated)
      if (data.fromDatabase) {
        console.log('[ui:fetchPlaylist] This playlist was already generated! Redirecting to existing playlist...');
        
        // Use the slug from the database - redirect immediately if slug exists
        if (data.slug) {
          const playlistSlug = `/playlist/${data.slug}`;
          console.log(`[ui:fetchPlaylist] Redirecting to existing playlist: ${playlistSlug}`);
          // Redirect immediately without setting any state to avoid re-renders
          router.push(playlistSlug);
          return; // Exit early to prevent further processing
        }
        
        // Fallback: if slug is missing, set state and continue (shouldn't happen normally)
        console.warn('[ui:fetchPlaylist] Playlist exists but slug is missing, loading data instead');
        setWasLoadedFromDatabase(true);
        
        // Set grade and subject from saved data if available
        if (data.grade) setGrade(data.grade as string);
        if (data.subject) setSubject(data.subject as string);
        
        // Set Google Sheet URLs if they exist
        if (data.googleSheetUrl) {
          const sheetUrl = data.googleSheetUrl as string;
          setExportedSheetUrl(sheetUrl);
          // Generate the copy URL from the sheet URL
          const spreadsheetId = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1];
          if (spreadsheetId) {
            setExportedCopyUrl(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/copy`);
          }
          console.log('[ui:fetchPlaylist] Loaded existing Google Sheet URL:', sheetUrl);
        }
        
        // Process items and populate state with existing assessment/IV data
        const processedItems = (data.items as PlaylistItem[]).sort((a, b) => a.position - b.position);
        setItems(processedItems);
        
        // Build state maps for assessments and interactive videos
        const newQuizKeyById: Record<string, string> = {};
        const newQuizMetaById: Record<string, { title: string; quizGenKey?: string | null }> = {};
        const newInteractiveMetaByVideoId: Record<string, { quizId: string; draftVersion: string; title: string }> = {};
        const newInteractiveCreatedById: Record<string, boolean> = {};
        
        for (const item of processedItems) {
          const itemAny = item as { id: string; title: string; assessmentQuizId?: string; assessmentLink?: string; interactiveVideoQuizId?: string; interactiveVideoLink?: string };
          
          // Process assessment data
          if (itemAny.assessmentQuizId) {
            // Create a pseudo quizGenKey based on video ID for matching
            const pseudoKey = `existing-${item.id}`;
            newQuizKeyById[item.id] = pseudoKey;
            newQuizMetaById[itemAny.assessmentQuizId] = {
              title: item.title,
              quizGenKey: pseudoKey,
            };
          }
          
          // Process interactive video data
          if (itemAny.interactiveVideoQuizId) {
            newInteractiveMetaByVideoId[item.id] = {
              quizId: itemAny.interactiveVideoQuizId,
              draftVersion: '1', // Placeholder since we don't store this
              title: item.title,
            };
            newInteractiveCreatedById[item.id] = true;
          }
        }
        
        setQuizKeyById(newQuizKeyById);
        setQuizMetaById(newQuizMetaById);
        setInteractiveMetaByVideoId(newInteractiveMetaByVideoId);
        setInteractiveCreatedById(newInteractiveCreatedById);
        
        // Set the phase to show output directly
        setPhase("published");
        setResourcesPublished(true);
        setShowOutput(true);
        setSupabaseSaved(true);
        
        console.log('[ui:fetchPlaylist] Loaded existing playlist data successfully!');
      } else {
        console.log('[ui:fetchPlaylist] New playlist - ready to generate resources');
        setWasLoadedFromDatabase(false);
        setItems((data.items as PlaylistItem[]).sort((a, b) => a.position - b.position));
        setPhase("videos");
      }
    } catch (e: unknown) {
      const msg = typeof e === "object" && e && "message" in e ? String((e as { message?: string }).message) : "Something went wrong";
      console.error(`[ui:fetchPlaylist] Error: ${msg}`);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }
  
  // Helper function to generate slug (same as in save-playlist API)
  // function generateSlug(title: string): string {
  //   return title
  //     .toLowerCase()
  //     .replace(/[^a-z0-9]+/g, '-')
  //     .replace(/^-+|-+$/g, '')
  //     .substring(0, 100);
  // }

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

  // Unused - using createAssessmentAndGetKey instead
  // async function createAssessment(item: PlaylistItem, startWait: boolean = true): Promise<boolean> {
  //   console.log(`[ui:createAssessment] Creating assessment for video ${item.id}: "${item.title.substring(0, 50)}..."`);
  //   setCreatingId(item.id);
  //   if (phase === "videos") setPhase("creating");
  //   try {
  //     const res = await fetch("/api/wayground/create-assessment", {
  //       method: "POST",
  //       headers: { "content-type": "application/json", ...cookieHeader() },
  //       body: JSON.stringify({
  //         videoUrl: item.videoUrl,
  //         grade,
  //         subject,
  //         duration: 0,
  //         videoId: item.id,
  //       }),
  //     });
  //     const cloned = res.clone();
  //     let data: unknown = null;
  //     try {
  //       data = await res.json();
  //     } catch {
  //       data = await cloned.text();
  //     }
  //     if (!res.ok) {
  //       throw new Error(typeof data === "string" ? data : JSON.stringify(data));
  //     }
  //     const key = findQuizGenKey(data);
  //     if (key) {
  //       console.log(`[ui:createAssessment] Success for ${item.id}, quizGenKey: ${key}`);
  //       setQuizKeyById((prev) => ({ ...prev, [item.id]: key }));
  //     } else {
  //       console.log(`[ui:createAssessment] Success for ${item.id}, but no quizGenKey found`);
  //     }
  //     if (startWait) startWaitCountdown(90);
  //     return true;
  //   } catch (e: unknown) {
  //     console.error(`[ui:createAssessment] Error for ${item.id}:`, e);
  //     setError("Failed to create assessment. See console for details.");
  //     return false;
  //   } finally {
  //     setCreatingId(null);
  //   }
  // }

  async function createAssessmentAndGetKey(item: PlaylistItem): Promise<string | null> {
    console.log(`[ui:createAssessment] Creating assessment for video ${item.id}: "${item.title.substring(0, 50)}..."`);
    setCreatingId(item.id);
    if (phase === "videos") setPhase("creating");
    try {
      const res = await fetch("/api/wayground/create-assessment", {
        method: "POST",
        headers: { "content-type": "application/json", ...cookieHeader() },
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
        console.log(`[ui:createAssessment] Success for ${item.id}, quizGenKey: ${key}`);
        setQuizKeyById((prev) => ({ ...prev, [item.id]: key }));
        return key;
      } else {
        console.log(`[ui:createAssessment] Success for ${item.id}, but no quizGenKey found`);
        return null;
      }
    } catch (e: unknown) {
      console.error(`[ui:createAssessment] Error for ${item.id}:`, e);
      setError("Failed to create assessment. See console for details.");
      return null;
    } finally {
      setCreatingId(null);
    }
  }

  // Unused for now - kept for future bulk create feature
  // async function createAssessmentsBulk() {
  //   if (items.length === 0) return;
  //   setBulkCreating(true);
  //   setBulkProgress({ done: 0, total: items.length });
  //   setError(null);
  //   setPhase("creating");
  //   for (const item of items) {
  //     if (quizKeyById[item.id]) {
  //       setBulkProgress((p) => ({ ...p, done: p.done + 1 }));
  //       continue;
  //     }
  //     await createAssessment(item, false);
  //     setBulkProgress((p) => ({ ...p, done: p.done + 1 }));
  //   }
  //   setBulkCreating(false);
  //   startWaitCountdown(90);
  // }

  async function createInteractive(item: PlaylistItem): Promise<boolean> {
    console.log(`[ui:createInteractive] Creating interactive video for ${item.id}: "${item.title.substring(0, 50)}..."`);
    setCreatingInteractiveId(item.id);
    try {
      const res = await fetch("/api/wayground/create-interactive", {
        method: "POST",
        headers: { "content-type": "application/json", ...cookieHeader() },
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
      console.log(`[ui:createInteractive] Success for ${item.id}`);
      return true;
    } catch (e: unknown) {
      console.error(`[ui:createInteractive] Error for ${item.id}:`, e);
      setError("Failed to create interactive video. See console for details.");
      return false;
    } finally {
      setCreatingInteractiveId(null);
    }
  }

  // Unused for now - kept for future bulk create feature
  // async function createInteractivesBulk() {
  //   if (items.length === 0) return;
  //   setBulkCreatingInteractive(true);
  //   setInteractiveProgress({ done: 0, total: items.length });
  //   setError(null);
  //   for (const item of items) {
  //     if (interactiveCreatedById[item.id]) {
  //       setInteractiveProgress((p) => ({ ...p, done: p.done + 1 }));
  //       continue;
  //     }
  //     await createInteractive(item);
  //     setInteractiveProgress((p) => ({ ...p, done: p.done + 1 }));
  //   }
  //   setBulkCreatingInteractive(false);
  //   // Ensure 90s wait after the last create in bulk
  //   startInteractiveWaitCountdown(90);
  // }

  async function fetchAssessments(numVideosInPlaylist: number): Promise<{ filteredQuizIds: string[]; quizTitleMap: Record<string, { title: string }> }> {
    console.log(`[ui:fetchAssessments] Starting assessment fetch for playlist with ${numVideosInPlaylist} videos`);
    setFetchingAssessments(true);
    setError(null);
    try {
      const res = await fetch("/api/wayground/fetch-assessments", { method: "POST", headers: cookieHeader() });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to fetch assessments");
      const ids = Array.isArray(data?.quizIds) ? (data.quizIds as string[]) : [];
      setFetchedQuizIds(ids);
      const quizTitleMap: Record<string, { title: string }> = {};
      if (Array.isArray(data?.quizzes)) {
        for (const q of data.quizzes as Array<{ id: string; title: string; createdAt?: string }>) {
          if (q?.id) quizTitleMap[q.id] = { title: q.title };
        }
      }
      setQuizMetaById((prev) => ({ ...prev, ...quizTitleMap }));

      // Filter for quizzes created in the last 150s + N*2s (where N = number of videos in playlist)
      // N*2s accounts for the 2s gap between each video creation call
      const filterWindowMs = (150 + numVideosInPlaylist * 2) * 1000;
      const cutoffTime = Date.now() - filterWindowMs;
      const recentQuizzes = Array.isArray(data?.quizzes)
        ? (data.quizzes as Array<{ id: string; title: string; createdAt?: string }>)
            .filter(q => {
              if (!q.createdAt) return false;
              const createdTime = new Date(q.createdAt).getTime();
              return createdTime >= cutoffTime;
            })
        : [];

      const recentIds = recentQuizzes.map(q => q.id);
      console.log(`[ui:fetchAssessments] Found ${ids.length} total assessments, ${recentIds.length} created in last ${filterWindowMs/1000}s (150s + ${numVideosInPlaylist}*2s)`);

      setFetchingAssessments(false);
      return { filteredQuizIds: recentIds, quizTitleMap };
    } catch (e: unknown) {
      console.error('[ui:fetchAssessments] Error:', e);
      const msg = typeof e === "object" && e && "message" in e ? String((e as { message?: string }).message) : "Failed to fetch assessments";
      setError(msg);
      setFetchingAssessments(false);
      return { filteredQuizIds: [], quizTitleMap: {} };
    }
  }

  return (
    <div className="min-h-screen font-sans p-6 sm:p-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold leading-none flex items-center gap-2 flex-wrap">
                <span>Create</span>
                <Image 
                  src="/wayground-icon.png" 
                  alt="Wayground" 
                  width={24}
                  height={24}
                  className="h-6 w-6 rounded-full"
                />
                <span>Wayground resources from</span>
                <Image 
                  src="/youtube.png" 
                  alt="YouTube" 
                  width={24}
                  height={24}
                  className="h-6 w-6 rounded-full"
                />
                <span>YouTube playlists!</span>
              </h2>
              <Button variant="outline" size="sm" onClick={() => setHelpOpen(true)} className="gap-1.5">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                  <path d="M5.07505 4.10001C5.07505 2.91103 6.25727 1.92502 7.50005 1.92502C8.74283 1.92502 9.92505 2.91103 9.92505 4.10001C9.92505 5.19861 9.36782 5.71436 8.61854 6.37884L8.58757 6.4063C7.84481 7.06467 6.92505 7.87995 6.92505 9.5C6.92505 9.81757 7.18248 10.075 7.50005 10.075C7.81761 10.075 8.07505 9.81757 8.07505 9.5C8.07505 8.41517 8.62945 7.90623 9.38156 7.23925L9.40238 7.22079C10.1496 6.55829 11.075 5.73775 11.075 4.10001C11.075 2.12757 9.21869 0.775024 7.50005 0.775024C5.7814 0.775024 3.92505 2.12757 3.92505 4.10001C3.92505 4.41758 4.18249 4.67501 4.50005 4.67501C4.81761 4.67501 5.07505 4.41758 5.07505 4.10001ZM7.50005 13.3575C7.9833 13.3575 8.37505 12.9657 8.37505 12.4825C8.37505 11.9992 7.9833 11.6075 7.50005 11.6075C7.0168 11.6075 6.62505 11.9992 6.62505 12.4825C6.62505 12.9657 7.0168 13.3575 7.50005 13.3575Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                </svg>
                How to use
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Paste YouTube playlist URL or ID"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <Button onClick={fetchPlaylist} disabled={!input || loading || items.length > 0} size="default" className="whitespace-nowrap">
                {loading ? "Loading..." : "Show Videos"}
              </Button>
            </div>
            {error && (
              <p className="text-sm text-red-600 mt-3">{error}</p>
            )}
            {/* Removed playlist ID display */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">Subject</span>
                <Combobox
                  options={subjectOptions}
                  value={subject}
                  onValueChange={setSubject}
                  placeholder="Select subject"
                  searchPlaceholder="Search subjects..."
                  className="w-[160px]"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Grade</span>
                <Combobox
                  options={gradeOptions}
                  value={grade}
                  onValueChange={setGrade}
                  placeholder="Select grade"
                  searchPlaceholder="Search grades..."
                  className="w-[160px]"
                />
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Button 
                  size="default" 
                  variant="default" 
                  onClick={createResources}
                  className="whitespace-nowrap"
                  disabled={
                    items.length === 0 || 
                    !(createFlowStatus === "idle" || createFlowStatus === "doneIV") || 
                    publishing || 
                    publishingIVs ||
                    savingToSupabase ||
                    generatingSheet ||
                    (resourcesPublished && supabaseSaved) // Disable if already generated
                  }
                >
                  {generatingSheet ? "Generating Google Sheet…" :
                   savingToSupabase ? "Saving…" :
                   publishing || publishingIVs ? `Publishing… (${publishProgress.done + publishIVProgress.done}/${publishProgress.total + publishIVProgress.total})` :
                   createFlowStatus === "creatingA" || createFlowStatus === "creatingIV" ? "Creating resources…" :
                   createFlowStatus === "waitingA" || createFlowStatus === "waitingIV" ? `Waiting ${Math.max(waitRemaining, interactiveWaitRemaining)}s` :
                   createFlowStatus === "fetchingA" || createFlowStatus === "fetchingIV" || createFlowStatus === "fetchingKeys" ? "Fetching resources…" :
                   (resourcesPublished && supabaseSaved && wasLoadedFromDatabase) ? "Already generated" :
                   "Create resources"}
                </Button>
              </div>
            </div>
            {generatingSheet && (
              <p className="text-blue-600 text-sm font-medium flex items-center gap-1.5 mt-3">
                <span>📄</span>
                <span>Generating Google Sheet with all resources...</span>
              </p>
            )}
            {(resourcesPublished && supabaseSaved && wasLoadedFromDatabase && !generatingSheet) && (
              <p className="text-green-600 text-sm font-medium flex items-center gap-1.5 mt-3">
                <span>✓</span>
                <span>This playlist already exists! Find the resources below</span>
              </p>
            )}
            
            {/* Removed per request: do not show repeated assessments created text here */}
          </CardContent>
        </Card>

        {authOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-md bg-white p-6 space-y-4">
              <h3 className="text-lg font-semibold">Login to Wayground</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    disabled={authLoading}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Password</label>
                  <Input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={authLoading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !authLoading) {
                        handleLogin();
                      }
                    }}
                  />
                </div>
                {authError && (
                  <p className="text-sm text-red-600">{authError}</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setAuthOpen(false)} disabled={authLoading}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleLogin} disabled={authLoading}>
                  {authLoading ? "Logging in..." : "Login"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {helpOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-lg bg-white p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b">
                <h3 className="text-xl font-semibold">How to use</h3>
                <button 
                  onClick={() => setHelpOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              <ol className="space-y-3.5">
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600 shrink-0">1.</span>
                  <div>
                    <div className="font-medium">Paste YouTube playlist URL and load videos</div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600 shrink-0">2.</span>
                  <div>
                    <div className="font-medium">Select subject and grade level</div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600 shrink-0">3.</span>
                  <div>
                    <div className="font-medium">Click &quot;Create Resources&quot; (takes 4-5 min)</div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600 shrink-0">4.</span>
                  <div>
                    <div className="font-medium">Share the link with your team or export to Google Sheets</div>
                  </div>
                </li>
              </ol>
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => setHelpOpen(false)}>
                  Got it!
                </Button>
              </div>
            </div>
          </div>
        )}

        {items.length > 0 && (
          <Card>
            <CardContent className="py-0">
              <div className="flex gap-4">
                {/* Playlist Thumbnail */}
                {items[0]?.thumbnailUrl && (() => {
                  const thumbnailUrl = getYouTubeThumbnailUrl(items[0].thumbnailUrl, items[0]?.id);
                  return thumbnailUrl ? (
                    <a 
                      href={playlistId ? `https://www.youtube.com/playlist?list=${playlistId}` : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative h-32 w-48 shrink-0 overflow-hidden rounded-lg bg-muted hover:opacity-80 transition-opacity"
                    >
                      <Image 
                        src={thumbnailUrl} 
                        alt={playlistTitle || 'Playlist'} 
                        fill 
                        sizes="192px"
                        className="object-cover" 
                      />
                    </a>
                  ) : null;
                })()}
                
                {/* Playlist Info */}
                <div className="flex-1 min-w-0 space-y-3 relative">
                  {/* Action Buttons - Top Right */}
                  <div className="absolute top-0 right-0 flex items-center gap-2">
                      {supabaseSaved && playlistUrl && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={copyPlaylistLink}
                        >
                          {linkCopied ? '✓ Link Copied!' : '🔗 Copy link'}
                        </Button>
                      )}
                      
                      {resourcesPublished && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="default" 
                              disabled={exportingSheets}
                              className="gap-1.5"
                            >
                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                              <path d="M3.5 2C3.22386 2 3 2.22386 3 2.5V12.5C3 12.7761 3.22386 13 3.5 13H11.5C11.7761 13 12 12.7761 12 12.5V4.70711L9.29289 2H3.5ZM2 2.5C2 1.67157 2.67157 1 3.5 1H9.5C9.63261 1 9.75979 1.05268 9.85355 1.14645L12.8536 4.14645C12.9473 4.24021 13 4.36739 13 4.5V12.5C13 13.3284 12.3284 14 11.5 14H3.5C2.67157 14 2 13.3284 2 12.5V2.5ZM4.75 7.5C4.75 7.22386 4.97386 7 5.25 7H7V5.25C7 4.97386 7.22386 4.75 7.5 4.75C7.77614 4.75 8 4.97386 8 5.25V7H9.75C10.0261 7 10.25 7.22386 10.25 7.5C10.25 7.77614 10.0261 8 9.75 8H8V9.75C8 10.0261 7.77614 10.25 7.5 10.25C7.22386 10.25 7 10.0261 7 9.75V8H5.25C4.97386 8 4.75 7.77614 4.75 7.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                            </svg>
                            {exportingSheets ? 'Exporting...' : 'Export'}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[200px]">
                          <DropdownMenuItem onClick={handleOpenInNewTab} disabled={exportingSheets}>
                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4">
                              <path d="M3 2C2.44772 2 2 2.44772 2 3V12C2 12.5523 2.44772 13 3 13H12C12.5523 13 13 12.5523 13 12V8.5C13 8.22386 12.7761 8 12.5 8C12.2239 8 12 8.22386 12 8.5V12H3V3L6.5 3C6.77614 3 7 2.77614 7 2.5C7 2.22386 6.77614 2 6.5 2H3ZM12.8536 2.14645C12.9015 2.19439 12.9377 2.24964 12.9621 2.30861C12.9861 2.36669 12.9996 2.4303 13 2.497L13 2.5V2.50049V5.5C13 5.77614 12.7761 6 12.5 6C12.2239 6 12 5.77614 12 5.5V3.70711L6.85355 8.85355C6.65829 9.04882 6.34171 9.04882 6.14645 8.85355C5.95118 8.65829 5.95118 8.34171 6.14645 8.14645L11.2929 3H9.5C9.22386 3 9 2.77614 9 2.5C9 2.22386 9.22386 2 9.5 2H12.4999H12.5C12.5678 2 12.6324 2.01349 12.6914 2.03794C12.7504 2.06234 12.8056 2.09851 12.8536 2.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                            </svg>
                            View Google Sheet
                          </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleCopyToDrive} disabled={exportingSheets}>
                              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4">
                                <path d="M1 9.50006C1 10.3285 1.67157 11.0001 2.5 11.0001H4L4 10.0001H2.5C2.22386 10.0001 2 9.7762 2 9.50006L2 2.50006C2 2.22392 2.22386 2.00006 2.5 2.00006L9.5 2.00006C9.77614 2.00006 10 2.22392 10 2.50006V4.00002H11V2.50006C11 1.67163 10.3284 1.00006 9.5 1.00006H2.5C1.67157 1.00006 1 1.67163 1 2.50006V9.50006ZM5.5 4.00002C4.67157 4.00002 4 4.67159 4 5.50002V12.5C4 13.3284 4.67157 14 5.5 14H12.5C13.3284 14 14 13.3284 14 12.5V5.50002C14 4.67159 13.3284 4.00002 12.5 4.00002H5.5ZM5 5.50002C5 5.22388 5.22386 5.00002 5.5 5.00002H12.5C12.7761 5.00002 13 5.22388 13 5.50002V12.5C13 12.7762 12.7761 13 12.5 13H5.5C5.22386 13 5 12.7762 5 12.5V5.50002Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                              </svg>
                              Copy to my Drive
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={exportCsv}>
                              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4">
                                <path d="M7.50005 1.04999C7.74858 1.04999 7.95005 1.25146 7.95005 1.49999V8.41359L10.1819 6.18179C10.3576 6.00605 10.6425 6.00605 10.8182 6.18179C10.994 6.35753 10.994 6.64245 10.8182 6.81819L7.81825 9.81819C7.64251 9.99392 7.35759 9.99392 7.18185 9.81819L4.18185 6.81819C4.00611 6.64245 4.00611 6.35753 4.18185 6.18179C4.35759 6.00605 4.64251 6.00605 4.81825 6.18179L7.05005 8.41359V1.49999C7.05005 1.25146 7.25152 1.04999 7.50005 1.04999ZM2.5 10C2.77614 10 3 10.2239 3 10.5V12C3 12.5539 3.44565 13 3.99635 13H11.0012C11.5529 13 12 12.5528 12 12V10.5C12 10.2239 12.2239 10 12.5 10C12.7761 10 13 10.2239 13 10.5V12C13 13.1041 12.1062 14 11.0012 14H3.99635C2.89019 14 2 13.103 2 12V10.5C2 10.2239 2.22386 10 2.5 10Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                              </svg>
                              Download CSV
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      
                  </div>

                  {channelTitle && (
                    <a 
                      href={channelId ? `https://www.youtube.com/channel/${channelId}` : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                      {channelThumbnail ? (
                        <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-muted">
                          <Image 
                            src={channelThumbnail} 
                            alt={channelTitle} 
                            fill 
                            sizes="24px"
                            className="object-cover" 
                          />
                        </div>
                      ) : (
                        <Image 
                          src="/youtube.png" 
                          alt="YouTube" 
                          width={20}
                          height={20}
                          className="h-5 w-5"
                        />
                      )}
                      <p className="text-sm font-medium text-muted-foreground">
                        {channelTitle}
                      </p>
                    </a>
                  )}
                  
                  <h1 className="text-2xl font-bold leading-tight">
                    {playlistTitle || 'Untitled Playlist'}
                  </h1>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    {subject && (
                      <span className="inline-flex items-center rounded-md bg-transparent px-2.5 py-1 text-xs font-medium text-black border border-black">
                        {subject}
                      </span>
                    )}
                    {grade && (
                      <span className="inline-flex items-center rounded-md bg-transparent px-2.5 py-1 text-xs font-medium text-black border border-black">
                        {grade}
                      </span>
                    )}
                    <span className="text-sm text-muted-foreground">
                      • {items.length} videos
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>

            {/* Videos List */}
            <div className="divide-y border-t">
              {items.map((item) => {
                const videoKey = quizKeyById[item.id];
                const matchedId = videoKey ? Object.entries(quizMetaById).find(([, meta]) => meta.quizGenKey === videoKey)?.[0] : undefined;
                // const _matched = matchedId ? quizMetaById[matchedId] : undefined;
                const ivMeta = interactiveMetaByVideoId[item.id];
                const utmParams = `utm_source=community&utm_medium=appplaylistpage&utm_term=${encodeURIComponent(playlistTitle || '')}`;
                const assessmentLink = matchedId ? `https://wayground.com/admin/quiz/${matchedId}?${utmParams}` : "";
                const ivLink = ivMeta?.quizId ? `https://wayground.com/admin/interactive-video/${ivMeta.quizId}?${utmParams}` : "";
                
                return (
                  <div key={item.id} className="p-2 hover:bg-muted">
                    <div className="flex items-center justify-between gap-3 min-w-0">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-xs text-muted-foreground w-6 shrink-0">{item.position + 1}.</span>
                        <a href={item.videoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 min-w-0 flex-1">
                          {(() => {
                            const thumbnailUrl = getYouTubeThumbnailUrl(item.thumbnailUrl, item.id);
                            return thumbnailUrl ? (
                              <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded bg-muted">
                                <Image src={thumbnailUrl} alt={item.title} fill sizes="64px" className="object-cover" />
                              </div>
                            ) : (
                              <div className="h-10 w-16 shrink-0 rounded bg-muted" />
                            );
                          })()}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{item.title}</p>
                            {!showOutput && interactiveCreatedById[item.id] && (
                              <div className="flex items-center gap-2 text-xs text-green-600">
                                <span>Interactive video created!</span>
                                <span>✓</span>
                              </div>
                            )}
                            {!showOutput && (() => {
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
                      </div>
                      {showOutput && (assessmentLink || ivLink) && (
                        <div className="flex items-center gap-2 shrink-0">
                          {assessmentLink && (
                            <a 
                              href={assessmentLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="relative group"
                              title="Open Assessment"
                            >
                              <Image 
                                src="https://cf.quizizz.com/image/Assessment.png" 
                                alt="Assessment" 
                                width={32} 
                                height={32}
                                className="hover:opacity-80 transition-opacity"
                                unoptimized
                              />
                              <span className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                Open Assessment
                              </span>
                            </a>
                          )}
                          {ivLink && (
                            <a 
                              href={ivLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="relative group"
                              title="Open Interactive Video"
                            >
                              <Image 
                                src="https://cf.quizizz.com/image/Video.png" 
                                alt="Interactive Video" 
                                width={32} 
                                height={32}
                                className="hover:opacity-80 transition-opacity"
                                unoptimized
                              />
                              <span className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                Open Interactive Video
                              </span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Explore Channels and Playlists - Show when no videos loaded */}
        {items.length === 0 && !loadingExplore && exploreSections.length > 0 && (
          <div className="space-y-8">
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <h2 className="text-2xl font-bold">Explore Playlists</h2>
            </div>

            {exploreSections.map((section) => (
              <div key={section.subject} className="space-y-4">
                <div className="flex items-center gap-2">
                  {getSubjectIcon(section.subject, "w-5 h-5 text-foreground")}
                  <h3 className="text-xl font-semibold">{section.subject}</h3>
                </div>
                
                {/* Grid of 3 channels per row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {section.channels.map((channel) => (
                    <Card key={channel.channel_id} className="flex flex-col">
                      <CardHeader className="pb-3">
                        <Link 
                          href={`/channel/${channel.channel_id}`}
                          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity group"
                        >
                          {channel.channel_thumbnail ? (
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted ring-2 ring-border">
                              <Image 
                                src={channel.channel_thumbnail} 
                                alt={channel.channel_title || ''} 
                                fill 
                                sizes="40px"
                                className="object-cover" 
                              />
                            </div>
                          ) : (
                            <div className="h-10 w-10 shrink-0 rounded-full bg-muted flex items-center justify-center ring-2 ring-border">
                              <Image 
                                src="/youtube.png" 
                                alt="YouTube" 
                                width={20}
                                height={20}
                                className="opacity-50"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold group-hover:text-primary transition-colors truncate">
                              {channel.channel_title}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {channel.playlists.length} {channel.playlists.length === 1 ? 'playlist' : 'playlists'}
                            </p>
                          </div>
                          <svg className="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </CardHeader>
                      <CardContent className="flex-1">
                        {/* Horizontal scrolling carousel */}
                        <div className="relative -mx-6 px-6">
                          <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
                            {channel.playlists.map((playlist) => (
                              <Link
                                key={playlist.id}
                                href={`/playlist/${playlist.slug}`}
                                className="block group flex-none w-48"
                              >
                                <div className="relative pb-2">
                                  {/* Stack effect layers */}
                                  <div className="absolute bottom-0 left-2 right-2 h-2 bg-muted-foreground/30 rounded-md" />
                                  <div className="absolute bottom-1 left-1 right-1 h-1.5 bg-muted-foreground/40 rounded-md" />
                                  
                                  {/* Thumbnail container */}
                                  <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted transition-all duration-200 group-hover:scale-[1.03] group-hover:shadow-lg shadow-sm">
                                    {(() => {
                                      const thumbnailUrl = getYouTubeThumbnailUrl(playlist.thumbnail_url);
                                      return thumbnailUrl ? (
                                        <Image
                                          src={thumbnailUrl}
                                          alt={playlist.title}
                                          fill
                                          sizes="192px"
                                          className="object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-muted">
                                          <Image 
                                            src="/youtube.png" 
                                            alt="YouTube" 
                                            width={32}
                                            height={32}
                                            className="opacity-30"
                                          />
                                        </div>
                                      );
                                    })()}
                                    
                                    {/* Video count badge */}
                                    {playlist.video_count && (
                                      <div className="absolute top-1.5 right-1.5 bg-background/95 backdrop-blur-sm text-foreground text-[10px] font-medium px-1.5 py-0.5 rounded border border-border shadow-sm flex items-center gap-0.5">
                                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                                        </svg>
                                        {playlist.video_count}
                                      </div>
                                    )}
                                    
                                    {/* Title overlay */}
                                    <div className="absolute bottom-0 left-0 right-0 p-1.5">
                                      <div className="bg-background/98 backdrop-blur-md rounded px-1.5 py-1 border border-border shadow-lg">
                                        <h5 className="text-[10px] font-semibold truncate text-foreground leading-tight">
                                          {playlist.title}
                                        </h5>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading skeletons for explore section */}
        {items.length === 0 && loadingExplore && (
          <div className="space-y-8">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-8 w-64" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-7 w-32" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2.5">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3.5 w-28" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-3 overflow-hidden">
                        {[1, 2, 3].map((j) => (
                          <Skeleton key={j} className="aspect-video w-48 flex-none rounded-md" />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
        </div>
    </div>
  );
}
