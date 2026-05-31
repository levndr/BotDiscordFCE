import { SlashCommandBuilder } from 'discord.js';
import { addCharacter, getCharacters } from '../utils/storage.js';

const MAX_CHARS = 10; // máximo de personajes por usuario

export const data = new SlashCommandBuilder()
  .setName('addchar')
  .setDescription('Registra un nuevo personaje tuyo.')
  .addStringOption(option =>
    option
      .setName('nombre')
      .setDescription('Nombre del personaje (ej: El_Fantasma)')
      .setRequired(true)
      .setMinLength(2)
      .setMaxLength(32)
  );

export async function execute(interaction) {
  const nombre = interaction.options.getString('nombre', true).trim();
  const userId = interaction.user.id;

  // Validar caracteres permitidos (letras, números, _, -)
  if (!/^[\w\-]+$/u.test(nombre)) {
    return interaction.reply({
      content: '```\n[ERROR] El nombre solo puede contener letras, números, _ o -.\n```',
      ephemeral: true,
    });
  }

  const { characters } = getCharacters(userId);

  if (characters.length >= MAX_CHARS) {
    return interaction.reply({
      content: `\`\`\`\n[ERROR] Límite alcanzado. Máximo ${MAX_CHARS} personajes por usuario.\n\`\`\``,
      ephemeral: true,
    });
  }

  const added = addCharacter(userId, nombre);

  if (!added) {
    return interaction.reply({
      content: `\`\`\`\n[ERROR] Ya tenés un personaje registrado con ese nombre.\n\`\`\``,
      ephemeral: true,
    });
  }

  return interaction.reply({
    content: `\`\`\`\n[OK] Personaje "${nombre}" registrado.\`\`\``,
    ephemeral: true,
  });
}
