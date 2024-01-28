import { sqToXY, pieceToText } from '../../view/core';
import { PieceToSquares, WHITE } from '../../core/globals';

export function Pieces({
  pieceToSquares,
  isReverse,
  size,
}: {
  pieceToSquares: PieceToSquares;
  isReverse: boolean;
  size: number;
}) {
  const magicNumber = size / 11; // 5

  return (
    <>
      {Object.entries(pieceToSquares).map(([colorAsString, pieces]) =>
        Object.entries(pieces).map(([pieceAsString, squares]) =>
          Object.keys(squares).map((square) => (
            <g
              className={isReverse ? 'rotate-svg-elem' : ''}
              key={square as string}
            >
              <use
                href={`#${pieceToText[pieceAsString]}`}
                className={
                  Number(colorAsString) === WHITE
                    ? 'piece--white'
                    : 'piece--black'
                }
                x={sqToXY[square].x * size + magicNumber}
                y={sqToXY[square].y * size + magicNumber}
              />
            </g>
          ))))}
    </>
  );
}
