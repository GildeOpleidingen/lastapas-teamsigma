import { createHmac, timingSafeEqual } from "crypto";

function toBase64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64");
}

function signature(payload: string, secret: string) {
  return toBase64Url(createHmac("sha256", secret).update(payload).digest());
}

export function createSignedCookieValue(payload: string, secret: string) {
  const encodedPayload = toBase64Url(payload);
  return `${encodedPayload}.${signature(encodedPayload, secret)}`;
}

export function readSignedCookieValue(value: string | undefined, secret: string) {
  if (!value) return null;

  const [encodedPayload, receivedSignature] = value.split(".");
  if (!encodedPayload || !receivedSignature) return null;

  const expectedSignature = signature(encodedPayload, secret);
  const expected = Buffer.from(expectedSignature);
  const received = Buffer.from(receivedSignature);

  if (expected.length !== received.length) return null;
  if (!timingSafeEqual(expected, received)) return null;

  return fromBase64Url(encodedPayload).toString("utf8");
}

export function timingSafeStringEqual(a: string, b: string) {
  const aHash = createHmac("sha256", "comparison").update(a).digest();
  const bHash = createHmac("sha256", "comparison").update(b).digest();
  return timingSafeEqual(aHash, bHash);
}
