// 共享认证与 KV 访问助手
// 设计：每个用户在 KV 中是独立的一个变量
//   user_<username>      -> 账户信息（含密码哈希、apiKey 列表）
//   memories_<username>  -> 该用户的全部记忆（JSON 数组，一个变量）
//   session_<token>       -> { username, createdAt, expiresAt }
//   apikey_<sha256>       -> { username, keyId }（用于 O(1) 鉴权查找）
//
// 注意：EdgeOne KV 的 key 仅支持「数字、字母、下划线」，不能用冒号等符号，
// 否则会报 Param Invalid。因此所有 key 一律用下划线分段。

const SESSION_COOKIE = 'mm_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 天
const PBKDF2_ITERATIONS = 100000;

// ---------- KV 绑定解析 ----------
// EdgeOne Pages 把绑定的 KV 命名空间以「变量名」注入为全局变量
// （见 https://pages.edgeone.ai/zh/document/kv-storage ，示例用 my_kv）。
// 为避免「mymemory is not defined」（变量名不一致或未绑定），这里动态解析：
//   1) 优先使用全局变量 mymemory（与原仓库模板一致）
//   2) 退回 env.mymemory / env.MYMEMORY（部分运行时把绑定挂在 env 上）
//   3) 兜底：扫描 env 中任意具备 get/put/delete 的 KV-like 对象
// 解析失败时抛出明确错误，便于在控制台日志中定位。
let _kv = null;
let _kvSource = null; // 记录绑定来源，用于日志诊断

function looksLikeKv(v) {
  return (
    v &&
    typeof v === 'object' &&
    typeof v.get === 'function' &&
    typeof v.put === 'function' &&
    typeof v.delete === 'function'
  );
}

function resolveKv(env) {
  // 1) 全局变量：通过 globalThis 按名读取，避免直接引用未声明变量抛 ReferenceError
  //    （不使用 eval，规避部分边缘运行时对 eval 的 CSP 限制）
  const globalNames = ['mymemory', 'my_memory', 'kv', 'my_kv', 'KV'];
  for (const name of globalNames) {
    const g = globalThis[name];
    if (looksLikeKv(g)) {
      _kvSource = `globalThis.${name}`;
      return g;
    }
  }
  // 2) env 上的绑定
  if (env) {
    for (const name of globalNames) {
      if (looksLikeKv(env[name])) {
        _kvSource = `env.${name}`;
        return env[name];
      }
    }
    // 3) 兜底：扫描 env 上任意 KV-like 对象
    for (const k of Object.keys(env)) {
      if (looksLikeKv(env[k])) {
        _kvSource = `env.${k}（自动扫描命中）`;
        return env[k];
      }
    }
  }
  return null;
}

// 每个 onRequest 入口需先调用 initKv(env) 解析绑定
export function initKv(env) {
  if (_kv) return _kv;
  _kv = resolveKv(env);
  if (_kv) {
    console.log('[mymemory] KV 绑定已解析:', _kvSource);
  } else {
    console.log('[mymemory] KV 绑定解析失败。env keys =', env ? Object.keys(env) : 'env is null');
    console.log('[mymemory] globalThis keys(可能含 KV) =', Object.keys(globalThis).filter((k) => looksLikeKv(globalThis[k])));
  }
  return _kv;
}

// 内部统一访问器 —— 包装 get/put/delete，输出操作日志便于定位 Param Invalid 等错误
function kv() {
  if (!_kv) {
    throw new Error(
      'KV 存储未绑定：请在 EdgeOne Pages 项目「KV 存储」中绑定命名空间，变量名设为 mymemory。'
    );
  }
  return {
    async get(key, opts) {
      console.log('[mymemory] KV.get:', key);
      const v = await _kv.get(key, opts);
      console.log('[mymemory] KV.get 结果:', key, '=>', v === null || v === undefined ? '(null)' : `(len=${typeof v === 'string' ? v.length : '?'})`);
      return v;
    },
    async put(key, value) {
      console.log('[mymemory] KV.put:', key, '(len=', typeof value === 'string' ? value.length : '?', ')');
      try {
        const r = await _kv.put(key, value);
        console.log('[mymemory] KV.put 成功:', key);
        return r;
      } catch (e) {
        console.error('[mymemory] KV.put 失败:', key, '错误:', e && e.message ? e.message : e);
        throw e;
      }
    },
    async delete(key) {
      console.log('[mymemory] KV.delete:', key);
      try {
        const r = await _kv.delete(key);
        console.log('[mymemory] KV.delete 成功:', key);
        return r;
      } catch (e) {
        console.error('[mymemory] KV.delete 失败:', key, '错误:', e && e.message ? e.message : e);
        throw e;
      }
    },
  };
}

// ---------- 通用工具 ----------

export function buf2hex(buf) {
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function jsonResponse(data, status = 200, extraHeaders = {}) {
  const headers = {
    'content-type': 'application/json; charset=UTF-8',
    ...extraHeaders,
  };
  return new Response(JSON.stringify(data), { status, headers });
}

// 回显 Origin 以支持 cookie 跨域（开发环境）
export function corsHeaders(request) {
  const origin = request?.headers?.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, authorization',
    'Vary': 'Origin',
  };
}

export function handleOptions(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(request) });
  }
  return null;
}

// ---------- 随机与哈希 ----------

export function randomToken(byteLen = 32) {
  const arr = new Uint8Array(byteLen);
  crypto.getRandomValues(arr);
  return buf2hex(arr);
}

export async function sha256Hex(text) {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return buf2hex(digest);
}

export async function hashPassword(password, salt, iterations = PBKDF2_ITERATIONS) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return buf2hex(derived);
}

// ---------- 用户与记忆存储 ----------
// 注意：EdgeOne KV 的 key 仅支持「数字、字母、下划线」，
// 不能使用冒号等符号（会报 Param Invalid）。
// 因此所有 key 用下划线分段：user_<name> / memories_<name> / session_<token> / apikey_<hash>

export function userKey(username) {
  return `user_${username}`;
}

export function memoriesKey(username) {
  return `memories_${username}`;
}

export function normalizeUsername(name) {
  // 仅允许字母、数字、下划线；3-32 位
  // （EdgeOne KV 的 key 仅支持数字、字母、下划线，用户名会成为 key 的一部分）
  return typeof name === 'string' && /^[a-zA-Z0-9_]{3,32}$/.test(name)
    ? name
    : null;
}

export async function readUser(username) {
  const raw = await kv().get(userKey(username));
  if (raw === null || raw === undefined) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function writeUser(user) {
  await kv().put(userKey(user.username), JSON.stringify(user));
}

export async function readUserMemories(username) {
  const raw = await kv().get(memoriesKey(username));
  if (raw === null || raw === undefined) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function writeUserMemories(username, items) {
  await kv().put(memoriesKey(username), JSON.stringify(items));
}

// ---------- 会话（cookie） ----------

export function parseCookies(request) {
  const header = request.headers.get('cookie') || '';
  const out = {};
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    out[k] = v;
  });
  return out;
}

export async function getSessionUser(request) {
  const cookies = parseCookies(request);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  const raw = await kv().get(`session_${token}`);
  if (raw === null || raw === undefined) return null;
  try {
    const data = JSON.parse(raw);
    if (!data?.username) return null;
    // 内嵌过期检查（兼容不同 KV 是否原生支持 TTL）
    const expiresAt = data.expiresAt ? Date.parse(data.expiresAt) : Infinity;
    if (Date.now() > expiresAt) {
      await kv().delete(`session_${token}`);
      return null;
    }
    return data.username;
  } catch {
    return null;
  }
}

export async function createSession(username) {
  const token = randomToken(32);
  const now = Date.now();
  await kv().put(
    `session_${token}`,
    JSON.stringify({
      username,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + SESSION_TTL_SECONDS * 1000).toISOString(),
    })
  );
  return token;
}

export async function destroySession(request) {
  const cookies = parseCookies(request);
  const token = cookies[SESSION_COOKIE];
  if (token) {
    await kv().delete(`session_${token}`);
  }
}

// 仅在 HTTPS 下追加 Secure 标记，避免 http://localhost 本地开发时浏览器丢弃 cookie
function cookieFlags(extra, request) {
  const isHttps =
    request?.url?.startsWith('https://') ||
    request?.headers?.get('x-forwarded-proto') === 'https';
  const flags = [...extra];
  if (isHttps) flags.push('Secure');
  return flags.join('; ');
}

export function sessionCookieHeader(token, request) {
  return {
    'Set-Cookie': cookieFlags(
      [
        `${SESSION_COOKIE}=${token}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        `Max-Age=${SESSION_TTL_SECONDS}`,
      ],
      request
    ),
  };
}

export function clearSessionCookieHeader(request) {
  return {
    'Set-Cookie': cookieFlags(
      [
        `${SESSION_COOKIE}=`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        'Max-Age=0',
      ],
      request
    ),
  };
}

// ---------- API Key ----------

const API_KEY_PREFIX = 'mm_';

export async function createApiKey(user, name) {
  const secret = `${API_KEY_PREFIX}${randomToken(32)}`;
  const hash = await sha256Hex(secret);
  const keyId = `k_${randomToken(8)}`;
  const keyRecord = {
    id: keyId,
    name: (name || '默认 Key').slice(0, 64),
    hash,
    createdAt: new Date().toISOString(),
  };
  user.apiKeys = user.apiKeys || [];
  user.apiKeys.push(keyRecord);
  await writeUser(user);
  await kv().put(
    `apikey_${hash}`,
    JSON.stringify({ username: user.username, keyId })
  );
  return { secret, record: { id: keyId, name: keyRecord.name, createdAt: keyRecord.createdAt } };
}

export async function deleteApiKey(user, keyId) {
  user.apiKeys = user.apiKeys || [];
  const idx = user.apiKeys.findIndex((k) => k.id === keyId);
  if (idx === -1) return false;
  const hash = user.apiKeys[idx].hash;
  user.apiKeys.splice(idx, 1);
  await writeUser(user);
  await kv().delete(`apikey_${hash}`);
  return true;
}

export async function authenticateApiKey(request) {
  const auth = request.headers.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  if (!m) return null;
  const secret = m[1].trim();
  const hash = await sha256Hex(secret);
  const raw = await kv().get(`apikey_${hash}`);
  if (raw === null || raw === undefined) return null;
  try {
    const data = JSON.parse(raw);
    return data?.username || null;
  } catch {
    return null;
  }
}

// ---------- 注册开关 ----------

export function isRegisterAllowed(env) {
  const v = env?.AllowRegister;
  return String(v) === '1';
}

// ---------- 示例记忆 ----------

export function buildSampleMemory() {
  const now = new Date().toISOString();
  return {
    key: `memory_sample_${Date.now()}`,
    value:
      '欢迎来到你的 AI 记忆库！\n\n这是你专属的私密空间，可以存储：\n- 📝 记忆：所思所想、知识笔记、生活记录\n- ⚡ Skill：提示词、指令模板、可复用的能力\n\n你可以随时编辑或删除这条示例记忆，开始打造属于你自己的记忆库。\n\n此外，你还可以在「API Keys」中创建密钥，通过 HTTP 接口程序化地读写你的记忆库。',
    meta: {
      title: '欢迎示例',
      tags: ['示例', '入门'],
      type: 'memory',
      createdAt: now,
    },
  };
}
