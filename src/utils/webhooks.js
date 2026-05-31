import { WebhookClient } from 'discord.js';
import { getWebhookData, setWebhookData, removeWebhookData } from './storage.js';

/**
 * Obtiene un WebhookClient para el canal dado.
 * Si hay uno guardado y sigue existiendo, lo reutiliza.
 * Si no, crea uno nuevo.
 *
 * @param {import('discord.js').TextChannel} channel
 * @returns {Promise<WebhookClient|null>} null si no tiene permisos.
 */
export async function getOrCreateWebhook(channel) {
  const stored = getWebhookData(channel.id);

  if (stored) {
    try {
      // Verificar que el webhook todavía existe en Discord
      const webhooks = await channel.fetchWebhooks();
      const existing = webhooks.find(wh => wh.id === stored.id);

      if (existing) {
        return new WebhookClient({ id: stored.id, token: stored.token });
      }
    } catch {
      // Sin permisos para fetchWebhooks u otro error
    }
    // El webhook ya no existe o no lo podemos verificar; limpiar y crear uno nuevo
    removeWebhookData(channel.id);
  }

  // Crear nuevo webhook
  try {
    const webhook = await channel.createWebhook({
      name: 'FCE-Comms',
      reason: 'Canal de comunicación encriptada — FCE Roleplay',
    });
    setWebhookData(channel.id, webhook.id, webhook.token);
    return new WebhookClient({ id: webhook.id, token: webhook.token });
  } catch {
    return null;
  }
}
