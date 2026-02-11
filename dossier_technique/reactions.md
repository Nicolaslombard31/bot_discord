# Reactions au message

[page précédente](../dossier_technique/ready.md)   [🏠](../)   [page suivante](../dossier_technique/create.md)

## 1. Intervenants :

Le code que nous voyons ci-dessous permet d'en un prmier temps de vérifier si le user n'a pas déjà le rôle ensuite de vérifiéer si le user n'est pas dans la liste des refusé.

![reaction_01](../images/reaction_01.png)

Par la suite nous envoyons un message a l'user si il est dans la liste refusé pour lui dire qu'il a déjà été refusé et qu'il doit contacter les modérateurs pour plus d'informations.

![reaction_02](../images/reaction_02.png)

## 2. Acceptée :

Dans le code on peut voir l'acceptation des modérateurs pour le rôle Intervenant.

![reaction_03](../images/reaction_03.png)

## 3. Refussée :

Ensuite dans ce bout de code on vois le refus des modérateurs pour le rôle Interveant, et nous le sauvegardons dans une liste qui reste même si le bot se réinitialise.

![reaction_04](../images/reaction_04.png)

## 4. Promos :

Dans le code qui suis nous avons mis en place le faite que si un user met un certains emoji il sera mis dans une promos spécifique. Et on a fait la même chose pour les RE (Recherche d'Entreprise).

![reaction_05](../images/reaction_05.png)

On a ensuite le retirage des rôles promos quand les user retire leurs emojis.

![reaction_06](../images/reaction_06.png)
![reaction_07](../images/reaction_07.png)


[page précédente](../dossier_technique/ready.md)   [🏠](../)   [page suivante](../dossier_technique/create.md)