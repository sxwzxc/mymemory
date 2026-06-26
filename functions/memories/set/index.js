import {
  jsonResponse,
  corsHeaders,
  handleOptions,
  initKv,
  getSessionUser,
  readUserMemories,
  writeUserMemories,
} from '../../_lib/auth.js';

// POST /memories/set —— 新增/更新当前登录用户的记忆
// Body: { key, value, meta }
export async function onRequest({ request, env }) {
  const options = handleOptions(request);
  if (options) return options;
  try {
    initKv(env);
    const username = await getSessionUser(request);
    if (!username) {
      return jsonResponse({ error: '未登录' }, 401, corsHeaders(request));
    }
    const body = await request.json();
    const { key, value, meta } = body || {};
    if (!key || value === undefined || value === null) {
      return jsonResponse({ error: 'key 和 value 为必填项' }, 400, corsHeaders(request));
    }

    const items = await readUserMemories(username);
    const idx = items.findIndex((m) => m.key === key);
    const now = new Date().toISOString();
    const enrichedMeta = {
      ...(meta || {}),
      createdAt: idx >= 0 ? items[idx].meta?.createdAt : meta?.createdAt || now,
      updatedAt: now,
    };
    const entry = { key, value: String(value), meta: enrichedMeta };
    if (idx >= 0) items[idx] = entry;
    else items.push(entry);
    await writeUserMemories(username, items);

    return jsonResponse({ message: '记忆已保存' }, 200, corsHeaders(request));
  } catch (err) {
    return jsonResponse(
      { error: err.message || String(err) },
      500,
      corsHeaders(request)
    );
  }
}
