import {
  BoardOfColors,
  Square,
  ObjectOfSquaresWithDirection,
  Direction,
  DIRECTIONS_OF_BISHOP,
  DIRECTIONS_OF_KNIGHT,
  DIRECTIONS_OF_QUEEN,
  DIRECTIONS_OF_ROOK,
  DIRECTIONS_FOR_PAWNS_OF_BOTH_COLORS,
  EMPTY_SQUARE,
  Color,
  SquareOrEdge,
  ROOK,
  BISHOP,
  QUEEN,
  KING,
  PAWN,
  KNIGHT,
} from './globals';

/* BEGIN not vector pieces control fns */
const makeControlOfEmpty = () => ({});

const makeMakerOfControlOfNonVectorPiece =
  (directions: readonly Direction[]) =>
  (
    boardOfColors: BoardOfColors,
    square: Square,
  ): ObjectOfSquaresWithDirection =>
    directions.reduce((control, direction) => {
      const nextSquare = square + direction;
      return boardOfColors[nextSquare]
        ? { ...control, [nextSquare]: direction }
        : control;
    }, {});

// direction of queen is not a typo
const makeControlOfKing =
  makeMakerOfControlOfNonVectorPiece(DIRECTIONS_OF_QUEEN);
const makeControlOfKnight =
  makeMakerOfControlOfNonVectorPiece(DIRECTIONS_OF_KNIGHT);

const makeControlOfPawn = (
  boardOfColors: BoardOfColors,
  square: Square,
  color: Color,
): ObjectOfSquaresWithDirection =>
  makeMakerOfControlOfNonVectorPiece(
    DIRECTIONS_FOR_PAWNS_OF_BOTH_COLORS[color],
  )(boardOfColors, square);

/* END not vector pieces control fns */

/* BEGIN vector pieces control fns */
export const makeVector = (
  boardOfColors: BoardOfColors,
  square: Square,
  direction: Direction,
): ObjectOfSquaresWithDirection => {
  /* the first square (where in theory the vector piece is located)
     is not controlled by itself (so it is not included in vector) */
  let nextSquare = (square + direction) as SquareOrEdge;
  let color = boardOfColors[nextSquare];
  const vector: ObjectOfSquaresWithDirection = {};

  while (color === EMPTY_SQUARE) {
    vector[nextSquare as Square] = direction;
    nextSquare += direction;
    color = boardOfColors[nextSquare];
  }

  if (color) {
    vector[nextSquare as Square] = direction;
  }

  return vector;
};

const makeMakerOfControlOfVectorPiece =
  (directions: readonly Direction[]) =>
  (
    boardOfColors: BoardOfColors,
    square: Square,
  ): ObjectOfSquaresWithDirection =>
    directions.reduce(
      (control, direction) => ({
        ...control,
        ...makeVector(boardOfColors, square, direction),
      }),
      {},
    );

const makeControlOfRook = makeMakerOfControlOfVectorPiece(DIRECTIONS_OF_ROOK);
const makeControlOfBishop =
  makeMakerOfControlOfVectorPiece(DIRECTIONS_OF_BISHOP);
export const makeControlOfQueen =
  makeMakerOfControlOfVectorPiece(DIRECTIONS_OF_QUEEN);

/* END vector pieces control fns */

export const pieceToControlFn = {
  [EMPTY_SQUARE]: makeControlOfEmpty,
  [ROOK]: makeControlOfRook,
  [BISHOP]: makeControlOfBishop,
  [QUEEN]: makeControlOfQueen,
  [KING]: makeControlOfKing,
  [KNIGHT]: makeControlOfKnight,
  [PAWN]: makeControlOfPawn,
} as const;
