import {
  WHITE,
  EMPTY_SQUARE,
  ROOK,
  BISHOP,
  QUEEN,
  KING,
  KNIGHT,
  PAWN,
  ALGEBRAIC_SQUARE_TO_SQUARE,
  SQUARE_TO_ALGEBRAIC_SQUARE,
  GameState,
  Square,
} from './globals';

import { reducerForGameState } from './handlers';

import { makeMoves } from './moves';

/* PGN was done for testing of entire core using pgn files of real games.
   it expects files to be in exact shape and without errors,
   in fact the pgn itself isn't implemented fully,
   i think it would crash if game is not finished yet.

   However it should work with files from https://www.pgnmentor.com
   for example https://www.pgnmentor.com/players/Fischer.zip was used for tests */

const getPromotionPieceFromSAN = (() => {
  const sanToPiece = {
    Q: QUEEN,
    N: KNIGHT,
    B: BISHOP,
    R: ROOK,
    K: KING,
  };

  return (san: string) =>
    (san.includes('=') ? sanToPiece[san[san.indexOf('=') + 1]] : null);
})();

const getSquaresFromSAN = (gameState: GameState, san: string) => {
  const {
    currentColor,
    squareControlledBy,
    boardOfPieces,
    boardOfColors,
    pieceToSquares,
  } = gameState;

  /* 0-0-0 and 0-0 are written literally instead of variable to show that order matters,
     if move is 0-0-0 then it would include both 0-0-0 and 0-0
     therefore we must look for 0-0-0 first */
  if (san.includes('0-0-0') || san.includes('O-O-O')) {
    if (currentColor === WHITE) {
      return {
        originSquare: 184 as Square,
        targetSquare: 182 as Square,
      };
    }
    return {
      originSquare: 72 as Square,
      targetSquare: 70 as Square,
    };
  }

  if (san.includes('0-0') || san.includes('O-O')) {
    if (currentColor === WHITE) {
      return {
        originSquare: 184 as Square,
        targetSquare: 186 as Square,
      };
    }
    return {
      originSquare: 72 as Square,
      targetSquare: 74 as Square,
    };
  }

  const piece = 'KQNBR'.includes(san[0])
    ? {
        K: KING,
        Q: QUEEN,
        N: KNIGHT,
        B: BISHOP,
        R: ROOK,
      }[san[0]]
    : PAWN;

  const ranksAndFiles = san
    .replace('e.p.', '')
    .match(/[a-h]|[1-8]/g) as string[];

  let disambiguation: string;
  if (ranksAndFiles?.length === 4) {
    disambiguation = ranksAndFiles.slice(0, 2).join('');
  } else if (ranksAndFiles?.length === 3) {
    // eslint-ignore-next-line prefer-destructuring
    disambiguation = ranksAndFiles[0] as string;
  } else {
    disambiguation = '';
  }

  const targetSquare = ALGEBRAIC_SQUARE_TO_SQUARE[
    ((ranksAndFiles[ranksAndFiles.length - 2] as string) +
      (ranksAndFiles[
        ranksAndFiles.length - 1
      ] as string)) as keyof typeof ALGEBRAIC_SQUARE_TO_SQUARE
  ] as Square;

  let originSquare;

  if (piece === PAWN) {
    originSquare = Number(
      Object.keys(pieceToSquares[currentColor][PAWN]).find((sqStr) => {
        const square = Number(sqStr) as Square;

        if (!san.includes('x')) {
          const doubleForwardSquare = square + 32 * currentColor;
          const forwardSquare = square + 16 * currentColor;

          return (
            forwardSquare === targetSquare ||
            (doubleForwardSquare === targetSquare &&
              boardOfColors[doubleForwardSquare] === EMPTY_SQUARE &&
              boardOfColors[forwardSquare] === EMPTY_SQUARE)
          );
        }
        return (
          makeMoves(gameState, square)[targetSquare] &&
          piece === boardOfPieces[square] &&
          SQUARE_TO_ALGEBRAIC_SQUARE[square].includes(disambiguation)
        );
      }),
    );
  } else {
    originSquare = Number(
      Object.keys(squareControlledBy[targetSquare][currentColor]).find(
        (squareAsString) => {
          const square = Number(squareAsString) as Square;

          return (
            makeMoves(gameState, square)[targetSquare] &&
            piece === boardOfPieces[square] &&
            SQUARE_TO_ALGEBRAIC_SQUARE[square].includes(disambiguation)
          );
        },
      ),
    );
  }

  if (!targetSquare || !originSquare) {
    throw new Error(
      `originSquare is ${originSquare} targetSquare is ${targetSquare} both must be truthy. san is ${san} moveHistory is ${gameState.moveHistory}`,
    );
  }

  return {
    targetSquare: targetSquare as Square,
    originSquare: originSquare as Square,
  };
};

// prom move of pawn doesnt work idk why
export const gameStateFromPGN = (
  pgn: string,
  gameState: GameState,
): GameState => {
  // find newline that starts with '1.' and match anything after it.
  // FIXME handle only moves without the heading data,
  // FIXME handle end game

  const strOfMoves = pgn.match(
    /1\.N?[a-h]?[1-8]? .*(\*|1-0|0-1|1\/2-1\/2).*$/s,
  );

  if (strOfMoves && strOfMoves[0]) {
    const moves = strOfMoves[0]
      .split(/\d+\./)
      .filter((s) => s !== '')
      .map((s) =>
        s
          .trim()
          .replace(/\r|\n|{.*}|\(.*\)/g, '')
          .split(/[ ]+/))
      .flat();

    return moves.reduce((updatedGameState, san, idx) => {
      if (updatedGameState.moveHistory.length !== idx) {
        // eslint-ignore-next-line no-console
        console.error(updatedGameState, san, idx);
        throw new Error('Expected each san to perform move');
      }

      if (san === '*') {
        return updatedGameState;
      }

      if (san === '1/2-1/2') {
        // FIXME: should set endgame
        return updatedGameState;
      }

      if (san === '1-0') {
        // FIXME: should set endgame
        return updatedGameState;
      }

      if (san === '0-1') {
        // FIXME: should set endgame
        return updatedGameState;
      }

      const { targetSquare, originSquare } = getSquaresFromSAN(
        updatedGameState,
        san,
      );
      const promotionPiece = getPromotionPieceFromSAN(san);

      const madeMove = reducerForGameState(
        reducerForGameState(updatedGameState, {
          type: 'square chosen',
          square: originSquare,
        }),
        { type: 'square chosen', square: targetSquare },
      );

      if (promotionPiece) {
        const madePromotion = reducerForGameState(madeMove, {
          type: 'promotion piece chosen',
          piece: promotionPiece,
        });

        const { reasonsToPauseGame } = madePromotion;
        if (Object.keys(reasonsToPauseGame).length) {
          return reducerForGameState(madePromotion, {
            type: 'do not claim draw',
          });
        }

        return madePromotion;
      }

      const { reasonsToPauseGame } = madeMove;

      if (Object.keys(reasonsToPauseGame).length) {
        return reducerForGameState(madeMove, { type: 'do not claim draw' });
      }

      return madeMove;
    }, gameState);
  }

  throw new Error(
    `was not able to find moves in pgn ${pgn} strOfMoves ${strOfMoves}`,
  );
};
