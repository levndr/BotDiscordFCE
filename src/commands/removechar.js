import { SlashCommandBuilder } from 'discord.js';
import { removeCharacter, getCharacters } from '../utils/storage.js';

export const data = new SlashCommandBuilder()
  .setName('removechar')
  .setDescription('Elimina uno de tus personajes registrados.')
  .addStringOption(option =>
    option
      .setName('nombre')
      .setDescription('Nombre del personaje a eliminar')
      .setRequired(true)
      .setAutocomplete(true)
  );

export async function execute(interaction) {
  const nombre = interaction.options.getString('nombre', true);
  const userId = interaction.user.id;

  const removed = removeCharacter(userId, nombre);

  if (!removed) {
    return interaction.reply({
      content: `\`\`\`\n[ERROR] No tenés un personaje llamado "${nombre}".\n\`\`\``,
      ephemeral: true,
    });
  }

  // Confirmación privada
  await interaction.reply({
    content: `\`\`\`\n[OK] Personaje "${removed.name}" eliminado.\`\`\``,
    ephemeral: true,
  });

  // Anuncio público en el canal
  await interaction.channel.send(`**${removed.name} ha salido del servidor encriptado.**`);
}

export async function autocomplete(interaction) {
  const focused = interaction.options.getFocused().toLowerCase();
  const { characters } = getCharacters(interaction.user.id);

  const choices = characters
    .filter(c => c.name.toLowerCase().includes(focused))
    .slice(0, 25)
    .map(c => ({ name: c.name, value: c.name }));

  await interaction.respond(choices);
}
