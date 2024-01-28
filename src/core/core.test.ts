import { splitEvery } from 'ramda';
import { describe, test, expect } from 'vitest';
import * as fs from 'fs';

import { makeMoves } from './moves';

import { undoMove, makeEpdFromGameState } from './change-state';
import { gameStateFromPGN } from './pgn';

import {
  handleUnpauseMoveWithoutDrawClaim,
  reducerForGameState,
} from './handlers';

import { initialGameState } from './initial-state';

import {
  BLACK,
  WHITE,
  ALGEBRAIC_SQUARE_TO_SQUARE,
  KING_DIRECTION_QUEENSIDE,
  KING_DIRECTION_KINGSIDE,
} from './globals';

// wont work with promotion!
const doMoves = (squarePairs, gameState) =>
  squarePairs.reduce((updatedGameState, [origin, target]) => {
    const validatedOrigin =
      typeof origin === 'string' ? ALGEBRAIC_SQUARE_TO_SQUARE[origin] : origin;
    const validatedTarget =
      typeof target === 'string' ? ALGEBRAIC_SQUARE_TO_SQUARE[target] : target;

    return reducerForGameState(
      reducerForGameState(updatedGameState, {
        type: 'square chosen',
        square: validatedOrigin,
      }),
      { type: 'square chosen', square: validatedTarget },
    );
  }, gameState);

const getTitleFromPGN = (pgn) => {
  if (pgn.length > 0) {
    return pgn.match(/\[(.*) "(.*)"\]/gm).join('');
  }
  return '';
};

const createPGNtest = (pgn, epd) => {
  const title = getTitleFromPGN(pgn);

  const pgnGameState = gameStateFromPGN(pgn, initialGameState);

  test(`undo ${title}`, () => {
    const undonePgnState = pgnGameState.moveHistory.reduce(
      (acc) => undoMove(acc),
      pgnGameState,
    );

    expect(undonePgnState).toEqual(initialGameState);
  });

  if (epd) {
    test(`epd ${title}`, () => {
      const gsFromPGN = gameStateFromPGN(pgn, initialGameState);
      const epdFromPGN = makeEpdFromGameState(gsFromPGN);
      expect(epdFromPGN).toEqual(epd);
    });
  }
};

// FIXME pgn tests should also compare end game fen
// FIXME pgn should handle end game
// WARNING: this is very many tests, like 800. if you log stuff it will run out of memory.
// https://www.pgnmentor.com/players/Fischer.zip
// describe('pgn tests', () => {
//   describe('pgn file tests', () => {
//     const pgns = fs
//       .readFileSync(`${__dirname}/Fischer.pgn`, 'utf8')
//       .split(/^\n$/m);

//     splitEvery(2, pgns).forEach((arr) => {
//       const pgn = arr.join('\n');

//       if (pgn !== '') {
//         createPGNtest(pgn);
//       }
//     });
//   });
// });

describe('makeMoves', () => {
  test("pawn's double forward move doesn't allow friendly pawns to capture en passant", () => {
    const gsAfterDoubleForward = doMoves([['e2', 'e4']], initialGameState);

    expect(makeMoves(gsAfterDoubleForward, 169)[152]).toBe(undefined);
    expect(makeMoves(gsAfterDoubleForward, 167)[152]).toBe(undefined);
  });
});

describe('castlingRights', () => {
  test('castling rights of both sides lost when both sides could castle either side, and first move of rook captured rook', () => {
    expect(
      doMoves(
        [
          ['a2', 'a4'],
          ['b7', 'b5'],
          ['a4', 'b5'],
          ['a7', 'a6'],
          ['b5', 'a6'],
          ['c8', 'a6'],
          ['b2', 'b4'],
          ['a6', 'c8'],
          ['a1', 'a8'], // w rook capture b rook
        ],
        initialGameState,
      ),
    ).toMatchObject({
      castlingRights: {
        [WHITE]: {
          [KING_DIRECTION_KINGSIDE]: true,
        },
        [BLACK]: {
          [KING_DIRECTION_KINGSIDE]: true,
        },
      },
      castlingRightsLostWhen: {
        [WHITE]: {
          [KING_DIRECTION_QUEENSIDE]: 8,
          [KING_DIRECTION_KINGSIDE]: -1,
        },
        [BLACK]: {
          [KING_DIRECTION_QUEENSIDE]: 8,
          [KING_DIRECTION_KINGSIDE]: -1,
        },
      },
    });
  });

  test('castling for a given rook side is erased when the rook is captured by opponent', () => {
    expect(
      doMoves(
        [
          ['d2', 'd4'],
          ['g7', 'g5'],
          ['d4', 'd5'],
          ['f7', 'f5'],
          ['d1', 'd4'],
          ['f5', 'f4'],
          ['d4', 'h8'], // white queen capture black rook
        ],
        initialGameState,
      ),
    ).toMatchObject({
      castlingRights: {
        [WHITE]: {
          [KING_DIRECTION_QUEENSIDE]: true,
          [KING_DIRECTION_KINGSIDE]: true,
        },
        [BLACK]: {
          [KING_DIRECTION_QUEENSIDE]: true,
        },
      },
      castlingRightsLostWhen: {
        [WHITE]: {
          [KING_DIRECTION_QUEENSIDE]: -1,
          [KING_DIRECTION_KINGSIDE]: -1,
        },
        [BLACK]: {
          [KING_DIRECTION_QUEENSIDE]: -1,
          [KING_DIRECTION_KINGSIDE]: 6,
        },
      },
    });
  });
});

describe('undo', () => {
  describe('undo captures', () => {
    test('undo pawn capture', () => {
      const moves = [
        ['e2', 'e4'],
        ['d7', 'd5'],
        ['e4', 'd5'],
      ];

      expect(undoMove(doMoves(moves, initialGameState))).toEqual(
        doMoves(moves.slice(0, -1), initialGameState),
      );
    });
  });

  describe('undo reasonsToAllowDraw', () => {
    const threefold = handleUnpauseMoveWithoutDrawClaim(
      doMoves(
        [
          [181, 148],
          [69, 100],
          [148, 181],
          [100, 69],

          [181, 148],
          [69, 100],
          [148, 181],
          [100, 69],

          [181, 148],
          [69, 100],
          [148, 181],
          [100, 69],
        ],
        initialGameState,
      ),
    );

    test('undo restores 3fold after one move', () => {
      expect(
        undoMove(doMoves([[164, 148]], threefold)).reasonsToAllowDraw,
      ).toEqual(threefold.reasonsToAllowDraw);
    });

    test('undo restores 3fold after two moves', () => {
      expect(
        undoMove(
          undoMove(
            doMoves(
              [
                [164, 148],
                [84, 100],
              ],
              threefold,
            ),
          ),
        ).reasonsToAllowDraw,
      ).toEqual(threefold.reasonsToAllowDraw);
    });

    test('multiple undo and redo have same result', () => {
      let gameState = structuredClone(threefold);
      for (let i = 0; i < 12; i += 1) {
        gameState = undoMove(gameState);
      }

      gameState = handleUnpauseMoveWithoutDrawClaim(
        doMoves(
          [
            [181, 148],
            [69, 100],
            [148, 181],
            [100, 69],

            [181, 148],
            [69, 100],
            [148, 181],
            [100, 69],

            [181, 148],
            [69, 100],
            [148, 181],
            [100, 69],
          ],
          gameState,
        ),
      );

      expect(gameState.reasonsToAllowDraw).toEqual(
        threefold.reasonsToAllowDraw,
      );
    });
  });

  describe('undo castlingRights', () => {
    test('undo restores white castling rights, when white castling is undone', () => {
      expect(
        undoMove(
          doMoves(
            [
              [186, 155],
              [74, 107],
              [170, 138],
              [90, 122],
              [185, 170],
              [73, 90],
              [184, 186],
            ],
            initialGameState,
          ),
        ).castlingRights,
      ).toEqual(initialGameState.castlingRights);
    });

    test('undo restores white castling rights, when white king move is undone', () => {
      expect(
        undoMove(
          doMoves(
            [
              [186, 155],
              [74, 107],
              [170, 138],
              [90, 122],
              [185, 170],
              [73, 90],
              [184, 185],
            ],
            initialGameState,
          ),
        ).castlingRights,
      ).toEqual(initialGameState.castlingRights);
    });

    test('undo restores white castling rights, when white rook move is undone', () => {
      expect(
        undoMove(
          doMoves(
            [
              [186, 155], // g1 h3
              [74, 107], // g8 h6
              [170, 138],
              [90, 122],
              [185, 170],
              [73, 90],
              [187, 186],
            ],
            initialGameState,
          ),
        ).castlingRights,
      ).toEqual(initialGameState.castlingRights);
    });

    test('undo does not restore white castling rights, when black move is undone', () => {
      expect(
        undoMove(
          doMoves(
            [
              [186, 155],
              [74, 107],
              [170, 138],
              [90, 122],
              [185, 170],
              [73, 90],
              [187, 186],
              [88, 104],
            ],
            initialGameState,
          ),
        ).castlingRights,
      ).toEqual(
        doMoves(
          [
            [186, 155],
            [74, 107],
            [170, 138],
            [90, 122],
            [185, 170],
            [73, 90],
            [187, 186],
          ],
          initialGameState,
        ).castlingRights,
      );
    });

    test('undo does not restore white castling rights, when rook lost castling rights before the move that is being undone', () => {
      expect(
        undoMove(
          doMoves(
            [
              [186, 155],
              [74, 107],
              [170, 138],
              [90, 122],
              [185, 170],
              [73, 90],
              [187, 186], // castling right lost here
              [88, 104],
              [186, 187], // moving rook that lost castling rights before
            ],
            initialGameState,
          ),
        ).castlingRights,
      ).toEqual(
        doMoves(
          [
            [186, 155],
            [74, 107],
            [170, 138],
            [90, 122],
            [185, 170],
            [73, 90],
            [187, 186],
          ],
          initialGameState,
        ).castlingRights,
      );
    });
  });
});
