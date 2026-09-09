const { test } = require('node:test');
const assert = require('node:assert/strict');
const cors = require('cors');
const { getAllowedOrigins, getCorsOptions } = require('../dist/src/config/cors');

test('origin configuration supports local and explicit Vercel origins, normalization and legacy fallback', () => {
  assert.deepEqual(getAllowedOrigins({ CORS_ORIGINS: ' http://localhost:3000/,https://project.vercel.app,http://localhost:3000 ', FRONTEND_URL: 'https://ignored.example' }), ['http://localhost:3000', 'https://project.vercel.app']);
  assert.deepEqual(getAllowedOrigins({ FRONTEND_URL: 'https://existing.example/' }), ['https://existing.example']);
  assert.deepEqual(getAllowedOrigins({}), ['http://localhost:3000']);
  for (const value of ['*', 'https://*.vercel.app', '', 'https://site.example/path', 'https://u:p@site.example', 'https://site.example?x=1']) assert.throws(() => getAllowedOrigins({ CORS_ORIGINS: value }));
  assert.throws(() => getAllowedOrigins({ NODE_ENV: 'production' }));
});

test('preflight allows configured origin and bearer headers, but gives no access header to other origins', () => {
  const middleware = cors(getCorsOptions(['https://project.vercel.app']));
  function preflight(origin) {
    const headers = {};
    const res = { setHeader: (k,v) => { headers[k.toLowerCase()] = v; }, getHeader: k => headers[k.toLowerCase()], end: () => {} };
    middleware({ method: 'OPTIONS', headers: { origin, 'access-control-request-method': 'PATCH', 'access-control-request-headers': 'authorization,content-type' } }, res, () => assert.fail('preflight must finish before authentication'));
    return { headers, status: res.statusCode };
  }
  const allowed = preflight('https://project.vercel.app');
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers['access-control-allow-origin'], 'https://project.vercel.app');
  assert.match(allowed.headers['access-control-allow-headers'], /Authorization/);
  assert.equal(preflight('https://other.example').headers['access-control-allow-origin'], undefined);
});
