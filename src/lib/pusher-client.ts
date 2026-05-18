import PusherJs from "pusher-js";

let client: PusherJs | null = null;

export function getPusherClient(): PusherJs | null {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!key || !cluster) return null;

  if (!client) {
    client = new PusherJs(key, { cluster });
  }

  return client;
}
