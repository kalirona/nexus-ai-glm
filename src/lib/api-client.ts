/** Typed fetch helpers for the workspace. */

export async function api<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) msg = typeof body.error === "string" ? body.error : JSON.stringify(body.error);
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface UserDto {
  id: string;
  name: string;
  email: string;
  plan: string;
  credits: number;
  creditsResetAt: string | null;
  avatarUrl: string | null;
}

export interface ChatDto {
  id: string;
  title: string;
  model: string;
  pinned: boolean;
  folderId: string | null;
  updatedAt: string;
}

export interface MessageDto {
  id: string;
  role: string;
  content: string;
  model: string | null;
  createdAt: string;
}

export interface DocumentDto {
  id: string;
  title: string;
  content: string;
  kind: string;
  updatedAt: string;
  createdAt: string;
}

export interface ImageDto {
  id: string;
  prompt: string;
  size: string;
  base64: string;
  kind: string;
  createdAt: string;
}
