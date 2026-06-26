import {
  jsonResponse,
  corsHeaders,
  handleOptions,
  initKv,
  authenticateApiKey,
  readUserMemories,
  writeUserMemories,
} from '../../../_lib/auth.js';

// DELETE /api/memories/delete?key=xxx —— 使用 API Key 删除记忆
export async function onRequest({ request, env }) {
  const options = handleOptions(request);
  if (options) return options;
  try {
    initKv(env);
    const username = await authenticateApiKey(request);
    if (!username) {
      return jsonResponse({ error: '无效或缺失的 API Key' }, 401, corsHeaders(request));
    }
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    if (!key) {
      return jsonResponse({ error: '缺少 key 参数' }, 400, corsHeaders(request));
    }
    const items = await readUserMemories(username);
    const next = items.filter((m) => m.key !== key);
    if (next.length === items.length) {
      return jsonResponse({ error: '未找到该记忆' }, 404, corsHeaders(request));
    }
    await writeUserMemories(username, next);
    return jsonResponse({ message: '记忆已删除' }, 200, corsHeaders(request));
  } catch (err) {
    return jsonResponse(
      { error: err.message || String(err) },
      500,
      corsHeaders(request)
    );
  }
}
