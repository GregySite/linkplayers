import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// ==================== TYPES ====================

type GameType = 'morpion' | 'battleship' | 'connect4' | 'rps' | 'othello' | 'pendu' | 'dames' | 'memory' | 'chkobba' | 'yaniv' | 'rami' | 'awale' | 'belote' | 'backgammon' | 'football'

const VALID_GAME_TYPES: GameType[] = ['morpion', 'battleship', 'connect4', 'rps', 'othello', 'pendu', 'dames', 'memory', 'chkobba', 'yaniv', 'rami', 'awale', 'belote', 'backgammon', 'football']

// ==================== UTILITY FUNCTIONS ====================

function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function createConnect4Board(): (string | null)[] {
  return Array(42).fill(null)
}

function createOthelloBoard(): (string | null)[] {
  const board: (string | null)[] = Array(64).fill(null)
  board[27] = 'white'
  board[28] = 'black'
  board[35] = 'black'
  board[36] = 'white'
  return board
}

function createDamesBoard(): (string | null)[] {
  const board: (string | null)[] = Array(100).fill(null)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 10; col++) {
      if ((row + col) % 2 === 1) board[row * 10 + col] = 'black'
    }
  }
  for (let row = 6; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if ((row + col) % 2 === 1) board[row * 10 + col] = 'white'
    }
  }
  return board
}

const MEMORY_EMOJIS = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
  '🐨', '🐯',
]

function createMemoryCards(): unknown[] {
  const cards: unknown[] = []
  MEMORY_EMOJIS.forEach((emoji, idx) => {
    cards.push({ id: idx * 2, emoji, flipped: false, matched: false })
    cards.push({ id: idx * 2 + 1, emoji, flipped: false, matched: false })
  })
  // Shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]]
  }
  return cards
}

type ChkobbaSuit = 'denari' | 'coppe' | 'spade' | 'bastoni'
interface ChkobbaCard { id: string; suit: ChkobbaSuit; value: number }

function createChkobbaRound(round: number, matchScores: { player1: number; player2: number }) {
  const suits: ChkobbaSuit[] = ['denari', 'coppe', 'spade', 'bastoni']
  const deck: ChkobbaCard[] = []
  for (const suit of suits) {
    for (let value = 1; value <= 10; value++) deck.push({ id: `${suit}-${value}`, suit, value })
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]]
  }
  const table = deck.splice(0, 4)
  const p1 = deck.splice(0, 3)
  const p2 = deck.splice(0, 3)
  return {
    deck, table,
    hands: { player1: p1, player2: p2 },
    captured: { player1: [], player2: [] },
    chkobbas: { player1: 0, player2: 0 },
    lastCapturer: null,
    matchScores,
    round,
    lastPlay: null,
    roundSummary: null,
  }
}

type YanivSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs' | 'joker'
interface YanivCard { id: string; suit: YanivSuit; rank: number }

function createYanivRound(round: number, scores: { player1: number; player2: number }) {
  const suits: YanivSuit[] = ['spades', 'hearts', 'diamonds', 'clubs']
  const deck: YanivCard[] = []
  for (const suit of suits) {
    for (let rank = 1; rank <= 13; rank++) deck.push({ id: `${suit}-${rank}`, suit, rank })
  }
  deck.push({ id: 'joker-1', suit: 'joker', rank: 0 })
  deck.push({ id: 'joker-2', suit: 'joker', rank: 0 })
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]]
  }
  const p1 = deck.splice(0, 5)
  const p2 = deck.splice(0, 5)
  const first = deck.splice(0, 1)
  return {
    deck,
    discardPile: first,
    pickable: first,
    hands: { player1: p1, player2: p2 },
    scores,
    round,
    lastPlay: null,
    roundSummary: null,
  }
}

type RamiSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs' | 'joker'
interface RamiCard { id: string; suit: RamiSuit; rank: number }

function createRamiRound(round: number, scores: { player1: number; player2: number }) {
  const suits: RamiSuit[] = ['spades', 'hearts', 'diamonds', 'clubs']
  const deck: RamiCard[] = []
  for (const suit of suits) {
    for (let rank = 1; rank <= 13; rank++) deck.push({ id: `${suit}-${rank}`, suit, rank })
  }
  deck.push({ id: 'joker-1', suit: 'joker', rank: 0 })
  deck.push({ id: 'joker-2', suit: 'joker', rank: 0 })
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]]
  }
  const p1 = deck.splice(0, 13)
  const p2 = deck.splice(0, 13)
  const firstDiscard = deck.splice(0, 1)
  return {
    deck,
    discardPile: firstDiscard,
    hands: { player1: p1, player2: p2 },
    melds: [],
    scores,
    round,
    hasDrawn: false,
    lastDrawFrom: null,
    roundSummary: null,
  }
}

function createKalahState() {
  const pits = Array(14).fill(4)
  pits[6] = 0 // réservoir joueur 1
  pits[13] = 0 // réservoir joueur 2
  return {
    pits,
    lastMove: null,
  }
}

type BeloteSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs'
interface BeloteCard { id: string; suit: BeloteSuit; rank: number }

function createBeloteRound(round: number, scores: { player1: number; player2: number }) {
  const suits: BeloteSuit[] = ['spades', 'hearts', 'diamonds', 'clubs']
  const deck: BeloteCard[] = []
  for (const suit of suits) {
    for (const rank of [7, 8, 9, 10, 11, 12, 13, 14]) deck.push({ id: `${suit}-${rank}`, suit, rank })
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]]
  }
  const trumpSuit = suits[Math.floor(Math.random() * 4)]
  return {
    hands: { player1: deck.slice(0, 16), player2: deck.slice(16, 32) },
    trumpSuit,
    currentTrick: [],
    roundPoints: { player1: 0, player2: 0 },
    beloteRebeloteAwardedTo: null,
    scores,
    round,
    roundSummary: null,
  }
}

function createBackgammonState() {
  const points = Array(24).fill(0)
  points[23] = 2; points[12] = 5; points[7] = 3; points[5] = 5
  points[0] = -2; points[11] = -5; points[16] = -3; points[18] = -5
  return {
    points,
    bar: { player1: 0, player2: 0 },
    off: { player1: 0, player2: 0 },
    dice: [],
    diceRolled: false,
  }
}

function createFootballState() {
  const GOAL_CENTER_X = 30
  const formation = (side: 'top' | 'bottom', prefix: string) => {
    const baseY = side === 'top' ? 16 : 100 - 16
    const midY = side === 'top' ? 30 : 100 - 30
    return [
      { id: `${prefix}-gk`, x: GOAL_CENTER_X, y: side === 'top' ? 8 : 92, vx: 0, vy: 0 },
      { id: `${prefix}-d1`, x: GOAL_CENTER_X - 14, y: baseY, vx: 0, vy: 0 },
      { id: `${prefix}-d2`, x: GOAL_CENTER_X + 14, y: baseY, vx: 0, vy: 0 },
      { id: `${prefix}-a1`, x: GOAL_CENTER_X - 10, y: midY, vx: 0, vy: 0 },
      { id: `${prefix}-a2`, x: GOAL_CENTER_X + 10, y: midY, vx: 0, vy: 0 },
    ]
  }
  return {
    tokens: {
      player1: formation('bottom', 'player1'),
      player2: formation('top', 'player2'),
    },
    ball: { x: GOAL_CENTER_X, y: 50, vx: 0, vy: 0 },
    scores: { player1: 0, player2: 0 },
    turnsPlayed: 0,
    lastAction: null,
  }
}

function getInitialState(gameType: GameType, extra?: Record<string, unknown>): Record<string, unknown> {
  const base = extra || {}
  switch (gameType) {
    case 'morpion':
      return { board: Array(9).fill(null), ...base }
    case 'battleship':
      return {
        player1Grid: [], player2Grid: [],
        player1Ships: [], player2Ships: [],
        player1Ready: false, player2Ready: false,
        phase: 'placement', ...base,
      }
    case 'connect4':
      return { board: createConnect4Board(), ...base }
    case 'rps':
      return {
        player1Choice: null, player2Choice: null,
        rounds: [], currentRound: 1, bestOf: 3, ...base,
      }
    case 'othello':
      return { board: createOthelloBoard(), currentColor: 'black', ...base }
    case 'pendu':
      return { word: null, guessedLetters: [], ...base }
    case 'dames':
      return { board: createDamesBoard(), currentColor: 'white', ...base }
    case 'chkobba':
      return { ...createChkobbaRound(1, { player1: 0, player2: 0 }), ...base }
    case 'yaniv':
      return { ...createYanivRound(1, { player1: 0, player2: 0 }), ...base }
    case 'rami':
      return { ...createRamiRound(1, { player1: 0, player2: 0 }), ...base }
    case 'awale':
      return { ...createKalahState(), ...base }
    case 'belote':
      return { ...createBeloteRound(1, { player1: 0, player2: 0 }), ...base }
    case 'backgammon':
      return { ...createBackgammonState(), ...base }
    case 'football':
      return { ...createFootballState(), ...base }
    case 'memory':
      return {
        cards: createMemoryCards(),
        flippedIndices: [],
        memoryScores: { player1: 0, player2: 0 },
        ...base,
      }
    default:
      return base
  }
}

// ==================== VALIDATION ====================

function validateGameState(gameType: string, state: Record<string, unknown>): string | null {
  switch (gameType) {
    case 'morpion': {
      if (!Array.isArray(state.board) || state.board.length !== 9) {
        return 'Morpion board must be an array of 9 elements'
      }
      for (const cell of state.board) {
        if (cell !== null && cell !== 'X' && cell !== 'O') {
          return 'Invalid morpion board cell value'
        }
      }
      break
    }
    case 'connect4': {
      if (!Array.isArray(state.board) || state.board.length !== 42) {
        return 'Connect4 board must be an array of 42 elements'
      }
      for (const cell of state.board) {
        if (cell !== null && cell !== 'red' && cell !== 'yellow') {
          return 'Invalid connect4 board cell value'
        }
      }
      break
    }
    case 'othello': {
      if (!Array.isArray(state.board) || state.board.length !== 64) {
        return 'Othello board must be an array of 64 elements'
      }
      for (const cell of state.board) {
        if (cell !== null && cell !== 'black' && cell !== 'white') {
          return 'Invalid othello board cell value'
        }
      }
      if (state.currentColor !== null && state.currentColor !== 'black' && state.currentColor !== 'white') {
        return 'Invalid othello currentColor'
      }
      break
    }
    case 'battleship': {
      if (state.phase !== undefined && !['placement', 'playing', 'finished'].includes(state.phase as string)) {
        return 'Invalid battleship phase'
      }
      break
    }
    case 'rps': {
      const validChoices = [null, 'rock', 'paper', 'scissors']
      if (state.player1Choice !== undefined && !validChoices.includes(state.player1Choice as string | null)) {
        return 'Invalid RPS choice for player1'
      }
      if (state.player2Choice !== undefined && !validChoices.includes(state.player2Choice as string | null)) {
        return 'Invalid RPS choice for player2'
      }
      if (state.bestOf !== undefined) {
        const bestOf = state.bestOf as number
        if (typeof bestOf !== 'number' || bestOf < 1 || bestOf > 11) {
          return 'Invalid bestOf value'
        }
      }
      break
    }
    case 'pendu': {
      // word can be null (not set yet) or a string
      if (state.word !== null && state.word !== undefined && typeof state.word !== 'string') {
        return 'Invalid pendu word'
      }
      if (state.guessedLetters !== undefined && !Array.isArray(state.guessedLetters)) {
        return 'guessedLetters must be an array'
      }
      break
    }
    case 'dames': {
      if (state.board !== undefined) {
        if (!Array.isArray(state.board) || state.board.length !== 100) {
          return 'Dames board must be an array of 100 elements'
        }
        const validPieces = [null, 'white', 'black', 'whiteKing', 'blackKing']
        for (const cell of state.board) {
          if (!validPieces.includes(cell as string | null)) {
            return 'Invalid dames board cell value'
          }
        }
      }
      if (state.currentColor !== undefined && state.currentColor !== 'white' && state.currentColor !== 'black') {
        return 'Invalid dames currentColor'
      }
      break
    }
    case 'chkobba': {
      if (!Array.isArray(state.deck) || !Array.isArray(state.table)) {
        return 'Chkobba deck and table must be arrays'
      }
      if (state.deck.length + state.table.length > 40) {
        return 'Invalid chkobba deck size'
      }
      const hands = state.hands as Record<string, unknown> | undefined
      if (!hands || !Array.isArray(hands.player1) || !Array.isArray(hands.player2)) {
        return 'Chkobba hands must be arrays'
      }
      const captured = state.captured as Record<string, unknown> | undefined
      if (!captured || !Array.isArray(captured.player1) || !Array.isArray(captured.player2)) {
        return 'Chkobba captured must be arrays'
      }
      const ms = state.matchScores as Record<string, unknown> | undefined
      if (!ms || typeof ms.player1 !== 'number' || typeof ms.player2 !== 'number') {
        return 'Invalid chkobba matchScores'
      }
      break
    }
    case 'memory': {
      if (state.cards !== undefined && !Array.isArray(state.cards)) {
        return 'Memory cards must be an array'
      }
      if (state.flippedIndices !== undefined && !Array.isArray(state.flippedIndices)) {
        return 'flippedIndices must be an array'
      }
      break
    }
    case 'yaniv': {
      if (!Array.isArray(state.deck) || !Array.isArray(state.discardPile) || !Array.isArray(state.pickable)) {
        return 'Yaniv deck, discardPile and pickable must be arrays'
      }
      if (state.deck.length + state.discardPile.length > 54) {
        return 'Invalid yaniv deck size'
      }
      const hands = state.hands as Record<string, unknown> | undefined
      if (!hands || !Array.isArray(hands.player1) || !Array.isArray(hands.player2)) {
        return 'Yaniv hands must be arrays'
      }
      const sc = state.scores as Record<string, unknown> | undefined
      if (!sc || typeof sc.player1 !== 'number' || typeof sc.player2 !== 'number') {
        return 'Invalid yaniv scores'
      }
      break
    }
    case 'rami': {
      if (!Array.isArray(state.deck) || !Array.isArray(state.discardPile) || !Array.isArray(state.melds)) {
        return 'Rami deck, discardPile and melds must be arrays'
      }
      const hands = state.hands as Record<string, unknown> | undefined
      if (!hands || !Array.isArray(hands.player1) || !Array.isArray(hands.player2)) {
        return 'Rami hands must be arrays'
      }
      const sc = state.scores as Record<string, unknown> | undefined
      if (!sc || typeof sc.player1 !== 'number' || typeof sc.player2 !== 'number') {
        return 'Invalid rami scores'
      }
      break
    }
    case 'awale': {
      if (!Array.isArray(state.pits) || state.pits.length !== 14) {
        return 'Kalah pits must be an array of 14'
      }
      break
    }
    case 'belote': {
      const hands = state.hands as Record<string, unknown> | undefined
      if (!hands || !Array.isArray(hands.player1) || !Array.isArray(hands.player2)) {
        return 'Belote hands must be arrays'
      }
      if (!Array.isArray(state.currentTrick)) {
        return 'Belote currentTrick must be an array'
      }
      const sc = state.scores as Record<string, unknown> | undefined
      if (!sc || typeof sc.player1 !== 'number' || typeof sc.player2 !== 'number') {
        return 'Invalid belote scores'
      }
      break
    }
    case 'backgammon': {
      if (!Array.isArray(state.points) || state.points.length !== 24) {
        return 'Backgammon points must be an array of 24'
      }
      const bar = state.bar as Record<string, unknown> | undefined
      const off = state.off as Record<string, unknown> | undefined
      if (!bar || typeof bar.player1 !== 'number' || typeof bar.player2 !== 'number') {
        return 'Invalid backgammon bar'
      }
      if (!off || typeof off.player1 !== 'number' || typeof off.player2 !== 'number') {
        return 'Invalid backgammon off'
      }
      break
    }
    case 'football': {
      const tokens = state.tokens as Record<string, unknown> | undefined
      if (!tokens || !Array.isArray(tokens.player1) || !Array.isArray(tokens.player2)) {
        return 'Football tokens must be arrays'
      }
      const ball = state.ball as Record<string, unknown> | undefined
      if (!ball || typeof ball.x !== 'number' || typeof ball.y !== 'number') {
        return 'Invalid football ball position'
      }
      const sc = state.scores as Record<string, unknown> | undefined
      if (!sc || typeof sc.player1 !== 'number' || typeof sc.player2 !== 'number') {
        return 'Invalid football scores'
      }
      break
    }
  }

  // Validate scores if present
  if (state.scores) {
    const scores = state.scores as Record<string, unknown>
    if (typeof scores !== 'object' || typeof scores.player1 !== 'number' || typeof scores.player2 !== 'number') {
      return 'Invalid scores structure'
    }
    if ((scores.player1 as number) < 0 || (scores.player2 as number) < 0 ||
        (scores.player1 as number) > 1000 || (scores.player2 as number) > 1000) {
      return 'Invalid score values'
    }
  }

  return null
}

// ==================== ACTION HANDLERS ====================

// deno-lint-ignore no-explicit-any
type SupabaseAny = any

async function handleCreate(supabase: SupabaseAny, playerId: string, params: Record<string, unknown>) {
  const { game_type } = params

  if (!game_type || !VALID_GAME_TYPES.includes(game_type as GameType)) {
    return { error: 'Invalid game type' }
  }

  const code = generateGameCode()
  const initialState = getInitialState(game_type as GameType)

  const { data, error } = await supabase
    .from('games')
    .insert([{
      code,
      game_type,
      player1_id: playerId,
      current_turn: playerId,
      game_state: initialState,
    }])
    .select()
    .single()

  if (error) {
    console.error('Create game error:', error)
    return { error: 'Failed to create game' }
  }

  console.log(`Game created: ${code} (${game_type}) by ${playerId}`)
  return { data }
}

async function handleJoin(supabase: SupabaseAny, playerId: string, params: Record<string, unknown>) {
  const { code } = params

  if (!code || typeof code !== 'string') {
    return { error: 'Code is required' }
  }

  const upperCode = (code as string).toUpperCase()

  const { data: game, error: fetchError } = await supabase
    .from('games')
    .select('*')
    .eq('code', upperCode)
    .maybeSingle()

  if (fetchError || !game) {
    return { error: 'Game not found' }
  }

  // Already a participant
  if (game.player1_id === playerId || game.player2_id === playerId) {
    return { data: game }
  }

  // Game is full
  if (game.player2_id) {
    return { error: 'Game is already full' }
  }

  // Atomic join
  const { data, error: updateError } = await supabase
    .from('games')
    .update({ player2_id: playerId, status: 'playing' })
    .eq('id', game.id)
    .is('player2_id', null)
    .select()
    .single()

  if (updateError || !data) {
    console.error('Join game error:', updateError)
    return { error: 'Game is already full' }
  }

  console.log(`Player ${playerId} joined game ${upperCode}`)
  return { data }
}

async function handleUpdateState(supabase: SupabaseAny, playerId: string, params: Record<string, unknown>) {
  const { game_id, game_state, additional_updates } = params

  if (!game_id || typeof game_id !== 'string') {
    return { error: 'game_id is required' }
  }
  if (!game_state || typeof game_state !== 'object') {
    return { error: 'game_state is required' }
  }

  const { data: game, error: fetchError } = await supabase
    .from('games')
    .select('*')
    .eq('id', game_id)
    .single()

  if (fetchError || !game) {
    return { error: 'Game not found' }
  }

  if (game.player1_id !== playerId && game.player2_id !== playerId) {
    console.warn(`Unauthorized update attempt by ${playerId} on game ${game_id}`)
    return { error: 'Not a participant in this game' }
  }

  if (game.status !== 'playing') {
    console.warn(`Attempt to update game ${game_id} with status ${game.status}`)
    return { error: 'Game is not in progress' }
  }

  // Turn enforcement exceptions
  const currentState = game.game_state as Record<string, unknown>
  const isSimultaneousGame = game.game_type === 'rps'
  const isBattleshipPlacement = game.game_type === 'battleship' && currentState.phase === 'placement'
  // Pendu: player1 sets the word (no turn check needed for that), then player2 guesses
  const isPenduWordSetting = game.game_type === 'pendu' && !currentState.word

  if (!isSimultaneousGame && !isBattleshipPlacement && !isPenduWordSetting) {
    if (game.current_turn && game.current_turn !== playerId) {
      console.warn(`Out-of-turn move by ${playerId} on game ${game_id} (turn: ${game.current_turn})`)
      return { error: 'Not your turn' }
    }
  }

  // Validate game state structure
  const validationError = validateGameState(game.game_type, game_state as Record<string, unknown>)
  if (validationError) {
    console.warn(`Invalid game state for ${game.game_type}: ${validationError}`)
    return { error: validationError }
  }

  // Build update payload — protect critical fields
  const updatePayload: Record<string, unknown> = { game_state }
  if (additional_updates && typeof additional_updates === 'object') {
    const addUpdates = additional_updates as Record<string, unknown>

    if ('current_turn' in addUpdates) {
      const newTurn = addUpdates.current_turn
      if (newTurn !== null && newTurn !== game.player1_id && newTurn !== game.player2_id) {
        return { error: 'Invalid current_turn value' }
      }
      updatePayload.current_turn = newTurn
    }

    if ('winner' in addUpdates) {
      const newWinner = addUpdates.winner
      if (newWinner !== null && newWinner !== game.player1_id && newWinner !== game.player2_id) {
        return { error: 'Invalid winner value' }
      }
      updatePayload.winner = newWinner
    }

    if ('status' in addUpdates) {
      const newStatus = addUpdates.status
      if (newStatus !== 'finished') {
        return { error: 'Can only set status to finished' }
      }
      updatePayload.status = 'finished'
    }
  }

  const { data, error: updateError } = await supabase
    .from('games')
    .update(updatePayload)
    .eq('id', game_id)
    .select()
    .single()

  if (updateError) {
    console.error('Update game state error:', updateError)
    return { error: 'Failed to update game state' }
  }

  return { data }
}

async function handleVoteRematch(supabase: SupabaseAny, playerId: string, params: Record<string, unknown>) {
  const { game_id, want_rematch } = params

  if (!game_id || typeof game_id !== 'string') {
    return { error: 'game_id is required' }
  }
  if (typeof want_rematch !== 'boolean') {
    return { error: 'want_rematch must be a boolean' }
  }

  const { data: game, error: fetchError } = await supabase
    .from('games')
    .select('*')
    .eq('id', game_id)
    .single()

  if (fetchError || !game) {
    return { error: 'Game not found' }
  }

  if (game.player1_id !== playerId && game.player2_id !== playerId) {
    return { error: 'Not a participant in this game' }
  }

  const amPlayer1 = game.player1_id === playerId
  const currentState = game.game_state as Record<string, unknown>
  const rematchKey = amPlayer1 ? 'player1WantsRematch' : 'player2WantsRematch'

  const newState = { ...currentState, [rematchKey]: want_rematch }

  const validationError = validateGameState(game.game_type, newState)
  if (validationError) {
    return { error: validationError }
  }

  const { data, error: updateError } = await supabase
    .from('games')
    .update({ game_state: newState })
    .eq('id', game_id)
    .select()
    .single()

  if (updateError) {
    console.error('Vote rematch error:', updateError)
    return { error: 'Failed to vote for rematch' }
  }

  return { data }
}

async function handleStartRematch(supabase: SupabaseAny, playerId: string, params: Record<string, unknown>) {
  const { game_id } = params

  if (!game_id || typeof game_id !== 'string') {
    return { error: 'game_id is required' }
  }

  const { data: game, error: fetchError } = await supabase
    .from('games')
    .select('*')
    .eq('id', game_id)
    .single()

  if (fetchError || !game) {
    return { error: 'Game not found' }
  }

  if (game.player1_id !== playerId) {
    return { error: 'Only player1 can start rematch' }
  }

  const currentState = game.game_state as Record<string, unknown>
  const p1Wants = currentState.player1WantsRematch
  const p2Wants = currentState.player2WantsRematch

  if (p1Wants !== true || p2Wants !== true) {
    return { error: 'Both players must agree to rematch' }
  }

  const currentScores = (currentState.scores as { player1: number; player2: number }) || { player1: 0, player2: 0 }
  const newScores = { ...currentScores }
  if (game.winner === game.player1_id) {
    newScores.player1 += 1
  } else if (game.winner === game.player2_id) {
    newScores.player2 += 1
  }

  // Alternate starting player: track rematch count
  const rematchCount = ((currentState.rematchCount as number) || 0) + 1
  const startsFirst = rematchCount % 2 === 0 ? game.player1_id : game.player2_id

  const freshState = getInitialState(game.game_type as GameType, {
    scores: newScores,
    rematchCount,
    player1WantsRematch: null,
    player2WantsRematch: null,
  })

  // For pendu, if player2 starts, they choose the word (swap roles)
  const penduTurn = game.game_type === 'pendu' ? startsFirst : startsFirst

  const { data, error: updateError } = await supabase
    .from('games')
    .update({
      game_state: freshState,
      status: 'playing',
      winner: null,
      current_turn: startsFirst,
    })
    .eq('id', game_id)
    .select()
    .single()

  if (updateError) {
    console.error('Start rematch error:', updateError)
    return { error: 'Failed to start rematch' }
  }

  console.log(`Rematch started for game ${game.code}`)
  return { data }
}

// ==================== MAIN HANDLER ====================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json()
    const { action, player_id: playerId, ...params } = body

    if (!playerId || typeof playerId !== 'string') {
      return new Response(JSON.stringify({ error: 'player_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Request from player ${playerId}, action: ${action}`)

    let result: { data?: unknown; error?: string }

    switch (action) {
      case 'create':
        result = await handleCreate(supabaseAdmin, playerId, params)
        break
      case 'join':
        result = await handleJoin(supabaseAdmin, playerId, params)
        break
      case 'update_state':
        result = await handleUpdateState(supabaseAdmin, playerId, params)
        break
      case 'vote_rematch':
        result = await handleVoteRematch(supabaseAdmin, playerId, params)
        break
      case 'start_rematch':
        result = await handleStartRematch(supabaseAdmin, playerId, params)
        break
      default:
        result = { error: 'Unknown action' }
    }

    const status = result.error ? 400 : 200
    return new Response(JSON.stringify(result), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
