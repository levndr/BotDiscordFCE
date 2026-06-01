import { SlashCommandBuilder } from 'discord.js';
import { getCharacters } from '../utils/storage.js';

export const data = new SlashCommandBuilder()
  .setName('chars')
  .setDescription('Muestra tus personajes registrados.');

export async function execute(interaction) {
  const { characters, active } = getCharacters(interaction.user.id);

  if (characters.length === 0) {
    return interaction.reply({
      content: '```\n[INFO] No tenés personajes registrados. Usá /addchar para agregar uno.\n```',
      ephemeral: true,
    });
  }

  const lines = characters.map(c => {
    const marker = c.name === active ? ' ◄ ACTIVO' : '';
    const phone = c.phone ? ` [${c.phone}]` : '';
    return `  · ${c.name}${phone}${marker}`;
  });

  const msg = [
    '```',
    '[ PERSONAJES REGISTRADOS ]',
    '',
    ...lines,
    '',
    'Usá /setchar para cambiar el activo.',
    '```',
  ].join('\n');

  return interaction.reply({ content: msg, ephemeral: true });
}
