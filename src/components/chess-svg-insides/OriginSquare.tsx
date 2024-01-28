import { SquareOrNull } from '../../core/globals';
import { UseSquare } from './UseSquare';

export function OriginSquare({
  originSquare,
  size,
}: {
  originSquare: SquareOrNull;
  size: number;
}) {
  if (originSquare) {
    return (
      <UseSquare square={originSquare} size={size} className="square--origin" />
    );
  }

  return null;
}
