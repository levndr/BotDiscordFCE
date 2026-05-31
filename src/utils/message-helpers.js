import { EmbedBuilder } from 'discord.js';

export const AVATAR_URL =
  'https://raw.githubusercontent.com/levndr/BotDiscordFCE/main/assets/avatar.png';

/**
 * Construye el embed oscuro estándar para mensajes de personaje.
 * @param {string} texto — contenido del mensaje
 */
export function buildEmbed(texto) {
  return new EmbedBuilder()
    .setDescription(texto)
    .setColor(0x8B0000)
    .setFooter({ text: '◈ FCE · SEÑAL ENCRIPTADA' });
}
