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

// POST /api/memories/import —— 使用 API Key 批量导入记忆
// Body: { items: [{ key, value, meta }] } 或 { version, items } 导出文件原样回导
// 策略：同 key 已存在则跳过（不覆盖），仅导入新条目；跳过无效条目并统计
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
    const incoming = Array.isArray(body) ? body : body?.items;
    if (!Array.isArray(incoming)) {
      return jsonResponse(
        { error: '请求体需为 { items: [...] } 或直接为数组' },
        400,
        corsHeaders(request)
      );
    }

    const items = await readUserMemories(username);
    const existingKeys = new Set(items.map((m) => m.key));
    const now = new Date().toISOString();

    let imported = 0;
    let skippedExist = 0;
    let skippedInvalid = 0;
    const errors = [];

    for (const entry of incoming) {
      if (!entry || typeof entry !== 'object') {
        skippedInvalid++;
        continue;
      }
      const key = entry.key;
      const value = entry.value;
      if (!key || value === undefined || value === null) {
        skippedInvalid++;
        continue;
      }
      if (!validateMemoryKey(key)) {
        skippedInvalid++;
        errors.push(`无效 key: ${String(key).slice(0, 32)}`);
        continue;
      }
      const valueStr = String(value);
      const valueCheck = validateMemoryValue(valueStr);
      if (!valueCheck.ok) {
        skippedInvalid++;
        errors.push(`值过大跳过: ${key}`);
        continue;
      }
      if (existingKeys.has(key)) {
        skippedExist++;
        continue;
      }
      // 检查条数上限
      const limit = checkMemoryLimit(items.length, 1);
      if (!limit.ok) {
        errors.push(`已达上限，后续条目未导入: ${limit.reason}`);
        break;
      }
      const meta = entry.meta && typeof entry.meta === 'object' ? entry.meta : {};
      items.push({
        key,
        value: valueStr,
        meta: {
          ...meta,
          createdAt: meta.createdAt || now,
          updatedAt: now,
          importedAt: now,
        },
      });
      existingKeys.add(key);
      imported++;
    }

    if (imported > 0) {
      await writeUserMemories(username, items);
    }

    return jsonResponse(
      {
        message: `导入完成：新增 ${imported} 条，跳过已存在 ${skippedExist} 条，跳过无效 ${skippedInvalid} 条`,
        imported,
        skippedExist,
        skippedInvalid,
        errors: errors.slice(0, 20),
        totalAfter: items.length,
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
