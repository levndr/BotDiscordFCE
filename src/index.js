import 'dotenv/config';
import { Client, Collection, Events, GatewayIntentBits, REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Cliente ───────────────────────────────────────────────────
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
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

// ── Eventos ───────────────────────────────────────────────────
client.once(Events.ClientReady, async readyClient => {
  console.log(`[OK] Bot conectado como ${readyClient.user.tag}`);
  await registerCommands();
});

client.on(Events.InteractionCreate, async interaction => {
  // Autocompletado
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

  // Comandos slash
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    console.warn(`[WARN] Comando desconocido: ${interaction.commandName}`);
    return;
  }

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
