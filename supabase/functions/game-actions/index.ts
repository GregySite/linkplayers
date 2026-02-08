import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// ==================== TYPES ====================

type GameType = 'morpion' | 'battleship' | 'connect4' | 'rps' | 'othello'

const VALID_GAME_TYPES: GameType[] = ['morpion', 'battleship', 'connect4', 'rps', 'othello']

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

async function handleCreate(supabase: ReturnType<typeof createClient>, playerId: string, params: Record<string, unknown>) {
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

async function handleJoin(supabase: ReturnType<typeof createClient>, playerId: string, params: Record<string, unknown>) {
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

  // Atomic join - race condition fix: only update if player2_id is still null
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

async function handleUpdateState(supabase: ReturnType<typeof createClient>, playerId: string, params: Record<string, unknown>) {
  const { game_id, game_state, additional_updates } = params

  if (!game_id || typeof game_id !== 'string') {
    return { error: 'game_id is required' }
  }
  if (!game_state || typeof game_state !== 'object') {
    return { error: 'game_state is required' }
  }

  // Fetch game and verify player is a participant
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

  // Only allow updates to games that are currently being played
  if (game.status !== 'playing') {
    console.warn(`Attempt to update game ${game_id} with status ${game.status}`)
    return { error: 'Game is not in progress' }
  }

  // Turn enforcement: verify it's the player's turn
  // Exceptions: RPS (simultaneous choices) and Battleship placement phase
  const currentState = game.game_state as Record<string, unknown>
  const isSimultaneousGame = game.game_type === 'rps'
  const isBattleshipPlacement = game.game_type === 'battleship' && currentState.phase === 'placement'

  if (!isSimultaneousGame && !isBattleshipPlacement) {
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

    // Validate current_turn: must be one of the two players or null
    if ('current_turn' in addUpdates) {
      const newTurn = addUpdates.current_turn
      if (newTurn !== null && newTurn !== game.player1_id && newTurn !== game.player2_id) {
        return { error: 'Invalid current_turn value' }
      }
      updatePayload.current_turn = newTurn
    }

    // Validate winner: must be one of the two players or null
    if ('winner' in addUpdates) {
      const newWinner = addUpdates.winner
      if (newWinner !== null && newWinner !== game.player1_id && newWinner !== game.player2_id) {
        return { error: 'Invalid winner value' }
      }
      updatePayload.winner = newWinner
    }

    // Validate status: only allow transition to 'finished', and only with a winner or draw
    if ('status' in addUpdates) {
      const newStatus = addUpdates.status
      if (newStatus !== 'finished') {
        return { error: 'Can only set status to finished' }
      }
      // A game can only be finished if a winner is being set or it's a draw (winner = null)
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

async function handleVoteRematch(supabase: ReturnType<typeof createClient>, playerId: string, params: Record<string, unknown>) {
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

async function handleStartRematch(supabase: ReturnType<typeof createClient>, playerId: string, params: Record<string, unknown>) {
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

  // Only player1 can trigger rematch
  if (game.player1_id !== playerId) {
    return { error: 'Only player1 can start rematch' }
  }

  const currentState = game.game_state as Record<string, unknown>
  const p1Wants = currentState.player1WantsRematch
  const p2Wants = currentState.player2WantsRematch

  if (p1Wants !== true || p2Wants !== true) {
    return { error: 'Both players must agree to rematch' }
  }

  // Calculate updated scores
  const currentScores = (currentState.scores as { player1: number; player2: number }) || { player1: 0, player2: 0 }
  const newScores = { ...currentScores }
  if (game.winner === game.player1_id) {
    newScores.player1 += 1
  } else if (game.winner === game.player2_id) {
    newScores.player2 += 1
  }

  const freshState = getInitialState(game.game_type as GameType, {
    scores: newScores,
    player1WantsRematch: null,
    player2WantsRematch: null,
  })

  const { data, error: updateError } = await supabase
    .from('games')
    .update({
      game_state: freshState,
      status: 'playing',
      winner: null,
      current_turn: game.player1_id,
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
    // Verify authentication via JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify the user's identity using their JWT
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: authError } = await supabaseUser.auth.getClaims(token)
    if (authError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const playerId = claimsData.claims.sub as string
    console.log(`Authenticated request from user ${playerId}`)

    // Service role client for database operations (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json()
    const { action, ...params } = body

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
