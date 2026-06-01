/**
 * admin.js — Herramienta de administración privada (CLI)
 *
 * Uso (desde Railway Shell o local):
 *   node src/admin.js list
 *   node src/admin.js whois <nombre_personaje>
 *   node src/admin.js userchars <discordUserId>
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR ?? join(__dirname, 'data');

function readJSON(filename) {
  const path = join(dataDir, filename);
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return {};
  }
}

function toCharObj(entry) {
  if (typeof entry === 'string') return { name: entry, phone: '' };
  return entry;
}

const [,, command, ...args] = process.argv;

const data = readJSON('characters.json');

switch (command) {

  // ── list ─────────────────────────────────────────────────────
  case 'list': {
    const rows = [];
    for (const [userId, entry] of Object.entries(data)) {
      const chars = (entry.characters ?? []).map(toCharObj);
      for (const c of chars) {
        rows.push({ userId, name: c.name, phone: c.phone, active: entry.active === c.name });
      }
    }
    if (rows.length === 0) {
      console.log('No hay personajes registrados.');
      break;
    }
    console.log('\n── Personajes registrados ──────────────────────────────────');
    console.log(
      'Discord User ID'.padEnd(22),
      'Personaje'.padEnd(28),
      'Teléfono'.padEnd(16),
      'Activo'
    );
    console.log('─'.repeat(80));
    for (const r of rows) {
      console.log(
        r.userId.padEnd(22),
        r.name.padEnd(28),
        (r.phone || '—').padEnd(16),
        r.active ? '✔' : ''
      );
    }
    console.log(`\nTotal: ${rows.length} personaje(s) en ${Object.keys(data).length} usuario(s).\n`);
    break;
  }

  // ── whois <nombre> ───────────────────────────────────────────
  case 'whois': {
    const query = args.join(' ').toLowerCase();
    if (!query) {
      console.error('Uso: node src/admin.js whois <nombre_personaje>');
      process.exit(1);
    }
    const found = [];
    for (const [userId, entry] of Object.entries(data)) {
      const chars = (entry.characters ?? []).map(toCharObj);
      for (const c of chars) {
        if (c.name.toLowerCase().includes(query)) {
          found.push({ userId, name: c.name, phone: c.phone, active: entry.active === c.name });
        }
      }
    }
    if (found.length === 0) {
      console.log(`No se encontró ningún personaje que coincida con "${args.join(' ')}".`);
      break;
    }
    console.log(`\n── Resultados para "${args.join(' ')}" ─────────────────────`);
    for (const r of found) {
      console.log(`  Personaje : ${r.name}`);
      console.log(`  Teléfono  : ${r.phone || '—'}`);
      console.log(`  Discord ID: ${r.userId}`);
      console.log(`  Activo    : ${r.active ? 'Sí' : 'No'}`);
      console.log('');
    }
    break;
  }

  // ── userchars <userId> ───────────────────────────────────────
  case 'userchars': {
    const userId = args[0];
    if (!userId) {
      console.error('Uso: node src/admin.js userchars <discordUserId>');
      process.exit(1);
    }
    const entry = data[userId];
    if (!entry) {
      console.log(`No se encontró ningún registro para el usuario ${userId}.`);
      break;
    }
    const chars = (entry.characters ?? []).map(toCharObj);
    console.log(`\n── Personajes del usuario ${userId} ───────────────────────`);
    if (chars.length === 0) {
      console.log('  (sin personajes)');
    } else {
      for (const c of chars) {
        const tag = entry.active === c.name ? ' ← activo' : '';
        console.log(`  • ${c.name} [${c.phone || '—'}]${tag}`);
      }
    }
    console.log('');
    break;
  }

  // ── ayuda ────────────────────────────────────────────────────
  default: {
    console.log(`
Uso:
  node src/admin.js list                   Lista todos los personajes con su dueño
  node src/admin.js whois <nombre>         Busca quién registró ese personaje
  node src/admin.js userchars <userId>     Lista los personajes de un usuario de Discord
`);
  }
}
