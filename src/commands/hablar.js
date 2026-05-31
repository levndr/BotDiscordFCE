import { SlashCommandBuilder } from 'discord.js';
import { getCharacters } from '../utils/storage.js';
import { getOrCreateWebhook } from '../utils/webhooks.js';
import { AVATAR_URL, buildEmbed } from '../utils/message-helpers.js';

export const data = new SlashCommandBuilder()
  .setName('hablar')
  .setDescription('Enviá un mensaje como un personaje específico (no el activo).')
  .addStringOption(option =>
    option
      .setName('personaje')
      .setDescription('El personaje a usar')
      .setRequired(true)
      .setAutocomplete(true)
  )
  .addStringOption(option =>
    option
      .setName('mensaje')
      .setDescription('El mensaje a enviar')
      .setRequired(true)
      .setMaxLength(2000)
  );

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const userId   = interaction.user.id;
  const nombreOpc = interaction.options.getString('personaje', true);
  const mensaje  = interaction.options.getString('mensaje', true);

  const { characters } = getCharacters(userId);

  if (characters.length === 0) {
    return interaction.editReply(
      '```\n[ERROR] No tenés personajes registrados. Usá /addchar primero.\n```'
    );
  }

  const personaje = characters.find(
    c => c.toLowerCase() === nombreOpc.toLowerCase()
  );
  if (!personaje) {
    return interaction.editReply(
      `\`\`\`\n[ERROR] No tenés un personaje llamado "${nombreOpc}".\n\`\`\``
    );
  }

  const channel = interaction.channel;
  if (!channel?.isTextBased()) {
    return interaction.editReply(
      '```\n[ERROR] Este comando solo funciona en canales de texto.\n```'
    );
  }

  const webhook = await getOrCreateWebhook(channel);
  if (!webhook) {
    return interaction.editReply(
      '```\n[ERROR] Sin permiso para gestionar webhooks en este canal.\n```'
    );
  }

  try {
    await webhook.send({
      username: personaje,
      avatarURL: AVATAR_URL,
      embeds: [buildEmbed(mensaje)],
      allowedMentions: { parse: [] },
    });
    // Borrar la respuesta efímera para no dejar rastro
    await interaction.deleteReply();
  } catch (err) {
    console.error('[hablar] Error:', err);
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
