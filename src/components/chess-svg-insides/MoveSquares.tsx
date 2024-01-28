import { sqToXY } from '../../view/core';
import { Moves } from '../../core/globals';

export function MoveSquares({
  movesOfOriginSquare,
  size,
}: {
  movesOfOriginSquare: Moves;
  size: number;
}) {
  return (
    <>
      {Object.keys(movesOfOriginSquare).map((square) => {
        const { x, y } = sqToXY[square];

        return (
          <use href="#square--move" x={x * size} y={y * size} key={square} />
        );
      })}
    </>
  );
}
