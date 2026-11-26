#!/usr/bin/env node
// Archives the approved PSR public enrichment manifest to private IDrive E2.
// No D1, R2 or Supabase writes; no source deletions. Uses built-in Node APIs only.
import { readFile } from 'node:fs/promises';
import { createHash, createHmac } from 'node:crypto';

const HOST = 's3.us-west-2.idrivee2.com';
const REGION = 'us-east-1';
const BUCKET = 'espacios-store-j';
const SHA = '560fd171d8d2b4f3d163451e28c3edc6706e3f414ea38c95e00288180fc9109b';
const BYTES = 39038;
const KEY = 'psrhomes/catalogue/enrichment/2026-11-26/' + SHA + '.json';
const INPUT = new URL('../../docs/catalogue-enrichment/2026-11-26-major-developer-batch.json', import.meta.url);
const hash = value => createHash('sha256').update(value).digest('hex');
const hmac = (key, value) => createHmac('sha256', key).update(value).digest();
const encode = value => encodeURIComponent(value).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());

function fail(message) { throw new Error(message); }

function sign(method, access, secret, body, date = new Date()) {
  const stamp = date.toISOString().replace(/[:-]/g, '').replace(/\.\d{3}/, '');
  const day = stamp.slice(0, 8);
  const scope = day + '/' + REGION + '/s3/aws4_request';
  const path = '/' + BUCKET + '/' + KEY.split('/').map(encode).join('/');
  const payloadHash = hash(body ?? Buffer.alloc(0));
  const headers = { host: HOST, 'x-amz-content-sha256': payloadHash, 'x-amz-date': stamp };
  if (method === 'PUT') Object.assign(headers, {
    'content-type': 'application/json',
    'if-none-match': '*',
    'x-amz-acl': 'private',
    'x-amz-meta-sha256': SHA
  });
  const names = Object.keys(headers).sort();
  const canonicalHeaders = names.map(n => n + ':' + headers[n].trim().replace(/\s+/g, ' ') + '\n').join('');
  const signedHeaders = names.join(';');
  const canonical = [method, path, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const signingKey = hmac(hmac(hmac(hmac(Buffer.from('AWS4' + secret), day), REGION), 's3'), 'aws4_request');
  const signature = createHmac('sha256', signingKey)
    .update(['AWS4-HMAC-SHA256', stamp, scope, hash(canonical)].join('\n')).digest('hex');
  delete headers.host;
  headers.authorization = 'AWS4-HMAC-SHA256 Credential=' + access + '/' + scope + ', SignedHeaders=' + signedHeaders + ', Signature=' + signature;
  if (method === 'GET') headers['accept-encoding'] = 'identity';
  return { url: 'https://' + HOST + path, headers };
}

async function checkBytes(response, expected) {
  if (response.status !== 200) fail('IDrive read returned HTTP ' + response.status);
  const declared = response.headers.get('content-length');
  if (declared !== null && Number(declared) !== expected.length) fail('IDrive length mismatch');
  if (response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') fail('IDrive content type mismatch');
  if (!response.body) fail('IDrive object body missing');
  const reader = response.body.getReader();
  const chunks = []; let total = 0;
  try {
    while (true) {
      const {value, done} = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > expected.length) { await reader.cancel(); fail('IDrive response exceeds manifest length'); }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  const actual = Buffer.concat(chunks);
  if (actual.length !== expected.length || hash(actual) !== SHA || !actual.equals(expected)) fail('IDrive byte verification failed');
}

async function run(bytes, access, secret, fetcher = fetch) {
  const call = (method, body) => {
    const { url, headers } = sign(method, access, secret, body);
    return fetcher(url, { method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(30000) });
  };
  let response = await call('GET');
  if (response.status === 200) {
    await checkBytes(response, bytes);
    return { alreadyExists: true };
  }
  const status = response.status;
  await response.body?.cancel();
  if (status !== 404) fail('IDrive initial read returned HTTP ' + status);
  const written = await call('PUT', bytes);
  const writeStatus = written.status;
  await written.body?.cancel();
  if (![200, 412].includes(writeStatus)) fail('IDrive conditional write returned HTTP ' + writeStatus);
  response = await call('GET');
  await checkBytes(response, bytes);
  return { alreadyExists: writeStatus === 412 };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(x => !['--write','--dry-run','--self-test'].includes(x)) || new Set(args).size > 1) fail('Use one of --dry-run, --self-test, or --write');
  const bytes = await readFile(INPUT);
  if (bytes.length !== BYTES || hash(bytes) !== SHA) fail('Approved manifest integrity mismatch; stop');
  const data = JSON.parse(bytes.toString('utf8'));
  if (data.projects?.length !== 31 || new Set(data.projects.map(x => x.slug)).size !== 31) fail('Project manifest identity check failed');
  const metadata = { bucket: BUCKET, key: KEY, sha256: SHA, bytes: bytes.length, records: 31 };
  if (args.includes('--self-test')) {
    const replies = [
      new Response('', {status:404}),
      new Response('', {status:200}),
      new Response(bytes, {status:200, headers:{'content-type':'application/json','content-length':String(bytes.length)}})
    ];
    const methods = [];
    const mockFetch = async (url, options) => {
      methods.push(options.method);
      if (url !== 'https://' + HOST + '/' + BUCKET + '/' + KEY) fail('Unexpected storage target');
      if (options.method === 'PUT' && options.headers['if-none-match'] !== '*') fail('Conditional write missing');
      if (!options.headers.authorization?.startsWith('AWS4-HMAC-SHA256 ')) fail('Signature missing');
      return replies.shift() ?? fail('Unexpected request');
    };
    await run(bytes, 'mock-access-key', 'mock-secret', mockFetch);
    if (methods.join(',') !== 'GET,PUT,GET') fail('Unexpected operation sequence');
    console.log(JSON.stringify({ok:true,selfTest:true,...metadata}, null, 2)); return;
  }
  if (!args.includes('--write')) { console.log(JSON.stringify({dryRun:true,...metadata}, null, 2)); return; }
  const access = process.env.E2J_KEY || process.env.IDRIVE_ACCESS_KEY;
  const secret = process.env.E2J_SECRET || process.env.IDRIVE_SECRET_KEY;
  if (!access || !secret || /[\r\n]/.test(access)) fail('Configure the authorized IDrive J credentials securely in the operator environment');
  const result = await run(bytes, access, secret);
  console.log(JSON.stringify({ok:true,source:'idrive_e2',verified:true,...result,...metadata}, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
