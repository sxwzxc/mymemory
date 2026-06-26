import {
  jsonResponse,
  corsHeaders,
  handleOptions,
  runDiagnostics,
} from '../../_lib/auth.js';

// GET /auth/diag —— 诊断端点：逐步执行 KV 绑定/get/put/delete 与 crypto.subtle，
// 直接返回每步成败与错误信息，便于定位 500 根因。无需登录。
export async function onRequest({ request, env }) {
  const options = handleOptions(request);
  if (options) return options;
  try {
    const report = await runDiagnostics(env);
    const anyFail = report.steps.some((s) => !s.ok);
    return jsonResponse(report, anyFail ? 500 : 200, corsHeaders(request));
  } catch (err) {
    return jsonResponse(
      { error: 'diag 自身异常: ' + (err && err.message ? err.message : String(err)) },
      500,
      corsHeaders(request)
    );
  }
}
