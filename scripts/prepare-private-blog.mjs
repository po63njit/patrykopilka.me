import { mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destination = resolve(root, 'apps/web/src/content/blog/private');
const maximumBytes = 2 * 1024 * 1024;

export function parseManifest(text) {
  const manifest = JSON.parse(text);
  if (manifest.version !== 1 || !Array.isArray(manifest.articles) || manifest.articles.length > 100)
    throw new Error('Invalid published article manifest.');
  const slugs = new Set();
  for (const entry of manifest.articles) {
    if (!entry || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug) ||
        !/^published\/[a-z0-9]+(?:-[a-z0-9]+)*\.mdx?$/.test(entry.file) ||
        slugs.has(entry.slug) || entry.slug === 'hello-world')
      throw new Error('Invalid or duplicate published article entry.');
    slugs.add(entry.slug);
  }
  return manifest.articles;
}

export function validateArticle(text, slug) {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)?.[1];
  if (!frontmatter || !/^draft: false\s*$/m.test(frontmatter) ||
      (frontmatter.match(/^draft:/gm) || []).length !== 1 ||
      !new RegExp(`^slug: ${slug}\\s*$`, 'm').test(frontmatter) ||
      (frontmatter.match(/^slug:/gm) || []).length !== 1)
    throw new Error('Published articles require an explicit matching slug and draft: false.');
  if (Buffer.byteLength(text) > maximumBytes) throw new Error('Article exceeds the size limit.');
  return text;
}

export function chooseContentSource(env) {
  if (env.CF_PAGES === '1') {
    if (env.CF_PAGES_BRANCH !== 'main') return { kind: 'none' };
    if (!env.BLOG_CONTENT_REPOSITORY || !env.BLOG_CONTENT_TOKEN)
      throw new Error('Production requires the private content repository and read-only secret.');
    if (!/^[a-zA-Z0-9-]+\/[a-zA-Z0-9._-]+$/.test(env.BLOG_CONTENT_REPOSITORY))
      throw new Error('Invalid private content repository.');
    return { kind: 'github', repository: env.BLOG_CONTENT_REPOSITORY, token: env.BLOG_CONTENT_TOKEN };
  }
  if (env.CI) return { kind: 'none' };
  return env.BLOG_CONTENT_DIR ? { kind: 'local', directory: env.BLOG_CONTENT_DIR } : { kind: 'none' };
}

async function localReader(directory) {
  const base = await realpath(resolve(directory));
  return async (file) => {
    const path = await realpath(resolve(base, file));
    if (!path.startsWith(base + sep)) throw new Error('Content path escapes its repository.');
    const body = await readFile(path, 'utf8');
    if (Buffer.byteLength(body) > maximumBytes) throw new Error('Content file exceeds the size limit.');
    return body;
  };
}

async function githubReader(source) {
  const base = `https://api.github.com/repos/${source.repository}`;
  const headers = { Authorization: `Bearer ${source.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  async function request(path) {
    const response = await fetch(base + path, { headers, redirect: 'error', signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Private content fetch failed (HTTP ${response.status}).`);
    const body = await response.text();
    if (Buffer.byteLength(body) > maximumBytes * 2) throw new Error('Private content response exceeds the size limit.');
    return JSON.parse(body);
  }
  // Pin every file in one build to the same immutable commit.
  const reference = await request('/git/ref/heads/main');
  const commit = reference.object;
  if (commit?.type !== 'commit' || !/^[a-f0-9]{40}$/.test(commit.sha)) throw new Error('Private content commit is invalid.');
  const repository = await request('');
  if (repository.private !== true) throw new Error('The article source repository must remain private.');
  return async (file) => {
    const data = await request(`/contents/${file}?ref=${commit.sha}`);
    if (data.type !== 'file' || data.encoding !== 'base64' || typeof data.content !== 'string' || data.size > maximumBytes)
      throw new Error('Invalid private content file response.');
    return Buffer.from(data.content, 'base64').toString('utf8');
  };
}

export async function preparePrivateBlog(env = process.env) {
  // Clear the old set first: a skipped or failed fetch cannot reuse stale articles.
  await rm(destination, { recursive: true, force: true });
  const source = chooseContentSource(env);
  if (source.kind === 'none') {
    console.log('Building the public theme without private articles.');
    return;
  }
  const read = source.kind === 'local' ? await localReader(source.directory) : await githubReader(source);
  const entries = parseManifest(await read('published.json'));
  const articles = [];
  for (const entry of entries) articles.push({ ...entry, text: validateArticle(await read(entry.file), entry.slug) });
  await mkdir(destination, { recursive: true });
  for (const entry of articles) await writeFile(resolve(destination, `${entry.slug}.${entry.file.endsWith('.mdx') ? 'mdx' : 'md'}`), entry.text);
  console.log(`Prepared ${articles.length} explicitly published article(s). Drafts were not fetched.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await preparePrivateBlog(); }
  // Never echo arbitrary network, header, parser or file errors: they can contain secrets or manuscript text.
  catch { console.error('Private content preparation failed. Check the production-only configuration, repository visibility and published manifest.'); process.exitCode = 1; }
}
