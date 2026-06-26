export async function onRequest({ request, params, env }) {
  try {
    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'content-type',
        },
      });
    }

    const body = await request.json();
    const { key, value, meta } = body;

    if (!key || value === undefined) {
      return new Response(
        JSON.stringify({ error: 'key 和 value 为必填项' }),
        {
          status: 400,
          headers: {
            'content-type': 'application/json; charset=UTF-8',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const enrichedMeta = {
      ...meta,
      createdAt: meta?.createdAt || new Date().toISOString(),
    };

    await mymemory.put(key, value, { metadata: enrichedMeta });

    return new Response(
      JSON.stringify({ message: '记忆已保存' }),
      {
        headers: {
          'content-type': 'application/json; charset=UTF-8',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err.message || JSON.stringify(err),
      }),
      {
        status: 500,
        headers: {
          'content-type': 'application/json; charset=UTF-8',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
