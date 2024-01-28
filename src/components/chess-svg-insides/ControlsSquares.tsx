import { SquareOrNull, Controls } from '../../core/globals';
import { sqToXY } from '../../view/core';

export function ControlsSquares({
  originSquare,
  squareControls,
  size,
}: {
  originSquare: SquareOrNull;
  squareControls: Controls;
  size: number;
}) {
  if (originSquare) {
    return (
      <>
        {Object.keys(squareControls[originSquare]).map((sq) => {
          const { x, y } = sqToXY[sq];

          return (
            <use href="#square--controls" x={x * size} y={y * size} key={sq} />
          );
        })}
      </>
    );
  }

  return null;
}
