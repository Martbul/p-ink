/**
 * p-ink API client
 *
 * Every function maps 1:1 to a backend route.
 * Auth token is fetched from Clerk on each call — no manual token handling needed.
 *
 * Usage:
 *   import { api } from "@/lib/api";
 *   const me = await api.getMe(token);
 */

import type {
  MeResponse,
  CoupleResponse,
  Couple,
  InviteCreateResponse,
  InviteInfoResponse,
  DeviceResponse,
  Device,
  ContentListResponse,
  Content,
  PushSubscriptionsResponse,
} from "@/types/api";

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7111";

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      // Don't set Content-Type for FormData — browser sets it with boundary
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.error ?? message;
    } catch {
      // ignore parse error, use the default message
    }
    throw new ApiError(res.status, message);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ─── API surface ──────────────────────────────────────────────────────────────

export const api = {
  // ── Users ──────────────────────────────────────────────────────────────────

  /** GET /api/users/me — returns the authed user, their couple, and their device */
  getMe(token: string): Promise<MeResponse> {
    return request("/api/users/me", token);
  },

  // ── Couples ────────────────────────────────────────────────────────────────

  /** GET /api/couples/me — returns couple + both partner profiles */
  getCouple(token: string): Promise<CoupleResponse> {
    return request("/api/couples/me", token);
  },

  /** POST /api/couples — creates a pending couple. Call once during onboarding. */
  createCouple(token: string, timezone?: string): Promise<Couple> {
    return request("/api/couples", token, {
      method: "POST",
      body: JSON.stringify({ timezone: timezone ?? "UTC" }),
    });
  },

  /** PATCH /api/couples/me — update couple timezone */
  updateCoupleTimezone(token: string, timezone: string): Promise<Couple> {
    return request("/api/couples/me", token, {
      method: "PATCH",
      body: JSON.stringify({ timezone }),
    });
  },

  /** POST /api/couples/invite — generate a shareable invite link */
  createInvite(token: string): Promise<InviteCreateResponse> {
    return request("/api/couples/invite", token, { method: "POST" });
  },

  /**
   * GET /api/couples/invite/:token — public, no auth needed.
   * Used on the join page to show "Alex invited you" before the user logs in.
   */
  getInviteInfo(inviteToken: string): Promise<InviteInfoResponse> {
    return fetch(`${BASE}/api/couples/invite/${inviteToken}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new ApiError(res.status, body.error ?? `HTTP ${res.status}`);
        }
        return res.json() as Promise<InviteInfoResponse>;
      });
  },

  /** POST /api/couples/join — accept an invite token and activate the couple */
  joinCouple(token: string, inviteToken: string): Promise<Couple> {
    return request("/api/couples/join", token, {
      method: "POST",
      body: JSON.stringify({ token: inviteToken }),
    });
  },

  // ── Devices ────────────────────────────────────────────────────────────────

  /** GET /api/devices/me — returns device + current frame_state */
  getDevice(token: string): Promise<DeviceResponse> {
    return request("/api/devices/me", token);
  },

  /** POST /api/devices/pair — link a MAC address to this user account */
  pairDevice(
    token: string,
    macAddress: string,
    label?: string
  ): Promise<Device> {
    return request("/api/devices/pair", token, {
      method: "POST",
      body: JSON.stringify({ mac_address: macAddress, label }),
    });
  },

  // ── Content ────────────────────────────────────────────────────────────────

  /** GET /api/content — list all content for this couple, newest first */
  listContent(token: string): Promise<ContentListResponse> {
    return request("/api/content", token);
  },

  /**
   * POST /api/content/message — send a text message to your partner's frame.
   * JSON only, no file upload needed.
   */
  sendMessage(
    token: string,
    text: string,
    caption?: string
  ): Promise<Content> {
    return request("/api/content/message", token, {
      method: "POST",
      body: JSON.stringify({ text, caption }),
    });
  },

  /**
   * POST /api/content — upload a photo or drawing.
   * Sends multipart/form-data.
   *
   * @param file   The File object from an <input type="file"> or drag-and-drop
   * @param type   "photo" | "drawing"
   * @param caption Optional caption string
   */
  uploadContent(
    token: string,
    file: File,
    type: "photo" | "drawing",
    caption?: string
  ): Promise<Content> {
    const form = new FormData();
    form.append("type", type);
    form.append("file", file);
    if (caption) form.append("caption", caption);

    return request("/api/content", token, {
      method: "POST",
      body: form,
    });
  },

  /** DELETE /api/content/:id — delete a queued item you sent */
  deleteContent(token: string, contentId: string): Promise<void> {
    return request(`/api/content/${contentId}`, token, {
      method: "DELETE",
    });
  },

  // ── Notifications ──────────────────────────────────────────────────────────

  /** GET /api/notifications/subscriptions */
  getPushSubscriptions(token: string): Promise<PushSubscriptionsResponse> {
    return request("/api/notifications/subscriptions", token);
  },

  /**
   * POST /api/notifications/subscribe
   * Pass the raw PushSubscription object from the Web Push API.
   *
   * Usage:
   *   const sub = await registration.pushManager.subscribe({ ... });
   *   await api.subscribePush(token, sub.toJSON());
   */
  subscribePush(
    token: string,
    subscription: PushSubscriptionJSON
  ): Promise<void> {
    return request("/api/notifications/subscribe", token, {
      method: "POST",
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      }),
    });
  },
};

export { ApiError };