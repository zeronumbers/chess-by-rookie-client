import { pick, dissoc } from 'ramda';
import {
  GameState,
  Square,
  Moves,
  ObjectOfSquaresWithDirection,
  Color,
  Piece,
  SquareAsString,
  CAPTURE_MOVE_TYPE,
  PinnedSquares,
  PAWN,
  KING,
  EN_PASSANT_MOVE_TYPE,
} from './globals';

import {
  labelMovesOfKingWithoutCastling,
  labelMovesOfPawn,
  labelNormalAndCaptureMoves,
  labelMovesOfKing,
} from './pseudo-moves';

import { isVectorPiece } from './utils';

const filterPinned = (
  pinnedSquares: PinnedSquares,
  moves: Moves,
  color: Color,
  square: Square,
): Moves => {
  const pinData = pinnedSquares?.[color]?.[square];

  if (pinData) {
    return pick(Object.keys(pinData), moves);
  }

  return moves;
};

export type RequiredForMakeMoves = Pick<
  GameState,
  | 'boardOfPieces'
  | 'boardOfColors'
  | 'squareControls'
  | 'squareControlledBy'
  | 'currentColor'
  | 'checkingVectors'
  | 'checkingSquares'
  | 'enPassantSquare'
  | 'castlingRights'
  | 'isCheck'
  | 'pinnedSquares'
>;
// returns valid moves
export const makeMoves = <GS extends RequiredForMakeMoves>(
  {
    boardOfPieces,
    boardOfColors,
    squareControls,
    squareControlledBy,
    currentColor,
    checkingVectors,
    checkingSquares,
    enPassantSquare,
    castlingRights,
    isCheck,
    pinnedSquares,
  }: GS,
  square: Square,
): Moves => {
  const color = boardOfColors[square] as Color;
  const piece = boardOfPieces[square] as Piece;

  const controlsOfSquare = squareControls[
    square
  ] as ObjectOfSquaresWithDirection;

  // FIXME this doesnt account for double check?
  if (isCheck && color === currentColor) {
    const checkingSquare = Number(Object.keys(checkingSquares)[0]) as Square;
    const checkingPiece = boardOfPieces[checkingSquare] as Piece;
    // 1. in every case we must see if king can escape
    if (piece === KING) {
      const moves = labelMovesOfKingWithoutCastling(
        squareControlledBy,
        squareControls,
        square,
        boardOfColors,
      );

      if (isVectorPiece(checkingPiece)) {
        const checkingDirection = Object.values(checkingVectors)[0];

        // king cannot move to the square that is on checking vector!
        return dissoc<Moves, Square>(
          (square - checkingDirection) as Square,
          moves,
        );
      }
      return moves;
    }

    // 2. if double check
    if (Object.keys(checkingSquares).length === 2) {
      // only king can escape double check
      return {};
    }
    // pins are irrelevant

    // 3. if single check
    // 3.1. if checking piece is not vector type we can only capture checking square
    if (!isVectorPiece(checkingPiece)) {
      // the only move is to capture checkingSquare
      // if our piece controls checkingSquare

      // FIXME: should filterPinned be run here as well?
      if (controlsOfSquare[checkingSquare]) {
        if (piece === PAWN && square === enPassantSquare) {
          return { [checkingSquare]: EN_PASSANT_MOVE_TYPE };
        }
        return { [checkingSquare]: CAPTURE_MOVE_TYPE };
      }
      return {};
    }

    // 3.2. if piece is vector type we can capture it or block vector
    // pawn's moves forward and doubleForward are not inside controls, so we must compute them here
    const moves =
      piece === PAWN
        ? labelMovesOfPawn(
            squareControls,
            enPassantSquare,
            square,
            boardOfColors,
          )
        : labelNormalAndCaptureMoves(boardOfColors, color, controlsOfSquare);

    return Object.entries(moves).reduce(
      /* we only need squares that exist in checking vector. */
      (acc, [squareAsString, moveType]) => {
        if (checkingVectors[squareAsString as SquareAsString]) {
          return { ...acc, [squareAsString]: moveType };
        }
        return acc;
      },
      {},
    );
  }

  if (piece === KING) {
    return labelMovesOfKing(
      square,
      boardOfColors,
      squareControls,
      squareControlledBy,
      castlingRights,
    );
  }

  // FIXME: filterPinned can use currying. 3 arguments are repeated, only moves changes.
  if (piece === PAWN) {
    return filterPinned(
      pinnedSquares,
      labelMovesOfPawn(squareControls, enPassantSquare, square, boardOfColors),
      color,
      square,
    );
  }

  // deal with pins here
  return filterPinned(
    pinnedSquares,
    labelNormalAndCaptureMoves(
      boardOfColors,
      color,
      squareControls[square] as ObjectOfSquaresWithDirection,
    ),
    color,
    square,
  );
};
