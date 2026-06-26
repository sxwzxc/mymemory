export const API_HOST =
  process.env.NODE_ENV === 'development' ? 'http://localhost:8088' : '';

// 所有请求都携带 cookie（同源 / 跨域开发均可用）
const CREDENTIALS: RequestCredentials = 'include';

export interface Memory {
  key: string;
  value: string;
  meta?: {
    title?: string;
    tags?: string[];
    type?: 'memory' | 'skill';
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface MemoryListResponse {
  items: Memory[];
  count: number;
}

export interface AuthStatus {
  allowRegister: boolean;
  authenticated: boolean;
  username: string | null;
}

export interface ApiKeyInfo {
  id: string;
  name: string;
  createdAt: string;
}

export interface MeResponse {
  authenticated: boolean;
  username?: string;
  createdAt?: string;
  apiKeys?: ApiKeyInfo[];
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (data.error) return data.error;
    if (data.stack) return data.stack;
    return `请求失败 (${res.status})`;
  } catch {
    return `请求失败 (${res.status})`;
  }
}

// ---------- 认证 ----------

export async function getAuthStatus(): Promise<AuthStatus> {
  const res = await fetch(`${API_HOST}/auth/status`, { credentials: CREDENTIALS });
  return res.json();
}

export async function register(
  username: string,
  password: string
): Promise<void> {
  const res = await fetch(`${API_HOST}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: CREDENTIALS,
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function login(
  username: string,
  password: string
): Promise<void> {
  const res = await fetch(`${API_HOST}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: CREDENTIALS,
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function logout(): Promise<void> {
  await fetch(`${API_HOST}/auth/logout`, {
    method: 'POST',
    credentials: CREDENTIALS,
  });
}

export async function getMe(): Promise<MeResponse> {
  const res = await fetch(`${API_HOST}/auth/me`, { credentials: CREDENTIALS });
  return res.json();
}

// ---------- 记忆（cookie 鉴权，浏览器用） ----------

export async function listMemories(): Promise<MemoryListResponse> {
  const res = await fetch(`${API_HOST}/memories`, { credentials: CREDENTIALS });
  const data = await res.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data;
}

export async function getMemory(key: string): Promise<Memory> {
  const res = await fetch(
    `${API_HOST}/memories/get?key=${encodeURIComponent(key)}`,
    { credentials: CREDENTIALS }
  );
  const data = await res.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data;
}

export async function addMemory(
  key: string,
  value: string,
  meta?: { title?: string; tags?: string[]; type?: 'memory' | 'skill' }
): Promise<{ message: string }> {
  const res = await fetch(`${API_HOST}/memories/set`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: CREDENTIALS,
    body: JSON.stringify({ key, value, meta }),
  });
  const data = await res.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data;
}

export async function updateMemory(
  key: string,
  value: string,
  meta?: {
    title?: string;
    tags?: string[];
    type?: 'memory' | 'skill';
    createdAt?: string;
  }
): Promise<{ message: string }> {
  const res = await fetch(`${API_HOST}/memories/set`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: CREDENTIALS,
    body: JSON.stringify({ key, value, meta }),
  });
  const data = await res.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data;
}

export async function deleteMemory(key: string): Promise<{ message: string }> {
  const res = await fetch(
    `${API_HOST}/memories/delete?key=${encodeURIComponent(key)}`,
    { method: 'DELETE', credentials: CREDENTIALS }
  );
  const data = await res.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data;
}

// ---------- API Key 管理 ----------

export async function listApiKeys(): Promise<ApiKeyInfo[]> {
  const res = await fetch(`${API_HOST}/auth/apikeys`, {
    credentials: CREDENTIALS,
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.apiKeys || [];
}

export async function createApiKey(
  name: string
): Promise<{ apiKey: string; record: ApiKeyInfo }> {
  const res = await fetch(`${API_HOST}/auth/apikeys`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: CREDENTIALS,
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function deleteApiKey(id: string): Promise<void> {
  const res = await fetch(`${API_HOST}/auth/apikeys/delete?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: CREDENTIALS,
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
}
