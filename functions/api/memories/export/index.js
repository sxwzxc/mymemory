import {
  jsonResponse,
  corsHeaders,
  handleOptions,
  initKv,
  authenticateApiKey,
  readUserMemories,
} from '../../../_lib/auth.js';

// GET /api/memories/export —— 使用 API Key 导出当前用户全部记忆为 JSON 备份
// 返回格式：{ version: 1, exportedAt, count, items }
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
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      count: items.length,
      items,
    };
    return jsonResponse(payload, 200, corsHeaders(request));
  } catch (err) {
    return jsonResponse(
      { error: err.message || String(err) },
      500,
      corsHeaders(request)
    );
  }
}
