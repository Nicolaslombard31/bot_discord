require('dotenv').config()

const { Client, GatewayIntentBits } = require('discord.js');

const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

bot.on('messageCreate', function (message) {
    if (message.content === '!ping') {
        message.reply('pong')
    }
})

bot.login(process.env.DISCORD_TOKEN);