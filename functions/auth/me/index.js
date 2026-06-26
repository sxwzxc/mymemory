import {
  jsonResponse,
  corsHeaders,
  handleOptions,
  initKv,
  getSessionUser,
  readUser,
} from '../../_lib/auth.js';

export async function onRequest({ request, env }) {
  const options = handleOptions(request);
  if (options) return options;
  try {
    initKv(env);
    const username = await getSessionUser(request);
    if (!username) {
      return jsonResponse(
        { authenticated: false },
        401,
        corsHeaders(request)
      );
    }
    const user = await readUser(username);
    const apiKeys = (user?.apiKeys || []).map((k) => ({
      id: k.id,
      name: k.name,
      createdAt: k.createdAt,
    }));
    return jsonResponse(
      {
        authenticated: true,
        username,
        createdAt: user?.createdAt || null,
        apiKeys,
      },
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
