import {
  jsonResponse,
  corsHeaders,
  handleOptions,
  initKv,
  normalizeUsername,
  hashPassword,
  readUser,
  createSession,
  sessionCookieHeader,
  toErrorBody,
} from '../../_lib/auth.js';

export async function onRequest({ request, env }) {
  const options = handleOptions(request);
  if (options) return options;
  try {
    initKv(env);
    const body = await request.json();
    const { username, password } = body || {};
    const uname = normalizeUsername(username);
    if (!uname || typeof password !== 'string') {
      return jsonResponse(
        { error: '用户名或密码无效' },
        400,
        corsHeaders(request)
      );
    }

    const user = await readUser(uname);
    if (!user) {
      return jsonResponse(
        { error: '用户名或密码错误' },
        401,
        corsHeaders(request)
      );
    }

    const hash = await hashPassword(password, user.salt);
    if (hash !== user.passwordHash) {
      return jsonResponse(
        { error: '用户名或密码错误' },
        401,
        corsHeaders(request)
      );
    }

    const token = await createSession(uname);
    return jsonResponse(
      { message: '登录成功', username: uname },
      200,
      { ...corsHeaders(request), ...sessionCookieHeader(token, request) }
    );
  } catch (err) {
    console.error('[mymemory] login 异常:', err);
    return jsonResponse(
      toErrorBody(err),
      500,
      corsHeaders(request)
    );
  }
}
