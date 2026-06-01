import { SlashCommandBuilder } from 'discord.js';
import { setActive, getCharacters } from '../utils/storage.js';

export const data = new SlashCommandBuilder()
  .setName('setchar')
  .setDescription('Establece tu personaje activo (el que usará /hablar por defecto).')
  .addStringOption(option =>
    option
      .setName('nombre')
      .setDescription('Nombre del personaje a activar')
      .setRequired(true)
      .setAutocomplete(true)
  );

export async function execute(interaction) {
  const nombre = interaction.options.getString('nombre', true);
  const userId = interaction.user.id;

  const ok = setActive(userId, nombre);

  if (!ok) {
    return interaction.reply({
      content: `\`\`\`\n[ERROR] No tenés un personaje llamado "${nombre}".\n\`\`\``,
      ephemeral: true,
    });
  }

  return interaction.reply({
    content: `\`\`\`\n[OK] Personaje activo → ${nombre}\`\`\``,
    ephemeral: true,
  });
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
