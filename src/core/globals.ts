/* Dictionary:
  - Edge (in board representation) :
    indexes that hold SENTINEL, as opposed to Square which holds real chess pieces or empty square
    (both Square and Edge exist inside the board representations, and both are indexes) */

/* Both piece and color */
export const SENTINEL = 0; // it must be 0
export const EMPTY_SQUARE = -2; // must be negative

/* colors
   must be exactly BLACK 1 and WHITE -1
   used at least for movement of pawns, and simple update of state.sideToMove

   for example: PAWN_DIRECTIONS are [15, 17]
   if we multiply direction by color we will get the real direction for given color of piece */
export const BLACK = 1;
export const WHITE = -1;
export type Color = typeof WHITE | typeof BLACK;

const BLACK_AS_STRING = '1';
const WHITE_AS_STRING = '-1';
export type ColorAsString = typeof WHITE_AS_STRING | typeof BLACK_AS_STRING;

export type ColorAtSquare = Color | typeof EMPTY_SQUARE;
export type ColorAtSquareOrEdge = ColorAtSquare | typeof SENTINEL;

export const KNIGHT = 1;
export const KING = 2;
export const PAWN = 3;
export const ROOK = 4;
export const BISHOP = 5;
export const QUEEN = 6;

export type Piece =
  | typeof KNIGHT
  | typeof KING
  | typeof PAWN
  | typeof ROOK
  | typeof BISHOP
  | typeof QUEEN;
export type PieceAtSquare = Piece | typeof EMPTY_SQUARE;
export type PieceAtSquareOrEdge = PieceAtSquare | typeof SENTINEL;

/* move types
   used to hint what update functions should be used to update state
   (state update is done to reflect that a move was made) */
export const NORMAL_MOVE_TYPE = 2;
export const CAPTURE_MOVE_TYPE = 3;
export const EN_PASSANT_MOVE_TYPE = 9;
export const DOUBLE_FORWARD_MOVE_TYPE = 99;

/* STYLE: debatable decision not to include CASTLING in the names of kingside and queenside
   but MOVE_ leaves no space for ambiguity so a shorter name would still be understandable.
   */
export const KINGSIDE_MOVE_TYPE = 16;
export const QUEENSIDE_MOVE_TYPE = 18;

/* variable * 2 is used in pawnMoves fn */
export const PROMOTION_MOVE_TYPE = NORMAL_MOVE_TYPE * 2;
export const PROMOTION_WITH_CAPTURE_MOVE_TYPE = CAPTURE_MOVE_TYPE * 2;

export type MoveType =
  | typeof NORMAL_MOVE_TYPE
  | typeof CAPTURE_MOVE_TYPE
  | typeof EN_PASSANT_MOVE_TYPE
  | typeof DOUBLE_FORWARD_MOVE_TYPE
  | typeof KINGSIDE_MOVE_TYPE
  | typeof QUEENSIDE_MOVE_TYPE
  | typeof PROMOTION_MOVE_TYPE
  | typeof PROMOTION_WITH_CAPTURE_MOVE_TYPE;

export type MoveTypeOrNull = MoveType | null;

/* Directions:
   they explain in which direction piece can go.

   for not vector pieces you simply add direction to square of piece
   to get a new square where piece would move.

   However for vector pieces
   directions need to be added until you find something that is not empty square */
export const DIRECTIONS_OF_ROOK = [-16, -1, 1, 16] as const;
export const DIRECTIONS_OF_BISHOP = [-17, 15, 17, -15] as const;
export const DIRECTIONS_OF_QUEEN = [
  ...DIRECTIONS_OF_ROOK,
  ...DIRECTIONS_OF_BISHOP,
] as const;
// king is same as queen
export const DIRECTIONS_OF_KNIGHT = [
  -33, -31, -18, -14, 14, 18, 31, 33,
] as const;
/* pawns are a special case

   Because we use numbers 1 and -1 as colors we can do
   [15, 17].map((n)=> n * color) to get the directions for our pawn.

   However using object would work for color as string as well, and maybe even would work faster.
*/
export const DIRECTIONS_FOR_PAWNS_OF_BOTH_COLORS = {
  [BLACK]: [15, 17],
  [WHITE]: [-15, -17],
} as const;

// there is no need to add directions of pawns because they are already inside bishop.
export type Direction =
  | (typeof DIRECTIONS_OF_ROOK)[number]
  | (typeof DIRECTIONS_OF_BISHOP)[number]
  | (typeof DIRECTIONS_OF_QUEEN)[number]
  | (typeof DIRECTIONS_OF_KNIGHT)[number];

export const KING_DIRECTION_QUEENSIDE = -2;
export const KING_DIRECTION_KINGSIDE = 2;

// origin squares for rooks
export const ORIGIN_SQUARE_WHITE_KINGSIDE_ROOK = 187;
export const ORIGIN_SQUARE_WHITE_QUEENSIDE_ROOK = 180;
export const ORIGIN_SQUARE_BLACK_KINGSIDE_ROOK = 75;
export const ORIGIN_SQUARE_BLACK_QUEENSIDE_ROOK = 68;

export const ALGEBRAIC_SQUARE_TO_SQUARE = {
  a1: 180,
  a2: 164,
  a3: 148,
  a4: 132,
  a5: 116,
  a6: 100,
  a7: 84,
  a8: 68,
  b1: 181,
  b2: 165,
  b3: 149,
  b4: 133,
  b5: 117,
  b6: 101,
  b7: 85,
  b8: 69,
  c1: 182,
  c2: 166,
  c3: 150,
  c4: 134,
  c5: 118,
  c6: 102,
  c7: 86,
  c8: 70,
  d1: 183,
  d2: 167,
  d3: 151,
  d4: 135,
  d5: 119,
  d6: 103,
  d7: 87,
  d8: 71,
  e1: 184,
  e2: 168,
  e3: 152,
  e4: 136,
  e5: 120,
  e6: 104,
  e7: 88,
  e8: 72,
  f1: 185,
  f2: 169,
  f3: 153,
  f4: 137,
  f5: 121,
  f6: 105,
  f7: 89,
  f8: 73,
  g1: 186,
  g2: 170,
  g3: 154,
  g4: 138,
  g5: 122,
  g6: 106,
  g7: 90,
  g8: 74,
  h1: 187,
  h2: 171,
  h3: 155,
  h4: 139,
  h5: 123,
  h6: 107,
  h7: 91,
  h8: 75,
} as const;

export type AlgebraicSquare = keyof typeof ALGEBRAIC_SQUARE_TO_SQUARE;

export const SQUARE_TO_ALGEBRAIC_SQUARE = {
  100: 'a6',
  101: 'b6',
  102: 'c6',
  103: 'd6',
  104: 'e6',
  105: 'f6',
  106: 'g6',
  107: 'h6',
  116: 'a5',
  117: 'b5',
  118: 'c5',
  119: 'd5',
  120: 'e5',
  121: 'f5',
  122: 'g5',
  123: 'h5',
  132: 'a4',
  133: 'b4',
  134: 'c4',
  135: 'd4',
  136: 'e4',
  137: 'f4',
  138: 'g4',
  139: 'h4',
  148: 'a3',
  149: 'b3',
  150: 'c3',
  151: 'd3',
  152: 'e3',
  153: 'f3',
  154: 'g3',
  155: 'h3',
  164: 'a2',
  165: 'b2',
  166: 'c2',
  167: 'd2',
  168: 'e2',
  169: 'f2',
  170: 'g2',
  171: 'h2',
  180: 'a1',
  181: 'b1',
  182: 'c1',
  183: 'd1',
  184: 'e1',
  185: 'f1',
  186: 'g1',
  187: 'h1',
  68: 'a8',
  69: 'b8',
  70: 'c8',
  71: 'd8',
  72: 'e8',
  73: 'f8',
  74: 'g8',
  75: 'h8',
  84: 'a7',
  85: 'b7',
  86: 'c7',
  87: 'd7',
  88: 'e7',
  89: 'f7',
  90: 'g7',
  91: 'h7',
} as const;

export const PIECE_TO_FIGURE = {
  [EMPTY_SQUARE]: {
    [EMPTY_SQUARE]: '',
  },
  [WHITE]: {
    [ROOK]: '♖',
    [KNIGHT]: '♘',
    [BISHOP]: '♗',
    [QUEEN]: '♕',
    [KING]: '♔',
    [PAWN]: '♙',
  },
  [BLACK]: {
    [ROOK]: '♜',
    [KNIGHT]: '♞',
    [BISHOP]: '♝',
    [QUEEN]: '♛',
    [KING]: '♚',
    [PAWN]: '♟',
  },
} as const;

export const FIGURE_TO_PIECE = {
  '♖': ROOK,
  '♜': ROOK,
  '♘': KNIGHT,
  '♞': KNIGHT,
  '♗': BISHOP,
  '♝': BISHOP,
  '♕': QUEEN,
  '♛': QUEEN,
  '♔': KING,
  '♚': KING,
} as const;

// order matters!!
export const RANKS = [8, 7, 6, 5, 4, 3, 2, 1] as const; // row (y)
export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const; // column (x)

export const SQUARES = [
  68, 69, 70, 71, 72, 73, 74, 75, 84, 85, 86, 87, 88, 89, 90, 91, 100, 101, 102,
  103, 104, 105, 106, 107, 116, 117, 118, 119, 120, 121, 122, 123, 132, 133,
  134, 135, 136, 137, 138, 139, 148, 149, 150, 151, 152, 153, 154, 155, 164,
  165, 166, 167, 168, 169, 170, 171, 180, 181, 182, 183, 184, 185, 186, 187,
] as const;

export const SQUARES_AS_STRINGS = [
  '68',
  '69',
  '70',
  '71',
  '72',
  '73',
  '74',
  '75',
  '84',
  '85',
  '86',
  '87',
  '88',
  '89',
  '90',
  '91',
  '100',
  '101',
  '102',
  '103',
  '104',
  '105',
  '106',
  '107',
  '116',
  '117',
  '118',
  '119',
  '120',
  '121',
  '122',
  '123',
  '132',
  '133',
  '134',
  '135',
  '136',
  '137',
  '138',
  '139',
  '148',
  '149',
  '150',
  '151',
  '152',
  '153',
  '154',
  '155',
  '164',
  '165',
  '166',
  '167',
  '168',
  '169',
  '170',
  '171',
  '180',
  '181',
  '182',
  '183',
  '184',
  '185',
  '186',
  '187',
] as const;

/* FIXME: how in typescript to type it as it is typed now,
   but without literally writing from 1 to 255 and using as const
   like: range(1,255) as const */
const SQUARES_AND_EDGES = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
  23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41,
  42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60,
  61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79,
  80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98,
  99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114,
  115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129,
  130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144,
  145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159,
  160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174,
  175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189,
  190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204,
  205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219,
  220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234,
  235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249,
  250, 251, 252, 253, 254, 255,
] as const;

export type Square = (typeof SQUARES)[number];
export type SquareAsString = (typeof SQUARES_AS_STRINGS)[number];

export type SquareOrEdge = (typeof SQUARES_AND_EDGES)[number];
export type SquareOrNull = Square | null;

export type ObjectOfSquaresWithTrue = {
  [sq in Square]?: true;
};

export type Moves = {
  [sq in Square]?: MoveType;
};

export type ObjectOfSquaresWithDirection = {
  [sq in Square]?: Direction;
};

export type Controls = {
  [sq in Square]: ObjectOfSquaresWithDirection;
};

export type ControlledBy = {
  [sq in Square]: {
    [c in Color]: ObjectOfSquaresWithDirection;
  };
};

export type CastlingDirections =
  | typeof KING_DIRECTION_KINGSIDE
  | typeof KING_DIRECTION_QUEENSIDE;

export type PlacedPiece = Piece | null;

export const REASON_CHECKMATE = 'checkmate';
export const REASON_STALEMATE = 'stalemate';
export const REASON_50MOVE = '50move';
export const REASON_75MOVE = '75move';
export const REASON_3FOLD = '3fold';
export const REASON_5FOLD = '5fold';
export const REASON_PROMOTION = 'prom';
export const REASON_AGREEMENT = 'agreement';

export type ReasonToAllowDraw = typeof REASON_3FOLD | typeof REASON_50MOVE;
export type ReasonToPauseGame = typeof REASON_PROMOTION | ReasonToAllowDraw;

export type ReasonForGameOver =
  | typeof REASON_CHECKMATE
  | typeof REASON_STALEMATE
  | typeof REASON_75MOVE
  | typeof REASON_5FOLD
  | ReasonToAllowDraw
  | typeof REASON_AGREEMENT;

export type BoardOfColors = ColorAtSquareOrEdge[];
export type BoardOfPieces = PieceAtSquareOrEdge[];

/* number is the index of move that erased castling right,
   if such event didnt happen, number would be -1 (same design as Array.indexOf)  */
export type CastlingRightsLostWhen = {
  [color in Color]: {
    [dir in CastlingDirections]: number;
  };
};

export type CastlingRights = {
  [color in Color]: {
    [dir in CastlingDirections]?: true;
  };
};

export type ReasonsForGameOver = {
  [key in ReasonForGameOver]?: true;
};

export type ReasonsToPauseGame = {
  [key in ReasonToPauseGame]?: true;
};

export type ReasonsToAllowDraw = {
  [key in ReasonToAllowDraw]?: true;
};

export type PieceToSquares = {
  [color in Color]: {
    [piece in Piece]: ObjectOfSquaresWithTrue;
  };
};

export type PinnedSquares = {
  [color in Color]: ObjectOfSquaresWithDirection;
};

export const REQUEST_OF_DRAW = 'draw' as const;
export const REQUEST_OF_UNDO = 'undo' as const;
export const REQUEST_OF_REMATCH = 'rematch' as const;

export type MoveHistory = string[];

/* game state is not same for both players when it is not hotseat,
   in hotseat there is only one state for both players. */
export type GameState = {
  boardOfColors: BoardOfColors;
  boardOfPieces: BoardOfPieces;

  castlingRights: CastlingRights;
  castlingRightsLostWhen: CastlingRightsLostWhen;

  /* it is possible that the same king is checked by two pieces,
     here we store squares of those pieces */
  checkingSquares: ObjectOfSquaresWithTrue;
  /* a vector (or both vectors merged into same object)
     it is possible that two vector pieces check the same king,

     for computation that I designed there is no need for second vector,
     however both vectors could be used in highlighting of board

     why this is an object and not array?
     - it is a vector and I decided that vectors are represented as objects
     - Because we need to look for specific square inside,
     with array we would have to use indexOf, with object we just get it. */
  checkingVectors: ObjectOfSquaresWithDirection;

  currentColor: Color;
  pieceToSquares: PieceToSquares;
  pinnedSquares: PinnedSquares;

  squareControlledBy: ControlledBy;
  squareControls: Controls;

  /* epds:
     Object of:
     key: string of form: board color castlingRights enPassant square

     value: 1 or more

     used to detect 3fold and 5fold repetition */
  epds: Record<string, number>;

  /* isCheck can be replaced with just checkingSquares.length
     But would that be better? I feel like that would make code harder to understand. */
  isCheck: boolean;

  /* used to detect 50 and 75 move rule,
     starts at 0 and is incremented each ply
     (in chess move is defined as action of both players,
      like e4 e5 is one move, even though two players moved their pieces.
      Because it is confusing I use move as an action of one player instead,
      therefore moveCounter of 100 and 150 would mean 50move and 75move) */
  moveCounter: number;

  // It is a list of "half" moves, so end game ran like 1/0 should not be added!
  moveHistory: MoveHistory;

  /* where piece can move* (in theory), this would have moves even
     if piece currently cannot move because it is not it's turn to move. */
  movesOfOriginSquare: Moves;

  reasonsForGameOver: ReasonsForGameOver;

  /* sometimes when correct move is chosen, additional choice must be made by player,
     like when such move would trigger one or both:
     - 50 move rule
     - threefold repetition
     player must decide if he claims draw or not.

     when move is a promotion, player has to select promotion piece. */
  reasonsToPauseGame: ReasonsToPauseGame;
  /* after player triggered 50 move rule and/or threefold repetition,
     and decided to not claim draw, for the whole move his opponent has right to claim draw. */
  reasonsToAllowDraw: ReasonsToAllowDraw;

  enPassantSquare: SquareOrNull;
  /* selected square, it can be even a square without a piece,
     or a square with piece of color that is currently waiting for opponent's move. */
  originSquare: SquareOrNull;
  // is set only on correct move.
  targetSquare: SquareOrNull;

  capturedPieces: {
    [color in Color]: {
      [piece in Exclude<Piece, typeof KING>]: number;
    };
  };
};

export type SendableAction =
  | {
      type: 'recieved action of opponent';
      id: number;
      subType:
        | 'move of opponent'
        | 'move of opponent without draw claim'
        | 'move of opponent with draw claim';

      data: {
        originSquare: Square;
        targetSquare: Square;
      };
    }
  | {
      type: 'recieved action of opponent';
      id: number;
      subType: 'move of opponent with promotion';
      data: {
        placedPiece: Piece;
        originSquare: Square;
        targetSquare: Square;
      };
    }
  | {
      type: 'recieved action of opponent';
      id: number;
      subType: 'initial state';
      data: GameStateForWebRTC;
    }
  | {
      type: 'recieved action of opponent';
      id: number;
      subType: 'opponent claimed draw without move';
    }
  | {
      type: 'recieved action of opponent';
      id: number;
      subType: 'opponent made request';
      data: TRequest;
    }
  | {
      type: 'recieved action of opponent';
      id: number;
      subType: 'opponent agreed to request';
      data: TRequest;
    };

export type TRequestType =
  | typeof REQUEST_OF_DRAW
  | typeof REQUEST_OF_REMATCH
  | typeof REQUEST_OF_UNDO;

// FIXME: there is already type Request, idk how to name this one.
export type TRequest = {
  type: TRequestType;
  requester: Color;
  moveHistoryLength: number;
};

export type GameStateForWebRTC = {
  playerColor: Color;

  // queue: remove item at first index, insert item at last index.
  queueOfActionsToSend: SendableAction[];

  // this increments when a new item is added to queue
  idOfLastActionOnQueue: number;
  idOfLastActionRecieved: number;

  /* request state:
     why it should be in game state?
     because i have to show player that his request is being processed,
     and i need to show other player that he recieved request. */
  requests: TRequest[];
} & GameState;

export type GameStateOrGameStateForWebRTC = GameState | GameStateForWebRTC;
