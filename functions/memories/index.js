import {
  jsonResponse,
  corsHeaders,
  handleOptions,
  initKv,
  getSessionUser,
  readUserMemories,
} from '../_lib/auth.js';

// GET /memories —— 列出当前登录用户的全部记忆
export async function onRequest({ request, env }) {
  const options = handleOptions(request);
  if (options) return options;
  try {
    initKv(env);
    const username = await getSessionUser(request);
    if (!username) {
      return jsonResponse({ error: '未登录' }, 401, corsHeaders(request));
    }
    const items = await readUserMemories(username);
    // 按创建时间倒序
    items.sort((a, b) => {
      const ta = a.meta?.createdAt || '';
      const tb = b.meta?.createdAt || '';
      return tb.localeCompare(ta);
    });
    return jsonResponse(
      { items, count: items.length },
      200,
      corsHeaders(request)
    );
  } catch (err) {
    return jsonResponse(
      { error: err.message || String(err) },
      500,
      corsHeaders(request)
    );
  }
}
