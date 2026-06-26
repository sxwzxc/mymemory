import {
  jsonResponse,
  corsHeaders,
  handleOptions,
  initKv,
  getSessionUser,
  readUser,
  createApiKey,
  deleteApiKey,
} from '../../_lib/auth.js';

export async function onRequest({ request, env }) {
  const options = handleOptions(request);
  if (options) return options;
  try {
    initKv(env);
    const username = await getSessionUser(request);
    if (!username) {
      return jsonResponse({ error: '未登录' }, 401, corsHeaders(request));
    }
    const user = await readUser(username);
    if (!user) {
      return jsonResponse({ error: '用户不存在' }, 404, corsHeaders(request));
    }

    // GET：列出当前用户的 API Key（不返回 hash / secret）
    if (request.method === 'GET') {
      const list = (user.apiKeys || []).map((k) => ({
        id: k.id,
        name: k.name,
        createdAt: k.createdAt,
      }));
      return jsonResponse({ apiKeys: list }, 200, corsHeaders(request));
    }

    // POST：创建新的 API Key，secret 只返回一次
    if (request.method === 'POST') {
      let name = '';
      try {
        const body = await request.json();
        name = (body?.name || '').toString().trim();
      } catch {
        // 容忍空 body
      }
      const { secret, record } = await createApiKey(user, name || '默认 Key');
      return jsonResponse(
        { apiKey: secret, record },
        200,
        corsHeaders(request)
      );
    }

    return jsonResponse({ error: '不支持的方法' }, 405, corsHeaders(request));
  } catch (err) {
    return jsonResponse(
      { error: err.message || String(err) },
      500,
      corsHeaders(request)
    );
  }
}
