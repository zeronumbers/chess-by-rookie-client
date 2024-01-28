import { range } from 'ramda';
import {
  GameState,
  WHITE,
  BLACK,
  PAWN,
  KNIGHT,
  BISHOP,
  ROOK,
  QUEEN,
  KING,
  Color,
  Piece,
} from '../core/globals';
import { pieceToText } from '../view/core';

const colors = [WHITE, BLACK] as const;

function CapturedPiece({
  color,
  piece,
  amount,
}: {
  color: Color;
  piece: Exclude<Piece, typeof KING>;
  amount: number;
}) {
  if (amount < 1) {
    return null;
  }

  return (
    <>
      {range(0, amount).map((_, idx) => (
        <li key={`${color}${piece}${idx}`} className="capturedPieces__piece">
          <svg className="capturedPieces__img" viewBox="0 0 45 45">
            <use
              href={`#${pieceToText[piece]}`}
              className={
                Number(color) === WHITE ? 'piece--white' : 'piece--black'
              }
            />
          </svg>
        </li>
      ))}
    </>
  );
}

const pieceCost = {
  [PAWN]: 1,
  [BISHOP]: 3,
  [KNIGHT]: 3,
  [ROOK]: 5,
  [QUEEN]: 9,
};

export function CapturedPieces({
  capturedPieces,
}: {
  capturedPieces: Pick<GameState, 'capturedPieces'>;
}) {
  // @ts-expect-error
  if (
    !Object.values(capturedPieces).some((obj) =>
      Object.values(obj).some((amount) => amount > 0))
  ) {
    return null;
  }

  return (
    <section className="capturedPieces">
      <h2>Captured pieces:</h2>
      {colors.map((color) => {
        // @ts-expect-error
        const pieces = capturedPieces[color];

        return (
          <div key={color}>
            total value:
            {' '}
            {Object.keys(pieces)
              .map(
                (piece) =>
                  pieceCost[Number(piece) as keyof typeof pieceCost] *
                  pieces[piece],
              )
              .reduce((acc, val) => acc + val)}
            <ul key={color} className="capturedPieces__pieces">
              <CapturedPiece color={color} piece={PAWN} amount={pieces[PAWN]} />
              <CapturedPiece
                color={color}
                piece={KNIGHT}
                amount={pieces[KNIGHT]}
              />
              <CapturedPiece
                color={color}
                piece={BISHOP}
                amount={pieces[BISHOP]}
              />
              <CapturedPiece color={color} piece={ROOK} amount={pieces[ROOK]} />
              <CapturedPiece
                color={color}
                piece={QUEEN}
                amount={pieces[QUEEN]}
              />
            </ul>
          </div>
        );
      })}
    </section>
  );
}
