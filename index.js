require('dotenv').config()

const { Client, GatewayIntentBits } = require('discord.js');
const { Channel } = require('node:diagnostics_channel');

const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

bot.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "!create") {
      message.reply(
          "Commande de création lancée ! Envoie maintenant le **nom du salon** et le **nom de la catégorie** (séparés par un espace)."
        );
        
        const filter = (m) => m.author.id === message.author.id;
        
        message.channel
        .awaitMessages({ filter, max: 1, time: 30000, errors: ["time"] })
        .then(async (collected) => {
            const response = collected.first();
            const args = response.content.split(" ");
            const category = message.guild.channels.cache.find(
              (c) => c.name.toLowerCase() === args[1].toLowerCase() && c.type === 4
            );
            const channelName = args[0];
            const categoryId = category ? category.id : null;
            
            if (!channelName || !categoryId) {
                return message.reply(
                    "Il manque des informations. Recommence la commande !"
                );
            }
            
            const newChannel = await message.guild.channels.create({
                name: channelName,
                type: 0,
                parent: categoryId,
            });
            
            message.reply(`Salon **${channelName}** créé avec succès !`);
        })
        .catch(() => {
            message.reply(
                "Temps écoulé ! Tu as mis trop de temps à répondre, commande annulée."
            );
        });
    }
});

bot.login(process.env.DISCORD_TOKEN);

const { createServer } = require('node:http');

const hostname = '127.0.0.1';
const port = 3000;

const server = createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Hello World');
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
