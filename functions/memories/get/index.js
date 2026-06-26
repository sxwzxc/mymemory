import {
  jsonResponse,
  corsHeaders,
  handleOptions,
  getSessionUser,
  readUserMemories,
} from '../../_lib/auth.js';

// GET /memories/get?key=xxx —— 获取当前登录用户的单条记忆
export async function onRequest({ request, env }) {
  const options = handleOptions(request);
  if (options) return options;
  try {
    const username = await getSessionUser(request);
    if (!username) {
      return jsonResponse({ error: '未登录' }, 401, corsHeaders(request));
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
