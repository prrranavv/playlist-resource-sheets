"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function RegeneratePage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;
  const [status, setStatus] = useState<"loading" | "redirecting" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setError("Invalid playlist slug");
      setStatus("error");
      return;
    }

    // Fetch playlist data to get YouTube playlist ID
    async function startRegeneration() {
      try {
        setStatus("loading");
        
        // Fetch playlist from database to get YouTube playlist ID
        const playlistRes = await fetch(`/api/playlist-by-slug?slug=${encodeURIComponent(slug)}`);
        const playlistData = await playlistRes.json();

        if (!playlistRes.ok || !playlistData.playlistId) {
          throw new Error(playlistData.error || "Failed to fetch playlist");
        }

        const youtubePlaylistId = playlistData.playlistId;
        const playlistUrl = `https://www.youtube.com/playlist?list=${youtubePlaylistId}`;

        // Redirect to homepage with playlist URL and regenerate flag
        setStatus("redirecting");
        router.push(`/?url=${encodeURIComponent(playlistUrl)}&regenerate=true`);
      } catch (err) {
        console.error("[RegeneratePage] Error:", err);
        setError(err instanceof Error ? err.message : "Failed to start regeneration");
        setStatus("error");
      }
    }

    startRegeneration();
  }, [slug, router]);

  if (status === "redirecting") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <h2 className="text-xl font-semibold">Redirecting to Homepage</h2>
              <p className="text-muted-foreground">
                Starting playlist regeneration process...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="text-red-500 text-4xl">⚠️</div>
              <h2 className="text-xl font-semibold">Error</h2>
              <p className="text-muted-foreground">{error || "Failed to start regeneration"}</p>
              <div className="flex gap-2 justify-center">
                <Button asChild>
                  <Link href={`/playlist/${slug}`}>Back to Playlist</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/">Go to Homepage</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <h2 className="text-xl font-semibold">Preparing Regeneration</h2>
            <p className="text-muted-foreground">
              Fetching playlist information...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

