import { WHITE, GameState, Square } from '../../core/globals';
import { sqToXY } from '../../view/core';

export function SquareControlledBy({
  classNameToAdd,
  square,
  size,
}: {
  classNameToAdd: string;
  square: Square;
  size: number;
}) {
  const magicNumber = size / 11; // 5

  const { x, y } = sqToXY[square];
  return (
    <use
      href="#square--controlled-by"
      className={`square--controlled-by-${classNameToAdd}`}
      x={x * size + magicNumber}
      y={y * size + magicNumber}
      width={`${size - magicNumber * 2}`}
      height={`${size - magicNumber * 2}`}
    />
  );
}

export function SquaresControlledBy({
  gameState,
  size,
}: {
  gameState: GameState;
  size: number;
}) {
  const { originSquare, squareControlledBy, boardOfColors } = gameState;
  if (originSquare) {
    return (
      <>
        {Object.entries(squareControlledBy[originSquare as Square]).map(
          ([_colorAsString, squares]) =>
            Object.keys(squares).map((square) => (
              <SquareControlledBy
                classNameToAdd={
                    boardOfColors[Number(square) as Square] === WHITE
                      ? 'white'
                      : 'black'
                  }
                square={Number(square) as Square}
                size={size}
                key={square}
              />
              )),
        )}
      </>
    );
  }

  return null;
}
