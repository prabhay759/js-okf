import http from 'node:http'
import path from 'node:path'
import { readdir, readFile } from 'node:fs/promises'
import { existsSync, realpathSync } from 'node:fs'
import { URL } from 'node:url'
import { watch } from 'chokidar'
import { readConcept } from './concept.js'
import { normalizeId } from './utils.js'
import type { ServeOptions, OKFConcept } from './types.js'

function resolveVendor(vendorFile: string, pkgFallback: { pkg: string; file: string }): string {
  const candidates: string[] = []
  // 1. Pre-bundled vendor in dist/vendor/ (always present in the npm package)
  try {
    const scriptDir = path.dirname(realpathSync(process.argv[1] ?? ''))
    candidates.push(path.join(scriptDir, 'vendor', vendorFile))
  } catch { /* ignore */ }
  // 2. node_modules relative to the script (npx / local install)
  try {
    const scriptDir = path.dirname(realpathSync(process.argv[1] ?? ''))
    candidates.push(path.join(scriptDir, '..', 'node_modules', pkgFallback.pkg, pkgFallback.file))
  } catch { /* ignore */ }
  // 3. node_modules in cwd
  candidates.push(path.join(process.cwd(), 'node_modules', pkgFallback.pkg, pkgFallback.file))
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  return ''
}

async function readVendor(filePath: string): Promise<string> {
  if (!filePath || !existsSync(filePath)) return ''
  return readFile(filePath, 'utf8')
}

const MARKED_PATH = resolveVendor('marked.js', { pkg: 'marked', file: 'lib/marked.umd.js' })
const HLJS_PATH = resolveVendor('hljs.js', { pkg: 'highlight.js', file: 'lib/common.js' })
const HLJS_CSS_PATH = resolveVendor('hljs.css', { pkg: 'highlight.js', file: 'styles/github.min.css' })

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>js-okf viewer</title>
<script src="/vendor/marked.js"></script>
<link rel="stylesheet" href="/vendor/hljs.css">
<script src="/vendor/hljs.js"></script>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #ffffff; --bg2: #f6f8fa; --border: #d0d7de; --text: #1f2328;
    --text2: #57606a; --link: #0969da; --link-hover: #0550ae;
    --active-bg: #ddf4ff; --active-text: #0550ae;
    --header-bg: #24292f; --header-text: #f0f6fc;
    --live: #2da44e; --sidebar-w: 260px;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0d1117; --bg2: #161b22; --border: #30363d; --text: #e6edf3;
      --text2: #8b949e; --link: #58a6ff; --link-hover: #79c0ff;
      --active-bg: #1c2a3a; --active-text: #58a6ff;
      --header-bg: #161b22; --header-text: #e6edf3;
      --live: #3fb950;
    }
  }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: var(--text); background: var(--bg); height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
  header { background: var(--header-bg); color: var(--header-text); padding: 0 16px; height: 48px; display: flex; align-items: center; gap: 12px; flex-shrink: 0; border-bottom: 1px solid var(--border); }
  header h1 { font-size: 14px; font-weight: 600; font-family: monospace; }
  header .sep { color: #8b949e; }
  header .bundle-path { font-family: monospace; font-size: 13px; color: #8b949e; }
  header .live { margin-left: auto; display: flex; align-items: center; gap: 6px; font-size: 12px; color: #8b949e; }
  header .live .dot { width: 8px; height: 8px; border-radius: 50%; background: #8b949e; transition: background 0.3s; }
  header .live .dot.connected { background: var(--live); }
  .layout { display: flex; flex: 1; overflow: hidden; }
  nav { width: var(--sidebar-w); background: var(--bg2); border-right: 1px solid var(--border); overflow-y: auto; padding: 8px 0; flex-shrink: 0; }
  nav .group-label { padding: 8px 12px 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text2); }
  nav .concept-link { display: block; padding: 5px 12px 5px 24px; color: var(--text); text-decoration: none; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; border-left: 2px solid transparent; }
  nav .concept-link:hover { background: var(--active-bg); color: var(--active-text); }
  nav .concept-link.active { background: var(--active-bg); color: var(--active-text); border-left-color: var(--link); font-weight: 500; }
  nav .root-link { padding-left: 12px; }
  main { flex: 1; overflow-y: auto; padding: 32px 40px; max-width: 900px; }
  main .empty { color: var(--text2); font-style: italic; margin-top: 48px; text-align: center; }
  .md-body { line-height: 1.6; }
  .md-body h1, .md-body h2, .md-body h3, .md-body h4 { margin: 1.5em 0 0.5em; font-weight: 600; line-height: 1.3; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
  .md-body h1 { font-size: 1.8em; }
  .md-body h2 { font-size: 1.4em; }
  .md-body h3 { font-size: 1.2em; border-bottom: none; }
  .md-body h4 { font-size: 1em; border-bottom: none; }
  .md-body p { margin: 0.8em 0; }
  .md-body ul, .md-body ol { margin: 0.8em 0; padding-left: 2em; }
  .md-body li { margin: 0.3em 0; }
  .md-body code { font-family: 'SFMono-Regular', Consolas, monospace; font-size: 0.875em; background: var(--bg2); padding: 0.15em 0.4em; border-radius: 4px; border: 1px solid var(--border); }
  .md-body pre { background: var(--bg2); border: 1px solid var(--border); border-radius: 6px; padding: 16px; overflow-x: auto; margin: 1em 0; }
  .md-body pre code { background: none; border: none; padding: 0; font-size: 0.875em; }
  .md-body table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  .md-body th, .md-body td { border: 1px solid var(--border); padding: 8px 12px; text-align: left; }
  .md-body th { background: var(--bg2); font-weight: 600; }
  .md-body blockquote { border-left: 4px solid var(--border); padding: 0 1em; color: var(--text2); margin: 1em 0; }
  .md-body a { color: var(--link); text-decoration: none; }
  .md-body a:hover { color: var(--link-hover); text-decoration: underline; }
  .md-body hr { border: none; border-top: 1px solid var(--border); margin: 1.5em 0; }
  .frontmatter { background: var(--bg2); border: 1px solid var(--border); border-radius: 6px; padding: 12px 16px; margin-bottom: 24px; font-family: monospace; font-size: 12px; color: var(--text2); }
  .frontmatter .fm-row { display: flex; gap: 8px; margin: 2px 0; }
  .frontmatter .fm-key { color: var(--text); font-weight: 600; min-width: 80px; }
</style>
</head>
<body>
<header>
  <h1>js-okf viewer</h1>
  <span class="sep">·</span>
  <span class="bundle-path" id="bundle-path"></span>
  <span class="live"><span class="dot" id="live-dot"></span><span id="live-label">connecting…</span></span>
</header>
<div class="layout">
  <nav id="sidebar"></nav>
  <main id="content"><p class="empty">Select a concept from the sidebar.</p></main>
</div>
<script>
const BUNDLE = document.getElementById('bundle-path');
const SIDEBAR = document.getElementById('sidebar');
const CONTENT = document.getElementById('content');
const DOT = document.getElementById('live-dot');
const LABEL = document.getElementById('live-label');

marked.setOptions({ breaks: false });
marked.use({ renderer: { code({ text, lang }) {
  const hl = lang && hljs.getLanguage(lang) ? hljs.highlight(text, { language: lang }).value : hljs.highlightAuto(text).value;
  return '<pre><code class="hljs ' + (lang || '') + '">' + hl + '</code></pre>';
}}});

let currentId = null;

async function loadConcepts() {
  const res = await fetch('/api/concepts');
  const concepts = await res.json();
  BUNDLE.textContent = concepts._bundleRoot || '';
  renderSidebar(concepts.items || []);
}

function renderSidebar(items) {
  const groups = {};
  for (const c of items) {
    const parts = c.id.split('/');
    const group = parts.length > 1 ? parts[0] : '';
    if (!groups[group]) groups[group] = [];
    groups[group].push(c);
  }
  let html = '';
  const sorted = Object.keys(groups).sort((a, b) => a.localeCompare(b));
  for (const g of sorted) {
    if (g) html += '<div class="group-label">' + escHtml(g) + '</div>';
    for (const c of groups[g]) {
      const label = c.matter && c.matter.title ? c.matter.title : (c.id.split('/').pop() || c.id);
      const active = c.id === currentId ? ' active' : '';
      html += '<a class="concept-link' + (g ? '' : ' root-link') + active + '" data-id="' + escAttr(c.id) + '" title="' + escAttr(c.id) + '">' + escHtml(label) + '</a>';
    }
  }
  SIDEBAR.innerHTML = html;
  SIDEBAR.querySelectorAll('[data-id]').forEach(el => {
    el.addEventListener('click', () => loadConcept(el.getAttribute('data-id')));
  });
}

async function loadConcept(id) {
  currentId = id;
  window.location.hash = '#' + id;
  SIDEBAR.querySelectorAll('[data-id]').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-id') === id);
  });
  const res = await fetch('/api/concept?id=' + encodeURIComponent(id));
  if (!res.ok) { CONTENT.innerHTML = '<p class="empty">Concept not found: ' + escHtml(id) + '</p>'; return; }
  const concept = await res.json();
  let html = '<div class="frontmatter">';
  for (const [k, v] of Object.entries(concept.matter)) {
    if (v === undefined || v === null) continue;
    html += '<div class="fm-row"><span class="fm-key">' + escHtml(k) + ':</span><span>' + escHtml(Array.isArray(v) ? v.join(', ') : String(v)) + '</span></div>';
  }
  html += '</div>';
  html += '<div class="md-body">' + marked.parse(concept.body || '') + '</div>';
  CONTENT.innerHTML = html;
  CONTENT.scrollTop = 0;
}

function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function escAttr(s) { return String(s).replace(/"/g,'&quot;'); }

const es = new EventSource('/api/events');
es.onopen = () => { DOT.classList.add('connected'); LABEL.textContent = 'Live'; };
es.onerror = () => { DOT.classList.remove('connected'); LABEL.textContent = 'Disconnected'; };
es.addEventListener('change', async (e) => {
  const data = JSON.parse(e.data);
  await loadConcepts();
  if (data.id === currentId) await loadConcept(currentId);
});

async function init() {
  await loadConcepts();
  const hash = window.location.hash.slice(1);
  if (hash) await loadConcept(decodeURIComponent(hash));
}

window.addEventListener('hashchange', () => {
  const hash = window.location.hash.slice(1);
  if (hash && hash !== currentId) loadConcept(decodeURIComponent(hash));
});

init();
</script>
</body>
</html>`

export function createServer(
  bundleRoot: string,
  options?: ServeOptions,
): { start(): Promise<void>; stop(): Promise<void> } {
  const port = options?.port ?? 3000
  const host = options?.host ?? 'localhost'
  const openBrowser = options?.open ?? false
  const absRoot = path.resolve(bundleRoot)

  const sseClients: Set<http.ServerResponse> = new Set()

  function broadcast(eventName: string, data: unknown): void {
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`
    for (const client of sseClients) {
      client.write(payload)
    }
  }

  async function listAllConcepts(): Promise<Array<{ id: string; matter: Record<string, unknown> }>> {
    if (!existsSync(absRoot)) return []
    const results: Array<{ id: string; matter: Record<string, unknown> }> = []
    async function walk(dir: string): Promise<void> {
      let entries
      try {
        entries = await readdir(dir, { withFileTypes: true })
      } catch {
        return
      }
      for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          await walk(full)
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          const rel = path.relative(absRoot, full)
          const id = normalizeId(rel)
          try {
            const concept = await readConcept(full, id)
            if (concept) results.push({ id: concept.id, matter: concept.matter as Record<string, unknown> })
          } catch {
            // skip unparseable files
          }
        }
      }
    }
    await walk(absRoot)
    results.sort((a, b) => a.id.localeCompare(b.id))
    return results
  }

  const server = http.createServer(async (req, res) => {
    const reqUrl = new URL(req.url ?? '/', `http://${host}`)
    const pathname = reqUrl.pathname

    if (req.method !== 'GET') {
      res.writeHead(405).end()
      return
    }

    if (pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(HTML)
      return
    }

    if (pathname === '/vendor/marked.js') {
      const content = await readVendor(MARKED_PATH)
      res.writeHead(200, { 'Content-Type': 'application/javascript' })
      res.end(content)
      return
    }

    if (pathname === '/vendor/hljs.js') {
      const content = await readVendor(HLJS_PATH)
      res.writeHead(200, { 'Content-Type': 'application/javascript' })
      res.end(content)
      return
    }

    if (pathname === '/vendor/hljs.css') {
      const content = await readVendor(HLJS_CSS_PATH)
      res.writeHead(200, { 'Content-Type': 'text/css' })
      res.end(content)
      return
    }

    if (pathname === '/api/concepts') {
      const items = await listAllConcepts()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ _bundleRoot: absRoot, items }))
      return
    }

    if (pathname === '/api/concept') {
      const rawId = reqUrl.searchParams.get('id') ?? ''
      const id = normalizeId(rawId)
      const filePath = path.join(absRoot, id + '.md')
      let concept: OKFConcept | null = null
      try {
        concept = await readConcept(filePath, id)
      } catch {
        // fall through to 404
      }
      if (!concept) {
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'not found', id }))
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(concept))
      return
    }

    if (pathname === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      })
      res.write(':\n\n') // initial comment to flush
      sseClients.add(res)
      req.on('close', () => sseClients.delete(res))
      return
    }

    res.writeHead(404).end()
  })

  const watcher = watch(path.join(absRoot, '**/*.md'), {
    ignoreInitial: true,
    persistent: false,
  })

  watcher.on('all', (_event, filePath) => {
    const rel = path.relative(absRoot, filePath)
    const id = normalizeId(rel)
    broadcast('change', { id })
  })

  return {
    start(): Promise<void> {
      return new Promise((resolve, reject) => {
        server.once('error', reject)
        server.listen(port, host, () => {
          server.off('error', reject)
          const url = `http://${host}:${port}`
          console.log(`OKF Viewer running at ${url}`)
          console.log(`Watching: ${absRoot}`)
          console.log('Press Ctrl+C to stop.')
          if (openBrowser) {
            import('node:child_process').then(({ exec }) => exec(`open "${url}" 2>/dev/null || xdg-open "${url}" 2>/dev/null || start "${url}"`))
          }
          resolve()
        })
      })
    },

    stop(): Promise<void> {
      return new Promise((resolve, reject) => {
        watcher.close().then(() => {
          for (const client of sseClients) client.end()
          sseClients.clear()
          server.close((err) => (err ? reject(err) : resolve()))
        }).catch(reject)
      })
    },
  }
}
