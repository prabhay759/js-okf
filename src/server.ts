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
  try {
    const scriptDir = path.dirname(realpathSync(process.argv[1] ?? ''))
    candidates.push(path.join(scriptDir, 'vendor', vendorFile))
  } catch { /* ignore */ }
  try {
    const scriptDir = path.dirname(realpathSync(process.argv[1] ?? ''))
    candidates.push(path.join(scriptDir, '..', 'node_modules', pkgFallback.pkg, pkgFallback.file))
  } catch { /* ignore */ }
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
const HLJS_PATH = resolveVendor('hljs.js', { pkg: 'highlight.js', file: 'lib/core.js' })
const HLJS_CSS_PATH = resolveVendor('hljs.css', { pkg: 'highlight.js', file: 'styles/github.min.css' })
const D3_PATH = resolveVendor('d3.js', { pkg: 'd3', file: 'dist/d3.min.js' })

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>js-okf viewer</title>
<script src="/vendor/d3.js"></script>
<script src="/vendor/marked.js"></script>
<link rel="stylesheet" href="/vendor/hljs.css">
<script src="/vendor/hljs.js"></script>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #0f172a; --bg2: #1e293b; --bg3: #334155;
  --border: #334155; --text: #e2e8f0; --text2: #94a3b8; --text3: #64748b;
  --link: #38bdf8; --accent: #f59e0b;
  --header-h: 48px; --map-w: 48%;
  --radius-sm: 6px; --radius-md: 10px;
  --shadow: 0 4px 24px rgba(0,0,0,0.4);
}
html, body { height: 100%; overflow: hidden; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px;
       color: var(--text); background: var(--bg); display: flex; flex-direction: column; }
/* ── Header ── */
header { height: var(--header-h); flex-shrink: 0; display: flex; align-items: center;
         padding: 0 20px; gap: 10px; background: var(--bg2);
         border-bottom: 1px solid var(--border); user-select: none; }
header .logo { font-family: monospace; font-size: 15px; font-weight: 700; color: #e2e8f0; letter-spacing: -0.3px; }
header .sep  { color: var(--text3); }
header .path { font-family: monospace; font-size: 12px; color: var(--text3); flex: 1; overflow: hidden;
               text-overflow: ellipsis; white-space: nowrap; }
header .live { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text3); }
header .dot  { width: 8px; height: 8px; border-radius: 50%; background: var(--text3); transition: background .3s; }
header .dot.on { background: #4ade80; box-shadow: 0 0 8px #4ade80; }
/* ── Layout ── */
.layout { display: flex; flex: 1; overflow: hidden; }
/* ── Map panel ── */
.map-panel { width: var(--map-w); position: relative; overflow: hidden; background: var(--bg); }
#mindmap { width: 100%; height: 100%; display: block; }
/* ── Divider ── */
.divider { width: 1px; background: var(--border); flex-shrink: 0; }
/* ── Content panel ── */
.content-panel { flex: 1; overflow-y: auto; padding: 32px 36px; }
.welcome { display: flex; flex-direction: column; align-items: center; justify-content: center;
           height: 100%; gap: 12px; color: var(--text3); }
.welcome svg { opacity: .3; }
.welcome p { font-size: 14px; }
/* ── Frontmatter card ── */
.fm-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius-md);
           padding: 14px 18px; margin-bottom: 24px; font-family: monospace; font-size: 12px; }
.fm-row { display: flex; gap: 10px; margin: 3px 0; }
.fm-key { color: var(--link); min-width: 88px; font-weight: 600; }
.fm-val { color: var(--text2); }
/* ── Markdown body ── */
.md-body { line-height: 1.7; font-size: 14px; }
.md-body h1,.md-body h2,.md-body h3,.md-body h4 { color: #f1f5f9; margin: 1.6em 0 .5em; font-weight: 600; line-height: 1.3; }
.md-body h1 { font-size: 1.7em; border-bottom: 1px solid var(--border); padding-bottom: .3em; }
.md-body h2 { font-size: 1.35em; border-bottom: 1px solid var(--border); padding-bottom: .3em; }
.md-body h3 { font-size: 1.1em; }
.md-body p { margin: .8em 0; }
.md-body ul,.md-body ol { margin: .8em 0; padding-left: 1.8em; }
.md-body li { margin: .3em 0; }
.md-body code { font-family: 'SFMono-Regular', Consolas, monospace; font-size: .875em;
                background: var(--bg3); padding: .15em .4em; border-radius: 4px; color: #fda4af; }
.md-body pre { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius-md);
               padding: 16px; overflow-x: auto; margin: 1em 0; }
.md-body pre code { background: none; color: inherit; padding: 0; }
.md-body table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: .9em; }
.md-body th,.md-body td { border: 1px solid var(--border); padding: 8px 12px; text-align: left; }
.md-body th { background: var(--bg2); color: #f1f5f9; font-weight: 600; }
.md-body blockquote { border-left: 3px solid var(--link); padding: 0 1em; color: var(--text2); margin: 1em 0; }
.md-body a { color: var(--link); text-decoration: none; }
.md-body a:hover { text-decoration: underline; }
.md-body hr { border: none; border-top: 1px solid var(--border); margin: 1.5em 0; }
/* ── Tooltip ── */
#tooltip { position: fixed; pointer-events: none; display: none; z-index: 999;
           background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius-sm);
           padding: 8px 12px; max-width: 280px; box-shadow: var(--shadow); }
#tooltip .tt-name { font-weight: 600; color: #f1f5f9; font-size: 13px; margin-bottom: 2px; }
#tooltip .tt-id   { font-family: monospace; font-size: 11px; color: var(--text3); margin-bottom: 4px; }
#tooltip .tt-desc { font-size: 12px; color: var(--text2); line-height: 1.4; }
/* ── SVG mind-map styles ── */
.node-label { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              pointer-events: none; }
.link-path { fill: none; }
</style>
</head>
<body>
<header>
  <span class="logo">js-okf</span>
  <span class="sep">·</span>
  <span class="path" id="hdr-path">loading…</span>
  <span class="live"><span class="dot" id="live-dot"></span><span id="live-lbl">connecting…</span></span>
</header>
<div class="layout">
  <div class="map-panel" id="map-panel">
    <svg id="mindmap"></svg>
  </div>
  <div class="divider"></div>
  <div class="content-panel" id="content">
    <div class="welcome">
      <svg width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3"/><circle cx="4" cy="6" r="2"/><circle cx="20" cy="6" r="2"/>
        <circle cx="4" cy="18" r="2"/><circle cx="20" cy="18" r="2"/>
        <line x1="6" y1="6" x2="10" y2="11"/><line x1="18" y1="6" x2="14" y2="11"/>
        <line x1="6" y1="18" x2="10" y2="13"/><line x1="18" y1="18" x2="14" y2="13"/>
      </svg>
      <p>Click any node in the mind map to open it.</p>
    </div>
  </div>
</div>
<div id="tooltip"></div>

<script>
'use strict';
marked.setOptions({ breaks: false });
marked.use({ renderer: { code: function(t) {
  var lang = t.lang || '';
  var text = t.text || '';
  var hl = lang && hljs.getLanguage(lang) ? hljs.highlight(text, { language: lang }).value : hljs.highlightAuto(text).value;
  return '<pre><code class="hljs ' + lang + '">' + hl + '</code></pre>';
}}});

var currentId = null;
var allConcepts = [];
var bundleRootPath = '';
var svgEl, gMain, zoomBeh;

// ── Colour palette ──────────────────────────────────────────
var PALETTE = ['#38bdf8','#a78bfa','#34d399','#fb923c','#f472b6','#facc15','#60a5fa','#4ade80','#f87171','#c084fc'];
var groupColorMap = {};
var colorIdx = 0;

function groupColor(name) {
  if (!groupColorMap[name]) { groupColorMap[name] = PALETTE[colorIdx++ % PALETTE.length]; }
  return groupColorMap[name];
}

// ── Tree builder ────────────────────────────────────────────
function buildTree(concepts, rootLabel) {
  var root = { name: rootLabel, id: '_root', children: [], depth: 0 };
  var groups = {};
  groupColorMap = {};
  colorIdx = 0;

  for (var i = 0; i < concepts.length; i++) {
    var c = concepts[i];
    var parts = c.id.split('/');
    var label = (c.matter && c.matter.title) ? c.matter.title : parts[parts.length - 1];
    if (parts.length === 1) {
      root.children.push({ name: label, id: c.id, concept: c, isLeaf: true });
    } else {
      var grp = parts[0];
      if (!groups[grp]) {
        groups[grp] = { name: grp, id: '_g_' + grp, children: [], isGroup: true };
        root.children.push(groups[grp]);
      }
      groups[grp].children.push({ name: label, id: c.id, concept: c, isLeaf: true });
    }
  }
  return root;
}

// ── Mind-map renderer ───────────────────────────────────────
function initSVG() {
  svgEl = d3.select('#mindmap');
  zoomBeh = d3.zoom().scaleExtent([0.15, 5])
    .on('zoom', function(ev) { gMain.attr('transform', ev.transform); });
  svgEl.call(zoomBeh).on('dblclick.zoom', null);
}

function renderMap(treeData) {
  var panel = document.getElementById('map-panel');
  var W = panel.clientWidth, H = panel.clientHeight;
  svgEl.attr('width', W).attr('height', H).selectAll('*').remove();

  // ── Defs: glow filter + radial gradient for root ──
  var defs = svgEl.append('defs');
  var glow = defs.append('filter').attr('id', 'glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
  glow.append('feGaussianBlur').attr('stdDeviation', '3.5').attr('result', 'blur');
  var feMerge = glow.append('feMerge');
  feMerge.append('feMergeNode').attr('in', 'blur');
  feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

  var rootGrad = defs.append('radialGradient').attr('id', 'rootGrad');
  rootGrad.append('stop').attr('offset', '0%').attr('stop-color', '#7dd3fc');
  rootGrad.append('stop').attr('offset', '100%').attr('stop-color', '#0ea5e9');

  gMain = svgEl.append('g');

  var hier = d3.hierarchy(treeData);
  var leaves = hier.leaves().length || 1;
  // Adaptive radius: more leaves → larger radius
  var baseR = Math.min(W, H) * 0.34;
  var outerR = Math.max(baseR, leaves * 14);
  outerR = Math.min(outerR, Math.min(W, H) * 0.46);

  var layout = d3.tree()
    .size([2 * Math.PI, outerR])
    .separation(function(a, b) { return (a.parent === b.parent ? 1 : 2) / a.depth; });

  layout(hier);

  // Assign group colours now (pre-pass)
  hier.children && hier.children.forEach(function(child) {
    if (child.data.isGroup) groupColor(child.data.name);
    else if (child.data.isLeaf) groupColor('__root__');
  });

  function nodeColor(d) {
    if (d.depth === 0) return 'url(#rootGrad)';
    if (d.depth === 1) return d.data.isGroup ? groupColor(d.data.name) : groupColor('__root__');
    return d.parent ? groupColor(d.parent.data.name) : '#94a3b8';
  }
  function linkColor(d) {
    var t = d.target;
    if (t.depth === 1) return t.data.isGroup ? groupColor(t.data.name) : groupColor('__root__');
    return t.parent ? groupColor(t.parent.data.name) : '#94a3b8';
  }

  // ── Links ──
  gMain.append('g').attr('class', 'links')
    .selectAll('path').data(hier.links()).join('path')
    .attr('class', 'link-path')
    .attr('stroke', function(d) { return linkColor(d); })
    .attr('stroke-opacity', 0.25)
    .attr('stroke-width', function(d) { return d.target.depth === 1 ? 2 : 1.2; })
    .attr('d', d3.linkRadial().angle(function(d) { return d.x; }).radius(function(d) { return d.y; }));

  // ── Nodes ──
  var nodes = gMain.append('g').attr('class', 'nodes')
    .selectAll('g').data(hier.descendants()).join('g')
    .attr('class', 'node-g')
    .attr('transform', function(d) {
      return 'rotate(' + (d.x * 180 / Math.PI - 90) + ') translate(' + d.y + ',0)';
    });

  // Selection ring (hidden initially)
  nodes.append('circle').attr('class', 'sel-ring')
    .attr('r', function(d) { return (d.depth === 0 ? 20 : d.depth === 1 ? 13 : 8) + 4; })
    .attr('fill', 'none')
    .attr('stroke', '#fbbf24').attr('stroke-width', 2.5).attr('stroke-dasharray', '4 3')
    .style('opacity', 0);

  // Main circles
  nodes.append('circle').attr('class', 'node-c')
    .attr('r', function(d) { return d.depth === 0 ? 20 : d.depth === 1 ? 12 : 7; })
    .attr('fill', nodeColor)
    .attr('stroke', function(d) { return d.depth === 0 ? '#7dd3fc' : 'rgba(255,255,255,0.15)'; })
    .attr('stroke-width', function(d) { return d.depth === 0 ? 2 : 1; })
    .attr('filter', function(d) { return d.depth <= 1 ? 'url(#glow)' : null; })
    .style('cursor', function(d) { return d.data.isLeaf ? 'pointer' : 'default'; })
    .on('mouseover', function(ev, d) {
      if (!d.data.isLeaf) return;
      d3.select(this).attr('r', d.depth === 1 ? 14 : 9);
      var name = d.data.name;
      var id = d.data.id;
      var desc = d.data.concept && d.data.concept.matter && d.data.concept.matter.description ? d.data.concept.matter.description : '';
      var h = '<div class="tt-name">' + esc(name) + '</div><div class="tt-id">' + esc(id) + '</div>';
      if (desc) h += '<div class="tt-desc">' + esc(desc) + '</div>';
      var tip = document.getElementById('tooltip');
      tip.innerHTML = h; tip.style.display = 'block';
      tip.style.left = (ev.clientX + 14) + 'px'; tip.style.top = (ev.clientY - 8) + 'px';
    })
    .on('mousemove', function(ev) {
      var tip = document.getElementById('tooltip');
      tip.style.left = (ev.clientX + 14) + 'px'; tip.style.top = (ev.clientY - 8) + 'px';
    })
    .on('mouseout', function(ev, d) {
      d3.select(this).attr('r', d.depth === 0 ? 20 : d.depth === 1 ? 12 : 7);
      document.getElementById('tooltip').style.display = 'none';
    })
    .on('click', function(ev, d) {
      if (d.data.isLeaf && d.data.id) loadConcept(d.data.id);
    });

  // Labels
  nodes.append('text').attr('class', 'node-label')
    .attr('dy', '0.32em')
    .attr('x', function(d) {
      if (d.depth === 0) return 0;
      return (d.x < Math.PI) === !d.children ? 17 : -17;
    })
    .attr('y', function(d) { return d.depth === 0 ? 36 : 0; })
    .attr('text-anchor', function(d) {
      if (d.depth === 0) return 'middle';
      return (d.x < Math.PI) === !d.children ? 'start' : 'end';
    })
    .attr('transform', function(d) { return (d.depth > 0 && d.x >= Math.PI) ? 'rotate(180)' : null; })
    .attr('font-size', function(d) { return d.depth === 0 ? 13 : d.depth === 1 ? 11.5 : 10.5; })
    .attr('font-weight', function(d) { return d.depth <= 1 ? '600' : '400'; })
    .attr('fill', function(d) {
      if (d.depth === 0) return '#e2e8f0';
      return d.depth === 1 ? nodeColor(d) : '#cbd5e1';
    })
    .text(function(d) { return d.data.name; });

  // Entrance animation
  nodes.style('opacity', 0)
    .transition().duration(600)
    .delay(function(d, i) { return i * 18; })
    .style('opacity', 1);

  // Center the view
  svgEl.call(zoomBeh.transform, d3.zoomIdentity.translate(W / 2, H / 2));
}

function updateSelection(id) {
  d3.selectAll('.sel-ring').style('opacity', 0);
  d3.selectAll('.node-g').each(function(d) {
    if (d.data && d.data.id === id) {
      d3.select(this).select('.sel-ring')
        .transition().duration(200).style('opacity', 1);
    }
  });
}

// ── Concept content ─────────────────────────────────────────
async function loadConcept(id) {
  currentId = id;
  window.location.hash = '#' + encodeURIComponent(id);
  updateSelection(id);
  var res = await fetch('/api/concept?id=' + encodeURIComponent(id));
  if (!res.ok) {
    document.getElementById('content').innerHTML = '<div class="welcome"><p>Not found: ' + esc(id) + '</p></div>';
    return;
  }
  var c = await res.json();
  var html = '<div class="fm-card">';
  var matter = c.matter || {};
  Object.keys(matter).forEach(function(k) {
    var v = matter[k];
    if (v === undefined || v === null) return;
    var valStr = Array.isArray(v) ? v.join(', ') : String(v);
    html += '<div class="fm-row"><span class="fm-key">' + esc(k) + '</span><span class="fm-val">' + esc(valStr) + '</span></div>';
  });
  html += '</div>';
  html += '<div class="md-body">' + marked.parse(c.body || '') + '</div>';
  var panel = document.getElementById('content');
  panel.innerHTML = html;
  panel.scrollTop = 0;
}

// ── Data loading ─────────────────────────────────────────────
async function loadAll() {
  var res = await fetch('/api/concepts');
  var data = await res.json();
  bundleRootPath = data._bundleRoot || '';
  allConcepts = data.items || [];
  document.getElementById('hdr-path').textContent = bundleRootPath;
  var label = bundleRootPath.split('/').pop() || bundleRootPath || 'bundle';
  renderMap(buildTree(allConcepts, label));
}

// ── SSE live reload ──────────────────────────────────────────
var es = new EventSource('/api/events');
es.onopen = function() {
  document.getElementById('live-dot').classList.add('on');
  document.getElementById('live-lbl').textContent = 'Live';
};
es.onerror = function() {
  document.getElementById('live-dot').classList.remove('on');
  document.getElementById('live-lbl').textContent = 'Reconnecting…';
};
es.addEventListener('change', function(ev) {
  var d = JSON.parse(ev.data);
  loadAll().then(function() {
    if (d.id === currentId) loadConcept(currentId);
  });
});

// ── Hash routing ─────────────────────────────────────────────
window.addEventListener('hashchange', function() {
  var h = decodeURIComponent(window.location.hash.slice(1));
  if (h && h !== currentId) loadConcept(h);
});

// ── Init ────────────────────────────────────────────────────
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

initSVG();
loadAll().then(function() {
  var h = decodeURIComponent(window.location.hash.slice(1));
  if (h) loadConcept(h);
});

// Redraw on resize
var resizeTimer;
window.addEventListener('resize', function() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function() {
    var label = bundleRootPath.split('/').pop() || 'bundle';
    renderMap(buildTree(allConcepts, label));
    if (currentId) updateSelection(currentId);
  }, 200);
});
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

    if (pathname === '/vendor/d3.js') {
      const content = await readVendor(D3_PATH)
      res.writeHead(200, { 'Content-Type': 'application/javascript' })
      res.end(content)
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
      res.write(':\n\n')
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
