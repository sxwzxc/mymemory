import {
  jsonResponse,
  corsHeaders,
  handleOptions,
  initKv,
  getSessionUser,
  readUser,
  deleteApiKey,
} from '../../../_lib/auth.js';

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

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return jsonResponse({ error: '缺少 id 参数' }, 400, corsHeaders(request));
    }

    const ok = await deleteApiKey(user, id);
    if (!ok) {
      return jsonResponse({ error: '未找到该 API Key' }, 404, corsHeaders(request));
    }
    return jsonResponse({ message: '已删除' }, 200, corsHeaders(request));
  } catch (err) {
    return jsonResponse(
      { error: err.message || String(err) },
      500,
      corsHeaders(request)
    );
  }
}
