import { SlashCommandBuilder } from 'discord.js';
import { getCharacters } from '../utils/storage.js';
import { getOrCreateWebhook } from '../utils/webhooks.js';

export const data = new SlashCommandBuilder()
  .setName('hablar')
  .setDescription('Enviá un mensaje como tu personaje.')
  .addStringOption(option =>
    option
      .setName('mensaje')
      .setDescription('El mensaje a enviar')
      .setRequired(true)
      .setMaxLength(2000)
  )
  .addStringOption(option =>
    option
      .setName('personaje')
      .setDescription('Personaje a usar (deja vacío para usar el activo)')
      .setRequired(false)
      .setAutocomplete(true)
  );

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const userId = interaction.user.id;
  const mensaje = interaction.options.getString('mensaje', true);
  const nombreOpc = interaction.options.getString('personaje');

  const { characters, active } = getCharacters(userId);

  if (characters.length === 0) {
    return interaction.editReply(
      '```\n[ERROR] No tenés personajes registrados. Usá /addchar primero.\n```'
    );
  }

  // Resolver qué personaje usar
  let personaje;
  if (nombreOpc) {
    personaje = characters.find(c => c.toLowerCase() === nombreOpc.toLowerCase());
    if (!personaje) {
      return interaction.editReply(
        `\`\`\`\n[ERROR] No tenés un personaje llamado "${nombreOpc}".\n\`\`\``
      );
    }
  } else {
    personaje = active;
    if (!personaje) {
      return interaction.editReply(
        '```\n[ERROR] No hay personaje activo. Usá /setchar para elegir uno.\n```'
      );
    }
  }

  // Obtener o crear el webhook del canal
  const channel = interaction.channel;
  if (!channel || !channel.isTextBased()) {
    return interaction.editReply('```\n[ERROR] Este comando solo funciona en canales de texto.\n```');
  }

  const webhook = await getOrCreateWebhook(channel);
  if (!webhook) {
    return interaction.editReply(
      '```\n[ERROR] No tengo permisos para gestionar webhooks en este canal.\nNecesito el permiso "Gestionar Webhooks".\n```'
    );
  }

  // Avatar auto-generado único por nombre de personaje (DiceBear)
  const avatarURL = `https://api.dicebear.com/9.x/pixel-art/png?seed=${encodeURIComponent(personaje)}&size=128`;

  // Enviar el mensaje como el personaje
  try {
    await webhook.send({
      content: mensaje,
      username: personaje,
      avatarURL,
      allowedMentions: { parse: [] }, // evitar menciones accidentales
    });

    await interaction.editReply('```\n✓\n```');
  } catch (err) {
    console.error('[hablar] Error al enviar webhook:', err);
    await interaction.editReply('```\n[ERROR] No se pudo enviar el mensaje.\n```');
  }
}

export async function autocomplete(interaction) {
  const focused = interaction.options.getFocused().toLowerCase();
  const { characters } = getCharacters(interaction.user.id);

  const choices = characters
    .filter(c => c.toLowerCase().includes(focused))
    .slice(0, 25)
    .map(c => ({ name: c, value: c }));

  await interaction.respond(choices);
}
