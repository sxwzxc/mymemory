import {
  jsonResponse,
  corsHeaders,
  handleOptions,
  initKv,
  getSessionUser,
  isRegisterAllowed,
} from '../../_lib/auth.js';

export async function onRequest({ request, env }) {
  const options = handleOptions(request);
  if (options) return options;
  try {
    initKv(env);
    const username = await getSessionUser(request);
    return jsonResponse(
      {
        allowRegister: isRegisterAllowed(env),
        authenticated: Boolean(username),
        username: username || null,
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
