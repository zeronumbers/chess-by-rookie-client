/* because update/undo is a complex process, that requires:
   - order of some functions (prop can be updated after another prop was updated first)
   - temporary values required, that should be shared between several functions.

   I decided to store all this information in one huge object.
   There are three kinds of props in such object
   - (before) props of gameState, but with 'before' prefix
   - (temp) any kind of key prefixed with 'temp' and with any value
   - (after) props of gameState that are changed (or not changed if there was no need for change)

   functions that follow this idea have input named as 'o'.

   update/undo is called with state.
   such state object has all props that require change, renamed with 'before' prefix added.
   additionally temporary values can be added to such object, with 'temp' prefix.

   if a prop from gameState appears in 'o' it means that it is fully updated and valid.
   If you need to call two functions separately to update one prop,
   then create a temp prop in first function and use it in second.
   Such rule doesn't have to work inside body of function, creating a gameState prop,
   and changing it is fine inside function body,
   as long as return value of prop would be fully updated.

   performance wasn't important here,
   because of complexity I decided it is best to keep track of what was updated. */

import {
  dec,
  dropLast,
  pick,
  splitEvery,
  mergeLeft,
  inc,
  adjust,
  assoc,
  assocPath,
  dissoc,
  dissocPath,
  modify,
  modifyPath,
  omit,
  pickBy,
  map,
  pipe,
  curry,
} from 'ramda';

import {
  ReasonsToAllowDraw,
  REASON_3FOLD,
  FILES,
  Controls,
  ControlledBy,
  FIGURE_TO_PIECE,
  QUEEN,
  SQUARES,
  KNIGHT,
  PieceToSquares,
  ReasonsToPauseGame,
  ReasonsForGameOver,
  Piece,
  WHITE,
  BLACK,
  GameState,
  EMPTY_SQUARE,
  PieceAtSquare,
  ROOK,
  ALGEBRAIC_SQUARE_TO_SQUARE,
  KING,
  PAWN,
  KING_DIRECTION_QUEENSIDE,
  KING_DIRECTION_KINGSIDE,
  SQUARE_TO_ALGEBRAIC_SQUARE,
  PIECE_TO_FIGURE,
  MoveType,
  NORMAL_MOVE_TYPE,
  CAPTURE_MOVE_TYPE,
  KINGSIDE_MOVE_TYPE,
  QUEENSIDE_MOVE_TYPE,
  DOUBLE_FORWARD_MOVE_TYPE,
  EN_PASSANT_MOVE_TYPE,
  PROMOTION_MOVE_TYPE,
  PROMOTION_WITH_CAPTURE_MOVE_TYPE,
  Square,
  Color,
  Direction,
  ObjectOfSquaresWithDirection,
  ColorAtSquare,
  REASON_50MOVE,
  REASON_CHECKMATE,
  REASON_STALEMATE,
  REASON_75MOVE,
  ORIGIN_SQUARE_WHITE_KINGSIDE_ROOK,
  ORIGIN_SQUARE_WHITE_QUEENSIDE_ROOK,
  ORIGIN_SQUARE_BLACK_KINGSIDE_ROOK,
  ORIGIN_SQUARE_BLACK_QUEENSIDE_ROOK,
  ColorAsString,
  GameStateForWebRTC,
  SquareOrNull,
  SquareAsString,
  BISHOP,
  MoveHistory,
  BoardOfPieces,
  BoardOfColors,
} from './globals';

import {
  getAlgebraicSquaresAtIndex,
  isCapturingMove,
  isVectorPiece,
} from './utils';
import { makeControlOfQueen, pieceToControlFn, makeVector } from './control';
import { makeMoves, RequiredForMakeMoves } from './moves';

type BeforeProp<T> = {
  [Property in keyof T as `before${Capitalize<
    string & Property
  >}`]: T[Property];
};

// erased from gameState: moveType, placedPiece, castlingOriginSquare, castlingTargetSquare

type TempProps = {
  tempOriginSquare: Square;
  tempTargetSquare: Square;
  tempCastlingOriginSquare: SquareOrNull;
  tempCastlingTargetSquare: SquareOrNull;
  tempEnPassantSquare: SquareOrNull;
  tempPlacedPiece: Piece;
  tempMoveType: MoveType;

  // props that are partially updated between functions
  tempMoveHistory: MoveHistory;
  tempReasonsToAllowDraw: ReasonsToAllowDraw;
  tempReasonsToPauseGame: ReasonsToPauseGame;
  tempReasonsForGameOver: ReasonsForGameOver;
};

type GameStateBefore = BeforeProp<GameState> & {
  beforeOriginSquare: Square;
  beforeTargetSquare: Square;
};

type O = TempProps & GameStateBefore & (GameState | GameStateForWebRTC);

// begin doMove

export const emptyHighlightState = {
  originSquare: null,
  targetSquare: null,
  movesOfOriginSquare: {},
} as const;

type EmptyHighlightStateKeys = keyof typeof emptyHighlightState;

const mergeEmptyHighlightState = <
  T extends Record<string, unknown>,
  R extends T & Pick<GameState, EmptyHighlightStateKeys>,
>(
  o: T,
): R => mergeLeft(emptyHighlightState, o) as R;

export const updateCurrentColor = <T extends Pick<O, 'beforeCurrentColor'>>(
  o: T,
): T & Pick<GameState, 'currentColor'> => ({
  ...o,
  currentColor: (o.beforeCurrentColor * -1) as Color,
});

const updateMoveCounter = <
  T extends Pick<
    O,
    | 'beforeBoardOfPieces'
    | 'beforeMoveCounter'
    | 'beforeOriginSquare'
    | 'tempMoveType'
  >,
>(
  o: T,
): T & Pick<GameState, 'moveCounter'> => {
  const {
    beforeBoardOfPieces,
    beforeOriginSquare,
    beforeMoveCounter,
    tempMoveType,
  } = o;

  if (
    isCapturingMove(tempMoveType) ||
    beforeBoardOfPieces[beforeOriginSquare!] === PAWN
  ) {
    return { ...o, moveCounter: 0 };
  }

  return { ...o, moveCounter: beforeMoveCounter + 1 };
};

/* moveHistory update is splited into two steps:
   - main one (without check)
   - secondary that adds check symbol
   secondary one is called:
   updateMoveHistoryAddCheck */
const beginUpdateMoveHistoryWithoutCheck = (() => {
  const moveHistoryKingside = '0-0';
  const moveHistoryQueenside = '0-0-0';

  return <
    T extends Pick<
      O,
      | 'beforeBoardOfColors'
      | 'beforeBoardOfPieces'
      | 'beforeCurrentColor'
      | 'beforeOriginSquare'
      | 'beforeTargetSquare'
      | 'beforeMoveHistory'
      | 'tempMoveType'
      | 'tempPlacedPiece'
      | 'currentColor'
    >,
  >(
    o: T,
  ) => {
    const {
      beforeBoardOfColors,
      beforeBoardOfPieces,
      beforeCurrentColor,
      beforeOriginSquare,
      beforeTargetSquare,
      beforeMoveHistory,
      tempMoveType,
      tempPlacedPiece,
      currentColor,
    } = o;

    const assocTempMoveHistory = (moveHistoryEntry: string) => ({
      ...o,
      tempMoveHistory: [...beforeMoveHistory, moveHistoryEntry],
    });

    if (tempMoveType === KINGSIDE_MOVE_TYPE) {
      return assocTempMoveHistory(moveHistoryKingside);
    }

    if (tempMoveType === QUEENSIDE_MOVE_TYPE) {
      return assocTempMoveHistory(moveHistoryQueenside);
    }

    const originAlgebraicSquare =
      SQUARE_TO_ALGEBRAIC_SQUARE[beforeOriginSquare];
    const targetAlgebraicSquare =
      SQUARE_TO_ALGEBRAIC_SQUARE[beforeTargetSquare];

    if (tempMoveType === EN_PASSANT_MOVE_TYPE) {
      return assocTempMoveHistory(
        `${originAlgebraicSquare}x${targetAlgebraicSquare} e.p.`,
      );
    }

    const originPiece = beforeBoardOfPieces[beforeOriginSquare] as Piece;
    const originFigure =
      originPiece !== PAWN
        ? PIECE_TO_FIGURE[beforeCurrentColor][originPiece]
        : '';

    const targetPiece = beforeBoardOfPieces[
      beforeTargetSquare
    ] as PieceAtSquare;
    const targetColor = beforeBoardOfColors[
      beforeTargetSquare
    ] as ColorAtSquare;

    // FIXME: ts, wtf this error means? is it trying to find emptySq inside color?
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore:next-line
    const targetFigure =
      targetPiece !== PAWN ? PIECE_TO_FIGURE[targetColor][targetPiece] : '';

    const promotion =
      originPiece !== tempPlacedPiece
        ? `=${PIECE_TO_FIGURE[currentColor][tempPlacedPiece]}`
        : '';

    return assocTempMoveHistory(
      `${originFigure}${originAlgebraicSquare}${
        isCapturingMove(tempMoveType) ? `x${targetFigure}` : '-'
      }${targetAlgebraicSquare}${promotion}`,
    );
  };
})();

const updateEnPassantSquare = <
  T extends Pick<
    O,
    'tempMoveType' | 'beforeOriginSquare' | 'beforeCurrentColor'
  >,
>(
  o: T,
): T & Pick<GameState, 'enPassantSquare'> => {
  const { tempMoveType, beforeOriginSquare, beforeCurrentColor } = o;

  if (tempMoveType === DOUBLE_FORWARD_MOVE_TYPE) {
    return {
      ...o,
      enPassantSquare: (beforeOriginSquare + 16 * beforeCurrentColor) as Square,
    };
  }

  return { ...o, enPassantSquare: null };
};

const updatePieceToSquares = <
  T extends Pick<
    O,
    | 'beforeBoardOfPieces'
    | 'beforeCurrentColor'
    | 'beforePieceToSquares'
    | 'beforeOriginSquare'
    | 'beforeTargetSquare'
    | 'tempMoveType'
    | 'tempCastlingOriginSquare'
    | 'tempCastlingTargetSquare'
    | 'tempPlacedPiece'
  >,
>(
  o: T,
): T & Pick<GameState, 'pieceToSquares'> => {
  const {
    beforeBoardOfPieces,
    beforeCurrentColor,
    beforePieceToSquares,
    beforeOriginSquare,
    beforeTargetSquare,
    tempCastlingOriginSquare,
    tempCastlingTargetSquare,
    tempPlacedPiece,
    tempMoveType,
  } = o;

  let result: PieceToSquares = beforePieceToSquares;

  if (isCapturingMove(tempMoveType)) {
    const oppositeColor = beforeCurrentColor * -1;
    if (tempMoveType === EN_PASSANT_MOVE_TYPE) {
      const capturedSquare = beforeTargetSquare - 16 * beforeCurrentColor;

      result = dissocPath([oppositeColor, PAWN, capturedSquare], result);
    } else {
      result = dissocPath(
        [
          oppositeColor,
          beforeBoardOfPieces[beforeTargetSquare],
          beforeTargetSquare,
        ],
        result,
      );
    }
  }

  if (
    tempMoveType === KINGSIDE_MOVE_TYPE ||
    tempMoveType === QUEENSIDE_MOVE_TYPE
  ) {
    result = modifyPath(
      [beforeCurrentColor, ROOK],
      pipe(
        assoc(`${tempCastlingTargetSquare as Square}`, true),
        dissoc(tempCastlingOriginSquare as Square),
      ),
      result,
    ) as unkown as PieceToSquares;
  }

  return {
    ...o,
    pieceToSquares: modify(
      beforeCurrentColor,
      pipe(
        dissocPath([
          beforeBoardOfPieces[beforeOriginSquare],
          beforeOriginSquare,
        ]),
        assocPath([tempPlacedPiece, beforeTargetSquare], true),
      ),
      result,
    ) as PieceToSquares,
  };
};
const updateBoards = <
  T extends Pick<
    O,
    | 'beforeCurrentColor'
    | 'beforeBoardOfPieces'
    | 'beforeBoardOfColors'
    | 'beforeOriginSquare'
    | 'beforeTargetSquare'
    | 'tempPlacedPiece'
    | 'tempCastlingOriginSquare'
    | 'tempCastlingTargetSquare'
    | 'tempMoveType'
  >,
>(
  o: T,
): T & Pick<GameState, 'boardOfColors' | 'boardOfPieces'> => {
  const {
    tempCastlingOriginSquare,
    tempCastlingTargetSquare,
    tempMoveType,
    tempPlacedPiece,
    beforeCurrentColor,
    beforeBoardOfPieces,
    beforeBoardOfColors,
    beforeTargetSquare,
    beforeOriginSquare,
  } = o;

  const boardOfPiecesCopy = beforeBoardOfPieces.slice();
  const boardOfColorsCopy = beforeBoardOfColors.slice();

  // place target
  boardOfPiecesCopy[beforeTargetSquare] = tempPlacedPiece;
  boardOfColorsCopy[beforeTargetSquare] = beforeCurrentColor;

  // clear origin
  boardOfPiecesCopy[beforeOriginSquare] = EMPTY_SQUARE;
  boardOfColorsCopy[beforeOriginSquare] = EMPTY_SQUARE;

  if (tempMoveType === EN_PASSANT_MOVE_TYPE) {
    // clear en passant square
    /* this is a bit counter intuitive but don't use enPassantSquare here,
       as that is the square where we would put moving piece */

    const capturedSquare = beforeTargetSquare - 16 * beforeCurrentColor;
    boardOfPiecesCopy[capturedSquare] = EMPTY_SQUARE;
    boardOfColorsCopy[capturedSquare] = EMPTY_SQUARE;
  }

  if (tempCastlingOriginSquare !== null) {
    // place castling target

    boardOfPiecesCopy[tempCastlingTargetSquare!] = ROOK;

    boardOfColorsCopy[tempCastlingTargetSquare!] = beforeCurrentColor;
    // clear castling origin
    boardOfPiecesCopy[tempCastlingOriginSquare] = EMPTY_SQUARE;
    boardOfColorsCopy[tempCastlingOriginSquare] = EMPTY_SQUARE;
  }

  return {
    ...o,
    boardOfPieces: boardOfPiecesCopy,
    boardOfColors: boardOfColorsCopy,
  };
};

const updateSquareControlsAndSquareControlledBy = (() => {
  const clearControlsAndControlledByOfSquare = curry(
    <T extends Pick<GameState, 'squareControls' | 'squareControlledBy'>>(
      color: Color,
      clearedSquare: Square,
      gameState: T,
    ): T => {
      const { squareControls, squareControlledBy } = gameState;

      return pipe(
        assocPath(['squareControls', clearedSquare], {}),
        assoc(
          'squareControlledBy',
          Object.keys(squareControls[clearedSquare]).reduce(
            (updatedControlledBy, squareAsString) =>
              dissocPath(
                [squareAsString, color, clearedSquare],
                updatedControlledBy,
              ),
            squareControlledBy,
          ),
        ),
      )(gameState) as unknown as T;
    },
  );

  const placeControlsAndControlledByOfSquare = curry(
    <
      T extends Pick<
        GameState,
        'boardOfColors' | 'squareControlledBy' | 'squareControls'
      >,
    >(
      piece: PieceAtSquare,
      color: Color,
      placedSquare: Square,
      gameState: T,
    ) => {
      const { boardOfColors, squareControlledBy } = gameState;

      const placedSquareControls = pieceToControlFn[piece](
        boardOfColors,
        placedSquare,
        color,
      );

      return pipe(
        assocPath(['squareControls', placedSquare], placedSquareControls),
        assoc(
          'squareControlledBy',
          Object.entries(placedSquareControls).reduce(
            (updatedControlledBy, [squareAsString, direction]) =>
              assocPath(
                [squareAsString, color, placedSquare],
                direction,
                updatedControlledBy,
              ),
            squareControlledBy,
          ),
        ),
      )(gameState);
    },
  );

  /* FIXME: TS: this is complete madness,
    extendVector and shrinkVector have same type, but i don't know how to write it in ts
    because T has to be used inside the function body.
    That is why extend and shirnk vector functions have their type assigned to FnUpdateVector,
    as well as literally repeating same type inside the function declaration again,
    to be able to do `as T` to keep sanity by not having to deal with typescript ramda combo. */
  type RequiredForUpdateVector = Pick<
    GameState,
    'squareControls' | 'squareControlledBy' | 'boardOfColors'
  >;
  type FnUpdateVector = <T extends RequiredForUpdateVector>(
    gameState: T,
    squareToUpdateFrom: Square,
    squareOfVectorPiece: Square,
    direction: Direction,
    colorAsString: ColorAsString,
  ) => T;

  const extendVector: FnUpdateVector = <T extends RequiredForUpdateVector>(
    gameState: T,
    squareToUpdateFrom: Square,
    squareOfVectorPiece: Square,
    direction: Direction,
    colorAsString: ColorAsString,
  ): T => {
    const { squareControls, squareControlledBy, boardOfColors } = gameState;

    const oldControlsOfVectorPiece = squareControls[squareOfVectorPiece];
    const newVector = makeVector(boardOfColors, squareToUpdateFrom, direction);
    return pipe(
      assocPath(['squareControls', squareOfVectorPiece], {
        ...oldControlsOfVectorPiece,
        ...newVector,
      }),
      assoc(
        'squareControlledBy',
        Object.entries(newVector).reduce(
          (updatedControlledBy, [squareAsString, directionOfSquare]) =>
            assocPath(
              [squareAsString, colorAsString, squareOfVectorPiece],
              directionOfSquare,
              updatedControlledBy,
            ),
          squareControlledBy,
        ),
      ),
    )(gameState) as T;
  };

  const shrinkVector: FnUpdateVector = <T extends RequiredForUpdateVector>(
    gameState: T,
    squareToUpdateFrom: Square,
    squareOfVectorPiece: Square,
    direction: Direction,
    colorAsString: ColorAsString,
  ): T => {
    const { squareControls, squareControlledBy, boardOfColors } = gameState;

    const oldControlsOfVectorPiece = squareControls[squareOfVectorPiece];
    const newVector = makeVector(boardOfColors, squareToUpdateFrom, direction);
    return pipe(
      assocPath(
        ['squareControls', squareOfVectorPiece],
        omit(Object.keys(newVector), oldControlsOfVectorPiece),
      ),
      assoc(
        'squareControlledBy',
        Object.keys(newVector).reduce(
          (updatedControlledBy, squareAsString) =>
            dissocPath(
              [squareAsString, colorAsString, squareOfVectorPiece],
              updatedControlledBy,
            ),
          squareControlledBy,
        ),
      ),
    )(gameState) as T;
  };

  type RequiredForUpdateVectors = Pick<GameState, 'boardOfPieces'> &
    RequiredForUpdateVector;
  const makeVectorsUpdateFn = (f: FnUpdateVector) =>
    curry(
      <T extends RequiredForUpdateVectors>(
        updatedSquare: Square,
        gameState: T,
      ) => {
        const { boardOfPieces, squareControlledBy } = gameState;

        const iterateOver = map(
          pickBy((_, squareAsString) =>
            isVectorPiece(
              boardOfPieces[Number(squareAsString)] as PieceAtSquare,
            )),
          squareControlledBy[updatedSquare],
        ) as ObjectOfSquaresWithDirection;

        return Object.entries(iterateOver).reduce(
          (outerGameState, [colorAsString, controlledByOfColor]) =>
            Object.entries(controlledByOfColor).reduce(
              (innerGameState, [squareAsString, direction]) =>
                f(
                  innerGameState,
                  updatedSquare,
                  Number(squareAsString) as Square,
                  direction as Direction,
                  // Number(colorAsString) as unknown as Color,
                  colorAsString as ColorAsString,
                ) as T,
              outerGameState,
            ),
          gameState,
        );
      },
    );

  const extendVectors = makeVectorsUpdateFn(extendVector);
  const shrinkVectors = makeVectorsUpdateFn(shrinkVector);

  return <
    T extends Pick<
      O,
      | 'beforeCurrentColor'
      | 'beforeOriginSquare'
      | 'beforeTargetSquare'
      | 'beforeSquareControls'
      | 'beforeSquareControlledBy'
      | 'tempPlacedPiece'
      | 'tempMoveType'
      | 'tempCastlingOriginSquare'
      | 'tempCastlingTargetSquare'
      | 'currentColor'
    >,
    R extends T & Pick<GameState, 'squareControls' | 'squareControlledBy'>,
  >(
    o: T,
  ): R => {
    const {
      beforeTargetSquare,
      beforeOriginSquare,
      beforeCurrentColor,
      beforeSquareControls,
      beforeSquareControlledBy,
      tempMoveType,
      tempPlacedPiece,
      tempCastlingOriginSquare,
      tempCastlingTargetSquare,
    } = o;

    const oppositeColor = (beforeCurrentColor * -1) as Color;

    const updatedGameState = pipe<[R], R, R, R, R>(
      tempMoveType === CAPTURE_MOVE_TYPE ||
        tempMoveType === PROMOTION_WITH_CAPTURE_MOVE_TYPE
        ? // clear controls of captured piece
          clearControlsAndControlledByOfSquare(
            oppositeColor,
            beforeTargetSquare,
          )
        : // shrink vectors of now occupied targetSquare
          shrinkVectors(beforeTargetSquare),

      // place target
      placeControlsAndControlledByOfSquare(
        tempPlacedPiece,
        beforeCurrentColor,
        beforeTargetSquare,
      ),

      // clean origin
      clearControlsAndControlledByOfSquare(
        beforeCurrentColor,
        beforeOriginSquare,
      ),

      // extend origin
      extendVectors(beforeOriginSquare),
    )({
      ...o,
      squareControls: beforeSquareControls,
      squareControlledBy: beforeSquareControlledBy,
    } as R) as R;

    if (tempMoveType === EN_PASSANT_MOVE_TYPE) {
      const capturedSquare = (beforeTargetSquare -
        16 * beforeCurrentColor) as Square;

      return pipe(
        // clear pawn that is captured
        clearControlsAndControlledByOfSquare(oppositeColor, capturedSquare),

        extendVectors(capturedSquare),
      )(updatedGameState) as unknown as R;
    }

    if (
      tempMoveType === KINGSIDE_MOVE_TYPE ||
      tempMoveType === QUEENSIDE_MOVE_TYPE
    ) {
      return pipe(
        placeControlsAndControlledByOfSquare(
          ROOK,
          beforeCurrentColor,
          tempCastlingTargetSquare!,
        ),

        shrinkVectors(tempCastlingTargetSquare!),

        clearControlsAndControlledByOfSquare(
          beforeCurrentColor,
          tempCastlingOriginSquare!,
        ),

        extendVectors(tempCastlingOriginSquare!),
      )(updatedGameState) as R;
    }

    return updatedGameState as R;
  };
})();

const updateCastlingRights = <
  T extends Pick<
    O,
    | 'beforeCurrentColor'
    | 'beforeBoardOfPieces'
    | 'beforeBoardOfColors'
    | 'beforeCastlingRights'
    | 'beforeCastlingRightsLostWhen'
    | 'beforeTargetSquare'
    | 'beforeMoveHistory'
    | 'tempPlacedPiece'
    | 'currentColor'
    | 'pieceToSquares'
  >,
  R extends T & Pick<GameState, 'castlingRights' | 'castlingRightsLostWhen'>,
>(
  o: T,
): R => {
  const {
    beforeCurrentColor,
    beforeBoardOfPieces,
    beforeBoardOfColors,
    beforeCastlingRights,
    beforeCastlingRightsLostWhen,
    beforeTargetSquare,
    beforeMoveHistory,
    tempPlacedPiece,
    currentColor,
    pieceToSquares,
  } = o;

  const targetPiece = beforeBoardOfPieces[beforeTargetSquare];
  const targetColor = beforeBoardOfColors[beforeTargetSquare];

  const idxThisMove = beforeMoveHistory.length;

  let result = {
    ...o,
    castlingRights: beforeCastlingRights,
    castlingRightsLostWhen: beforeCastlingRightsLostWhen,
  };

  if (targetColor === currentColor && targetPiece === ROOK) {
    // if move captured rook, king cannot castle to that direction anymore
    const castlingRightsOfOpponent = beforeCastlingRights[currentColor];

    if (
      castlingRightsOfOpponent[KING_DIRECTION_KINGSIDE] &&
      beforeTargetSquare ===
        (currentColor === WHITE
          ? ORIGIN_SQUARE_WHITE_KINGSIDE_ROOK
          : ORIGIN_SQUARE_BLACK_KINGSIDE_ROOK)
    ) {
      result = pipe(
        assocPath(
          ['castlingRightsLostWhen', currentColor, KING_DIRECTION_KINGSIDE],
          idxThisMove,
        ),
        dissocPath(['castlingRights', currentColor, KING_DIRECTION_KINGSIDE]),
      )(result) as R;
    } else if (
      castlingRightsOfOpponent[KING_DIRECTION_QUEENSIDE] &&
      beforeTargetSquare ===
        (currentColor === WHITE
          ? ORIGIN_SQUARE_WHITE_QUEENSIDE_ROOK
          : ORIGIN_SQUARE_BLACK_QUEENSIDE_ROOK)
    ) {
      result = pipe(
        assocPath(
          ['castlingRightsLostWhen', currentColor, KING_DIRECTION_QUEENSIDE],
          idxThisMove,
        ),

        dissocPath(['castlingRights', currentColor, KING_DIRECTION_QUEENSIDE]),
      )(result) as R;
    }
  }

  if (tempPlacedPiece === ROOK) {
    // expect promotion to add more rooks
    const squaresOfRook = Object.keys(pieceToSquares[beforeCurrentColor][ROOK]);
    if (squaresOfRook.length) {
      // 131 +/- 56 is 187 or 75, the default squares of kingside rooks
      const squareOfKingsideRook = (131 + 56 * currentColor) as Square;
      // same logic for queenside
      const squareOfQueensideRook = (124 + 56 * currentColor) as Square;

      // if there is no rook at the initial square
      if (
        !pieceToSquares[beforeCurrentColor][ROOK][squareOfKingsideRook] &&
        beforeCastlingRights[beforeCurrentColor][KING_DIRECTION_KINGSIDE]
      ) {
        result = pipe(
          assocPath(
            [
              'castlingRightsLostWhen',
              beforeCurrentColor,
              KING_DIRECTION_KINGSIDE,
            ],
            idxThisMove,
          ),
          dissocPath([
            'castlingRights',
            beforeCurrentColor,
            KING_DIRECTION_KINGSIDE,
          ]),
        )(result) as R;
      }

      if (
        !pieceToSquares[beforeCurrentColor][ROOK][squareOfQueensideRook] &&
        beforeCastlingRights[beforeCurrentColor][KING_DIRECTION_QUEENSIDE]
      ) {
        result = pipe(
          assocPath(
            [
              'castlingRightsLostWhen',
              beforeCurrentColor,
              KING_DIRECTION_QUEENSIDE,
            ],
            idxThisMove,
          ),
          dissocPath([
            'castlingRights',
            beforeCurrentColor,
            KING_DIRECTION_QUEENSIDE,
          ]),
        )(result) as R;
      }

      return {
        ...o,
        castlingRights: result.castlingRights,
        castlingRightsLostWhen: result.castlingRightsLostWhen,
      };
    }
  }

  if (tempPlacedPiece === KING) {
    let emptyGS = assocPath(['castlingRights', beforeCurrentColor], {}, result);

    if (beforeCastlingRights[beforeCurrentColor][KING_DIRECTION_KINGSIDE]) {
      emptyGS = assocPath(
        ['castlingRightsLostWhen', beforeCurrentColor, KING_DIRECTION_KINGSIDE],
        idxThisMove,
        emptyGS,
      );
    }

    if (beforeCastlingRights[beforeCurrentColor][KING_DIRECTION_QUEENSIDE]) {
      emptyGS = assocPath(
        [
          'castlingRightsLostWhen',
          beforeCurrentColor,
          KING_DIRECTION_QUEENSIDE,
        ],
        idxThisMove,
        emptyGS,
      ) as R;
    }

    return {
      ...o,
      castlingRights: emptyGS.castlingRights,
      castlingRightsLostWhen: emptyGS.castlingRightsLostWhen,
    } as R;
  }

  return {
    ...o,
    castlingRights: result.castlingRights,
    castlingRightsLostWhen: result.castlingRightsLostWhen,
  } as R;
};

export const updateIsCheckAndCheckingSquares = (() => {
  const alwaysTrue = (): true => true;

  return <
    T extends Pick<
      GameState,
      'currentColor' | 'squareControlledBy' | 'pieceToSquares'
    >,
  >(
    o: T,
  ): T & Pick<GameState, 'isCheck' | 'checkingSquares'> => {
    const { currentColor, squareControlledBy, pieceToSquares } = o;

    const currentColorKingSquare = Number(
      Object.keys(pieceToSquares[currentColor][KING])[0],
    ) as Square;

    const checkingSquares = map(
      alwaysTrue,
      squareControlledBy[currentColorKingSquare][(currentColor * -1) as Color],
    );

    return {
      ...o,
      isCheck: Object.keys(checkingSquares).length > 0,
      checkingSquares,
    };
  };
})();

const finishUpdateMoveHistoryAddCheck = <
  T extends Pick<GameState, 'isCheck'> & Pick<O, 'tempMoveHistory'>,
>(
  o: T,
): T & Pick<GameState, 'moveHistory'> => {
  const { isCheck, tempMoveHistory } = o;

  if (isCheck) {
    return {
      ...o,
      moveHistory: adjust(-1, (s) => `${s}+`, tempMoveHistory),
    };
  }

  return {
    ...o,
    moveHistory: tempMoveHistory,
  };
};

// used in both doMove and undoMove, and for computation of initialGameState in globals.ts
export const updatePinnedSquaresAndCheckingVectors = (() => {
  // naming is terrible but how to improve it?
  type Required = Pick<
    GameState,
    | 'squareControlledBy'
    | 'squareControls'
    | 'boardOfColors'
    | 'boardOfPieces'
    | 'pieceToSquares'
    | 'currentColor'
    | 'pinnedSquares'
    | 'checkingVectors'
  >;

  const helper = <T extends Required>(gameState: T, color: Color): T => {
    const {
      squareControlledBy,
      squareControls,
      boardOfColors,
      boardOfPieces,
      pieceToSquares,
      currentColor,
    } = gameState;

    const squareOfKing = Number(
      Object.keys(pieceToSquares[color][KING])[0],
    ) as Square;

    const colorOfEnemy = color * -1;
    const vectorsOfKing = makeControlOfQueen(boardOfColors, squareOfKing);

    return Object.entries(vectorsOfKing)
      .filter(
        ([squareAsString]) =>
          boardOfColors[Number(squareAsString)] !== EMPTY_SQUARE,
      )
      .reduce(
        (
          updatedGameState: T,
          [squareAsString, direction]: [string, Direction],
        ): T => {
          // if we found a square with same color as our king
          if (boardOfColors[Number(squareAsString)] === color) {
            const oppositeDirection = direction * -1;
            const [pinningSquare] =
              Object.entries(
                squareControlledBy[squareAsString as SquareAsString][
                  `${colorOfEnemy}` as ColorAsString
                ],
              ).filter(
                ([innerSquareAsString, innerDirection]) =>
                  innerDirection === oppositeDirection &&
                  isVectorPiece(
                    boardOfPieces[Number(innerSquareAsString)] as PieceAtSquare,
                  ),
              )[0] || [];

            // if square is controlledBy enemy
            if (pinningSquare) {
              /*
            possible squares must include all squares on a pinned line where piece could go.
            it has square, direction where direction is irrelevant
                         */
              const possibleSquares = {
                [pinningSquare]: oppositeDirection,

                ...pickBy(
                  (innerDirection) => direction === innerDirection,
                  omit([squareAsString], vectorsOfKing),
                ),

                ...pickBy(
                  (innerDirection) => innerDirection === oppositeDirection,
                  omit(
                    [squareAsString],
                    squareControls[Number(pinningSquare) as Square],
                  ),
                ),
              } as ObjectOfSquaresWithDirection;

              return assocPath(
                ['pinnedSquares', color, squareAsString],
                possibleSquares,
                updatedGameState,
              );
            }
            return updatedGameState;
          }

          // only current color can have checking vectors!
          if (
            color === currentColor &&
            squareControlledBy[squareOfKing][(currentColor * -1) as Color][
              Number(squareAsString) as Square
            ] &&
            isVectorPiece(
              boardOfPieces[Number(squareAsString)] as PieceAtSquare,
            )
          ) {
            const checkingVector = pickBy(
              (innerDirection) => direction === innerDirection,
              vectorsOfKing,
            ) as ObjectOfSquaresWithDirection;

            return modify(
              'checkingVectors',
              mergeLeft(checkingVector),
              updatedGameState,
            ) as T;
          }

          return updatedGameState;
        },
        gameState,
      ) as T;
  };

  return <
    T extends Required,
    R extends T & Pick<GameState, 'pinnedSquares' | 'checkingVectors'>,
  >(
    gameState: T,
  ): R =>
    helper(
      helper(
        {
          ...gameState,
          pinnedSquares: { [WHITE]: {}, [BLACK]: {} },
          checkingVectors: {},
        } as R,
        WHITE,
      ),

      BLACK,
    ) as R;
})();

// most reasons are updated here, except 3/5 folds
const beginUpdateReasons = (() => {
  type GSRequiredForIsThereMoveForCurrentColor = RequiredForMakeMoves &
    Pick<GameState, 'currentColor' | 'pieceToSquares'>;
  const isThereMoveForCurrentColor = <
    T extends GSRequiredForIsThereMoveForCurrentColor,
  >(
    gameState: T,
  ): boolean => {
    const { currentColor, pieceToSquares } = gameState;

    /* loops are required to exit early,
       a rewrite with `.some` method is possible but would require additional if */
    // Array of Arrays of Square strings of all pieces of current color
    for (const squaresAsStrings of Object.values(
      pieceToSquares[currentColor],
    ).map((o) => Object.keys(o))) {
      for (const squareAsString of squaresAsStrings) {
        /* Intuitively you may think that this is inefficient because we compute all moves
           of piece when we need to find just one.
           But the difference is small because most of stuff is already computed in controls.
           While using transducers or generators for move computation
           could allow us to stop at the first move found
           they would come at a cost which would probably outweight most performance gains.
           However I didn't test this */

        if (
          Object.keys(makeMoves(gameState, Number(squareAsString) as Square))
            .length
        ) {
          return true;
        }
      }
    }

    return false;
  };

  return <
    T extends Pick<GameState, 'isCheck' | 'moveCounter'> &
      GSRequiredForIsThereMoveForCurrentColor &
      Pick<O, 'beforeReasonsToPauseGame'>,
  >(
    o: T,
  ): T &
    Pick<O, 'tempReasonsToPauseGame' | 'tempReasonsForGameOver'> &
    Pick<GameState, 'reasonsToAllowDraw'> => {
    const { moveCounter, isCheck, beforeReasonsToPauseGame } = o;

    const tempReasonsForGameOver: ReasonsForGameOver = {};
    const tempReasonsToPauseGame: ReasonsToPauseGame = {};
    const reasonsToAllowDraw = beforeReasonsToPauseGame;

    // checkmate or stalemate
    if (!isThereMoveForCurrentColor(o)) {
      tempReasonsForGameOver[isCheck ? REASON_CHECKMATE : REASON_STALEMATE] =
        true;
    }

    // 50/75 move rule
    if (moveCounter === 100) {
      tempReasonsToPauseGame[REASON_50MOVE] = true;
    }

    if (moveCounter === 150) {
      tempReasonsForGameOver[REASON_75MOVE] = true;
    }

    if (moveCounter > 100) {
      reasonsToAllowDraw[REASON_50MOVE] = true;
    }

    // 3/5 folds are done in updateEpds
    return {
      ...o,
      reasonsToAllowDraw,
      tempReasonsForGameOver,
      tempReasonsToPauseGame,
    };

    /* dead position:
       this is a problem that is unreasonable to solve with what I have.
       The best solution that I know of is: https://chasolver.org/FUN22-full.pdf
       it is written in c++ and uses stockfish.
       the 5.2 mentions that:
       "there exist artificial positions that are not efficiently captured by our logic
       and the tool could take a long time to analyze"

       Obviously I cannot make something better than that, even if I had the same language.
       I don't even have a chess engine, just a game. */

    // draw on time: (requires dead position)
    // win on time: (could be incorrect because of draw on time)
  };
})();

type RequiredForTranslateToEpdBoard = Pick<
  GameState,
  'boardOfColors' | 'boardOfPieces'
>;
type RequiredForTranslateToEpdCastlingRights = Pick<
  GameState,
  'castlingRights'
>;
type RequiredForTranslateToEpdCurrentColor = Pick<GameState, 'currentColor'>;
type RequiredForTranlsateToEpdEnPassantSquare = Pick<
  GameState,
  'enPassantSquare'
>;
export type RequiredForMakeEpdFromGameState = RequiredForTranslateToEpdBoard &
  RequiredForTranslateToEpdCastlingRights &
  RequiredForTranslateToEpdCurrentColor &
  RequiredForTranlsateToEpdEnPassantSquare;

// Important: props of 'o' here can be before, and after change, but they are named normally.
export const makeEpdFromGameState = (() => {
  const pieceToCode = {
    [EMPTY_SQUARE]: {
      [EMPTY_SQUARE]: ' ',
    },
    [WHITE]: {
      [PAWN]: 'P',
      [KNIGHT]: 'N',
      [BISHOP]: 'B',
      [ROOK]: 'R',
      [QUEEN]: 'Q',
      [KING]: 'K',
    },
    [BLACK]: {
      [PAWN]: 'p',
      [KNIGHT]: 'n',
      [BISHOP]: 'b',
      [ROOK]: 'r',
      [QUEEN]: 'q',
      [KING]: 'k',
    },
  } as const;

  const translateToEpdBoard = <T extends RequiredForTranslateToEpdBoard>(
    gameState: T,
  ): string => {
    const { boardOfPieces, boardOfColors } = gameState;
    const board = SQUARES.map((sq) => {
      const color = boardOfColors[sq] as ColorAtSquare;
      const piece = boardOfPieces[sq] as PieceAtSquare;

      // FIXME: ts: same error as in beginUpdateMoveHistoryWithoutCheck
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore:next-line
      return pieceToCode[color][piece];
    });

    return splitEvery(8, board)
      .map((arr) => arr.join('').replace(/ {1,8}/g, (s) => `${s.length}`))
      .join('/');
  };

  const translateToEpdCastlingRights = <
    T extends RequiredForTranslateToEpdCastlingRights,
  >(
    gameState: T,
  ): string => {
    const { castlingRights } = gameState;

    const whiteKingside = castlingRights[WHITE][KING_DIRECTION_KINGSIDE]
      ? 'K'
      : '';
    const whiteQueenside = castlingRights[WHITE][KING_DIRECTION_QUEENSIDE]
      ? 'Q'
      : '';
    const blackKingside = castlingRights[BLACK][KING_DIRECTION_KINGSIDE]
      ? 'k'
      : '';
    const blackQueenside = castlingRights[BLACK][KING_DIRECTION_QUEENSIDE]
      ? 'q'
      : '';

    const result = `${whiteKingside}${whiteQueenside}${blackKingside}${blackQueenside}`;

    return result === '' ? '-' : result;
  };

  const translateToEpdCurrentColor = <
    T extends RequiredForTranslateToEpdCurrentColor,
  >(
    gameState: T,
  ): string => {
    const { currentColor } = gameState;
    return currentColor === WHITE ? 'w' : 'b';
  };

  const translateToEpdEnPassantSquare = <
    T extends RequiredForTranlsateToEpdEnPassantSquare,
  >(
    gameState: T,
  ): string => {
    const { enPassantSquare } = gameState;

    if (enPassantSquare) {
      return SQUARE_TO_ALGEBRAIC_SQUARE[enPassantSquare];
    }

    return '-';
  };

  return <T extends RequiredForMakeEpdFromGameState>(o: T): string => {
    const board = translateToEpdBoard(o);
    const castlingRights = translateToEpdCastlingRights(o);
    const color = translateToEpdCurrentColor(o);
    const enPassant = translateToEpdEnPassantSquare(o);

    return `${board} ${color} ${castlingRights} ${enPassant}`;
  };
})();

const updateEpdsAndFinishUpdateReasonsWithFolds = <
  T extends Pick<
    O,
    'beforeEpds' | 'tempReasonsToPauseGame' | 'tempReasonsForGameOver'
  > &
    RequiredForMakeEpdFromGameState,
>(
  o: T,
): T & Pick<GameState, 'epds'> => {
  const { beforeEpds, tempReasonsToPauseGame, tempReasonsForGameOver } = o;
  const epd = makeEpdFromGameState(o);

  const numberOfRepetitions = beforeEpds[epd];

  if (numberOfRepetitions) {
    if (numberOfRepetitions === 2) {
      return {
        ...o,
        epds: modify(epd, inc, beforeEpds),
        reasonsToPauseGame: assoc('3fold', true, tempReasonsToPauseGame),
        reasonsForGameOver: tempReasonsForGameOver,
      };
    }

    if (numberOfRepetitions === 4) {
      return {
        ...o,
        epds: modify(epd, inc, beforeEpds),
        reasonsForGameOver: assoc('5fold', true, tempReasonsForGameOver),
        reasonsToPauseGame: tempReasonsToPauseGame,
      };
    }

    return {
      ...o,
      epds: modify(epd, inc, beforeEpds),
      reasonsToPauseGame: tempReasonsToPauseGame,
      reasonsForGameOver: tempReasonsForGameOver,
    };
  }
  return {
    ...o,
    epds: assoc(epd, 1, beforeEpds),
    reasonsToPauseGame: tempReasonsToPauseGame,
    reasonsForGameOver: tempReasonsForGameOver,
  };
};

const updateCapturedPieces = <
  T extends Pick<
    O,
    | 'beforeCurrentColor'
    | 'beforeTargetSquare'
    | 'beforeBoardOfPieces'
    | 'beforeCapturedPieces'
    | 'tempMoveType'
  >,
>(
  o: T,
): T & Pick<GameState, 'capturedPieces'> => {
  const {
    beforeCurrentColor,
    beforeTargetSquare,
    beforeBoardOfPieces,
    beforeCapturedPieces,
    tempMoveType,
  } = o;

  if (isCapturingMove(tempMoveType as unknown as MoveType)) {
    const capturedPiece =
      tempMoveType === EN_PASSANT_MOVE_TYPE
        ? PAWN
        : beforeBoardOfPieces[beforeTargetSquare!];

    return {
      ...o,
      capturedPieces: modifyPath(
        [beforeCurrentColor * -1, capturedPiece],
        inc,
        beforeCapturedPieces,
      ),
    };
  }

  return { ...o, capturedPieces: beforeCapturedPieces };
};

const addTempCastlingSquares = <
  T extends Pick<O, 'tempMoveType' | 'beforeTargetSquare'>,
>(
  o: T,
): T & Pick<O, 'tempCastlingOriginSquare' | 'tempCastlingTargetSquare'> => {
  const { tempMoveType } = o;

  if (
    tempMoveType === KINGSIDE_MOVE_TYPE ||
    tempMoveType === QUEENSIDE_MOVE_TYPE
  ) {
    const { beforeTargetSquare } = o;

    switch (beforeTargetSquare) {
      case 186:
        return {
          ...o,
          tempCastlingOriginSquare: ORIGIN_SQUARE_WHITE_KINGSIDE_ROOK,
          tempCastlingTargetSquare: 185,
        };
      case 182:
        return {
          ...o,
          tempCastlingOriginSquare: ORIGIN_SQUARE_WHITE_QUEENSIDE_ROOK,
          tempCastlingTargetSquare: 183,
        };
      case 74:
        return {
          ...o,
          tempCastlingOriginSquare: ORIGIN_SQUARE_BLACK_KINGSIDE_ROOK,
          tempCastlingTargetSquare: 73,
        };
      case 70:
        return {
          ...o,
          tempCastlingOriginSquare: ORIGIN_SQUARE_BLACK_QUEENSIDE_ROOK,
          tempCastlingTargetSquare: 71,
        };
      default:
        throw new Error(
          `targetSquare was unexpected value, expected one of 186, 182, 74, 70 instead got: ${beforeTargetSquare}`,
        );
    }
  }

  return {
    ...o,
    tempCastlingOriginSquare: null,
    tempCastlingTargetSquare: null,
  };
};

const prefixPropsWithBefore = (gs: GameState) =>
  Object.fromEntries(
    Object.entries(gs).map(([k, v]) =>
      (k.slice(0, 4) === 'temp'
        ? [k, v]
        : [`before${k[0].toUpperCase() + k.slice(1)}`, v])),
  );

// FIXME: this doesn't add props of gameStateForWebrtc like playerColor and stuff.
export const doMove = <GS extends GameState | GameStateForWebRTC>(
  gameState: GS,
): GS => {
  // TS: ignore all errors in this function
  const gsWithCastlingSquares = addTempCastlingSquares(
    prefixPropsWithBefore(gameState),
  );

  return {
    ...pick(
      [
        'playerColor',
        'queueOfActionsToSend',
        'idOfLastActionOnQueue',
        'idOfLastActionRecieved',
        'requests',
      ],
      gameState,
    ),

    ...pick(
      [
        'boardOfColors',
        'boardOfPieces',
        'castlingRights',
        'castlingRightsLostWhen',
        'checkingSquares',
        'checkingVectors',
        'currentColor',
        'pieceToSquares',
        'pinnedSquares',
        'squareControlledBy',
        'squareControls',
        'epds',
        'isCheck',
        'moveCounter',
        'moveHistory',
        'movesOfOriginSquare',
        'reasonsForGameOver',
        'reasonsToPauseGame',
        'reasonsToAllowDraw',
        'enPassantSquare',
        'originSquare',
        'targetSquare',
        'capturedPieces',
      ],
      pipe(
        // updates that need only gameState
        updateCurrentColor,
        updateMoveCounter,
        beginUpdateMoveHistoryWithoutCheck,
        updateEnPassantSquare,
        // 3 below require castling squares
        updatePieceToSquares,
        updateBoards,
        updateSquareControlsAndSquareControlledBy,
        // updates that also need uGameState
        updateCastlingRights,
        updateIsCheckAndCheckingSquares,
        finishUpdateMoveHistoryAddCheck,
        updatePinnedSquaresAndCheckingVectors,
        mergeEmptyHighlightState,
        beginUpdateReasons,
        updateEpdsAndFinishUpdateReasonsWithFolds,
        updateCapturedPieces,
      )(gsWithCastlingSquares),
    ),
  };
};

// begin undoMove

const computeTempProps = <
  T extends Pick<GameState, 'moveHistory' | 'currentColor'>,
>(
  gameState: T,
): T &
  Pick<
    TempProps,
    | 'tempOriginSquare'
    | 'tempTargetSquare'
    | 'tempCastlingOriginSquare'
    | 'tempCastlingTargetSquare'
    | 'tempEnPassantSquare'
    | 'tempPlacedPiece'
    | 'tempMoveType'
  > => {
  const { moveHistory, currentColor } = gameState;
  if (moveHistory.length) {
    const lastMove = moveHistory[moveHistory.length - 1];

    const isCapture = lastMove.includes('x');

    /* TS: when this function is called moveHistory has at least one element
       and such element would give algebraic squares. */
    const algebraicSquares = getAlgebraicSquaresAtIndex(
      moveHistory,
      moveHistory.length - 1,
    ) as unknown as Array<keyof typeof ALGEBRAIC_SQUARE_TO_SQUARE>;
    const squares = algebraicSquares.map(
      (square) => ALGEBRAIC_SQUARE_TO_SQUARE[square],
    );

    const tempOriginSquare = squares[0];
    const tempTargetSquare = squares[1];
    const tempCastlingOriginSquare = squares[2] || null;
    const tempCastlingTargetSquare = squares[3] || null;

    const tempEnPassantSquare = lastMove.includes('e.p.')
      ? ((ALGEBRAIC_SQUARE_TO_SQUARE[
          // TS: same as above
          // @ts-ignore
          getAlgebraicSquaresAtIndex(moveHistory, moveHistory.length - 2)[0]
        ] +
          16 * currentColor) as Square)
      : null;

    let tempPlacedPiece;

    if (isCapture) {
      /* the actual type is a file(chess letter, not an os file) from FILES
         or a figure that is used in moveHistory. */
      const fileOrFig = lastMove.match(/(?<=x)./)[0];
      if (!FILES.includes(fileOrFig)) {
        tempPlacedPiece = FIGURE_TO_PIECE[
          fileOrFig as keyof typeof FIGURE_TO_PIECE
        ] as Piece;
      } else {
        tempPlacedPiece = PAWN as Piece;
      }
    } else {
      tempPlacedPiece = null;
    }

    let tempMoveType;

    if (tempEnPassantSquare) {
      tempMoveType = EN_PASSANT_MOVE_TYPE;
    }

    if (lastMove.includes('=')) {
      if (isCapture) {
        tempMoveType = PROMOTION_WITH_CAPTURE_MOVE_TYPE;
      } else {
        tempMoveType = PROMOTION_MOVE_TYPE;
      }
    }

    if (tempCastlingTargetSquare === 185 || tempCastlingTargetSquare === 73) {
      tempMoveType = KINGSIDE_MOVE_TYPE;
    }

    if (tempCastlingTargetSquare === 183 || tempCastlingTargetSquare === 71) {
      tempMoveType = QUEENSIDE_MOVE_TYPE;
    }

    if (
      // 1. if move begins with a file, then it is a move of pawn.
      FILES.includes(lastMove[0]) &&
      // if pawn traveled 32 then it is double forward.
      Math.abs(tempOriginSquare - tempTargetSquare) === 32
    ) {
      tempMoveType = DOUBLE_FORWARD_MOVE_TYPE;
    }

    tempMoveType =
      tempMoveType || (isCapture ? CAPTURE_MOVE_TYPE : NORMAL_MOVE_TYPE);

    return {
      tempOriginSquare,
      tempTargetSquare,
      tempCastlingOriginSquare,
      tempCastlingTargetSquare,
      tempEnPassantSquare,
      tempPlacedPiece,
      tempMoveType,
    };
  }

  // note that in this case all temp props are irrelevant
  return {};
};

const removeCurrentEpd = <
  T extends Pick<
    O,
    | 'beforeEpds'
    | 'beforeEnPassantSquare'
    | 'beforeCurrentColor'
    | 'beforeCastlingRights'
    | 'beforeBoardOfPieces'
    | 'beforeBoardOfColors'
  >,
>(
  o: T,
): T & Pick<GameState, 'epds'> => {
  const {
    beforeEpds,
    beforeEnPassantSquare,
    beforeCurrentColor,
    beforeBoardOfColors,
    beforeBoardOfPieces,
    beforeCastlingRights,
  } = o;

  const epd = makeEpdFromGameState({
    enPassantSquare: beforeEnPassantSquare,
    currentColor: beforeCurrentColor,
    boardOfPieces: beforeBoardOfPieces,
    boardOfColors: beforeBoardOfColors,
    castlingRights: beforeCastlingRights,
  });

  const numberOfRepetitions = beforeEpds[epd];

  if (numberOfRepetitions === undefined) {
    throw new Error(`Epd: ${epd} was not found in gameState.epds`);
  }

  return {
    ...o,
    epds:
      numberOfRepetitions === 1
        ? dissoc(epd, beforeEpds)
        : modify(epd, dec, beforeEpds),
  };
};

const undoBoards = <
  T extends Pick<
    TempProps,
    | 'tempOriginSquare'
    | 'tempTargetSquare'
    | 'tempCastlingOriginSquare'
    | 'tempCastlingTargetSquare'
    | 'tempMoveType'
    | 'tempPlacedPiece'
  > &
    Pick<GameState, 'currentColor'> &
    Pick<O, 'beforeBoardOfPieces' | 'beforeBoardOfColors'>,
>(
  o: T,
): T & Pick<GameState, 'boardOfColors' | 'boardOfPieces'> => {
  const {
    beforeBoardOfPieces,
    beforeBoardOfColors,
    tempOriginSquare,
    tempTargetSquare,
    tempCastlingOriginSquare,
    tempCastlingTargetSquare,
    tempMoveType,
    tempPlacedPiece,
    currentColor,
  } = o;

  const boardOfPiecesCopy: BoardOfPieces = beforeBoardOfPieces.slice();
  const boardOfColorsCopy: BoardOfColors = beforeBoardOfColors.slice();

  const movedPiece = beforeBoardOfPieces[tempTargetSquare];
  const oppositeColor = (currentColor * -1) as Color;

  if (tempMoveType === CAPTURE_MOVE_TYPE) {
    boardOfPiecesCopy[tempOriginSquare] = movedPiece;
    boardOfColorsCopy[tempOriginSquare] = currentColor;

    boardOfPiecesCopy[tempTargetSquare] = tempPlacedPiece;
    boardOfColorsCopy[tempTargetSquare] = oppositeColor;
  }

  if (tempMoveType === EN_PASSANT_MOVE_TYPE) {
    const capturedSquare = tempTargetSquare - 16 * currentColor;
    boardOfPiecesCopy[capturedSquare] = PAWN;
    boardOfColorsCopy[capturedSquare] = oppositeColor;
    boardOfPiecesCopy[tempOriginSquare] = PAWN;
    boardOfColorsCopy[tempOriginSquare] = currentColor;
    boardOfPiecesCopy[tempTargetSquare] = EMPTY_SQUARE;
    boardOfColorsCopy[tempTargetSquare] = EMPTY_SQUARE;

    return {
      ...o,
      boardOfPieces: boardOfPiecesCopy,
      boardOfColors: boardOfColorsCopy,
    };
  }

  if (tempPlacedPiece) {
    boardOfPiecesCopy[tempTargetSquare] = tempPlacedPiece;
    boardOfColorsCopy[tempTargetSquare] = oppositeColor;
  } else {
    boardOfPiecesCopy[tempTargetSquare] = EMPTY_SQUARE;
    boardOfColorsCopy[tempTargetSquare] = EMPTY_SQUARE;
  }

  if (
    tempMoveType === PROMOTION_WITH_CAPTURE_MOVE_TYPE ||
    tempMoveType === PROMOTION_MOVE_TYPE
  ) {
    boardOfPiecesCopy[tempOriginSquare] = PAWN;
    boardOfColorsCopy[tempOriginSquare] = currentColor;
  } else {
    boardOfPiecesCopy[tempOriginSquare] = movedPiece;
    boardOfColorsCopy[tempOriginSquare] = currentColor;
  }

  if (tempCastlingOriginSquare !== null) {
    boardOfPiecesCopy[tempCastlingOriginSquare] = ROOK;
    boardOfColorsCopy[tempCastlingOriginSquare] = currentColor;
    boardOfPiecesCopy[tempCastlingTargetSquare as Square] = EMPTY_SQUARE;
    boardOfColorsCopy[tempCastlingTargetSquare as Square] = EMPTY_SQUARE;
  }

  return {
    ...o,
    boardOfPieces: boardOfPiecesCopy,
    boardOfColors: boardOfColorsCopy,
  };
};

type RequiredForComputePieceToSquare = Pick<
  GameState,
  'boardOfColors' | 'boardOfPieces'
>;

// used for undo and in initial-state.ts
export const computePieceToSquare = ({
  boardOfColors,
  boardOfPieces,
}: RequiredForComputePieceToSquare): PieceToSquares => {
  const emptyPieceToSquare: PieceToSquares = {
    [WHITE]: {
      [ROOK]: {},
      [KNIGHT]: {},
      [BISHOP]: {},
      [QUEEN]: {},
      [KING]: {},
      [PAWN]: {},
    },
    [BLACK]: {
      [ROOK]: {},
      [KNIGHT]: {},
      [BISHOP]: {},
      [QUEEN]: {},
      [KING]: {},
      [PAWN]: {},
    },
  };

  SQUARES.forEach((square) => {
    const color = boardOfColors[square] as ColorAtSquare;
    if (color !== EMPTY_SQUARE) {
      emptyPieceToSquare[color][boardOfPieces[square] as Piece][square] = true;
    }
  });

  return emptyPieceToSquare;
};

const undoPieceToSquares = <
  T extends Pick<GameState, 'boardOfPieces' | 'boardOfColors'>,
>(
  gameState: T,
): T & Pick<GameState, 'pieceToSquares'> => {
  const { boardOfPieces, boardOfColors } = gameState;
  return {
    ...gameState,

    pieceToSquares: computePieceToSquare({
      boardOfPieces,
      boardOfColors,
    }),
  };
};

type RequiredForComputeControls = Pick<
  GameState,
  'boardOfColors' | 'boardOfPieces'
>;

// used for undo and in initial-state.ts
export const computeControls = ({
  boardOfColors,
  boardOfPieces,
}: RequiredForComputeControls): Controls =>
  SQUARES.reduce(
    (acc, square) => ({
      ...acc,
      /* ts: boardOfColor[sq] can be empty square, but in that case
         it is not used as parameter so it is fine */
      [square]: pieceToControlFn[boardOfPieces[square] as PieceAtSquare](
        boardOfColors,
        square,
        boardOfColors[square] as Color,
      ),
    }),
    {} as Controls,
  );

const undoSquareControls = <
  T extends Pick<GameState, 'boardOfPieces' | 'boardOfColors'>,
>(
  gameState: T,
): T & Pick<GameState, 'squareControls'> => {
  const { boardOfPieces, boardOfColors } = gameState;
  return {
    ...gameState,
    squareControls: computeControls({
      boardOfPieces,
      boardOfColors,
    }),
  };
};

type RequiredForComputeControlledBy = Pick<
  GameState,
  'boardOfColors' | 'squareControls'
>;

// used for undo and in initial-state.ts
export const computeControlledBy = (() => {
  const emptyControlledBy = SQUARES.reduce(
    (acc, square) => ({ ...acc, [square]: { [WHITE]: {}, [BLACK]: {} } }),
    {},
  );

  return ({ boardOfColors, squareControls }: RequiredForComputeControlledBy) =>
    Object.entries(squareControls).reduce(
      (outerAcc, [controllingSquareAsString, control]) =>
        Object.entries(control).reduce(
          (acc, [controlledSquareAsString, directory]) =>
            assocPath(
              [
                controlledSquareAsString,
                boardOfColors[Number(controllingSquareAsString)].toString(),
                controllingSquareAsString,
              ],
              directory,
              acc,
            ),
          outerAcc,
        ),
      emptyControlledBy as ControlledBy,
    );
})();

const undoSquareControlledBy = <T extends RequiredForComputeControlledBy>(
  gameState: T,
): T & Pick<GameState, 'squareControlledBy'> => ({
  ...gameState,
  squareControlledBy: computeControlledBy(gameState),
});

const undoCastlingRights = <
  T extends Pick<
    O,
    | 'beforeMoveHistory'
    | 'beforeCastlingRights'
    | 'beforeCastlingRightsLostWhen'
  >,
  R extends T & Pick<GameState, 'castlingRights' | 'castlingRightsLostWhen'>,
>(
  o: T,
): R => {
  const {
    beforeMoveHistory,
    beforeCastlingRights,
    beforeCastlingRightsLostWhen,
  } = o;

  /* FIXME WHY -2? It has to do something with the fact that to undo one move,
     you have to undo another one and see if it had something, but I forgot what was it. */
  if (beforeMoveHistory.length - 2 > 0) {
    const lastMoveIdx = beforeMoveHistory.length - 1;

    const undoneCastlingRights = Object.entries(
      beforeCastlingRightsLostWhen,
    ).reduce(
      (gs, [clr, obj]) =>
        Object.entries(obj).reduce((gsInner, [direction, idxOfMove]) => {
          if (idxOfMove === lastMoveIdx) {
            return assocPath(
              ['beforeCastlingRightsLostWhen', clr, direction],
              -1,
              assocPath(
                ['beforeCastlingRights', clr, direction],
                true,
                gsInner,
              ),
            );
          }
          return gsInner;
        }, gs),
      o,
    );

    return {
      ...o,
      castlingRights: undoneCastlingRights.beforeCastlingRights,
      castlingRightsLostWhen: undoneCastlingRights.beforeCastlingRightsLostWhen,
    };
  }
  return {
    ...o,
    castlingRights: beforeCastlingRights,
    castlingRightsLostWhen: beforeCastlingRightsLostWhen,
  };
};

const undoMoveHistory = <
  T extends Pick<O, 'beforeMoveHistory'>,
  R extends T & Pick<GameState, 'moveHistory'>,
>(
  o: T,
): R =>
  ({
    ...o,
    moveHistory: dropLast(1, o.beforeMoveHistory),
  }) as R;

const undoMoveCounter = <
  T extends Pick<TempProps, 'tempMoveType' | 'tempOriginSquare'> &
    Pick<GameState, 'boardOfPieces' | 'moveHistory'> &
    Pick<O, 'beforeMoveCounter'>,
  R extends T & Pick<GameState, 'moveCounter'>,
>(
  o: T,
): R => {
  const {
    tempMoveType,
    tempOriginSquare,
    boardOfPieces,
    moveHistory,
    beforeMoveCounter,
  } = o;

  if (
    isCapturingMove(tempMoveType) ||
    boardOfPieces[tempOriginSquare] === PAWN
  ) {
    // @ts-expect-error Typescript is wrong, findLastIndex should exist
    const lastIndexOfCapturingOrPawnMove = moveHistory.findLastIndex(
      (move: string) => {
        const movedPiece = FIGURE_TO_PIECE[move[0]] || PAWN;
        return move.includes('x') || movedPiece === PAWN;
      },
    );

    if (lastIndexOfCapturingOrPawnMove === 0) {
      return { ...o, moveCounter: 0 } as R;
    }

    if (lastIndexOfCapturingOrPawnMove !== -1) {
      return {
        ...o,
        moveCounter: lastIndexOfCapturingOrPawnMove - 1,
      } as R;
    }

    return { ...o, moveCounter: moveHistory.length } as R;
  }

  if (beforeMoveCounter === 0) {
    return { ...o, moveCounter: beforeMoveCounter } as R;
  }

  return { ...o, moveCounter: beforeMoveCounter - 1 } as R;
};

// used only for undo
const beginUndoReasonsToAllowDraw50move = <
  T extends Pick<O, 'beforeReasonsToAllowDraw'> &
    Pick<GameState, 'moveCounter'>,
>(
  o: T,
): T & Pick<TempProps, 'tempReasonsToAllowDraw'> => {
  const { moveCounter, beforeReasonsToAllowDraw } = o;

  if (moveCounter >= 100) {
    return {
      ...o,
      tempReasonsToAllowDraw: assoc(
        REASON_50MOVE,
        true,
        beforeReasonsToAllowDraw,
      ),
    };
  }
  /* no need to test for 75move rule:
     by definition we cannot undo into a move that was already in game over. */

  return {
    ...o,
    tempReasonsToAllowDraw: {},
  };
};

const undoAddEnPassantSquare = <
  T extends Pick<O, 'beforeCurrentColor'> &
    Pick<GameState, 'moveHistory' | 'currentColor'> &
    TempProps,
>(
  o: T,
): T & Pick<GameState, 'enPassantSquare'> => {
  const prevGSTemp = computeTempProps(o);

  const { beforeCurrentColor } = o;

  /* TS: lines below are ignored because the props are either valid values
     or undefined in which case code would not run. */
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore:next-line
  if (prevGSTemp.tempMoveType === DOUBLE_FORWARD_MOVE_TYPE) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore:next-line
    return {
      ...o,
      enPassantSquare:
        (prevGSTemp.tempOriginSquare as Square) + 16 * beforeCurrentColor,
    };
  }

  return { ...o, enPassantSquare: null };
};

const undoCapturedPieces = <
  T extends Pick<O, 'beforeCurrentColor' | 'beforeCapturedPieces'> &
    Pick<TempProps, 'tempMoveType' | 'tempPlacedPiece'>,
  R extends T & Pick<GameState, 'capturedPieces'>,
>(
  o: T,
): R => {
  const {
    beforeCurrentColor,
    beforeCapturedPieces,
    tempMoveType,
    tempPlacedPiece,
  } = o;

  if (isCapturingMove(tempMoveType)) {
    const capturedPiece = tempPlacedPiece;

    return {
      ...o,
      capturedPieces: modifyPath(
        [beforeCurrentColor, capturedPiece],
        dec,
        beforeCapturedPieces,
      ),
    } as R;
  }

  return { ...o, capturedPieces: beforeCapturedPieces } as unknown as R;
};

const finishUndoReasonsToAllowDraw3fold = (
  () =>
  <
    T extends Pick<O, 'beforeEpds' | 'tempReasonsToAllowDraw'> &
      RequiredForMakeEpdFromGameState &
      Pick<GameState, 'epds'>,
  >(
    o: T,
  ): T & Pick<GameState, 'reasonsToAllowDraw'> => {
    const { beforeEpds, tempReasonsToAllowDraw } = o;
    const previousEpd = makeEpdFromGameState(o);

    const numberOfPreviousRepetitions = beforeEpds[previousEpd];

    if (numberOfPreviousRepetitions === 3) {
      return {
        ...o,
        reasonsToAllowDraw: assoc(REASON_3FOLD, true, tempReasonsToAllowDraw),
      };
    }

    // same as in 75 move rule, there is no need to test for 5 fold in undo.

    return {
      ...o,
      reasonsToAllowDraw: tempReasonsToAllowDraw as ReasonsToAllowDraw,
    };
  }
)();

const emptyPartialReasonsState = {
  reasonsForGameOver: {}, // by definition cannot be filled if we are doing undo.
  reasonsToPauseGame: {}, // same
  // reasonsToAllowDraw: is computed in two undo functions.
} as const;

// FIXME: rename to undoMove
export const undoMove = <GS extends GameState | GameStateForWebRTC>(
  gameState: GS,
): GS => {
  if (!gameState.moveHistory.length) {
    return gameState;
  }

  // TS: just ignore all that
  return {
    ...pick(
      [
        'playerColor',
        'queueOfActionsToSend',
        'idOfLastActionOnQueue',
        'idOfLastActionRecieved',
        'requests',
      ],
      gameState,
    ),

    ...pick(
      Object.keys(gameState),
      pipe(
        mergeLeft(emptyHighlightState),
        mergeLeft(emptyPartialReasonsState),

        undoMoveHistory,
        removeCurrentEpd,

        updateCurrentColor,

        undoBoards,
        undoPieceToSquares,
        undoSquareControls,
        undoSquareControlledBy,

        updateIsCheckAndCheckingSquares,
        updatePinnedSquaresAndCheckingVectors,

        undoCastlingRights,
        undoMoveCounter,

        beginUndoReasonsToAllowDraw50move,

        undoAddEnPassantSquare,
        undoCapturedPieces,
        finishUndoReasonsToAllowDraw3fold,
      )({
        ...computeTempProps(gameState),
        ...prefixPropsWithBefore(gameState),
      }),
    ),
  };
};
