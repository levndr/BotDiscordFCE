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

/** Devuelve { characters: string[], active: string|null } para un usuario. */
export function getCharacters(userId) {
  const data = readJSON('characters.json');
  return data[userId] ?? { characters: [], active: null };
}

/**
 * Agrega un personaje al usuario.
 * @returns {boolean} false si el personaje ya existe.
 */
export function addCharacter(userId, name) {
  const data = readJSON('characters.json');
  if (!data[userId]) data[userId] = { characters: [], active: null };

  const normalized = name.trim();
  if (data[userId].characters.some(c => c.toLowerCase() === normalized.toLowerCase())) {
    return false;
  }

  data[userId].characters.push(normalized);
  if (!data[userId].active) data[userId].active = normalized;
  writeJSON('characters.json', data);
  return true;
}

/**
 * Elimina un personaje del usuario.
 * @returns {boolean} false si no existía.
 */
export function removeCharacter(userId, name) {
  const data = readJSON('characters.json');
  if (!data[userId]) return false;

  const idx = data[userId].characters.findIndex(
    c => c.toLowerCase() === name.toLowerCase()
  );
  if (idx === -1) return false;

  const removed = data[userId].characters[idx];
  data[userId].characters.splice(idx, 1);

  if (data[userId].active?.toLowerCase() === removed.toLowerCase()) {
    data[userId].active = data[userId].characters[0] ?? null;
  }

  writeJSON('characters.json', data);
  return true;
}

/**
 * Establece el personaje activo de un usuario.
 * @returns {boolean} false si el personaje no existe.
 */
export function setActive(userId, name) {
  const data = readJSON('characters.json');
  if (!data[userId]) return false;

  const match = data[userId].characters.find(
    c => c.toLowerCase() === name.toLowerCase()
  );
  if (!match) return false;

  data[userId].active = match;
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
