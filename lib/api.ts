export const API_HOST =
  process.env.NODE_ENV === 'development' ? 'http://localhost:8088' : '';

// 所有请求都携带 cookie（同源 / 跨域开发均可用）
const CREDENTIALS: RequestCredentials = 'include';

export type SkillCategory =
  | 'translate'
  | 'summary'
  | 'writing'
  | 'code'
  | 'roleplay'
  | 'analysis'
  | 'other';

export interface Memory {
  key: string;
  value: string;
  meta?: {
    title?: string;
    tags?: string[];
    type?: 'memory' | 'skill';
    // Skill 专用（AI 友好）字段
    usage?: string; // 使用场景说明，一句话告诉用户/ AI 何时调用
    examples?: string[]; // 示例输入或示例提示词
    category?: SkillCategory; // Skill 分类
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

export type MemoryMetaInput = {
  title?: string;
  tags?: string[];
  type?: 'memory' | 'skill';
  usage?: string;
  examples?: string[];
  category?: SkillCategory;
  createdAt?: string;
};

export async function addMemory(
  key: string,
  value: string,
  meta?: MemoryMetaInput
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
  meta?: MemoryMetaInput
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

// ---------- Skill 模板 ----------

export interface SkillTemplate {
  name: string;
  category: SkillCategory;
  title: string;
  usage: string;
  content: string;
  examples: string[];
}

export const SKILL_TEMPLATES: SkillTemplate[] = [
  {
    name: '翻译助手',
    category: 'translate',
    title: '中英互译助手',
    usage: '需要将中文翻译为英文，或将英文翻译为中文时调用',
    content:
      '你是一位专业的中英互译助手。请将用户提供的文本翻译为目标语言，遵循以下规则：\n1. 保持原文语气与风格\n2. 专业术语给出译名注释\n3. 不确定处给出 2 个候选译法\n4. 输出格式：译文 + 简短说明',
    examples: [
      '请把这段话翻译成英文：今天天气真好',
      'Translate to Chinese: The system is down.',
    ],
  },
  {
    name: '内容总结',
    category: 'summary',
    title: '文章精炼总结',
    usage: '面对长文章、会议记录、聊天记录需要快速提取要点时调用',
    content:
      '你是一位内容总结专家。请对用户提供的长文本进行结构化总结：\n1. 一句话核心结论\n2. 3-5 条要点（bullet）\n3. 关键数据 / 名词\n4. 行动建议（如有）',
    examples: ['帮我总结这篇会议记录', '提取这篇报道的要点'],
  },
  {
    name: '代码评审',
    category: 'code',
    title: '代码评审官',
    usage: '需要审查代码质量、发现 bug、给出改进建议时调用',
    content:
      '你是一位资深代码评审工程师。请审查用户提交的代码，输出：\n1. 严重问题（bug / 安全）\n2. 可读性与命名\n3. 性能优化点\n4. 改进示例（给出修订后的代码片段）\n请按问题严重程度从高到低排列。',
    examples: ['评审这段 Python 代码', '帮我看看这个函数有什么问题'],
  },
  {
    name: '写作助手',
    category: 'writing',
    title: '润色改写助手',
    usage: '需要润色、改写、提升文字表达时调用',
    content:
      '你是一位文字润色专家。请改写用户提供的文本，使其更清晰、专业、有感染力。要求：\n1. 保留原意\n2. 修正语病与逻辑\n3. 提供改写后版本与简短改动说明\n4. 如有多个风格可选，给出正式 / 口语两个版本',
    examples: ['帮我润色这封邮件', '把这段话改得更专业一点'],
  },
  {
    name: '角色扮演',
    category: 'roleplay',
    title: '面试官',
    usage: '模拟面试场景进行问答练习时调用',
    content:
      '请你扮演一位资深技术面试官。请根据用户选择的岗位，提出由浅入深的面试问题，每次只问一个问题，等待用户回答后再给出反馈并追问下一题。',
    examples: ['我想模拟前端面试', '进行一次产品经理面试模拟'],
  },
];

export const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
  translate: '翻译',
  summary: '总结',
  writing: '写作',
  code: '代码',
  roleplay: '角色扮演',
  analysis: '分析',
  other: '其他',
};

/**
 * 把一条 Skill 记忆格式化为可粘贴到任意 AI 对话框的提示词文本。
 */
export function formatSkillAsPrompt(mem: Memory): string {
  const meta = mem.meta || {};
  const lines: string[] = [];
  lines.push(`# Skill：${meta.title || '未命名'}`);
  lines.push('');
  if (meta.category) {
    lines.push(`## 分类`);
    lines.push(SKILL_CATEGORY_LABELS[meta.category] || meta.category);
    lines.push('');
  }
  if (meta.usage) {
    lines.push(`## 使用场景`);
    lines.push(meta.usage);
    lines.push('');
  }
  lines.push(`## 指令内容`);
  lines.push(mem.value || '');
  if (meta.examples && meta.examples.length) {
    lines.push('');
    lines.push(`## 示例`);
    meta.examples.forEach((e, i) => lines.push(`${i + 1}. ${e}`));
  }
  if (meta.tags && meta.tags.length) {
    lines.push('');
    lines.push(`## 标签`);
    lines.push(meta.tags.map((t) => `#${t}`).join(' '));
  }
  return lines.join('\n');
}
