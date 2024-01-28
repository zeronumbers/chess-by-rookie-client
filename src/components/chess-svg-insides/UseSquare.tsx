import { sqToXY } from '../../view/core';
import { Square } from '../../core/globals';

export function UseSquare({
  square,
  size,
  className,
}: {
  square: Square;
  size: number;
  className: string;
}) {
  const { x, y } = sqToXY[square];

  return <use href="#square" className={className} x={x * size} y={y * size} />;
}
