import test from 'node:test';
import assert from 'node:assert/strict';
import { parseManifest, validateArticle, chooseContentSource } from '../../../scripts/prepare-private-blog.mjs';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const entry = { slug: 'example', file: 'published/example.mdx' };
const manifest = (articles) => JSON.stringify({ version: 1, articles });
const article = '---\ntitle: Example\nslug: example\ndraft: false\ndate: 2026-01-01\n---\nA synthetic example.';
const script = fileURLToPath(new URL('../../../scripts/prepare-private-blog.mjs', import.meta.url));
const webRoot = fileURLToPath(new URL('../', import.meta.url));
const base = 'https://api.github.com/repos/owner/private-content';
const sha = 'a'.repeat(40);
const referenceURL = `${base}/git/ref/heads/main`;
const manifestURL = `${base}/contents/published.json?ref=${sha}`;
const articleURL = `${base}/contents/${entry.file}?ref=${sha}`;
const credentials = { BLOG_CONTENT_REPOSITORY: 'owner/private-content', BLOG_CONTENT_TOKEN: 'synthetic-test-token' };
const production = { CF_PAGES: '1', CF_PAGES_BRANCH: 'main', ...credentials };
const safeFailure = 'Private content preparation failed. Check the production-only configuration, repository visibility and published manifest.\n';
const encodedFile = (text) => ({ type: 'file', encoding: 'base64', size: Buffer.byteLength(text), content: Buffer.from(text).toString('base64') });
const responses = () => ({
  [referenceURL]: { object: { type: 'commit', sha } },
  [base]: { private: true },
  [manifestURL]: encodedFile(manifest([entry])),
  [articleURL]: encodedFile(article),
});

// Run a copy of the real CLI in an isolated tree. The script derives its output
// directory from import.meta.url, so these tests cannot alter a concurrent build.
function runPreparation(t, { env = production, responseBodies = responses(), error } = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'private-blog-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const copiedScript = join(directory, 'scripts', 'prepare-private-blog.mjs');
  const destination = join(directory, 'apps/web/src/content/blog/private');
  mkdirSync(dirname(copiedScript), { recursive: true });
  mkdirSync(destination, { recursive: true });
  copyFileSync(script, copiedScript);
  writeFileSync(join(destination, 'stale.mdx'), 'Synthetic stale manuscript.');
  writeFileSync(join(directory, 'responses.json'), JSON.stringify({ responseBodies, error }));
  const preload = join(directory, 'mock-fetch.mjs');
  writeFileSync(preload, `
    import { appendFileSync, readFileSync } from 'node:fs';
    const { responseBodies, error } = JSON.parse(readFileSync(new URL('./responses.json', import.meta.url), 'utf8'));
    globalThis.fetch = async (url, options) => {
      appendFileSync(new URL('./requests.jsonl', import.meta.url), JSON.stringify({ url, redirect: options.redirect }) + '\\n');
      // Exercise real header validation without ever making a network request.
      new Request(url, options);
      if (error) throw new Error(error);
      if (!Object.hasOwn(responseBodies, url)) throw new Error('Unexpected mocked content request.');
      const body = responseBodies[url];
      return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status: 200 });
    };
  `);
  const result = spawnSync(process.execPath, ['--import', preload, copiedScript], {
    cwd: directory,
    env: { ...env },
    encoding: 'utf8',
    timeout: 10000,
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  const log = join(directory, 'requests.jsonl');
  const requests = existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line)) : [];
  return { ...result, destination, requests };
}

test('only explicit safe published paths are accepted', () => {
  assert.deepEqual(parseManifest(manifest([entry])), [entry]);
  assert.deepEqual(parseManifest(manifest([])), []);
  for (const file of ['drafts/secret.mdx', '../secret.mdx', 'published/../../secret.mdx', 'published/a.js', 'https://example.org/a.mdx'])
    assert.throws(() => parseManifest(manifest([{ ...entry, file }])));
  assert.throws(() => parseManifest(manifest([entry, entry])));
  assert.throws(() => parseManifest(manifest([{ ...entry, slug: 'hello-world' }])));
});

test('the manuscript must explicitly be publishable and match its route', () => {
  assert.equal(validateArticle(article, 'example'), article);
  for (const body of [article.replace('draft: false', 'draft: true'), article.replace('draft: false\n', ''), article.replace('slug: example', 'slug: other'), article.replace('draft: false', 'draft: false\ndraft: true')])
    assert.throws(() => validateArticle(body, 'example'));
});

test('only Cloudflare main can fetch private content', () => {
  assert.equal(chooseContentSource({ CF_PAGES: '1', CF_PAGES_BRANCH: 'main', ...credentials }).kind, 'github');
  assert.equal(chooseContentSource({ CF_PAGES: '1', CF_PAGES_BRANCH: 'feature', ...credentials }).kind, 'none');
  assert.equal(chooseContentSource({ CF_PAGES: '1', ...credentials }).kind, 'none');
  assert.throws(() => chooseContentSource({ CF_PAGES: '1', CF_PAGES_BRANCH: 'main' }));
  assert.equal(chooseContentSource({ CI: 'true', BLOG_CONTENT_DIR: '/synthetic/private' }).kind, 'none');
  assert.equal(chooseContentSource({}).kind, 'none');
  assert.equal(chooseContentSource({ BLOG_CONTENT_DIR: '/synthetic/private' }).kind, 'local');
});

test('private generated manuscripts and compiled output cannot be accidentally added', () => {
  const ignored = execFileSync('git', ['check-ignore', 'src/content/blog/private/example.mdx', 'dist/blog/example/index.html'], { encoding: 'utf8', cwd: webRoot });
  assert.match(ignored, /src\/content\/blog\/private\/example\.mdx/);
  assert.match(ignored, /dist\/blog\/example\/index\.html/);
  const tracked = execFileSync('git', ['ls-files', 'src/content/blog/private', 'dist'], { encoding: 'utf8', cwd: webRoot });
  assert.equal(tracked.trim(), '');
});

test('GitHub preparation reads only a ref, metadata and commit-pinned allowlisted files', (t) => {
  const second = { slug: 'second-note', file: 'published/second-note.md' };
  const secondArticle = article.replace('slug: example', 'slug: second-note');
  const secondURL = `${base}/contents/${second.file}?ref=${sha}`;
  const responseBodies = responses();
  responseBodies[manifestURL] = encodedFile(manifest([entry, second]));
  responseBodies[secondURL] = encodedFile(secondArticle);
  const result = runPreparation(t, { responseBodies });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(result.requests, [referenceURL, base, manifestURL, articleURL, secondURL].map(url => ({ url, redirect: 'error' })));
  assert.equal(result.requests.some(({ url }) => /\/commits(?:\/|\?)|\/drafts\//.test(url)), false);
  assert.deepEqual(readdirSync(result.destination).sort(), ['example.mdx', 'second-note.md']);
  assert.equal(readFileSync(join(result.destination, 'example.mdx'), 'utf8'), article);
  assert.equal(readFileSync(join(result.destination, 'second-note.md'), 'utf8'), secondArticle);
  assert.doesNotMatch(result.stdout + result.stderr, /synthetic-test-token|A synthetic example/);
});

test('preview and CI runs never fetch and remove stale generated manuscripts', (t) => {
  for (const env of [
    { ...production, CF_PAGES_BRANCH: 'feature', BLOG_CONTENT_DIR: '/must-not-be-read' },
    { CF_PAGES: '1', ...credentials, BLOG_CONTENT_DIR: '/must-not-be-read' },
    { CI: 'true', ...credentials, BLOG_CONTENT_DIR: '/must-not-be-read' },
  ]) {
    const result = runPreparation(t, { env, error: 'Fetch must never run.' });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(result.requests, []);
    assert.equal(existsSync(result.destination), false);
  }
});

test('production requires both credentials and clears stale content before failing', (t) => {
  for (const key of ['BLOG_CONTENT_REPOSITORY', 'BLOG_CONTENT_TOKEN']) {
    const env = { ...production };
    delete env[key];
    const result = runPreparation(t, { env });
    assert.equal(result.status, 1);
    assert.equal(result.stderr, safeFailure);
    assert.deepEqual(result.requests, []);
    assert.equal(existsSync(result.destination), false);
  }
});

test('public source repositories and draft paths fail before any manuscript fetch', (t) => {
  const publicRepository = responses();
  publicRepository[base] = { private: false };
  const invalidManifest = responses();
  invalidManifest[manifestURL] = encodedFile(manifest([{ ...entry, file: 'drafts/secret.mdx' }]));
  for (const [responseBodies, expectedURLs] of [
    [publicRepository, [referenceURL, base]],
    [invalidManifest, [referenceURL, base, manifestURL]],
  ]) {
    const result = runPreparation(t, { responseBodies });
    assert.equal(result.status, 1);
    assert.equal(result.stderr, safeFailure);
    assert.deepEqual(result.requests.map(({ url }) => url), expectedURLs);
    assert.equal(existsSync(result.destination), false);
  }
});

test('CLI failures never echo arbitrary errors, malformed credentials or manuscript text', (t) => {
  const secret = 'synthetic-credential-sentinel';
  const manuscript = 'synthetic-private-manuscript-sentinel';
  const malformedResponse = responses();
  malformedResponse[referenceURL] = manuscript;
  const malformedManifest = responses();
  malformedManifest[manifestURL] = encodedFile(manuscript);
  for (const scenario of [
    { error: `Authorization: Bearer ${secret}; ${manuscript}` },
    { env: { ...production, BLOG_CONTENT_TOKEN: `${secret}\nmalformed` } },
    { responseBodies: malformedResponse },
    { responseBodies: malformedManifest },
  ]) {
    const result = runPreparation(t, scenario);
    assert.equal(result.status, 1);
    assert.equal(result.stderr, safeFailure);
    assert.equal((result.stdout + result.stderr).includes(secret), false);
    assert.equal((result.stdout + result.stderr).includes(manuscript), false);
    assert.equal(existsSync(result.destination), false);
  }
});

test('direct workspace builds and development always run private-content preparation', () => {
  const { scripts } = JSON.parse(readFileSync(join(webRoot, 'package.json'), 'utf8'));
  assert.equal(scripts.prebuild, 'node ../../scripts/prepare-private-blog.mjs');
  assert.equal(scripts.predev, 'node ../../scripts/prepare-private-blog.mjs');
});
