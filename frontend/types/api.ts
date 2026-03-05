export interface User {
  id: string;
  clerk_id: string;
  email: string;
  name: string;
  created_at: string;
}

export type CoupleStatus = "pending" | "active";

export interface Couple {
  id: string;
  user_a_id: string;
  user_b_id: string | null;
  status: CoupleStatus;
  timezone: string;
  created_at: string;
}

export interface InviteToken {
  token: string;
  couple_id: string;
  created_by: string;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
}

export interface Device {
  id: string;
  owner_id: string;
  couple_id: string | null;
  mac_address: string;
  label: string | null;
  last_seen: string | null;
  firmware: string | null;
  created_at: string;
}

export type ContentType = "photo" | "message" | "drawing";
export type ContentStatus = "queued" | "displayed" | "archived";

export interface Content {
  id: string;
  couple_id: string;
  sent_by: string;
  sent_to: string;
  type: ContentType;
  storage_key: string | null;
  message_text: string | null;
  caption: string | null;
  status: ContentStatus;
  displayed_at: string | null;
  created_at: string;
}

export interface FrameState {
  device_id: string;
  content_id: string | null;
  image_url: string;
  image_hash: string;
  composed_at: string;
  expires_at: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

export interface MeResponse {
  user: User;
  couple: Couple | null;
  device: Device | null;
}

export interface CoupleResponse {
  couple: Couple;
  user_a: User;
  user_b: User | null;
}

export interface DeviceResponse {
  device: Device;
  frame_state: FrameState | null;
}

export interface DeviceWithState {
  device: Device;
  frame_state: FrameState | null;
}

export interface CoupleDevicesResponse {
  devices: DeviceWithState[];
}

export interface ContentListResponse {
  items: Content[];
}

export interface InviteCreateResponse {
  token: string;
  invite_url: string;
  expires_at: string;
}

export interface InviteInfoResponse {
  token: string;
  expires_at: string;
  invited_by: User;
}

export interface PushSubscriptionsResponse {
  subscriptions: PushSubscription[];
}

export interface ApiError {
  error: string;
} 