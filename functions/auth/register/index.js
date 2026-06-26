import {
  jsonResponse,
  corsHeaders,
  handleOptions,
  isRegisterAllowed,
  normalizeUsername,
  randomToken,
  hashPassword,
  readUser,
  writeUser,
  writeUserMemories,
  buildSampleMemory,
} from '../../_lib/auth.js';

export async function onRequest({ request, env }) {
  const options = handleOptions(request);
  if (options) return options;
  try {
    if (!isRegisterAllowed(env)) {
      return jsonResponse(
        { error: '管理员已关闭注册功能' },
        403,
        corsHeaders(request)
      );
    }

    const body = await request.json();
    const { username, password } = body || {};
    const uname = normalizeUsername(username);
    if (!uname) {
      return jsonResponse(
        { error: '用户名仅允许字母、数字、下划线、短横线、点，长度 3-32' },
        400,
        corsHeaders(request)
      );
    }
    if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
      return jsonResponse(
        { error: '密码长度需为 6-128 位' },
        400,
        corsHeaders(request)
      );
    }

    const existing = await readUser(uname);
    if (existing) {
      return jsonResponse(
        { error: '该用户名已被注册' },
        409,
        corsHeaders(request)
      );
    }

    const salt = randomToken(16);
    const passwordHash = await hashPassword(password, salt);

    const user = {
      username: uname,
      passwordHash,
      salt,
      iterations: 100000,
      createdAt: new Date().toISOString(),
      apiKeys: [],
    };
    await writeUser(user);

    // 自动新建一条示例记忆（每个用户的记忆独立存为一个变量）
    const sample = buildSampleMemory();
    await writeUserMemories(uname, [sample]);

    return jsonResponse(
      { message: '注册成功', username: uname },
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
