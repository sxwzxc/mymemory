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

    const iterations = user.iterations || 100000;
    const hash = await hashPassword(password, user.salt, iterations);
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
    return jsonResponse(
      { error: err.message || String(err) },
      500,
      corsHeaders(request)
    );
  }
}
