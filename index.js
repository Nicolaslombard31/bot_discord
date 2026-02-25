// Chargement des variables d'environnement (Token, IDs de salons, etc.)
require("dotenv").config();

// Fonction utilitaire pour créer des pauses (évite les bannissements de l'API Discord)
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  MessageFlags,
  Partials,
  EmbedBuilder,
} = require("discord.js");

const fs = require("fs");
const path = "./refus.json";

// Chargement du fichier lang.json contenant les textes externalisés
const lang = require("./lang.json");

// --- GESTION DE LA PERSISTANCE (Base de données locale) ---

let listeRefuses = new Set();
// Si le fichier de refus existe, on le charge en mémoire (Set pour unicité des IDs)
if (fs.existsSync(path)) {
  const data = fs.readFileSync(path);
  const array = JSON.parse(data);
  listeRefuses = new Set(array);
  console.log(`📂 ${listeRefuses.size} utilisateur(s) refusé(s) chargés.`);
}

// Fonction pour sauvegarder la liste des refusés dans le fichier JSON
function sauvegarderRefus() {
  const array = Array.from(listeRefuses);
  fs.writeFileSync(path, JSON.stringify(array, null, 2));
}

// --- CONFIGURATION DU CLIENT DISCORD ---

const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds, // Gestion du serveur
    GatewayIntentBits.GuildMessages, // Lecture des messages
    GatewayIntentBits.MessageContent, // Contenu des messages (requis pour les commandes)
    GatewayIntentBits.GuildMessageReactions, // Gestion des réactions
    GatewayIntentBits.GuildMembers, // Gestion des membres (arrivées, rôles)
    GatewayIntentBits.GuildInvites, // Suivi des liens d'invitation
    GatewayIntentBits.DirectMessages, // Lecture des messages privés
    GatewayIntentBits.GuildScheduledEvents, // Gestion des événements
    1 << 21, // Intent pour l'Auto-Modération
  ],
  partials: [Partials.Channel, Partials.Message], // Permet de traiter les messages anciens ou les DMs
});

// Map pour stocker les utilisations des invitations
const invites = new Map();

// --- ÉVÉNEMENT : READY (Lancement du bot) ---

bot.on("ready", async () => {
  console.log(`✅ Bot EPSI Bordeaux en ligne : ${bot.user.tag}`);

  // Configuration automatique du salon du Règlement
  const channelRules = bot.channels.cache.get(process.env.ID_SALON_REGLE);
  if (channelRules) {
    const messages = await channelRules.messages.fetch({ limit: 10 });
    if (messages.size === 0) {
      // Création de l'Embed (message stylisé) pour les règles
      const embedRules = new EmbedBuilder()
        .setTitle(lang.rules.title)
        .setColor(0x2ecc71)
        .setDescription(lang.rules.description)
        .addFields(
          lang.rules.fields.map((f) => ({ name: f.name, value: f.value })),
        )
        .setFooter({ text: lang.rules.footer });

      // Ajout du bouton d'acceptation
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("accept_rules")
          .setLabel(lang.rules.button)
          .setStyle(ButtonStyle.Success),
      );

      await channelRules.send({ embeds: [embedRules], components: [row] });
    }
  }

  // Configuration automatique du salon de choix de Rôles (Promos)
  const channel = bot.channels.cache.get(process.env.ID_SALON_RULES);
  if (channel) {
    const oldMessages = await channel.messages.fetch({ limit: 10 });
    if (oldMessages.size > 0)
      await channel.bulkDelete(oldMessages).catch(() => null);

    const sentMessage = await channel.send(lang.roles.message);

    // Ajout des réactions par défaut
    await sentMessage.react("👨‍🏫");
    await sentMessage.react("🎓");
    await sentMessage.react("📖");
    await sentMessage.react("💻");
    await sentMessage.react("🚀");
    await sentMessage.react("🏆");
  }

  // Configuration automatique du salon Recherche Entreprise (RE)
  const channelRE = bot.channels.cache.get(process.env.ID_SALON_RE);
  if (channelRE) {
    const oldMessages = await channelRE.messages.fetch({ limit: 10 });
    if (oldMessages.size > 0)
      await channelRE.bulkDelete(oldMessages).catch(() => null);

    const sentMessageRE = await channelRE.send(lang.roles.re_message);

    await sentMessageRE.react("📱");
    await sentMessageRE.react("⚙️");
    await sentMessageRE.react("🧠");
    await sentMessageRE.react("🛡️");
    await sentMessageRE.react("👨‍💻");
    await sentMessageRE.react("🏗️");
  }

  // Initialisation du cache des invitations pour savoir qui a rejoint via quel lien
  bot.guilds.cache.forEach(async (guild) => {
    const firstInvites = await guild.invites.fetch();
    invites.set(
      guild.id,
      new Map(firstInvites.map((invite) => [invite.code, invite.uses])),
    );
  });
});

// --- ÉVÉNEMENT : REACTION ADD (Attribution des rôles) ---

bot.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return; // On ignore les réactions du bot lui-même

  // Calcul du nombre d'intervenants pour générer le numéro du prochain rôle i-x
  const intervenants = reaction.message.guild.roles.cache.filter((r) =>
    r.name.startsWith("i-"),
  ).size;

  // Gestion des réactions partielles (si le message est vieux)
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      return;
    }
  }

  const memberWhoReacted = await reaction.message.guild.members.fetch(user.id);
  const hasIntervenantRole = memberWhoReacted.roles.cache.some((r) =>
    r.name.startsWith("i-"),
  );

  // CAS : Demande de rôle Intervenant (👨‍🏫)
  if (reaction.emoji.name === "👨‍🏫") {
    if (!hasIntervenantRole) {
      if (!listeRefuses.has(user.id)) {
        // Envoi d'une demande de validation dans le salon des Admins
        const admin = bot.channels.cache.get(process.env.ID_SALON_ADMIN);
        if (admin) {
          const sentMessage = await admin.send(lang.intervenant.ask_admin);
          await sentMessage.react("✅");
          await sentMessage.react("❌");
        }
      } else {
        // Si l'utilisateur a déjà été refusé, on l'informe par bouton en DM
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`help_request_${user.id}`)
            .setLabel("Demander de l'aide")
            .setStyle(ButtonStyle.Primary),
        );
        await user
          .send({ content: lang.intervenant.refused, components: [row] })
          .catch(() => null);
      }
    }
  }

  // CAS : Validation par l'Admin (✅)
  if (reaction.emoji.name === "✅") {
    const content = reaction.message.content;
    const studentId = content.split("`")[1]; // Extraction de l'ID entre les backticks
    const student = await reaction.message.guild.members
      .fetch(studentId)
      .catch(() => null);

    if (student) {
      // Création d'un rôle unique (i-x)
      const newRole = await reaction.message.guild.roles.create({
        name: `i-${intervenants + 1}`,
        color: 0xff0000,
        reason:
          "Rôle créé pour l'utilisateur ayant demandé le rôle Intervenant",
      });
      await student.roles.add(newRole.id);

      // Configuration automatique des permissions du salon de création pour ce nouveau rôle
      const targetChannel = bot.channels.cache.get(
        process.env.ID_SALON_CREATION,
      );
      if (targetChannel) {
        await targetChannel.permissionOverwrites.create(newRole.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        });
        console.log(`✅ Autorisations ajoutées pour ${newRole.name}`);
      }
    }
    await reaction.message.delete().catch(() => null);
  }

  // CAS : Refus par l'Admin (❌)
  if (reaction.emoji.name === "❌") {
    const content = reaction.message.content;
    const studentId = content.split("`")[1];
    const student = await reaction.message.guild.members
      .fetch(studentId)
      .catch(() => null);

    if (student) {
      listeRefuses.add(studentId); // Ajout à la liste noire locale
      sauvegarderRefus(); // Sauvegarde sur le disque
      const dmChannel = await student.createDM();
      dmChannel.send(lang.intervenant.error_dm).catch(() => null);
    }
    await reaction.message.delete().catch(() => null);
  }

  // Attribution automatique des rôles promos via l'objet lang.json
  let promos = {
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
    const student = await reaction.message.guild.members
      .fetch(user.id)
      .catch(() => null);
    if (student) {
      const role = reaction.message.guild.roles.cache.find(
        (r) => r.name === promos[reaction.emoji.name],
      );
      if (role) await student.roles.add(role.id);
    }
  }
});

// --- ÉVÉNEMENT : REACTION REMOVE (Retrait des rôles) ---

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
    const role = guild.roles.cache.find(
      (r) => r.name === promos[reaction.emoji.name],
    );
    if (role) await member.roles.remove(role).catch(() => null);
  }
});

// --- ÉVÉNEMENT : MESSAGE CREATE (Commandes et DMs) ---

bot.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // Gestion des Messages Privés (Redirection vers le Forum ou l'Admin)
  if (!message.guild) {
    const questionChannel = bot.channels.cache.get(
      process.env.ID_SALON_QUESTIONS,
    );
    if (questionChannel) {
      if (questionChannel.type === 15) {
        // Type 15 = Salon Forum
        await questionChannel.threads
          .create({
            name: `Question de ${message.author.username}`,
            message: {
              content: `**Utilisateur :** <@${message.author.id}>\n**Message :** ${message.content}`,
            },
          })
          .catch(console.error);
      } else {
        await questionChannel.send(
          `💬 **DM reçu de ${message.author.tag}** : ${message.content}`,
        );
      }
    }
    return;
  }

  // Vérification si l'utilisateur est un Intervenant
  const hasRole = message.member.roles.cache.some(
    (r) => r.name.split("-")[0] === "i",
  );

  // COMMANDE : !create (Création de salon de cours par un intervenant)
  if (message.content === "!create") {
    if (hasRole) {
      message.reply(lang.commands.create_start);

      const filter = (m) => m.author.id === message.author.id;
      message.channel
        .awaitMessages({ filter, max: 1, time: 30000, errors: ["time"] })
        .then(async (collected) => {
          const args = collected.first().content.split(" ");
          const category = message.guild.channels.cache.find(
            (c) =>
              c.name.toLowerCase() === args[1]?.toLowerCase() && c.type === 4,
          );
          const channelName = args[0];

          if (!channelName || !category)
            return message.reply(lang.commands.create_error);

          const roleInter = message.member.roles.cache.find((r) =>
            r.name.startsWith("i-"),
          );
          const rolepromo = message.guild.roles.cache.find(
            (r) => r.name.toLowerCase() === category.name.toLowerCase(),
          );

          // Définition des rôles BTS si précisé
          const rolebtsb1 = message.guild.roles.cache.find(
            (r) => r.name === "BTS_B1",
          );
          const rolebtsb2 = message.guild.roles.cache.find(
            (r) => r.name === "BTS_B2",
          );

          // Logique de permissions selon les arguments (BTS ou Promo classique)
          let targetRole = rolepromo;
          if (args[2]?.toLowerCase() === "bts") {
            targetRole = args[1].toLowerCase() === "b1" ? rolebtsb1 : rolebtsb2;
          }

          if (!targetRole || !roleInter)
            return message.reply("Erreur : Rôles introuvables.");

          await message.guild.channels.create({
            name: channelName,
            type: 0,
            parent: category.id,
            permissionOverwrites: [
              { id: message.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
              {
                id: roleInter.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ManageMessages,
                ],
              },
              {
                id: targetRole.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                ],
              },
            ],
          });
          message.reply(`Salon **${channelName}** créé avec succès !`);
        })
        .catch(() => message.reply(lang.commands.create_timeout));
    }
  }

  // COMMANDE : !changementpromo (Migration annuelle des membres et nettoyage)
  const moderateur = message.member.roles.cache.has(process.env.ID_ROLE_ADMIN);
  if (message.content.startsWith("!changementpromo")) {
    if (moderateur) {
      // Liste des IDs de catégories à nettoyer
      const category = [
        process.env.ID_CATEGORIE_B1,
        process.env.ID_CATEGORIE_B2,
        process.env.ID_CATEGORIE_B3,
        process.env.ID_CATEGORIE_M1,
        process.env.ID_CATEGORIE_M2,
      ];

      // Phase 1 : Suppression de tous les anciens salons de cours
      for (let i = 0; i < category.length; i++) {
        const categoryID = message.guild.channels.cache.get(category[i]);
        if (!categoryID) continue;

        const channelsToDelete = message.guild.channels.cache.filter(
          (c) => c.parentId === categoryID.id,
        );
        console.log(lang.commands.migration_start);

        for (const [id, channel] of channelsToDelete) {
          try {
            await channel.delete("Nettoyage automatique");
            await wait(500); // Pause anti-flood API
          } catch (err) {
            console.error(err);
          }
        }
      }

      // Phase 2 : Migration des grades (ex: B1 devient B2)
      let filePromos = ["M2", "M1", "B3", "B2", "B1", "BTS_B2", "BTS_B1"];
      const cible = {
        M2: "Alumni",
        M1: "M2",
        B3: "M1",
        BTS_B2: "B3",
        B2: "B3",
        BTS_B1: "BTS_B2",
        B1: "B2",
      };

      const membres = await message.guild.members.fetch();
      for (const nomAnciennePromo of filePromos) {
        const roleAncien = message.guild.roles.cache.find(
          (r) => r.name === nomAnciennePromo,
        );
        const roleNouveau = message.guild.roles.cache.find(
          (r) => r.name === cible[nomAnciennePromo],
        );

        if (roleAncien && roleNouveau) {
          const liste = membres.filter(
            (m) => m.roles.cache.has(roleAncien.id) && !m.user.bot,
          );
          for (const [id, membre] of liste) {
            try {
              await membre.roles.add(roleNouveau);
              await membre.roles.remove(roleAncien);
              await wait(100);
            } catch (err) {
              console.error(err);
            }
          }
        }
      }
      message.channel.send(lang.commands.migration_done);
    }
  }
});

// --- ÉVÉNEMENT : INTERACTION CREATE (Boutons) ---

bot.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  // Bouton d'aide pour les demandes d'intervenants refusées
  if (interaction.customId.startsWith("help_request_")) {
    const studentId = interaction.customId.split("_")[2];
    const student = await bot.users.fetch(studentId).catch(() => null);
    if (student) {
      await student
        .send("Un modérateur vous répondra dès que possible.")
        .catch(() => null);
    }
  }

  // Bouton d'acceptation du règlement
  if (interaction.customId === "accept_rules") {
    const role = interaction.guild.roles.cache.find((r) => r.name === "Membre");
    if (role) {
      await interaction.member.roles.add(role.id);
      await interaction.reply({
        content: "✅ Règlement accepté ! Bienvenue sur le serveur.",
        flags: [MessageFlags.Ephemeral],
      });
    }
  }
});

// --- ÉVÉNEMENT : GUILD MEMBER ADD (Accueil et suivi d'invitation) ---

bot.on("guildMemberAdd", async (member) => {
  const newInvites = await member.guild.invites.fetch();
  const oldInvites = invites.get(member.guild.id);
  const inviteUsed = newInvites.find(
    (i) => i.uses > (oldInvites.get(i.code) || 0),
  );

  // Attribution automatique d'un rôle si le membre vient du lien Recherche Entreprise
  if (inviteUsed && inviteUsed.code === process.env.INVITE_CODE_SPECIAL) {
    const role = member.guild.roles.cache.find((r) => r.name === "Membre_RE");
    if (role) await member.roles.add(role).catch(console.error);
  }

  // Mise à jour du cache des invitations
  invites.set(
    member.guild.id,
    new Map(newInvites.map((i) => [i.code, i.uses])),
  );
});

// --- ÉVÉNEMENT : AUTO MODERATION (Sécurité) ---

bot.on("autoModerationActionExecution", async (execution) => {
  try {
    const member = await execution.guild.members
      .fetch(execution.userId)
      .catch(() => null);
    if (!member) return;

    const roleRestriction = execution.guild.roles.cache.find(
      (r) => r.name === "Restriction",
    );
    const roleMember = execution.guild.roles.cache.find(
      (r) => r.name === "Membre",
    );

    if (roleRestriction) {
      await member.roles.add(roleRestriction);
      if (roleMember) await member.roles.remove(roleMember);
      await member
        .send(
          `⚠️ Ton message a été bloqué sur **${execution.guild.name}**. Tu es désormais restreint.`,
        )
        .catch(() => null);
    }
  } catch (error) {
    console.error(error);
  }
});

// --- GESTION DES ERREURS GLOBALES ---

bot.on("error", (error) => {
  if (error.name === "GatewayRateLimitError") {
    console.warn(
      `⏳ [Rate Limit] Discord demande d'attendre. Le bot suspend l'action.`,
    );
  } else {
    console.error("❌ [Erreur Client] :", error);
  }
});

process.on("unhandledRejection", (error) => {
  console.error("📌 [Rejet non géré] :", error);
});

// Connexion du bot à Discord
bot.login(process.env.DISCORD_TOKEN);

// --- SERVEUR WEB DE MAINTIEN EN LIGNE (HTTP) ---

const { createServer } = require("node:http");
createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain");
  res.end("Hello World");
}).listen(3000, "127.0.0.1", () => {
  console.log(`Serveur de statut actif sur le port 3000`);
});
