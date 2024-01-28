import {
 GameState, AlgebraicSquare, RANKS, FILES,
} from '../../core/globals';
import { getAlgebraicSquaresAtIndex } from '../../core/utils';

export function PreviousMoveSquares({
  gameState,
  size,
}: {
  gameState: GameState;
  size: number;
}) {
  const { moveHistory } = gameState;

  if (moveHistory.length) {
    const algebraicSquares = getAlgebraicSquaresAtIndex(
      moveHistory,
      moveHistory.length - 1,
    ) as unknown as AlgebraicSquare[];

    // maybe if en Passant show that pawn was captured at square?

    return (
      <>
        {algebraicSquares.map((s: AlgebraicSquare, i: number) => (
          <use
            href="#square"
            className={
              i % 2
                ? 'square square--previous-move-target'
                : 'square square--previous-move-origin'
            }
            y={RANKS.indexOf(Number(s[1]) as (typeof RANKS)[number]) * size}
            x={FILES.indexOf(s[0] as (typeof FILES)[number]) * size}
            key={s}
            width="12.5%"
            height="12.5%"
          />
        ))}
      </>
    );
  }
  return null;
}
