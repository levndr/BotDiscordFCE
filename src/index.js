import 'dotenv/config';
import { Client, Collection, Events, GatewayIntentBits, REST, Routes, ActivityType } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { getCharacters } from './utils/storage.js';
import { getOrCreateWebhook } from './utils/webhooks.js';
import { AVATAR_URL, buildEmbed } from './utils/message-helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Cliente ───────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // intento privilegiado — activar en el portal
  ],
});

client.commands = new Collection();

// ── Carga de comandos ─────────────────────────────────────────
const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = join(commandsPath, file);
  const command = await import(pathToFileURL(filePath).href);

  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`[WARN] El comando en ${file} no tiene "data" o "execute".`);
  }
}

// ── Registro automático de comandos al arrancar ───────────────
async function registerCommands() {
  try {
    const commandData = [...client.commands.values()].map(c => c.data.toJSON());
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commandData }
    );
    console.log('[OK] Comandos registrados en Discord.');
  } catch (err) {
    console.error('[ERROR] No se pudieron registrar los comandos:', err.message);
  }
}

// ── Listener: "! mensaje" → hablar como personaje activo ─────
client.on(Events.MessageCreate, async message => {
  // Ignorar bots y mensajes que no empiecen con "! "
  if (message.author.bot) return;
  if (!message.content.startsWith('! ')) return;

  const texto = message.content.slice(2).trim();
  if (!texto) return;

  const { active } = getCharacters(message.author.id);

  // Si el usuario no tiene personaje activo, ignorar silenciosamente
  if (!active) return;

  // Borrar el mensaje original para no dejar rastro
  await message.delete().catch(() => {});

  // Obtener o crear webhook del canal
  const webhook = await getOrCreateWebhook(message.channel);
  if (!webhook) return;

  try {
    await webhook.send({
      username: active,
      avatarURL: AVATAR_URL,
      embeds: [buildEmbed(texto)],
      allowedMentions: { parse: [] },
    });
  } catch (err) {
    console.error('[!] Error al enviar webhook:', err);
  }
});

// ── Eventos ───────────────────────────────────────────────────
client.once(Events.ClientReady, async readyClient => {
  console.log(`[OK] Bot conectado como ${readyClient.user.tag}`);

  readyClient.user.setPresence({
    status: 'online',
    activities: [{
      name: '! | /addchar /setchar /chars',
      type: ActivityType.Listening,
    }],
  });

  await registerCommands();
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    if (!command?.autocomplete) return;
    try {
      await command.autocomplete(interaction);
    } catch (err) {
      console.error(`[ERROR] Autocomplete "${interaction.commandName}":`, err);
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`[ERROR] Comando "${interaction.commandName}":`, err);
    const errorMsg = '```\n[ERROR] Ocurrió un error al ejecutar el comando.\n```';
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply(errorMsg).catch(() => {});
    } else {
      await interaction.reply({ content: errorMsg, ephemeral: true }).catch(() => {});
    }
  }
});

// ── Login ─────────────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN);
