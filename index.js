require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const { Channel } = require("node:diagnostics_channel");

const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

bot.on("ready", async () => {
  const channel = bot.channels.cache.get(process.env.ID_SALON);
  if (channel) {
     const sentMessage = await channel.send(
      "Choisissez un rôle en réagissant à ce message !:\n👨‍🏫 : Intervenant\n🧑‍🎓 : Etudiant"
    );

    await sentMessage.react("👨‍🏫");
    await sentMessage.react("🧑‍🎓");
  }
});

bot.on("messageReactionAdd", async (reaction, user) => {
    if (user.bot) return;
    const intervenants = reaction.message.guild.roles.cache.filter(r => r.name.startsWith("i-")).size;
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error("Erreur lors du fetch de la réaction:", error);
            return;
        }
    }
    if (reaction.emoji.name === "👨‍🏫") {
        const admin = bot.channels.cache.get(process.env.ID_SALON_ADMIN);
        if (admin) {
            const sentMessage = await admin.send(
            `@Modérateur L'utilisateur <@${user.id}> a demandé le rôle Intervenant.\n Son ID est \`${user.id}\`.`
            );
            await sentMessage.react("✅");
            await sentMessage.react("❌");
        }
    }
    if (reaction.emoji.name === "✅") {
        const content = reaction.message.content;
        const studentId = content.split("`")[1];
        const student = await reaction.message.guild.members.fetch(studentId).catch(() => null);
        if (student) {
            const newRole = reaction.message.guild.roles.create({
                name: `i-${intervenants + 1}`,
                color: 0xff0000,
                reason: 'Rôle créé pour l\'utilisateur ayant demandé le rôle Intervenant',
            });
            await student.roles.add((await newRole).id);
        }
        await reaction.message.delete().catch(err => console.error("Erreur suppression:", err));
    }
    if (reaction.emoji.name === "❌") {
        const content = reaction.message.content;
        const studentId = content.split("`")[1];
        const student = await reaction.message.guild.members.fetch(studentId).catch(() => null);
        if (student) {
            const dmChannel = await student.createDM();
            dmChannel.send("Votre demande de rôle Intervenant a été refusée.");
        }
        await reaction.message.delete().catch(err => console.error("Erreur suppression:", err));
    }
});

bot.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const hasRole = message.member.roles.cache.some(function (r) {
    const role = r.name.split("-");
    return role[0] === "p";
  });

  if (hasRole && message.content === "!create") {
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

const { createServer } = require("node:http");

const hostname = "127.0.0.1";
const port = 3000;

const server = createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain");
  res.end("Hello World");
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
