const { getSql } = require('./_lib/neon-client');

exports.handler = async function handler() {
  try {
    const sql = getSql();
    const result = await sql`select now() as now`;
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        db: 'neon',
        serverTime: result?.[0]?.now || null,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
