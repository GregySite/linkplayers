import { GameType } from '@/hooks/useGame';

export interface GameRules {
  objective: string;
  rules: string[];
  winCondition: string;
}

export const GAME_RULES: Record<GameType, GameRules> = {
  morpion: {
    objective: 'Aligne 3 symboles avant ton adversaire sur une grille 3×3.',
    rules: [
      'Tu joues X, l\'adversaire joue O (ou l\'inverse).',
      'Chacun son tour, place ton symbole dans une case vide.',
      'Un alignement horizontal, vertical ou diagonal de 3 gagne.',
    ],
    winCondition: 'Premier à aligner 3 symboles. Grille pleine sans alignement = match nul.',
  },
  battleship: {
    objective: 'Coule la flotte adverse avant qu\'elle ne coule la tienne.',
    rules: [
      'Place tes navires sur ta grille au début de la partie.',
      'Chacun son tour, tire une case sur la grille adverse.',
      'Touché = tu peux localiser le reste du navire ; coulé = le navire entier est détruit.',
    ],
    winCondition: 'Le premier à couler tous les navires adverses gagne.',
  },
  connect4: {
    objective: 'Aligne 4 jetons de ta couleur avant l\'adversaire.',
    rules: [
      'Chacun son tour, fais tomber un jeton dans une colonne.',
      'Le jeton tombe jusqu\'à la case libre la plus basse.',
      'Alignement horizontal, vertical ou diagonal de 4 = victoire.',
    ],
    winCondition: 'Premier à aligner 4 jetons. Grille pleine sans alignement = match nul.',
  },
  rps: {
    objective: 'Gagne au meilleur des 3 manches de Pierre-Papier-Ciseaux.',
    rules: [
      'Chaque manche, les deux joueurs choisissent en simultané.',
      'Pierre bat Ciseaux, Ciseaux bat Papier, Papier bat Pierre.',
      'Même choix = manche nulle, on rejoue.',
    ],
    winCondition: 'Premier à remporter 2 manches gagne la partie.',
  },
  othello: {
    objective: 'Termine la partie avec le plus de pions de ta couleur sur le plateau.',
    rules: [
      'Place un pion pour encadrer une ou plusieurs rangées de pions adverses.',
      'Tous les pions encadrés se retournent et deviennent de ta couleur.',
      'Si tu n\'as aucun coup possible, ton tour est passé.',
    ],
    winCondition: 'Plateau plein (ou plus de coup possible) : le plus de pions gagne.',
  },
  pendu: {
    objective: 'Devine le mot choisi par l\'adversaire lettre par lettre.',
    rules: [
      'Un joueur choisit un mot secret, l\'autre doit le deviner.',
      'Propose une lettre à la fois ; bonne lettre = elle apparaît, mauvaise = un trait du pendu se dessine.',
      `Tu as un nombre limité d'erreurs avant la fin de partie.`,
    ],
    winCondition: 'Mot trouvé à temps = victoire du devineur. Trop d\'erreurs = victoire de l\'autre.',
  },
  dames: {
    objective: 'Capture tous les pions adverses ou bloque tous leurs déplacements.',
    rules: [
      'Les pions avancent en diagonale et capturent en sautant par-dessus un pion adverse.',
      'La prise est obligatoire quand elle est possible.',
      'Un pion qui atteint la dernière rangée devient une dame et peut se déplacer sur plusieurs cases.',
    ],
    winCondition: 'L\'adversaire n\'a plus de pion ou plus aucun coup possible.',
  },
  chkobba: {
    objective: 'Ramasse un maximum de cartes sur le tapis pour marquer des points.',
    rules: [
      'Pose une carte pour capturer une carte du tapis de même valeur (ou une somme de cartes égale à sa valeur).',
      'Une "chkobba" (tapis vidé d\'un coup) rapporte un point bonus.',
      'Points en fin de manche : plus de cartes, plus de cartes de deniers, le 7 de deniers, la plus grosse somme.',
    ],
    winCondition: 'Premier joueur à atteindre 11 points gagne la partie.',
  },
  memory: {
    objective: 'Retrouve le plus de paires de cartes identiques.',
    rules: [
      'Retourne deux cartes par tour.',
      'Si elles sont identiques, tu les gardes et tu rejoues.',
      'Si elles sont différentes, elles se retournent et c\'est au tour de l\'adversaire.',
    ],
    winCondition: 'Toutes les paires trouvées : celui qui en a le plus gagne.',
  },
  yaniv: {
    objective: 'Aie la main la plus légère possible (7 points ou moins) pour annoncer "Yaniv".',
    rules: [
      'Défausse une carte ou une combinaison, puis pioche (talon ou défausse).',
      'Quand ta main vaut 7 points ou moins, tu peux annoncer "Yaniv" au lieu de jouer.',
      'Si l\'adversaire a une main égale ou plus légère, il fait "Assaf" et gagne la manche à ta place !',
    ],
    winCondition: 'Le perdant de chaque manche encaisse des points ; premier à 100 points est éliminé (l\'autre gagne).',
  },
  rami: {
    objective: 'Vide ta main en posant des brelans et des suites.',
    rules: [
      'Pioche une carte (talon ou défausse), pose des combinaisons valides si possible, puis défausse.',
      'Un brelan = 3-4 cartes de même valeur, couleurs différentes. Une suite = 3+ cartes qui se suivent, même couleur.',
      'Tu peux aussi ajouter une carte isolée à une combinaison déjà posée sur la table.',
    ],
    winCondition: 'Premier à vider sa main. Le perdant encaisse les points des cartes restantes ; élimination à 151 points.',
  },
  awale: {
    objective: 'Capture plus de la moitié des 48 graines du plateau.',
    rules: [
      'Choisis une de tes cases et sème une graine dans chaque case suivante (dans un seul sens, autour du plateau).',
      'Si ta dernière graine tombe dans une case adverse qui contient alors 2 ou 3 graines, tu la captures.',
      'La capture se poursuit vers l\'arrière tant que les cases adverses précédentes ont aussi 2 ou 3 graines.',
    ],
    winCondition: 'Premier à capturer 25 graines ou plus gagne (48 graines au total sur le plateau).',
  },
  belote: {
    objective: 'Remporte le plus de points possible sur les plis, avec un atout tiré au hasard chaque manche.',
    rules: [
      'Fournis la couleur demandée si tu peux ; sinon coupe (joue atout) si tu en as.',
      'Le plus fort à la couleur demandée (ou le plus fort atout) remporte le pli et ses points.',
      'L\'atout vaut plus : Valet (20), 9 (14), As (11)... Roi+Dame d\'atout dans la même main = bonus "Belote-Rebelote" (+20).',
    ],
    winCondition: 'Dernier pli = +10 points bonus. Premier à 501 points cumulés gagne.',
  },
  backgammon: {
    objective: 'Fais rentrer tes 15 pions chez toi puis sors-les tous avant l\'adversaire.',
    rules: [
      'Lance les dés et avance tes pions du nombre de cases indiqué (les doubles comptent pour 4 coups).',
      'Une case avec 2+ pions adverses est bloquée ; un pion adverse seul peut être capturé et renvoyé sur la barre.',
      'Un pion sur la barre doit rentrer avant tout autre coup. Tu ne peux sortir tes pions que quand ils sont tous dans ta zone finale.',
    ],
    winCondition: 'Premier à sortir ses 15 pions du plateau gagne.',
  },
  football: {
    objective: 'Marque plus de buts que l\'adversaire, comme au air-hockey ou au carrom.',
    rules: [
      'Chacun ton tour, glisse un de tes pions vers l\'arrière (comme un lance-pierre) puis relâche pour le tirer.',
      'Le pion percute le ballon (ou d\'autres pions) selon sa trajectoire et sa force — rebondit sur les bords du terrain.',
      'Vise juste : plus le geste est long, plus le tir est puissant.',
    ],
    winCondition: 'Premier à 3 buts gagne.',
  },
};
