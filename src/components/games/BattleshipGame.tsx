import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Game } from '@/hooks/useGame';
import { 
  BattleshipCell, 
  createEmptyGrid, 
  SHIPS, 
  canPlaceShip,
  checkAllShipsSunk 
} from '@/lib/gameUtils';
import { RotateCw, Target, Ship } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BattleshipGameProps {
  game: Game;
  playerId: string;
  onPlaceShips: (grid: BattleshipCell[][]) => void;
  onShoot: (row: number, col: number) => void;
}

export const BattleshipGame = ({ game, playerId, onPlaceShips, onShoot }: BattleshipGameProps) => {
  const gameState = game.game_state as {
    player1Grid?: BattleshipCell[][];
    player2Grid?: BattleshipCell[][];
    player1Ready?: boolean;
    player2Ready?: boolean;
    phase?: string;
  };

  const amPlayer1 = game.player1_id === playerId;
  const myReady = amPlayer1 ? gameState.player1Ready : gameState.player2Ready;
  const opponentReady = amPlayer1 ? gameState.player2Ready : gameState.player1Ready;
  const myGrid = amPlayer1 ? gameState.player1Grid : gameState.player2Grid;
  const opponentGrid = amPlayer1 ? gameState.player2Grid : gameState.player1Grid;
  const phase = gameState.phase || 'placement';
  const isMyTurn = game.current_turn === playerId;

  const [placementGrid, setPlacementGrid] = useState<BattleshipCell[][]>(createEmptyGrid);
  const [currentShipIndex, setCurrentShipIndex] = useState(0);
  const [horizontal, setHorizontal] = useState(true);
  const [hoverCells, setHoverCells] = useState<[number, number][]>([]);

  useEffect(() => {
    if (myGrid && myGrid.length > 0) {
      setPlacementGrid(myGrid);
    }
  }, [myGrid]);

  const currentShip = SHIPS[currentShipIndex];
  const allShipsPlaced = currentShipIndex >= SHIPS.length;

  const getHoverCells = (row: number, col: number): [number, number][] => {
    if (!currentShip || allShipsPlaced) return [];
    const cells: [number, number][] = [];
    for (let i = 0; i < currentShip.size; i++) {
      const r = horizontal ? row : row + i;
      const c = horizontal ? col + i : col;
      if (r < 10 && c < 10) cells.push([r, c]);
    }
    return cells;
  };

  const handlePlacementHover = (row: number, col: number) => {
    setHoverCells(getHoverCells(row, col));
  };

  const handlePlaceShip = (row: number, col: number) => {
    if (!currentShip || allShipsPlaced) return;
    if (!canPlaceShip(placementGrid, row, col, currentShip.size, horizontal)) return;

    const newGrid = placementGrid.map(r => r.map(c => ({ ...c })));
    for (let i = 0; i < currentShip.size; i++) {
      const r = horizontal ? row : row + i;
      const c = horizontal ? col + i : col;
      newGrid[r][c].hasShip = true;
    }
    setPlacementGrid(newGrid);
    setCurrentShipIndex(prev => prev + 1);
    setHoverCells([]);
  };

  const handleConfirmPlacement = () => {
    onPlaceShips(placementGrid);
  };

  const handleShoot = (row: number, col: number) => {
    if (!isMyTurn || phase !== 'playing') return;
    if (opponentGrid && opponentGrid[row][col].hit) return;
    onShoot(row, col);
  };

  // Check for winner
  const checkWinner = () => {
    if (phase !== 'playing') return null;
    if (opponentGrid && checkAllShipsSunk(opponentGrid)) return playerId;
    if (myGrid && checkAllShipsSunk(myGrid)) return amPlayer1 ? game.player2_id : game.player1_id;
    return null;
  };

  const winner = checkWinner();

  const getStatusMessage = () => {
    if (winner) {
      return winner === playerId ? '🎉 Tu as gagné !' : '😢 Tu as perdu...';
    }
    if (game.status === 'waiting') return '⏳ En attente de l\'adversaire...';
    if (phase === 'placement') {
      if (!myReady) return allShipsPlaced ? '✅ Confirme le placement' : `🚢 Place ton ${currentShip?.name}`;
      return opponentReady ? '🎮 C\'est parti !' : '⏳ Attente du placement adverse...';
    }
    return isMyTurn ? '🎯 C\'est ton tour !' : '⏳ Tour de l\'adversaire...';
  };

  const renderGrid = (
    grid: BattleshipCell[][] | undefined,
    isOwn: boolean,
    isPlacement: boolean,
    onClick?: (row: number, col: number) => void,
    onHover?: (row: number, col: number) => void
  ) => {
    const displayGrid = isPlacement ? placementGrid : (grid || createEmptyGrid());

    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex gap-0.5 mb-0.5">
          <div className="w-6 h-6" />
          {Array(10).fill(null).map((_, i) => (
            <div key={i} className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-xs text-muted-foreground">
              {String.fromCharCode(65 + i)}
            </div>
          ))}
        </div>
        {displayGrid.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-0.5">
            <div className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-xs text-muted-foreground">
              {rowIndex + 1}
            </div>
            {row.map((cell, colIndex) => {
              const isHovered = hoverCells.some(([r, c]) => r === rowIndex && c === colIndex);
              const canPlace = isPlacement && currentShip && canPlaceShip(placementGrid, rowIndex, colIndex, currentShip.size, horizontal);

              return (
                <motion.button
                  key={colIndex}
                  whileHover={onClick ? { scale: 1.1 } : {}}
                  onClick={() => onClick?.(rowIndex, colIndex)}
                  onMouseEnter={() => onHover?.(rowIndex, colIndex)}
                  onMouseLeave={() => setHoverCells([])}
                  disabled={!onClick}
                  className={`
                    w-6 h-6 sm:w-7 sm:h-7 rounded-sm border transition-all duration-150
                    ${cell.hit && cell.hasShip ? 'bg-destructive border-destructive' : ''}
                    ${cell.hit && !cell.hasShip ? 'bg-secondary/30 border-secondary' : ''}
                    ${!cell.hit && cell.hasShip && isOwn ? 'bg-primary/50 border-primary' : ''}
                    ${!cell.hit && !cell.hasShip ? 'bg-muted border-border' : ''}
                    ${isHovered && canPlace ? 'bg-success/50 border-success' : ''}
                    ${isHovered && !canPlace && isPlacement ? 'bg-destructive/50 border-destructive' : ''}
                    ${onClick && !cell.hit ? 'cursor-pointer hover:border-primary' : ''}
                    ${onClick && cell.hit ? 'cursor-not-allowed' : ''}
                  `}
                >
                  {cell.hit && cell.hasShip && (
                    <Target className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
                  )}
                  {cell.hit && !cell.hasShip && (
                    <span className="text-secondary text-xs">•</span>
                  )}
                </motion.button>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  if (game.status === 'waiting') {
    return (
      <div className="text-center text-muted-foreground">
        {getStatusMessage()}
      </div>
    );
  }

  if (phase === 'placement' && !myReady) {
    return (
      <div className="flex flex-col items-center gap-6">
        <div className="text-xl font-display font-semibold text-foreground">
          {getStatusMessage()}
        </div>

        {!allShipsPlaced && (
          <Button
            variant="outline"
            onClick={() => setHorizontal(!horizontal)}
            className="flex items-center gap-2"
          >
            <RotateCw className="w-4 h-4" />
            {horizontal ? 'Horizontal' : 'Vertical'}
          </Button>
        )}

        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Ship className="w-4 h-4" />
            <span>Ta flotte</span>
          </div>
          {renderGrid(undefined, true, true, handlePlaceShip, handlePlacementHover)}
        </div>

        {allShipsPlaced && (
          <Button onClick={handleConfirmPlacement} className="bg-primary hover:bg-primary/90">
            Confirmer le placement
          </Button>
        )}

        <div className="flex flex-wrap justify-center gap-2 max-w-xs">
          {SHIPS.map((ship, index) => (
            <div
              key={ship.name}
              className={`px-3 py-1 rounded-lg text-xs ${
                index < currentShipIndex
                  ? 'bg-success/20 text-success'
                  : index === currentShipIndex
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {ship.name} ({ship.size})
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === 'placement' && myReady) {
    return (
      <div className="flex flex-col items-center gap-6">
        <div className="text-xl font-display font-semibold text-foreground">
          {getStatusMessage()}
        </div>
        <div className="animate-pulse text-muted-foreground">
          Attente du placement adverse...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-xl font-display font-semibold text-foreground text-center">
        {getStatusMessage()}
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="w-4 h-4" />
            <span>Grille adverse</span>
          </div>
          {renderGrid(
            opponentGrid,
            false,
            false,
            isMyTurn && phase === 'playing' && !winner ? handleShoot : undefined
          )}
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Ship className="w-4 h-4" />
            <span>Ta flotte</span>
          </div>
          {renderGrid(myGrid, true, false)}
        </div>
      </div>
    </div>
  );
};
