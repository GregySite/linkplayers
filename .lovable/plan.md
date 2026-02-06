

# Plan : Correction du bug de revanche + ajout de 4 nouveaux jeux

## Bug identifie : Rematch desynchronise

Le probleme vient de `startRematch()` qui cree une **nouvelle partie avec un nouveau code**. Les deux joueurs appellent `startRematch()` chacun de leur cote (via le `useEffect` dans `GamePage`), ce qui cree potentiellement **deux parties differentes**. De plus, seul le joueur qui lance la creation est redirige, l'autre reste sur l'ancien code.

**Solution** : Au lieu de creer une nouvelle partie, on **reinitialise la partie existante** en conservant le meme code. Ainsi les deux joueurs restent sur la meme URL et recoivent la mise a jour via le realtime.

---

## Nouveaux jeux a ajouter

1. **Puissance 4 (Connect Four)** - Grille 7x6, jetons qui tombent, aligner 4 pour gagner
2. **Pierre-Papier-Ciseaux** - Choix simultane, best of 3/5, revelation animee
3. **Othello/Reversi** - Grille 8x8, capturer les pions adverses en les encadrant
4. **Blind Test Emoji** - Un joueur envoie des emojis, l'autre doit deviner le film/chanson (original et fun)

---

## Etapes d'implementation

### 1. Migration de base de donnees
Ajouter les nouveaux types de jeux a l'enum `game_type` :
```sql
ALTER TYPE public.game_type ADD VALUE 'connect4';
ALTER TYPE public.game_type ADD VALUE 'rps';
ALTER TYPE public.game_type ADD VALUE 'othello';
ALTER TYPE public.game_type ADD VALUE 'emoji_quiz';
```

### 2. Correction du bug de rematch (`src/hooks/useGame.ts`)
- Modifier `startRematch()` pour faire un **UPDATE** de la partie existante au lieu d'un INSERT avec nouveau code
- Reinitialiser le `game_state` (plateau vide, scores conserves, votes remis a null)
- Remettre le `status` a `playing`, `winner` a null, `current_turn` au player1
- Ajouter un garde dans le `useEffect` de `GamePage` pour que **seul le player1** declenche le rematch (eviter le double appel)

### 3. Mise a jour du type `GameType` (`src/hooks/useGame.ts`)
```typescript
export type GameType = 'morpion' | 'battleship' | 'connect4' | 'rps' | 'othello' | 'emoji_quiz';
```

### 4. Utilitaires de jeu (`src/lib/gameUtils.ts`)
Ajouter les fonctions pour chaque nouveau jeu :
- **Connect4** : `checkConnect4Winner()`, `dropPiece()`, `isConnect4Draw()`
- **RPS** : `determineRPSWinner()`, types pour les choix (rock/paper/scissors)
- **Othello** : `getValidMoves()`, `flipPieces()`, `checkOthelloWinner()`, `countPieces()`
- **Emoji Quiz** : types pour les rounds et les reponses

### 5. Composants de jeu (nouveaux fichiers)

- **`src/components/games/Connect4Game.tsx`**
  - Grille 7 colonnes x 6 lignes
  - Animation de chute des jetons (framer-motion)
  - Survol pour previsualiser ou le jeton va tomber
  - Detection de victoire (4 alignes horizontalement, verticalement, diagonalement)

- **`src/components/games/RPSGame.tsx`**  
  - 3 boutons de choix (Pierre, Papier, Ciseaux) avec icones
  - Phase de choix simultane (les deux joueurs choisissent sans voir l'autre)
  - Revelation animee des deux choix
  - Systeme de rounds (best of 3 par defaut)
  - Compteur de rounds gagnes

- **`src/components/games/OthelloGame.tsx`**
  - Grille 8x8 avec pions noirs et blancs
  - Mise en surbrillance des coups valides
  - Animation de retournement des pions captures
  - Compteur de pions en temps reel
  - Gestion du cas ou un joueur ne peut pas jouer (passe son tour)

- **`src/components/games/EmojiQuizGame.tsx`**
  - Un joueur (le "maitre") tape une serie d'emojis representant un film/chanson/personnage
  - L'autre joueur doit deviner en tapant sa reponse
  - Le maitre valide ou refuse la reponse
  - Alternance des roles a chaque round
  - Compteur de points

### 6. Integration dans `GamePage.tsx`
- Ajouter les imports et le rendu conditionnel pour chaque nouveau type de jeu
- Ajouter les handlers de mouvements/actions pour chaque jeu
- Mettre a jour `isGameFinished()` pour gerer les nouvelles conditions de victoire
- Ajouter les titres de jeux dans le header

### 7. Mise a jour de la page d'accueil (`src/pages/Index.tsx`)
- Ajouter 4 nouvelles `GameCard` avec icones et descriptions
- Reorganiser la grille pour afficher 6 jeux proprement (grille 2x3 ou liste)

### 8. Mise a jour de `createGame()` dans `useGame.ts`
Ajouter les etats initiaux pour chaque nouveau type de jeu :
- **Connect4** : `{ board: Array(42).fill(null) }` (6 lignes x 7 colonnes)
- **RPS** : `{ player1Choice: null, player2Choice: null, rounds: [], currentRound: 1, bestOf: 3 }`
- **Othello** : `{ board: [...initial 8x8 setup...] }`
- **Emoji Quiz** : `{ currentMaster: 'player1', emojis: '', guess: '', rounds: [], currentRound: 1 }`

---

## Details techniques

### Composants touches
| Fichier | Action |
|---------|--------|
| `supabase/migrations/` | Nouveau fichier SQL pour l'enum |
| `src/hooks/useGame.ts` | Type GameType, createGame, startRematch |
| `src/lib/gameUtils.ts` | Fonctions utilitaires pour les 4 jeux |
| `src/components/games/Connect4Game.tsx` | Nouveau |
| `src/components/games/RPSGame.tsx` | Nouveau |
| `src/components/games/OthelloGame.tsx` | Nouveau |
| `src/components/games/EmojiQuizGame.tsx` | Nouveau |
| `src/pages/GamePage.tsx` | Integration + handlers |
| `src/pages/Index.tsx` | Cartes des nouveaux jeux |
| `src/components/GameCard.tsx` | Aucun changement |

