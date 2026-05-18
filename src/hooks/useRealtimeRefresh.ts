"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPusherClient } from "@/lib/pusher-client";

export function useRealtimeRefresh(channel: string) {
  const router = useRouter();

  useEffect(() => {
    const pusher = getPusherClient();
    const ch = pusher.subscribe(channel);
    ch.bind("refresh", () => router.refresh());
    return () => {
      ch.unbind_all();
      pusher.unsubscribe(channel);
    };
  }, [channel, router]);
}
