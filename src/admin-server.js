/**
 * admin-server.js — Servidor HTTP de administración privada
 *
 * Requiere la variable de entorno ADMIN_TOKEN en Railway.
 *
 * Endpoints:
 *   GET /admin?token=XXX                  → lista todos los personajes
 *   GET /admin?token=XXX&whois=nombre     → quién registró ese personaje
 *   GET /admin?token=XXX&userchars=userId → personajes de un usuario
 */

import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR ?? join(__dirname, 'data');

function readJSON(filename) {
  const path = join(dataDir, filename);
  if (!existsSync(path)) return {};
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch { return {}; }
}

function toCharObj(entry) {
  if (typeof entry === 'string') return { name: entry, phone: '' };
  return entry;
}

// ── HTML helpers ──────────────────────────────────────────────

function page(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — FCE Admin</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0f1117; color: #e2e8f0; padding: 2rem; }
    h1 { font-size: 1.4rem; color: #90cdf4; margin-bottom: 1.5rem; }
    h2 { font-size: 1rem; color: #a0aec0; margin: 1.5rem 0 0.75rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th { text-align: left; padding: 0.5rem 0.75rem; background: #1a202c; color: #a0aec0; font-weight: 600; }
    td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #2d3748; }
    tr:hover td { background: #1a202c; }
    .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; }
    .active { background: #276749; color: #9ae6b4; }
    .uid { font-family: monospace; font-size: 0.75rem; color: #4a9270; }
    .discord-name { font-weight: 600; color: #e2e8f0; }
    .empty { color: #718096; font-style: italic; }
    form { margin-bottom: 1.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap; }
    input[type=text] { background: #1a202c; border: 1px solid #2d3748; color: #e2e8f0; padding: 0.4rem 0.75rem; border-radius: 0.375rem; font-size: 0.9rem; width: 260px; }
    button { background: #2b6cb0; color: white; border: none; padding: 0.4rem 1rem; border-radius: 0.375rem; cursor: pointer; font-size: 0.9rem; }
    button:hover { background: #2c5282; }
    .nav { margin-bottom: 1rem; font-size: 0.85rem; color: #718096; }
    .nav a { color: #63b3ed; text-decoration: none; }
    .nav a:hover { text-decoration: underline; }
    .total { margin-top: 1rem; font-size: 0.82rem; color: #718096; }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

// ── Lógica de consultas ───────────────────────────────────────

async function renderList(token, client) {
  const data = readJSON('characters.json');
  const rows = [];
  for (const [userId, entry] of Object.entries(data)) {
    const discordName = await getDiscordName(client, userId);
    for (const c of (entry.characters ?? []).map(toCharObj)) {
      rows.push({ userId, discordName, name: c.name, phone: c.phone || '—', active: entry.active === c.name });
    }
  }

  const tableRows = rows.length === 0
    ? `<tr><td colspan="4" class="empty">No hay personajes registrados.</td></tr>`
    : rows.map(r => `
      <tr>
        <td><span class="discord-name">${r.discordName}</span><br><span class="uid">${r.userId}</span></td>
        <td>${r.name}${r.active ? ' <span class="badge active">activo</span>' : ''}</td>
        <td>${r.phone}</td>
      </tr>`).join('');

  return page('Lista completa', `
    <h1>🔐 FCE Admin — Personajes</h1>
    <div class="nav">
      <a href="?token=${token}">Lista completa</a> ·
      Buscar por personaje: <form style="display:inline-flex" method="get">
        <input type="hidden" name="token" value="${token}">
        <input type="text" name="whois" placeholder="nombre del personaje">
        <button>Buscar</button>
      </form>
    </div>
    <table>
      <thead><tr><th>Usuario de Discord</th><th>Personaje</th><th>Teléfono</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    <p class="total">${rows.length} personaje(s) · ${Object.keys(data).length} usuario(s)</p>
  `);
}

async function renderWhois(token, query, client) {
  const data = readJSON('characters.json');
  const q = query.toLowerCase();
  const found = [];

  for (const [userId, entry] of Object.entries(data)) {
    for (const c of (entry.characters ?? []).map(toCharObj)) {
      if (c.name.toLowerCase().includes(q)) {
        const discordName = await getDiscordName(client, userId);
        found.push({ userId, discordName, name: c.name, phone: c.phone || '—', active: entry.active === c.name });
      }
    }
  }

  const tableRows = found.length === 0
    ? `<tr><td colspan="3" class="empty">Sin resultados para "${query}".</td></tr>`
    : found.map(r => `
      <tr>
        <td>${r.name}${r.active ? ' <span class="badge active">activo</span>' : ''}</td>
        <td>${r.phone}</td>
        <td><span class="discord-name">${r.discordName}</span><br><span class="uid">${r.userId}</span></td>
      </tr>`).join('');

  return page(`Whois: ${query}`, `
    <h1>🔍 Whois: "${query}"</h1>
    <div class="nav"><a href="?token=${token}">← Lista completa</a></div>
    <table>
      <thead><tr><th>Personaje</th><th>Teléfono</th><th>Usuario de Discord</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  `);
}

async function renderUserchars(token, userId, client) {
  const data = readJSON('characters.json');
  const entry = data[userId];

  if (!entry) {
    return page('Usuario no encontrado', `
      <h1>Usuario no encontrado</h1>
      <p class="empty">No hay registros para el ID <code>${userId}</code>.</p>
      <div class="nav" style="margin-top:1rem"><a href="?token=${token}">← Lista completa</a></div>
    `);
  }

  const discordName = await getDiscordName(client, userId);
  const chars = (entry.characters ?? []).map(toCharObj);
  const tableRows = chars.length === 0
    ? `<tr><td colspan="2" class="empty">Sin personajes.</td></tr>`
    : chars.map(c => `
      <tr>
        <td>${c.name}${entry.active === c.name ? ' <span class="badge active">activo</span>' : ''}</td>
        <td>${c.phone || '—'}</td>
      </tr>`).join('');

  return page(`Personajes de ${discordName}`, `
    <h1>👤 ${discordName} <span class="uid">(${userId})</span></h1>
    <div class="nav"><a href="?token=${token}">← Lista completa</a></div>
    <table>
      <thead><tr><th>Personaje</th><th>Teléfono</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  `);
}

// ── Servidor ──────────────────────────────────────────────────

/** Obtiene el nombre de usuario de Discord dado un userId. Devuelve el ID si falla. */
async function getDiscordName(client, userId) {
  try {
    const user = await client.users.fetch(userId);
    return user.displayName ?? user.username;
  } catch {
    return userId;
  }
}

export function startAdminServer(client) {
  const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
  const PORT = process.env.PORT ?? 3000;

  if (!ADMIN_TOKEN) {
    console.warn('[ADMIN] ADMIN_TOKEN no configurado. Servidor de admin deshabilitado.');
    return;
  }

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost`);

    if (url.pathname !== '/admin') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    const token = url.searchParams.get('token');
    if (token !== ADMIN_TOKEN) {
      res.writeHead(401, { 'Content-Type': 'text/plain' });
      res.end('Unauthorized');
      return;
    }

    let html;
    const whois = url.searchParams.get('whois');
    const userchars = url.searchParams.get('userchars');

    if (whois) {
      html = await renderWhois(ADMIN_TOKEN, whois, client);
    } else if (userchars) {
      html = await renderUserchars(ADMIN_TOKEN, userchars, client);
    } else {
      html = await renderList(ADMIN_TOKEN, client);
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });

  server.listen(PORT, () => {
    console.log(`[ADMIN] Servidor HTTP escuchando en puerto ${PORT}`);
  });
}
