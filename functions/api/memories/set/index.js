import {
  jsonResponse,
  corsHeaders,
  handleOptions,
  initKv,
  authenticateApiKey,
  readUserMemories,
  writeUserMemories,
  validateMemoryKey,
  validateMemoryValue,
  checkMemoryLimit,
} from '../../../_lib/auth.js';

// POST /api/memories/set —— 使用 API Key 新增/更新记忆
// Body: { key, value, meta }
export async function onRequest({ request, env }) {
  const options = handleOptions(request);
  if (options) return options;
  try {
    initKv(env);
    const username = await authenticateApiKey(request);
    if (!username) {
      return jsonResponse({ error: '无效或缺失的 API Key' }, 401, corsHeaders(request));
    }
    const body = await request.json();
    const { key, value, meta } = body || {};
    if (!key || value === undefined || value === null) {
      return jsonResponse({ error: 'key 和 value 为必填项' }, 400, corsHeaders(request));
    }
    if (!validateMemoryKey(key)) {
      return jsonResponse(
        { error: 'key 格式不合法（仅允许字母、数字、下划线、连字符，长度 1-128）' },
        400,
        corsHeaders(request)
      );
    }
    const valueStr = String(value);
    const valueCheck = validateMemoryValue(valueStr);
    if (!valueCheck.ok) {
      return jsonResponse({ error: valueCheck.reason }, 400, corsHeaders(request));
    }

    const items = await readUserMemories(username);
    const idx = items.findIndex((m) => m.key === key);
    // 新增时才检查条数上限（更新不增加条数）
    if (idx < 0) {
      const limit = checkMemoryLimit(items.length, 1);
      if (!limit.ok) {
        return jsonResponse({ error: limit.reason }, 400, corsHeaders(request));
      }
    }
    const now = new Date().toISOString();
    const enrichedMeta = {
      ...(meta || {}),
      createdAt: idx >= 0 ? items[idx].meta?.createdAt : now,
      updatedAt: now,
    };
    const entry = { key, value: valueStr, meta: enrichedMeta };
    if (idx >= 0) items[idx] = entry;
    else items.push(entry);
    await writeUserMemories(username, items);

    return jsonResponse({ message: '记忆已保存', key }, 200, corsHeaders(request));
  } catch (err) {
    return jsonResponse(
      { error: err.message || String(err) },
      500,
      corsHeaders(request)
    );
  }
}
