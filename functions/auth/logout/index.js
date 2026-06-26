import {
  jsonResponse,
  corsHeaders,
  handleOptions,
  destroySession,
  clearSessionCookieHeader,
} from '../../_lib/auth.js';

export async function onRequest({ request, env }) {
  const options = handleOptions(request);
  if (options) return options;
  try {
    await destroySession(request);
    return jsonResponse(
      { message: '已退出登录' },
      200,
      { ...corsHeaders(request), ...clearSessionCookieHeader(request) }
    );
  } catch (err) {
    return jsonResponse(
      { error: err.message || String(err) },
      500,
      corsHeaders(request)
    );
  }
}
