const { neon } = require('@neondatabase/serverless');

function getSql() {
  const databaseUrl = process.env.NEON_DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Missing NEON_DATABASE_URL (or NETLIFY_DATABASE_URL)');
  }
  return neon(databaseUrl);
}

module.exports = {
  getSql,
};
