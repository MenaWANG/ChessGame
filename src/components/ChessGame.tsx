/**
 * Chess Game Component
 * A full-featured chess game with computer opponent, multiple difficulty levels,
 * and time controls.
 * 
 * Features:
 * - Play against computer with 3 difficulty levels
 * - Multiple time control options
 * - Move validation and highlighting
 * - Game state management
 * - Advanced computer move evaluation
 */

import { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

// Piece values for evaluation (centipawns)
const PIECE_VALUES = {
  p: 100,   // pawn
  n: 320,   // knight
  b: 330,   // bishop
  r: 500,   // rook
  q: 900,   // queen
  k: 20000  // king - high value to prioritize king safety
};

// Positional bonuses for pieces (simplified)
const PAWN_POSITION_SCORES = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5,  5, 10, 25, 25, 10,  5,  5,
  0,  0,  0, 20, 20,  0,  0,  0,
  5, -5,-10,  0,  0,-10, -5,  5,
  5, 10, 10,-20,-20, 10, 10,  5,
  0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_POSITION_SCORES = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50
];

// New position scores for other pieces
const BISHOP_POSITION_SCORES = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -20,-10,-10,-10,-10,-10,-10,-20
];

const ROOK_POSITION_SCORES = [
  0,  0,  0,  5,  5,  0,  0,  0,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  5, 10, 10, 10, 10, 10, 10,  5,
  0,  0,  0,  0,  0,  0,  0,  0
];

const QUEEN_POSITION_SCORES = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
  -5,  0,  5,  5,  5,  5,  0, -5,
  0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20
];

const KING_MIDDLEGAME_SCORES = [
  20, 30, 10,  0,  0, 10, 30, 20,
  20, 20,  0,  0,  0,  0, 20, 20,
  -10,-20,-20,-20,-20,-20,-20,-10,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30
];

const KING_ENDGAME_SCORES = [
  -50,-30,-30,-30,-30,-30,-30,-50,
  -30,-30,  0,  0,  0,  0,-30,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-20,-10,  0,  0,-10,-20,-30,
  -50,-40,-30,-20,-20,-30,-40,-50
];

/**
 * Search depth configuration for different difficulty levels
 * Higher depth means stronger but slower play
 */
const SEARCH_DEPTH = {
  Easy: 2,    // Basic positional understanding
  Medium: 3,  // Advanced evaluation
  Hard: 3     // Deep positional understanding with strong evaluation
};

/**
 * Thinking time configuration (in milliseconds) for different difficulty levels
 * Represents how long the computer "thinks" before making a move
 */
const THINKING_TIME = {
  Easy: 3000,    // 3 seconds - beginner friendly
  Medium: 2000,  // 2 seconds - moderate speed
  Hard: 1000     // 1 second - quick decisions
};

type Difficulty = 'Easy' | 'Medium' | 'Hard';

type TimeControl = {
  name: string;
  initial: number;  // Time in seconds
  increment: number; // Increment in seconds
};

const TIME_CONTROLS: TimeControl[] = [
  { name: "1 min Bullet", initial: 60, increment: 0 },
  { name: "3 min Blitz", initial: 180, increment: 0 },
  { name: "5 min Blitz", initial: 300, increment: 0 },
  { name: "10 min Rapid", initial: 600, increment: 0 },
  { name: "15|10 Rapid", initial: 900, increment: 10 },
];

// Add timeout handling for computer moves
let moveTimeoutId: NodeJS.Timeout | null = null;

export default function ChessGame() {
  // Initialize the chess instance
  const [game, setGame] = useState(new Chess());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [moveFrom, setMoveFrom] = useState("");
  const [possibleMoves, setPossibleMoves] = useState<string[]>([]);
  const [isPlayingComputer, setIsPlayingComputer] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  
  // Timer states
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControl>(TIME_CONTROLS[3]); // Default to 10 min
  const [timeLeft, setTimeLeft] = useState({ white: selectedTimeControl.initial, black: selectedTimeControl.initial });
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [lastMoveTime, setLastMoveTime] = useState<number | null>(null);

  /**
   * Timer effect: Handles the countdown of player times
   * Updates every second when the timer is running and game is not over
   */
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isTimerRunning && !game.isGameOver()) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          const currentPlayer = game.turn() === 'w' ? 'white' : 'black';
          const newTime = Math.max(0, prev[currentPlayer] - 1);
          
          return {
            ...prev,
            [currentPlayer]: newTime
          };
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, game]);

  // Check for time out
  useEffect(() => {
    if (timeLeft.white === 0) {
      setIsTimerRunning(false);
      // Black wins on time
    } else if (timeLeft.black === 0) {
      setIsTimerRunning(false);
      // White wins on time
    }
  }, [timeLeft]);

  // Format time for display
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handle move completion and increment time
  const handleMoveComplete = () => {
    // Start timer if it's not running
    if (!isTimerRunning) {
      setIsTimerRunning(true);
      return;
    }

    // Add increment to the player who just moved
    const playerJustMoved = game.turn() === 'w' ? 'black' : 'white';
    if (selectedTimeControl.increment > 0) {
      setTimeLeft(prev => ({
        ...prev,
        [playerJustMoved]: prev[playerJustMoved] + selectedTimeControl.increment
      }));
    }
  };

  /**
   * Computer move effect: Handles computer's move selection and execution
   * Evaluates positions and selects moves based on difficulty level
   */
  useEffect(() => {
    let moveTimer: NodeJS.Timeout | null = null;
    
    const makeComputerMoveWithTimer = async () => {
      if (!isTimerRunning) {
        setIsTimerRunning(true);
      }

      const moves = game.moves({ verbose: true });
      if (moves.length > 0) {
        const gameCopy = new Chess(game.fen());
        const evaluatedMoves = evaluateAllMoves(moves, gameCopy);
        const selectedMove = selectMove(evaluatedMoves);
        
        return new Promise<void>(resolve => {
          moveTimer = setTimeout(() => {
            if (selectedMove) {
              makeAMove({
                from: selectedMove.from,
                to: selectedMove.to,
                promotion: 'q'
              });
            }
            resolve();
          }, THINKING_TIME[difficulty]);
        });
      }
    };

    if (isPlayingComputer && game.turn() === 'b' && !game.isGameOver()) {
      makeComputerMoveWithTimer();
    }

    return () => {
      if (moveTimer) clearTimeout(moveTimer);
    };
  }, [game, isPlayingComputer, difficulty, moveHistory]);

  /**
   * Evaluates all possible moves for the computer based on current difficulty
   * @param moves List of possible moves
   * @param gameCopy Copy of current game state
   * @returns Array of moves with their evaluated scores
   */
  function evaluateAllMoves(moves: any[], gameCopy: Chess) {
    return moves.map(move => {
      let score = 0;
      gameCopy.move(move);

      // Base evaluation for all levels
      score += evaluateBasicPosition(move, gameCopy);
      
      // Additional evaluation based on difficulty
      if (difficulty === 'Easy') {
        score += Math.random() * 50; // More randomness for variety
      } 
      else if (difficulty === 'Medium') {
        score += evaluateIntermediatePosition(gameCopy);
        score += Math.random() * 20;
      }
      else { // Hard
        score += evaluateAdvancedPosition(gameCopy);
        score += Math.random() * 5; // Minimal randomness
      }

      gameCopy.undo();
      return { move, score };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Selects a move from evaluated moves based on difficulty level
   * @param evaluatedMoves Array of moves with their scores
   * @returns Selected move object
   */
  function selectMove(evaluatedMoves: any[]) {
    const topMoves = evaluatedMoves.slice(0, 
      difficulty === 'Easy' ? 5 : 
      difficulty === 'Medium' ? 3 : 2
    );
    return topMoves[Math.floor(Math.random() * topMoves.length)].move;
  }

  // Evaluate a move based on difficulty
  function evaluateMove(move: any, gameCopy: Chess) {
    let score = 0;
    const isEndgame = isInEndgame(gameCopy);

    if (difficulty === 'Easy') {
      // Now plays like the old Medium level
      if (move.captured) {
        score += PIECE_VALUES[move.captured];
        score += (PIECE_VALUES[move.captured] - PIECE_VALUES[move.piece]) / 10;
      }

      gameCopy.move(move);
      if (gameCopy.isCheck()) {
        score += 50;
      }
      if (gameCopy.isCheckmate()) {
        score += 10000;
      }
      if (gameCopy.isDraw()) {
        score -= 5000;
      }
      gameCopy.undo();

      return score + Math.random() * 50; // Some randomness but less than before
    }

    // Apply move to evaluate resulting position
    gameCopy.move(move);

    // Base evaluation for all levels
    if (move.captured) {
      score += PIECE_VALUES[move.captured];
      score += (PIECE_VALUES[move.captured] - PIECE_VALUES[move.piece]) / 10;
    }

    // Check threats
    if (gameCopy.isCheck()) {
      score += 50;
    }
    if (gameCopy.isCheckmate()) {
      score += 10000;
    }
    if (gameCopy.isDraw()) {
      score -= 5000;
    }

    // Count attacked squares
    const attacks = countAttackedSquares(gameCopy, 'b');
    score += attacks * 5;

    if (difficulty === 'Medium') {
      // Now plays like the old Hard level
      score += evaluatePosition(gameCopy);
      score += evaluateKingSafety(gameCopy, isEndgame);
      score += evaluatePawnStructure(gameCopy);
      
      const mobility = gameCopy.moves().length;
      score += mobility * 2;

      if (moveHistory.length < 10) {
        if (['n', 'b'].includes(move.piece)) {
          score += 30;
        }
        if (move.san.includes('O-O') || move.san.includes('O-O-O')) {
          score += 40;
        }
        if (move.piece === 'q' && !move.captured) {
          score -= 30;
        }
      }
    }
    else if (difficulty === 'Hard') {
      // Enhanced evaluation for Hard mode
      score += evaluateAdvancedPosition(gameCopy);
      score += evaluateKingSafety(gameCopy, isEndgame) * 2; // Double weight for king safety
      score += evaluateAdvancedPawnStructure(gameCopy);
      
      // Mobility and control
      const mobility = gameCopy.moves().length;
      const centerControl = evaluateCenterControl(gameCopy);
      score += mobility * 3;
      score += centerControl * 10;

      // Opening principles with higher weights
      if (moveHistory.length < 15) {
        if (['n', 'b'].includes(move.piece)) {
          score += 50; // Stronger emphasis on development
        }
        if (move.san.includes('O-O') || move.san.includes('O-O-O')) {
          score += 70; // Higher priority on castling
        }
        if (move.piece === 'q' && !move.captured) {
          score -= 50; // Stronger penalty for early queen moves
        }
        // Control of center pawns
        if (move.piece === 'p' && ['d4', 'd5', 'e4', 'e5'].includes(move.to)) {
          score += 40;
        }
      }

      // Endgame specific evaluation
      if (isEndgame) {
        score += evaluateEndgamePosition(gameCopy);
      }
    }

    gameCopy.undo();
    return score + Math.random() * (difficulty === 'Hard' ? 0.1 : 0.2); // Less randomness for Hard
  }

  /**
   * Evaluates basic position attributes common to all difficulty levels
   * @param move The move being evaluated
   * @param gameCopy Copy of the game state
   * @returns Basic evaluation score
   */
  function evaluateBasicPosition(move: any, gameCopy: Chess) {
    let score = 0;

    // Material advantage
    if (move.captured) {
      score += PIECE_VALUES[move.captured] * 2;
    }

    // Tactical evaluation
    if (gameCopy.isCheck()) score += 50;
    if (gameCopy.isCheckmate()) score += 10000;
    if (gameCopy.isDraw()) score -= 5000;

    return score;
  }

  /**
   * Evaluates position for intermediate (Medium) difficulty
   * @param gameCopy Copy of the game state
   * @returns Intermediate evaluation score
   */
  function evaluateIntermediatePosition(gameCopy: Chess) {
    let score = 0;
    const isEndgame = isInEndgame(gameCopy);

    score += evaluatePosition(gameCopy);
    score += evaluateKingSafety(gameCopy, isEndgame);
    score += evaluatePawnStructure(gameCopy);
    score += gameCopy.moves().length * 2; // Mobility bonus

    // Opening principles
    if (moveHistory.length < 10) {
      score += evaluateOpeningPrinciples(gameCopy, 1.0); // Normal weight
    }

    return score;
  }

  /**
   * Evaluates position for advanced (Hard) difficulty
   * @param gameCopy Copy of the game state
   * @returns Advanced evaluation score
   */
  function evaluateAdvancedPosition(gameCopy: Chess) {
    let score = 0;
    const isEndgame = isInEndgame(gameCopy);

    // Core evaluation with higher weights
    score += evaluatePosition(gameCopy) * 2;
    score += evaluateKingSafety(gameCopy, isEndgame) * 3;
    score += evaluateAdvancedPawnStructure(gameCopy) * 2;

    // Mobility and control
    const mobility = gameCopy.moves().length;
    const centerControl = evaluateCenterControl(gameCopy);
    score += mobility * 5;
    score += centerControl * 15;

    // Opening principles with higher weights
    if (moveHistory.length < 15) {
      score += evaluateOpeningPrinciples(gameCopy, 2.0); // Double weight
    }

    // Endgame specific evaluation
    if (isEndgame) {
      score += evaluateEndgamePosition(gameCopy) * 2;
    }

    // Look ahead for threats
    score -= evaluateThreats(gameCopy);

    return score;
  }

  /**
   * Evaluates adherence to opening principles
   * @param gameCopy Copy of the game state
   * @param weight Weight multiplier for the scores
   * @returns Opening principles score
   */
  function evaluateOpeningPrinciples(gameCopy: Chess, weight: number) {
    let score = 0;
    const moves = gameCopy.moves({ verbose: true });
    
    moves.forEach(move => {
      if (['n', 'b'].includes(move.piece)) score += 30 * weight; // Development
      if (move.san.includes('O-O') || move.san.includes('O-O-O')) score += 40 * weight; // Castling
      if (move.piece === 'q' && !move.captured) score -= 30 * weight; // Early queen moves
      if (move.piece === 'p' && ['d4', 'd5', 'e4', 'e5'].includes(move.to)) score += 25 * weight; // Center control
    });

    return score;
  }

  /**
   * Evaluates immediate threats in the position
   * @param gameCopy Copy of the game state
   * @returns Threat evaluation score
   */
  function evaluateThreats(gameCopy: Chess) {
    const nextMoves = gameCopy.moves({ verbose: true });
    return nextMoves.reduce((max, nextMove) => {
      if (nextMove.captured || gameCopy.isCheck()) {
        return Math.max(max, PIECE_VALUES[nextMove.captured || 'p']);
      }
      return max;
    }, 0);
  }

  /**
   * Evaluates pawn structure quality
   * @param gameCopy Copy of the game state
   * @returns Pawn structure evaluation score
   */
  function evaluatePawnStructure(gameCopy: Chess) {
    let score = 0;
    const fen = gameCopy.fen();
    const position = fen.split(' ')[0];
    
    // Analyze pawn structure
    const files = 'abcdefgh'.split('');
    files.forEach(file => {
      // Check for doubled pawns
      const pawnsInFile = (position.match(new RegExp(file + '[1-8].*?p', 'g')) || []).length;
      if (pawnsInFile > 1) score -= 20;

      // Check for isolated pawns
      const hasPawn = position.includes(file + '[1-8].*?p');
      if (hasPawn) {
        const hasNeighborPawn = (file !== 'a' && position.includes(files[files.indexOf(file)-1] + '[1-8].*?p')) ||
                               (file !== 'h' && position.includes(files[files.indexOf(file)+1] + '[1-8].*?p'));
        if (!hasNeighborPawn) score -= 15;
      }
    });

    return score;
  }

  /**
   * Evaluates king safety based on position and game phase
   * @param gameCopy Copy of the game state
   * @param isEndgame Whether the position is in endgame
   * @returns King safety evaluation score
   */
  function evaluateKingSafety(gameCopy: Chess, isEndgame: boolean) {
    let score = 0;
    
    if (!isEndgame) {
      // Reward castling
      if (gameCopy.fen().includes('k.*?r') || gameCopy.fen().includes('r.*?k')) {
        score += 60;
      }
      
      // Penalize exposed king
      score -= countAttacksNearKing(gameCopy) * 10;
    }
    
    return score;
  }

  /**
   * Evaluates piece positioning and development
   * @param gameCopy Copy of the game state
   * @returns Position evaluation score
   */
  function evaluatePosition(gameCopy: Chess) {
    let score = 0;
    const position = gameCopy.board();

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = position[row][col];
        if (piece) {
          const isBlack = piece.color === 'b';
          const square = row * 8 + col;

          switch (piece.type) {
            case 'p':
              score += isBlack ? PAWN_POSITION_SCORES[63 - square] : -PAWN_POSITION_SCORES[square];
              break;
            case 'n':
              score += isBlack ? KNIGHT_POSITION_SCORES[63 - square] : -KNIGHT_POSITION_SCORES[square];
              break;
            case 'b':
              score += isBlack ? BISHOP_POSITION_SCORES[63 - square] : -BISHOP_POSITION_SCORES[square];
              break;
            case 'r':
              score += isBlack ? ROOK_POSITION_SCORES[63 - square] : -ROOK_POSITION_SCORES[square];
              break;
            case 'q':
              score += isBlack ? QUEEN_POSITION_SCORES[63 - square] : -QUEEN_POSITION_SCORES[square];
              break;
            case 'k':
              if (isInEndgame(gameCopy)) {
                score += isBlack ? KING_ENDGAME_SCORES[63 - square] : -KING_ENDGAME_SCORES[square];
              } else {
                score += isBlack ? KING_MIDDLEGAME_SCORES[63 - square] : -KING_MIDDLEGAME_SCORES[square];
              }
              break;
          }
        }
      }
    }
    return score;
  }

  /**
   * Checks if the position is in endgame phase
   * @param gameCopy Copy of the game state
   * @returns boolean indicating if position is in endgame
   */
  function isInEndgame(gameCopy: Chess) {
    const fen = gameCopy.fen();
    const queens = (fen.match(/q/gi) || []).length;
    const pieces = (fen.match(/[rnb]/gi) || []).length;
    
    return queens === 0 || pieces <= 6;
  }

  /**
   * Counts number of squares attacked near the king
   * @param gameCopy Copy of the game state
   * @returns Number of attacked squares near the king
   */
  function countAttacksNearKing(gameCopy: Chess) {
    const position = gameCopy.board();
    let kingRow = -1, kingCol = -1;
    
    // Find king position
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = position[row][col];
        if (piece && piece.type === 'k' && piece.color === 'b') {
          kingRow = row;
          kingCol = col;
          break;
        }
      }
      if (kingRow !== -1) break;
    }

    // Count attacks in king's vicinity
    let attacks = 0;
    const moves = gameCopy.moves({ verbose: true });
    moves.forEach(move => {
      const moveRow = 8 - parseInt(move.to[1]);
      const moveCol = move.to.charCodeAt(0) - 'a'.charCodeAt(0);
      if (Math.abs(moveRow - kingRow) <= 1 && Math.abs(moveCol - kingCol) <= 1) {
        attacks++;
      }
    });
    
    return attacks;
  }

  /**
   * Evaluates control of the center squares
   * @param gameCopy Copy of the game state
   * @returns Center control evaluation score
   */
  function evaluateCenterControl(gameCopy: Chess) {
    let score = 0;
    const centerSquares = ['d4', 'd5', 'e4', 'e5'];
    const extendedCenter = ['c3', 'c4', 'c5', 'c6', 'd3', 'd6', 'e3', 'e6', 'f3', 'f4', 'f5', 'f6'];
    
    const moves = gameCopy.moves({ verbose: true });
    const controlledSquares = new Set(moves.map(move => move.to));

    centerSquares.forEach(square => {
      if (controlledSquares.has(square)) score += 10;
    });

    extendedCenter.forEach(square => {
      if (controlledSquares.has(square)) score += 5;
    });

    return score;
  }

  // Handle piece movement
  function makeAMove(move: any) {
    const gameCopy = new Chess(game.fen());
    
    try {
      const result = gameCopy.move(move);
      if (result) {
        setGame(gameCopy);
        setMoveHistory([...moveHistory, result.san]);
        // Reset selection after move
        setMoveFrom("");
        setPossibleMoves([]);
        handleMoveComplete();
        return true;
      }
    } catch (error) {
      return false;
    }
    return false;
  }

  // Handle square click for move highlighting
  function onSquareClick(square: string) {
    // Don't allow moves if it's computer's turn
    if (isPlayingComputer && game.turn() === 'b') return;

    // Get list of possible moves
    const moves = game.moves({ square, verbose: true });

    if (moveFrom === "") {
      // No piece is selected yet
      if (moves.length > 0) {
        setMoveFrom(square);
        setPossibleMoves(moves.map(move => move.to));
      }
    } else {
      // A piece is already selected
      if (square === moveFrom) {
        // Clicked the same square twice, deselect
        setMoveFrom("");
        setPossibleMoves([]);
      } else if (possibleMoves.includes(square)) {
        // Make the move if it's a valid destination
        makeAMove({
          from: moveFrom,
          to: square,
          promotion: 'q'
        });
      } else {
        // Clicked a different square, check if it has valid moves
        if (moves.length > 0) {
          setMoveFrom(square);
          setPossibleMoves(moves.map(move => move.to));
        } else {
          setMoveFrom("");
          setPossibleMoves([]);
        }
      }
    }
  }

  // Handle when a piece is dropped
  function onDrop(sourceSquare: string, targetSquare: string) {
    // Don't allow moves if it's computer's turn
    if (isPlayingComputer && game.turn() === 'b') return false;

    setMoveFrom("");
    setPossibleMoves([]);
    const move = makeAMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q'
    });
    return move;
  }

  // Reset the game
  function resetGame() {
    setGame(new Chess());
    setMoveHistory([]);
    setMoveFrom("");
    setPossibleMoves([]);
    setTimeLeft({ 
      white: selectedTimeControl.initial, 
      black: selectedTimeControl.initial 
    });
    setIsTimerRunning(false);
  }

  // Undo last move
  function undoLastMove() {
    const gameCopy = new Chess(game.fen());
    // If playing against computer, undo both moves
    if (isPlayingComputer) {
      gameCopy.undo();
      gameCopy.undo();
    } else {
      gameCopy.undo();
    }
    setGame(gameCopy);
    setMoveHistory(prev => isPlayingComputer ? prev.slice(0, -2) : prev.slice(0, -1));
    setMoveFrom("");
    setPossibleMoves([]);
    // Pause timer when undoing moves
    setIsTimerRunning(false);
  }

  // Get current game status
  function getGameStatus() {
    if (timeLeft.white === 0) return "Black wins on time!";
    if (timeLeft.black === 0) return "White wins on time!";
    if (game.isCheckmate()) return "Checkmate!";
    if (game.isDraw()) return "Draw!";
    if (game.isStalemate()) return "Stalemate!";
    if (game.isCheck()) return "Check!";
    return `${game.turn() === 'w' ? 'White' : 'Black'}'s turn`;
  }

  // Custom square styles for highlighting
  const customSquareStyles = {};
  if (moveFrom) {
    customSquareStyles[moveFrom] = { backgroundColor: 'rgba(255, 255, 0, 0.4)' };
    possibleMoves.forEach(square => {
      customSquareStyles[square] = { backgroundColor: 'rgba(0, 255, 0, 0.2)' };
    });
  }

  // Enhanced position evaluation for Hard mode
  function evaluateAdvancedPosition(gameCopy: Chess, isEndgame: boolean) {
    let score = 0;
    const position = gameCopy.board();

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = position[row][col];
            if (piece) {
                const isBlack = piece.color === 'b';
                const square = row * 8 + col;

                switch (piece.type) {
                    case 'p':
                        score += isBlack ? PAWN_POSITION_SCORES[63 - square] : -PAWN_POSITION_SCORES[square];
                        break;
                    case 'n':
                        score += isBlack ? KNIGHT_POSITION_SCORES[63 - square] : -KNIGHT_POSITION_SCORES[square];
                        break;
                    case 'b':
                        score += isBlack ? BISHOP_POSITION_SCORES[63 - square] : -BISHOP_POSITION_SCORES[square];
                        break;
                    case 'r':
                        score += isBlack ? ROOK_POSITION_SCORES[63 - square] : -ROOK_POSITION_SCORES[square];
                        break;
                    case 'q':
                        score += isBlack ? QUEEN_POSITION_SCORES[63 - square] : -QUEEN_POSITION_SCORES[square];
                        break;
                    case 'k':
                        if (isEndgame) {
                            score += isBlack ? KING_ENDGAME_SCORES[63 - square] : -KING_ENDGAME_SCORES[square];
                        } else {
                            score += isBlack ? KING_MIDDLEGAME_SCORES[63 - square] : -KING_MIDDLEGAME_SCORES[square];
                        }
                        break;
                }
            }
        }
    }
    return score;
  }

  // Enhanced pawn structure evaluation
  function evaluateAdvancedPawnStructure(gameCopy: Chess) {
    let score = 0;
    const position = gameCopy.board();
    
    // Check for doubled pawns
    for (let col = 0; col < 8; col++) {
        let blackPawns = 0;
        for (let row = 0; row < 8; row++) {
            const piece = position[row][col];
            if (piece && piece.type === 'p' && piece.color === 'b') {
                blackPawns++;
            }
        }
        if (blackPawns > 1) score -= 30; // Increased penalty
    }

    // Check for isolated and passed pawns
    for (let col = 0; col < 8; col++) {
        let hasPawn = false;
        let isIsolated = true;
        let isPassed = true;

        // Check for pawns in current file
        for (let row = 0; row < 8; row++) {
            const piece = position[row][col];
            if (piece && piece.type === 'p' && piece.color === 'b') {
                hasPawn = true;
                // Check for enemy pawns ahead
                for (let r = 0; r < row; r++) {
                    if (position[r][col]?.type === 'p') {
                        isPassed = false;
                        break;
                    }
                }
            }
        }

        if (hasPawn) {
            // Check neighboring files for friendly pawns
            if (col > 0) {
                for (let row = 0; row < 8; row++) {
                    if (position[row][col-1]?.type === 'p' && position[row][col-1]?.color === 'b') {
                        isIsolated = false;
                        break;
                    }
                }
            }
            if (col < 7) {
                for (let row = 0; row < 8; row++) {
                    if (position[row][col+1]?.type === 'p' && position[row][col+1]?.color === 'b') {
                        isIsolated = false;
                        break;
                    }
                }
            }

            if (isIsolated) score -= 25;
            if (isPassed) score += 50;
        }
    }

    return score;
  }

  // Evaluate endgame positions
  function evaluateEndgamePosition(gameCopy: Chess) {
    let score = 0;
    const position = gameCopy.board();
    
    // Find kings
    let blackKingPos = null;
    let whiteKingPos = null;
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = position[row][col];
            if (piece && piece.type === 'k') {
                if (piece.color === 'b') {
                    blackKingPos = { row, col };
                } else {
                    whiteKingPos = { row, col };
                }
            }
        }
    }

    if (blackKingPos && whiteKingPos) {
        // Drive enemy king to the corner in winning positions
        const blackKingDistance = Math.max(
            Math.abs(blackKingPos.row - 3.5),
            Math.abs(blackKingPos.col - 3.5)
        );
        score += blackKingDistance * 10;

        // Keep kings close in drawn positions
        const kingDistance = Math.max(
            Math.abs(blackKingPos.row - whiteKingPos.row),
            Math.abs(blackKingPos.col - whiteKingPos.col)
        );
        if (isDrawnPosition(gameCopy)) {
            score -= kingDistance * 5;
        }
    }

    return score;
  }

  // Helper function to detect drawn positions
  function isDrawnPosition(gameCopy: Chess) {
    const fen = gameCopy.fen();
    const pieces = fen.split(' ')[0];
    const pieceCount = (pieces.match(/[prnbqPRNBQ]/g) || []).length;
    return pieceCount <= 3; // Likely drawn with 3 or fewer pieces
  }

  return (
    <div className="chess-game">
      <div className="game-status">
        <div className="timer-display">
          <div className={`timer ${game.turn() === 'b' ? 'active' : ''}`}>
            Black: {formatTime(timeLeft.black)}
          </div>
        </div>
        <h2>{getGameStatus()}</h2>
        <div className="timer-display">
          <div className={`timer ${game.turn() === 'w' ? 'active' : ''}`}>
            White: {formatTime(timeLeft.white)}
          </div>
        </div>
        <div className="game-controls">
          <button onClick={resetGame}>New Game</button>
          <button onClick={undoLastMove} disabled={moveHistory.length === 0}>
            Undo Move
          </button>
          <button 
            onClick={() => {
              setIsPlayingComputer(!isPlayingComputer);
              resetGame();
            }}
            className={isPlayingComputer ? 'active' : ''}
          >
            {isPlayingComputer ? 'Play vs Friend' : 'Play vs Computer'}
          </button>
          {isPlayingComputer && (
            <select 
              value={difficulty} 
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="difficulty-select"
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          )}
          <select
            value={selectedTimeControl.name}
            onChange={(e) => {
              const newTimeControl = TIME_CONTROLS.find(tc => tc.name === e.target.value)!;
              setSelectedTimeControl(newTimeControl);
              setTimeLeft({ 
                white: newTimeControl.initial, 
                black: newTimeControl.initial 
              });
            }}
            className="time-control-select"
          >
            {TIME_CONTROLS.map(tc => (
              <option key={tc.name} value={tc.name}>
                {tc.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="game-board">
        <Chessboard 
          position={game.fen()} 
          onPieceDrop={onDrop}
          onSquareClick={onSquareClick}
          customSquareStyles={customSquareStyles}
          boardWidth={560}
        />
      </div>

      <div className="move-history">
        <h3>Move History</h3>
        <div className="moves-list">
          {moveHistory.map((move, index) => (
            <span key={index}>
              {index % 2 === 0 ? `${Math.floor(index/2 + 1)}. ` : ''}
              {move}{' '}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
} 