import {
  jsonResponse,
  corsHeaders,
  handleOptions,
  initKv,
  authenticateApiKey,
  readUserMemories,
} from '../../../_lib/auth.js';

// GET /api/memories/get?key=xxx —— 使用 API Key 获取单条记忆
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
    const found = items.find((m) => m.key === key);
    if (!found) {
      return jsonResponse({ error: '未找到该记忆' }, 404, corsHeaders(request));
    }
    return jsonResponse(found, 200, corsHeaders(request));
  } catch (err) {
    return jsonResponse(
      { error: err.message || String(err) },
      500,
      corsHeaders(request)
    );
  }
}
