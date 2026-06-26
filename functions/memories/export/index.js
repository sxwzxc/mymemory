import {
  jsonResponse,
  corsHeaders,
  handleOptions,
  initKv,
  getSessionUser,
  readUserMemories,
} from '../../_lib/auth.js';

// GET /memories/export —— 导出当前登录用户全部记忆为 JSON 备份
// 触发浏览器下载：返回 Content-Disposition: attachment
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
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      count: items.length,
      items,
    };
    const body = JSON.stringify(payload, null, 2);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="mymemory-backup-${stamp}.json"`,
        ...corsHeaders(request),
      },
    });
  } catch (err) {
    return jsonResponse(
      { error: err.message || String(err) },
      500,
      corsHeaders(request)
    );
  }
}
