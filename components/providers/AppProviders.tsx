"use client";

import { useMemo } from "react";
import { CivicAuthProvider } from "@civic/auth/react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

const CIVIC_CLIENT_ID =
  process.env.NEXT_PUBLIC_CIVIC_CLIENT_ID ??
  "14053725-1e38-4e54-aefb-f65d58484704";

interface AppProvidersProps {
  children: React.ReactNode;
  convexUrl?: string;
}

export function AppProviders({ children, convexUrl }: AppProvidersProps) {
  const convex = useMemo(() => {
    if (!convexUrl) return null;
    return new ConvexReactClient(convexUrl);
  }, [convexUrl]);

  if (!convex) {
    return <CivicAuthProvider clientId={CIVIC_CLIENT_ID}>{children}</CivicAuthProvider>;
  }

  return (
    <CivicAuthProvider clientId={CIVIC_CLIENT_ID}>
      <ConvexProvider client={convex}>{children}</ConvexProvider>
    </CivicAuthProvider>
  );
}
