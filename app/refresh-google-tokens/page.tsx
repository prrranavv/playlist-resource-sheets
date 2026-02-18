"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function RefreshGoogleTokens() {
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAuthUrl() {
      try {
        const response = await fetch("/api/auth/google");
        const data = await response.json();
        if (data.authUrl) {
          setAuthUrl(data.authUrl);
        } else {
          setError("Failed to get authorization URL");
        }
      } catch (err) {
        setError("Error fetching authorization URL");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchAuthUrl();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center">Loading authorization URL...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !authUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <h1 className="text-xl font-semibold">Error</h1>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error || "Failed to get authorization URL"}</p>
            <Button
              onClick={() => window.location.reload()}
              className="mt-4"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-xl font-semibold">Refresh Google Tokens</h1>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Click the button below to authorize and get new Google OAuth tokens.
            After authorization, you&apos;ll be redirected to a page showing your new tokens.
          </p>
          <Button
            onClick={() => window.location.href = authUrl}
            className="w-full"
            size="lg"
          >
            Authorize with Google
          </Button>
          <div className="pt-4 border-t">
            <p className="text-xs text-gray-500 mb-2">Or copy this URL:</p>
            <code className="text-xs bg-gray-100 p-2 rounded block break-all">
              {authUrl}
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
