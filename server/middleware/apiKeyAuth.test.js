import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApiKeyAuth } from './apiKeyAuth.js';
import { AppError } from '../utils/errors.js';

function fakeNext() {
  const calls = [];
  const next = (...args) => calls.push(args);
  next.calls = calls;
  return next;
}

test('calls next() when the correct key is provided', () => {
  const apiKeyAuth = createApiKeyAuth({ apiKey: 'secret-key' });
  const req = { headers: { 'x-api-key': 'secret-key' } };
  const next = fakeNext();

  apiKeyAuth(req, {}, next);

  assert.equal(next.calls.length, 1);
  assert.deepEqual(next.calls[0], []);
});

test('throws a 401 AppError when the key header is missing', () => {
  const apiKeyAuth = createApiKeyAuth({ apiKey: 'secret-key' });
  const req = { headers: {} };
  const next = fakeNext();

  assert.throws(
    () => apiKeyAuth(req, {}, next),
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 401);
      return true;
    }
  );
  assert.equal(next.calls.length, 0);
});

test('throws a 401 AppError when the key is wrong', () => {
  const apiKeyAuth = createApiKeyAuth({ apiKey: 'secret-key' });
  const req = { headers: { 'x-api-key': 'wrong-key' } };
  const next = fakeNext();

  assert.throws(
    () => apiKeyAuth(req, {}, next),
    (error) => {
      assert.equal(error.statusCode, 401);
      return true;
    }
  );
  assert.equal(next.calls.length, 0);
});

test('throws a 401 AppError when the provided key has a different length', () => {
  const apiKeyAuth = createApiKeyAuth({ apiKey: 'secret-key' });
  const req = { headers: { 'x-api-key': 'short' } };
  const next = fakeNext();

  assert.throws(
    () => apiKeyAuth(req, {}, next),
    (error) => {
      assert.equal(error.statusCode, 401);
      return true;
    }
  );
});
