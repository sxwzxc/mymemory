import {
  jsonResponse,
  corsHeaders,
  handleOptions,
  initKv,
  authenticateApiKey,
  readUserMemories,
} from '../../_lib/auth.js';

// GET /api/memories  —— 使用 API Key 列出当前用户全部记忆
// 需要 Header: Authorization: Bearer <api_key>
export async function onRequest({ request, env }) {
  const options = handleOptions(request);
  if (options) return options;
  try {
    initKv(env);
    const username = await authenticateApiKey(request);
    if (!username) {
      return jsonResponse({ error: '无效或缺失的 API Key' }, 401, corsHeaders(request));
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
