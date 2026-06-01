import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Si existe DATA_DIR (volumen persistente en Railway), usarlo.
// Si no, usar la carpeta local src/data/ (desarrollo local).
const dataDir = process.env.DATA_DIR ?? join(__dirname, '..', 'data');

function readJSON(filename) {
  const path = join(dataDir, filename);
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return {};
  }
}

function writeJSON(filename, data) {
  const path = join(dataDir, filename);
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
}

// ── Personajes ────────────────────────────────────────────────

/**
 * Normaliza una entrada de personaje a objeto { name, phone }.
 * Soporta entradas legacy donde el personaje era solo un string.
 */
function toCharObj(entry) {
  if (typeof entry === 'string') return { name: entry, phone: '' };
  return entry;
}

/**
 * Devuelve { characters: { name, phone }[], active: string|null } para un usuario.
 */
export function getCharacters(userId) {
  const data = readJSON('characters.json');
  const entry = data[userId] ?? { characters: [], active: null };
  return {
    characters: (entry.characters ?? []).map(toCharObj),
    active: entry.active ?? null,
  };
}

/**
 * Agrega un personaje al usuario.
 * @returns {boolean} false si el personaje ya existe.
 */
export function addCharacter(userId, name, phone = '') {
  const data = readJSON('characters.json');
  if (!data[userId]) data[userId] = { characters: [], active: null };

  const normalized = name.trim();
  const normalizedPhone = phone.trim();

  const exists = (data[userId].characters ?? []).some(
    c => toCharObj(c).name.toLowerCase() === normalized.toLowerCase()
  );
  if (exists) return false;

  data[userId].characters.push({ name: normalized, phone: normalizedPhone });
  if (!data[userId].active) data[userId].active = normalized;
  writeJSON('characters.json', data);
  return true;
}

/**
 * Elimina un personaje del usuario.
 * @returns {{ name: string, phone: string }|null} null si no existía.
 */
export function removeCharacter(userId, name) {
  const data = readJSON('characters.json');
  if (!data[userId]) return null;

  const idx = (data[userId].characters ?? []).findIndex(
    c => toCharObj(c).name.toLowerCase() === name.toLowerCase()
  );
  if (idx === -1) return null;

  const removed = toCharObj(data[userId].characters[idx]);
  data[userId].characters.splice(idx, 1);

  if (data[userId].active?.toLowerCase() === removed.name.toLowerCase()) {
    const next = data[userId].characters[0];
    data[userId].active = next ? toCharObj(next).name : null;
  }

  writeJSON('characters.json', data);
  return removed;
}

/**
 * Establece el personaje activo de un usuario.
 * @returns {boolean} false si el personaje no existe.
 */
export function setActive(userId, name) {
  const data = readJSON('characters.json');
  if (!data[userId]) return false;

  const match = (data[userId].characters ?? []).find(
    c => toCharObj(c).name.toLowerCase() === name.toLowerCase()
  );
  if (!match) return false;

  data[userId].active = toCharObj(match).name;
  writeJSON('characters.json', data);
  return true;
}

// ── Webhooks ──────────────────────────────────────────────────

/** Devuelve { id, token } del webhook almacenado para el canal, o null. */
export function getWebhookData(channelId) {
  const data = readJSON('webhooks.json');
  return data[channelId] ?? null;
}

/** Guarda { id, token } del webhook para el canal. */
export function setWebhookData(channelId, id, token) {
  const data = readJSON('webhooks.json');
  data[channelId] = { id, token };
  writeJSON('webhooks.json', data);
}

/** Elimina el webhook almacenado para el canal. */
export function removeWebhookData(channelId) {
  const data = readJSON('webhooks.json');
  delete data[channelId];
  writeJSON('webhooks.json', data);
}
