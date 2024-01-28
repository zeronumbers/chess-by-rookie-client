import {
  PieceAtSquare,
  MoveType,
  CAPTURE_MOVE_TYPE,
  EN_PASSANT_MOVE_TYPE,
  PROMOTION_WITH_CAPTURE_MOVE_TYPE,
} from './globals';

export const isVectorPiece = (pieceAtSquare: PieceAtSquare) =>
  pieceAtSquare > 3;

export const isCapturingMove = (moveType: MoveType) =>
  [
    CAPTURE_MOVE_TYPE,
    EN_PASSANT_MOVE_TYPE,
    PROMOTION_WITH_CAPTURE_MOVE_TYPE,
  ].includes(moveType);

export const getAlgebraicSquaresAtIndex = (
  moveHistory: string[],
  index: number,
) => {
  const move = moveHistory[index];

  /* 0-0-0 and 0-0 are written literally instead of variable to show that order matters,
     if move is 0-0-0 then it would include both 0-0-0 and 0-0
     therefore we must look for 0-0-0 first */
  if (move.includes('0-0-0')) {
    return index % 2 ? ['e8', 'c8', 'a8', 'd8'] : ['e1', 'c1', 'a1', 'd1'];
  }

  if (move.includes('0-0')) {
    return index % 2 ? ['e8', 'g8', 'h8', 'f8'] : ['e1', 'g1', 'h1', 'f1'];
  }
  return moveHistory[index].match(/[a-h][1-8]/g);
};
