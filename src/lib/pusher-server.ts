import Pusher from "pusher";

let pusherServer: Pusher | null = null;

function getPusherServer() {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!appId || !key || !secret || !cluster) return null;

  pusherServer ??= new Pusher({
    appId,
    key,
    secret,
    cluster,
  });

  return pusherServer;
}

export async function triggerRealtime(
  channel: string,
  event: string,
  data: Record<string, unknown>
) {
  const server = getPusherServer();
  if (!server) return;

  try {
    await server.trigger(channel, event, data);
  } catch (error) {
    console.error("Failed to trigger realtime update", error);
  }
}
