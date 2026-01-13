require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
let checkemojinegatif = false;

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
      "Choisissez un rôle en réagissant à ce message !:\n👨‍🏫 : Intervenant, 🎓 : B1, 📖 : B2(SN2), 💻 : B3, 🚀 : M1, 🏆 : M2"
    );

    await sentMessage.react("👨‍🏫");
    await sentMessage.react("🎓");
    await sentMessage.react("📖");
    await sentMessage.react("💻");
    await sentMessage.react("🚀");
    await sentMessage.react("🏆");
  }
});

bot.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;
  const intervenants = reaction.message.guild.roles.cache.filter((r) =>
    r.name.startsWith("i-")
  ).size;
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error("Erreur lors du fetch de la réaction:", error);
      return;
    }
  }
  const memberWhoReacted = await reaction.message.guild.members.fetch(user.id);
  const hasIntervenantRole = memberWhoReacted.roles.cache.some((r) =>
    r.name.startsWith("i-")
  );
  if (reaction.emoji.name === "👨‍🏫") {
    if (!hasIntervenantRole) {
      if (!checkemojinegatif) {
        const admin = bot.channels.cache.get(process.env.ID_SALON_ADMIN);
        if (admin) {
          const sentMessage = await admin.send(
            `@Modérateur L'utilisateur <@${user.id}> a demandé le rôle Intervenant.\n Son ID est \`${user.id}\`.`
          );
          await sentMessage.react("✅");
          await sentMessage.react("❌");
        }
      } else {
        const dmChannel = await user.createDM();
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`help_request_${user.id}`)
            .setLabel("Demander de l'aide")
            .setStyle(ButtonStyle.Primary)
        );
        await user
          .send({
            content: `Votre demande de rôle Intervenant a déjà été refusée et nous ne pouvons plus l'activé. (Contactez un modérateur si vous voullez plus d'informations, cliquez sur le bouton ci-dessous pour alerter les modérateurs.`,
            components: [row],
          })
          .catch(() => null);
      }
    }
  }
  if (reaction.emoji.name === "✅") {
    const content = reaction.message.content;
    const studentId = content.split("`")[1];
    const student = await reaction.message.guild.members
      .fetch(studentId)
      .catch(() => null);
    if (student) {
      const newRole = reaction.message.guild.roles.create({
        name: `i-${intervenants + 1}`,
        color: 0xff0000,
        reason:
          "Rôle créé pour l'utilisateur ayant demandé le rôle Intervenant",
      });
      await student.roles.add((await newRole).id);
    }
    await reaction.message
      .delete()
      .catch((err) => console.error("Erreur suppression:", err));
  }
  if (reaction.emoji.name === "❌") {
    const content = reaction.message.content;
    const studentId = content.split("`")[1];
    const student = await reaction.message.guild.members
      .fetch(studentId)
      .catch(() => null);
    if (student) {
      const dmChannel = await student.createDM();
      dmChannel.send("Votre demande de rôle Intervenant a été refusée.");
    }
    await reaction.message
      .delete()
      .catch((err) => console.error("Erreur suppression:", err));
    checkemojinegatif = true;
  }
  if (reaction.emoji.name === "🎓") {
    const studentId = user.id;
    const student = await reaction.message.guild.members
      .fetch(studentId)
      .catch(() => null);
    if (student) {
      if (reaction.message.guild.roles.cache.find((r) => r.name === "B1")) {
        const role = reaction.message.guild.roles.cache.find(
          (r) => r.name === "B1"
        );
        await student.roles.add(role.id);
      }
    }
  }
  if (reaction.emoji.name === "📖") {
    const studentId = user.id;
    const student = await reaction.message.guild.members
      .fetch(studentId)
      .catch(() => null);
    if (student) {
      if (reaction.message.guild.roles.cache.find((r) => r.name === "B2")) {
        const role = reaction.message.guild.roles.cache.find(
          (r) => r.name === "B2"
        );
        await student.roles.add(role.id);
      }
    }
  }
  if (reaction.emoji.name === "💻") {
    const studentId = user.id;
    const student = await reaction.message.guild.members
      .fetch(studentId)
      .catch(() => null);
    if (student) {
      if (reaction.message.guild.roles.cache.find((r) => r.name === "B3")) {
        const role = reaction.message.guild.roles.cache.find(
          (r) => r.name === "B3"
        );
        await student.roles.add(role.id);
      }
    }
  }
  if (reaction.emoji.name === "🚀") {
    const studentId = user.id;
    const student = await reaction.message.guild.members
      .fetch(studentId)
      .catch(() => null);
    if (student) {
      if (reaction.message.guild.roles.cache.find((r) => r.name === "M1")) {
        const role = reaction.message.guild.roles.cache.find(
          (r) => r.name === "M1"
        );
        await student.roles.add(role.id);
      }
    }
  }
  if (reaction.emoji.name === "🏆") {
    const studentId = user.id;
    const student = await reaction.message.guild.members
      .fetch(studentId)
      .catch(() => null);
    if (student) {
      if (reaction.message.guild.roles.cache.find((r) => r.name === "M2")) {
        const role = reaction.message.guild.roles.cache.find(
          (r) => r.name === "M2"
        );
        await student.roles.add(role.id);
      }
    }
  }
});

bot.on("messageReactionRemove", async (reaction, user) => {
    if (user.bot) return;

    if (reaction.partial) {
        try { await reaction.fetch(); } catch (error) { return; }
    }

    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    const promos = {
        "🎓": "B1",
        "📖": "B2",
        "💻": "B3",
        "🚀": "M1",
        "🏆": "M2"
    };

    if (promos[reaction.emoji.name]) {
        const roleName = promos[reaction.emoji.name];
        const role = guild.roles.cache.find(r => r.name === roleName);
        
        if (role) {
            await member.roles.remove(role).catch(err => console.error("Erreur retrait rôle:", err));
            console.log(`Rôle ${roleName} retiré à ${user.username}`);
        }
    }
});

bot.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const hasRole = message.member.roles.cache.some(function (r) {
    const role = r.name.split("-");
    return role[0] === "i";
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
  } else {
    message.reply("Vous n'avez pas la permission d'utiliser cette commande.");
  }
});

bot.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId.startsWith("help_request_")) {
    const studentId = interaction.customId.split("_")[2];
    const adminChannel = bot.channels.cache.get(process.env.ID_SALON_ADMIN);

    if (adminChannel) {
      await adminChannel.send(
        `**Demande d'aide** : L'utilisateur <@${studentId}> (ID: \`${studentId}\`) a cliqué sur le bouton d'aide après son refus.`
      );

      await interaction.reply({
        content:
          "✅ Votre demande d'aide a été envoyée aux modérateurs. Ils reviendront vers vous dès que possible.",
        ephemeral: true,
      });
    }
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
