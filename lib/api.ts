export const API_HOST =
  process.env.NODE_ENV === 'development' ? 'http://localhost:8088' : '';

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

export async function listMemories(): Promise<MemoryListResponse> {
  const res = await fetch(`${API_HOST}/memories`);
  const data = await res.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data;
}

export async function getMemory(key: string): Promise<Memory> {
  const res = await fetch(`${API_HOST}/memories/get?key=${encodeURIComponent(key)}`);
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
    body: JSON.stringify({
      key,
      value,
      meta: { ...meta, updatedAt: new Date().toISOString() },
    }),
  });
  const data = await res.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data;
}

export async function deleteMemory(key: string): Promise<{ message: string }> {
  const res = await fetch(`${API_HOST}/memories/delete?key=${encodeURIComponent(key)}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data;
}
