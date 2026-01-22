require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionOverwrites,
  PermissionFlagsBits,
  MessageFlags,
  Partials,
  EmbedBuilder,
} = require("discord.js");
const fs = require("fs");
const path = "./refus.json";

let listeRefuses = new Set();
if (fs.existsSync(path)) {
  const data = fs.readFileSync(path);
  const array = JSON.parse(data);
  listeRefuses = new Set(array);
  console.log(`📂 ${listeRefuses.size} utilisateur(s) refusé(s) chargés.`);
}

function sauvegarderRefus() {
  const array = Array.from(listeRefuses);
  fs.writeFileSync(path, JSON.stringify(array, null, 2));
}

const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildScheduledEvents,
    1 << 21,
  ],
  partials: [Partials.Channel, Partials.Message],
});

const invites = new Map();

bot.on("ready", async () => {
  console.log(`✅ Bot EPSI Bordeaux en ligne : ${bot.user.tag}`);

  const channelRules = bot.channels.cache.get(process.env.ID_SALON_REGLE);
  if (channelRules) {
    const messages = await channelRules.messages.fetch({ limit: 10 });
    if (messages.size === 0) {
      const embedRules = new EmbedBuilder()
        .setTitle("⚖️ Règlement de la communauté EPSI")
        .setColor(0x2ecc71)
        .setDescription(
          "Bienvenue ! Pour accéder à l'intégralité du serveur, merci de prendre connaissance des règles suivantes :"
        )
        .addFields(
          {
            name: "🤝 Entraide",
            value:
              "• Ici on s'entraide sur le code. Pas de jugement sur les erreurs des autres.",
          },
          {
            name: "💬 Respect",
            value:
              "• Politesse avec les camarades et les intervenants. Utilisez vos vrais noms.",
          },
          {
            name: "💻 Professionnalisme",
            value: "• Utilisez les salons appropriés et soignez votre langage.",
          },
          {
            name: "📚 EPSI",
            value: "• Respectez les règles de l'EPSI.",
          },
          {
            name: "⚠️ Sanctions",
            value:
              "• Non-respect des règles peut entraîner des avertissements ou bannissements de la part des modérateurs.",
          }
        )
        .setFooter({
          text: "Clique sur le bouton ci-dessous pour accepter le règlement",
        });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("accept_rules")
          .setLabel("J'ai lu et j'accepte")
          .setStyle(ButtonStyle.Success)
      );

      await channelRules.send({ embeds: [embedRules], components: [row] });
    }
  }

  const channel = bot.channels.cache.get(process.env.ID_SALON_RULES);
  if (channel) {
    const oldMessages = await channel.messages.fetch({ limit: 10 });
    if (oldMessages.size > 0)
      await channel.bulkDelete(oldMessages).catch(() => null);
    const sentMessage = await channel.send(
      "Choisissez un rôle en réagissant à ce message !:\n👨‍🏫 : Intervenant, \n🎓 : B1, \n📖 : B2(SN2), \n💻 : B3, \n🚀 : M1, \n🏆 : M2"
    );

    await sentMessage.react("👨‍🏫");
    await sentMessage.react("🎓");
    await sentMessage.react("📖");
    await sentMessage.react("💻");
    await sentMessage.react("🚀");
    await sentMessage.react("🏆");
  }
  const channelRE = bot.channels.cache.get(process.env.ID_SALON_RE);
  if (channelRE) {
    const oldMessages = await channelRE.messages.fetch({ limit: 10 });
    if (oldMessages.size > 0)
      await channelRE.bulkDelete(oldMessages).catch(() => null);
    const sentMessageRE = await channelRE.send(
      "Bienvenue dans le salon de Recherche d'Entreprise ! veuillers choisir votre promotion en réagissant à ce message :\n
      📱 : B3 CDA, \n⚙️ : B3 ASRBD, \n🧠 : M1 IA, \n🛡️ : M1 cyber, \n👨‍💻 : M1 Dev, \n🏗️ : M1 infra"
    );
    await sentMessageRE.react("📱");
    await sentMessageRE.react("⚙️");
    await sentMessageRE.react("🧠");
    await sentMessageRE.react("🛡️");
    await sentMessageRE.react("👨‍💻");
    await sentMessageRE.react("🏗️");
  }
  bot.guilds.cache.forEach(async (guild) => {
    const firstInvites = await guild.invites.fetch();
    invites.set(
      guild.id,
      new Map(firstInvites.map((invite) => [invite.code, invite.uses]))
    );
  });
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
      if (!listeRefuses.has(user.id)) {
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
      listeRefuses.add(studentId);
      sauvegarderRefus();

      const dmChannel = await student.createDM();
      dmChannel.send("Votre demande de rôle Intervenant a été refusée.");
    }
    await reaction.message
      .delete()
      .catch((err) => console.error("Erreur suppression:", err));
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
  if (reaction.emoji.name === "📱") {
    const studentId = user.id;
    const student = await reaction.message.guild.members
      .fetch(studentId)
      .catch(() => null);
    if (student) {
      if (reaction.message.guild.roles.cache.find((r) => r.name === "B3_CDA")) {
        const role = reaction.message.guild.roles.cache.find(
          (r) => r.name === "B3_CDA"
        );
        await student.roles.add(role.id);
      }
    }
  }
  if (reaction.emoji.name === "⚙️") {
    const studentId = user.id;
    const student = await reaction.message.guild.members
      .fetch(studentId)
      .catch(() => null);
    if (student) {
      if (
        reaction.message.guild.roles.cache.find((r) => r.name === "B3_ASRBD")
      ) {
        const role = reaction.message.guild.roles.cache.find(
          (r) => r.name === "B3_ASRBD"
        );
        await student.roles.add(role.id);
      }
    }
  }
  if (reaction.emoji.name === "🧠") {
    const studentId = user.id;
    const student = await reaction.message.guild.members
      .fetch(studentId)
      .catch(() => null);
    if (student) {
      if (reaction.message.guild.roles.cache.find((r) => r.name === "M1_IA")) {
        const role = reaction.message.guild.roles.cache.find(
          (r) => r.name === "M1_IA"
        );
        await student.roles.add(role.id);
      }
    }
  }
  if (reaction.emoji.name === "🛡️") {
    const studentId = user.id;
    const student = await reaction.message.guild.members
      .fetch(studentId)
      .catch(() => null);
    if (student) {
      if (
        reaction.message.guild.roles.cache.find((r) => r.name === "M1_Cyber")
      ) {
        const role = reaction.message.guild.roles.cache.find(
          (r) => r.name === "M1_Cyber"
        );
        await student.roles.add(role.id);
      }
    }
  }
  if (reaction.emoji.name === "👨‍💻") {
    const studentId = user.id;
    const student = await reaction.message.guild.members
      .fetch(studentId)
      .catch(() => null);
    if (student) {
      if (reaction.message.guild.roles.cache.find((r) => r.name === "M1_Dev")) {
        const role = reaction.message.guild.roles.cache.find(
          (r) => r.name === "M1_Dev"
        );
        await student.roles.add(role.id);
      }
    }
  }
  if (reaction.emoji.name === "🏗️") {
    const studentId = user.id;
    const student = await reaction.message.guild.members
      .fetch(studentId)
      .catch(() => null);
    if (student) {
      if (
        reaction.message.guild.roles.cache.find((r) => r.name === "M1_Infra")
      ) {
        const role = reaction.message.guild.roles.cache.find(
          (r) => r.name === "M1_Infra"
        );
        await student.roles.add(role.id);
      }
    }
  }
});

bot.on("messageReactionRemove", async (reaction, user) => {
  if (user.bot) return;

  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      return;
    }
  }

  const guild = reaction.message.guild;
  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) return;

  const promos = {
    "🎓": "B1",
    "📖": "B2",
    "💻": "B3",
    "🚀": "M1",
    "🏆": "M2",
    "📱": "B3_CDA",
    "⚙️": "B3_SRB",
    "🧠": "M1_IA",
    "🛡️": "M1_Cyber",
    "👨‍💻": "M1_Dev",
    "🏗️": "M1_Infra",
  };

  if (promos[reaction.emoji.name]) {
    const roleName = promos[reaction.emoji.name];
    const role = guild.roles.cache.find((r) => r.name === roleName);

    if (role) {
      await member.roles
        .remove(role)
        .catch((err) => console.error("Erreur retrait rôle:", err));
      console.log(`Rôle ${roleName} retiré à ${user.username}`);
    }
  }
});

bot.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (!message.guild) {
    console.log(`💬 DM reçu de ${message.author.tag} : ${message.content}`);

    const adminChannel = bot.channels.cache.get(process.env.ID_SALON_QUESTIONS);

    if (adminChannel) {
      if (adminChannel.type === 15) {
        await adminChannel.threads
          .create({
            name: `Question de ${message.author.username}`,
            message: {
              content: `**Utilisateur :** <@${message.author.id}>\n**Message :** ${message.content}`,
            },
          })
          .catch((err) => console.error("Erreur Forum:", err));
      } else if (adminChannel.isTextBased()) {
        await adminChannel
          .send(`💬 **DM reçu de ${message.author.tag}** : ${message.content}`)
          .catch((err) => console.error("Erreur envoi Admin:", err));
      }
    }
    return;
  }

  const hasRole = message.member.roles.cache.some(function (r) {
    const role = r.name.split("-");
    return role[0] === "i";
  });

  if (message.content === "!create") {
    if (hasRole) {
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
            (c) =>
              c.name.toLowerCase() === args[1].toLowerCase() && c.type === 4
          );
          const channelName = args[0];
          const categoryId = category ? category.id : null;

          if (!channelName || !categoryId) {
            return message.reply(
              "Il manque des informations. Recommence la commande !"
            );
          }
          const roleInter = message.member.roles.cache.find((r) =>
            r.name.startsWith("i-")
          );
          if (!roleInter) {
            return message.reply(
              "❌ Erreur : Je n'ai pas trouvé votre rôle d'intervenant (commençant par 'i-')."
            );
          }
          const rolepromo = message.guild.roles.cache.find(
            (r) => r.name.toLowerCase() === category.name.toLowerCase()
          );
          if (!rolepromo) {
            return message.reply(
              "❌ Erreur : Je n'ai pas trouvé le rôle de la promo."
            );
          }

          const newChannel = await message.guild.channels.create({
            name: channelName,
            type: 0,
            parent: categoryId,
            rateLimitPerUser: 60,
            permissionOverwrites: [
              {
                id: message.guild.id,
                deny: [PermissionFlagsBits.ViewChannel],
              },
              {
                id: roleInter.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ManageMessages,
                ],
              },
              {
                id: rolepromo.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                ],
              },
            ],
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
  }
});

bot.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId.startsWith("help_request_")) {
    const studentId = interaction.customId.split("_")[2];
    const student = await bot.users.fetch(studentId).catch(() => null);
    const dmChannel = await student.createDM();
    student
      .send({
        content: `Veuillez décrire votre problème en détail. Un modérateur vous répondra dès que possible.`,
      })
      .catch(() => null);
  }
  if (interaction.customId === "accept_rules") {
    const member = interaction.member;
    const role = interaction.guild.roles.cache.find((r) => r.name === "Membre");
    if (role) {
      await member.roles.add(role.id);
      await interaction.reply({
        content:
          "✅ Merci d'avoir accepté le règlement ! Vous avez maintenant accès au reste du serveur.",
        flags: [MessageFlags.Ephemeral],
      });
    }
  }
});

bot.on("guildMemberAdd", async (member) => {
  const newInvites = await member.guild.invites.fetch();
  const oldInvites = invites.get(member.guild.id);

  const inviteUsed = newInvites.find(
    (i) => i.uses > (oldInvites.get(i.code) || 0)
  );

  if (inviteUsed && inviteUsed.code === process.env.INVITE_CODE_SPECIAL) {
    console.log(`L'élève ${member.user.tag} est arrivé via le lien spécial !`);

    const role = member.guild.roles.cache.find((r) => r.name === "Membre_RE");
    if (role) {
      await member.roles.add(role).catch(console.error);
    }
  }

  invites.set(
    member.guild.id,
    new Map(newInvites.map((invite) => [invite.code, invite.uses]))
  );
});

bot.on("autoModerationActionExecution", async (execution) => {
  try {
    const member = await execution.guild.members
      .fetch(execution.userId)
      .catch(() => null);

    if (!member) {
      console.log("❌ Impossible de récupérer le membre sur le serveur.");
      return;
    }

    const roleRestriction = execution.guild.roles.cache.find(
      (r) => r.name === "Restriction"
    );
    const roleMember = execution.guild.roles.cache.find(
      (r) => r.name === "Membre"
    );

    if (!roleRestriction) {
      console.log(
        "⚠️ Le rôle 'restriction' n'existe pas. Vérifie l'orthographe (minuscules/majuscules)."
      );
      return;
    }

    await member.roles.add(roleRestriction);
    console.log(`✅ Rôle ${roleRestriction.name} ajouté à ${member.user.tag}`);

    if (roleMember && member.roles.cache.has(roleMember.id)) {
      await member.roles.remove(roleMember);
      console.log(`✅ Rôle ${roleMember.name} retiré à ${member.user.tag}`);
    }

    await member
      .send(
        `⚠️ Ton message a été bloqué sur **${execution.guild.name}**. Tu as été restreint.`
      )
      .catch(() => console.log("DMs fermés."));
  } catch (error) {
    console.error("❌ Erreur lors de l'exécution de l'AutoMod :");
    console.error(error);
  }
});

bot.on("guildScheduledEventCreate", async (event) => {
  console.log(`Nouvel événement détecté : ${event.name}`);

  const forumChannel = event.guild.channels.cache.get(
    process.env.ID_SALON_ANNONCE
  );

  if (forumChannel && forumChannel.type === 15) {
    try {
      const imageURL = event.coverImageURL({ size: 1024, extension: "png" });

      const { EmbedBuilder } = require("discord.js");
      const eventEmbed = new EmbedBuilder()
        .setTitle(`Discussion : ${event.name}`)
        .setDescription(event.description || "Aucune description fournie.")
        .setColor(0x3498db)
        .addFields(
          {
            name: "Lieu",
            value: event.entityMetadata?.location || "Salon vocal / Interne",
            inline: true,
          },
          {
            name: "Début",
            value: `<t:${Math.floor(event.scheduledStartTimestamp / 1000)}:F>`,
            inline: true,
          }
        );

      if (imageURL) {
        eventEmbed.setImage(imageURL);
      }

      await forumChannel.threads.create({
        name: `${event.name}`,
        message: {
          embeds: [eventEmbed],
          content: `Un nouvel événement a été programmé par <@${event.creatorId}> !`,
        },
      });

      console.log(`Forum avec image créé pour : ${event.name}`);
    } catch (error) {
      console.error("Erreur lors de la création du post forum :", error);
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
