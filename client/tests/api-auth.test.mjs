import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { configureStore } from '@reduxjs/toolkit';

// Load the actual API definition without adding a second build configuration.
process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.test/';
const configSource = readFileSync(new URL('../src/lib/apiConfig.ts', import.meta.url), 'utf8');
const configCode = ts.transpileModule(configSource, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const configModuleUrl = `data:text/javascript;base64,${Buffer.from(configCode).toString('base64')}`;
const { parseApiBaseUrl } = await import(configModuleUrl);
const source = readFileSync(new URL('../src/state/api.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
  .replace('"@reduxjs/toolkit/query/react"', JSON.stringify(import.meta.resolve('@reduxjs/toolkit/query/react')))
  .replace('"@/lib/apiConfig"', JSON.stringify(configModuleUrl));
const { api } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('RTK Query gets a fresh session token per request and separates session stores', async () => {
  const originalFetch = globalThis.fetch;
  const headers = [];
  globalThis.fetch = async request => {
    assert.equal(request.url, 'https://api.example.test/users/me');
    headers.push(request.headers.get('Authorization'));
    return new Response(JSON.stringify({ userId: 17, username: 'test' }), { headers: { 'Content-Type': 'application/json' } });
  };
  const makeStore = getToken => configureStore({ reducer: { [api.reducerPath]: api.reducer }, middleware: getDefault => getDefault({ thunk: { extraArgument: { getToken } } }).concat(api.middleware) });
  let token = 'session-a';
  const first = makeStore(async () => token);
  const second = makeStore(async () => 'session-b');
  try {
    await first.dispatch(api.endpoints.getCurrentUser.initiate(undefined, { subscribe: false })).unwrap();
    token = 'session-a-refreshed';
    await first.dispatch(api.endpoints.getCurrentUser.initiate(undefined, { subscribe: false, forceRefetch: true })).unwrap();
    assert.equal(api.endpoints.getCurrentUser.select()(second.getState()).data, undefined);
    await second.dispatch(api.endpoints.getCurrentUser.initiate(undefined, { subscribe: false })).unwrap();
    assert.deepEqual(headers, ['Bearer session-a', 'Bearer session-a-refreshed', 'Bearer session-b']);
  } finally {
    first.dispatch(api.util.resetApiState()); second.dispatch(api.util.resetApiState());
    globalThis.fetch = originalFetch;
  }
});

test('API configuration preserves path prefixes and rejects unsafe or missing URLs', () => {
  assert.equal(parseApiBaseUrl(' https://api.example.test/backend/// '), 'https://api.example.test/backend/');
  for (const value of [undefined, '', '/api', 'ftp://api.example.test', 'https://user:secret@api.example.test', 'https://api.example.test?token=x', 'https://api.example.test#x']) {
    assert.throws(() => parseApiBaseUrl(value), /NEXT_PUBLIC_API_BASE_URL/);
  }
});
