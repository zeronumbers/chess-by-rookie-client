import {
  WHITE,
  BLACK,
  BoardOfColors,
  Color,
  ObjectOfSquaresWithDirection,
  Moves,
  Square,
  SquareAsString,
  SquareOrNull,
  MoveType,
  EMPTY_SQUARE,
  NORMAL_MOVE_TYPE,
  CAPTURE_MOVE_TYPE,
  KINGSIDE_MOVE_TYPE,
  QUEENSIDE_MOVE_TYPE,
  EN_PASSANT_MOVE_TYPE,
  DOUBLE_FORWARD_MOVE_TYPE,
  PROMOTION_MOVE_TYPE,
  PROMOTION_WITH_CAPTURE_MOVE_TYPE,
  Controls,
  ControlledBy,
  CastlingRights,
  KING_DIRECTION_KINGSIDE,
  KING_DIRECTION_QUEENSIDE,
} from './globals';

// FIXME: arguments order of functions is random. Find a way to decide order of arguments.

/* functions here take control, and return an object of square and moveType.
   such object is called moves.
   moves returned here aren't always valid because piece could be pinned
   or king could be in check, also even if it is valid. */

/* it is designed to be used with only basic moves like capture and move.
   for pawn moves and castling use special fns */
export const labelNormalAndCaptureMoves = (
  boardOfColors: BoardOfColors,
  color: Color,
  controlsOfSquare: ObjectOfSquaresWithDirection,
): Moves =>
  Object.entries(controlsOfSquare).reduce((acc, [squareAsString]) => {
    const colorOfSquare = boardOfColors[Number(squareAsString)];

    if (colorOfSquare !== color) {
      if (colorOfSquare === EMPTY_SQUARE) {
        return { ...acc, [squareAsString]: NORMAL_MOVE_TYPE };
      }
      return { ...acc, [squareAsString]: CAPTURE_MOVE_TYPE };
    }
    return acc;
  }, {});

// it is assumed that it is called with targetSquare that is from controls of originSquare
const labelPawnControl = (
  originSquare: Square,
  targetSquare: Square,
  enPassantSquare: SquareOrNull,
  boardOfColors: BoardOfColors,
  colorOfEnemy: Color,
): MoveType | null => {
  const colorOfSquare = boardOfColors[targetSquare];
  if (colorOfSquare === colorOfEnemy) {
    if (targetSquare > 179 || targetSquare < 76) {
      return PROMOTION_WITH_CAPTURE_MOVE_TYPE;
    }

    return CAPTURE_MOVE_TYPE;
  }

  //  > and < is used to make sure that enPassant is not shown for friendly pawns
  if (
    targetSquare === enPassantSquare &&
    ((originSquare > 131 && originSquare < 140) ||
      (originSquare > 115 && originSquare < 124))
  ) {
    return EN_PASSANT_MOVE_TYPE;
  }

  return null;
};

export const labelMovesOfPawn = (
  squareControls: Controls,
  enPassantSquare: SquareOrNull,
  square: Square,
  boardOfColors: BoardOfColors,
): Moves => {
  const colorOfAlly = boardOfColors[square];
  const colorOfEnemy = (colorOfAlly * -1) as Color;
  const captureSquares = squareControls[square];

  // captures
  const moves: Moves = Object.entries(
    captureSquares as ObjectOfSquaresWithDirection,
  ).reduce((acc, [squareAsString]) => {
    const moveType = labelPawnControl(
      square,
      Number(squareAsString) as unknown as Square,
      enPassantSquare,
      boardOfColors,
      colorOfEnemy,
    );

    if (moveType !== null) {
      return { ...acc, [squareAsString]: moveType };
    }

    return acc;
  }, {});

  // moves
  const directionForward = colorOfAlly * 16;
  const forwardSquare = square + directionForward;
  if (boardOfColors[forwardSquare] === EMPTY_SQUARE) {
    if (forwardSquare < 76 || forwardSquare > 179) {
      moves[forwardSquare as Square] = PROMOTION_MOVE_TYPE;
    } else {
      moves[forwardSquare as Square] = NORMAL_MOVE_TYPE;

      const doubleForwardSquare = forwardSquare + directionForward;
      if (
        boardOfColors[doubleForwardSquare] === EMPTY_SQUARE &&
        (square > 163 || square < 92)
      ) {
        moves[doubleForwardSquare as Square] = DOUBLE_FORWARD_MOVE_TYPE;
      }
    }
  }

  return moves;
};

export const labelMovesOfKing = (() => {
  // squares in array must be ordered, starting from the square next to king.
  const CASTLING_SQUARES_BETWEEN_KING_AND_ROOK = {
    [WHITE]: {
      [KING_DIRECTION_QUEENSIDE]: [183, 182, 181],
      [KING_DIRECTION_KINGSIDE]: [185, 186],
    },
    [BLACK]: {
      [KING_DIRECTION_QUEENSIDE]: [71, 70, 69],
      [KING_DIRECTION_KINGSIDE]: [73, 74],
    },
  } as const;

  const isSquareControlledByColor = (
    squareControlledBy: ControlledBy,
    square: Square,
    color: Color,
  ) => Object.keys(squareControlledBy[square][color]).length > 0;

  return (
    square: Square,
    boardOfColors: BoardOfColors,
    squareControls: Controls,
    squareControlledBy: ControlledBy,
    castlingRights: CastlingRights,
  ): Moves => {
    const moves = squareControls[square] as Moves;
    const colorOfAlly = boardOfColors[square] as Color;
    const colorOfEnemy = (colorOfAlly * -1) as Color;

    // normal moves
    const result = Object.entries(moves).reduce((acc, [squareAsString]) => {
      // if square is not controlled by enemy
      if (
        Object.keys(
          squareControlledBy[Number(squareAsString) as Square][colorOfEnemy],
        ).length < 1
      ) {
        const colorOfSquare = boardOfColors[Number(squareAsString)];
        if (colorOfSquare === EMPTY_SQUARE) {
          return { ...acc, [squareAsString]: NORMAL_MOVE_TYPE };
        }
        if (colorOfSquare === colorOfEnemy) {
          return { ...acc, [squareAsString]: CAPTURE_MOVE_TYPE };
        }
        return acc;
      }
      return acc;
    }, {}) as Moves;

    // castling:
    // if king is not in check
    if (!isSquareControlledByColor(squareControlledBy, square, colorOfEnemy)) {
      Object.keys(castlingRights[colorOfAlly]).forEach((_direction) => {
        // absurd line below is needed only for typescript
        const direction = Number(_direction) as
          | typeof KING_DIRECTION_QUEENSIDE
          | typeof KING_DIRECTION_KINGSIDE;
        const castlingSquaresBetween =
          CASTLING_SQUARES_BETWEEN_KING_AND_ROOK[colorOfAlly][direction];
        const squareThatKingJumpsOver = castlingSquaresBetween[0];
        const kingTargetSquare = castlingSquaresBetween[1] as Square;

        // if square that king jumps over is not controlled by enemy
        if (
          !isSquareControlledByColor(
            squareControlledBy,
            squareThatKingJumpsOver,
            colorOfEnemy,
          ) &&
          // does not end up on controlled by enemy square
          !isSquareControlledByColor(
            squareControlledBy,
            kingTargetSquare,
            colorOfEnemy,
          ) &&
          // if every square between is empty

          // FIXME: ts, wtf is this error?
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore:next-line
          castlingSquaresBetween.every(
            (square: Square) => boardOfColors[square] === EMPTY_SQUARE,
          )
        ) {
          const moveType =
            direction === KING_DIRECTION_KINGSIDE
              ? KINGSIDE_MOVE_TYPE
              : QUEENSIDE_MOVE_TYPE;
          result[kingTargetSquare] = moveType;
        }
      });
    }

    return result;
  };
})();

// FIXME: does it return valid moves?
// returns valid moves, does not include castling moves even when they are possible
export const labelMovesOfKingWithoutCastling = (
  squareControlledBy: ControlledBy,
  squareControls: Controls,
  square: Square,
  boardOfColors: BoardOfColors,
): Moves => {
  const moves = squareControls[square] as ObjectOfSquaresWithDirection;
  const colorOfAlly = boardOfColors[square] as Color;
  const colorOfEnemy = (colorOfAlly * -1) as Color;

  // normal moves
  return Object.entries(moves).reduce((acc, [squareAsString]) => {
    // if square is not controlled by enemy
    if (
      !Object.keys(
        squareControlledBy[squareAsString as SquareAsString][colorOfEnemy],
      ).length
    ) {
      const colorOfSquare = boardOfColors[squareAsString as SquareAsString];
      if (colorOfSquare === EMPTY_SQUARE) {
        return { ...acc, [squareAsString]: NORMAL_MOVE_TYPE };
      }
      if (colorOfSquare === colorOfEnemy) {
        return { ...acc, [squareAsString]: CAPTURE_MOVE_TYPE };
      }
      return acc;
    }
    return acc;
  }, {});
};
