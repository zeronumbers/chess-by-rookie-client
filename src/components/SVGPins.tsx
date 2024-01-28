import { reject } from 'ramda';
import { PinnedSquares, DIRECTIONS_OF_QUEEN, Direction } from '../core/globals';
import { sqToXY } from '../view/core';

const dirToXY = {
  1: { x: 100, y: 50 }, // right
  [-1]: { x: 0, y: 50 }, // left
  16: { x: 50, y: 100 }, // down
  [-16]: { x: 50, y: 0 }, // up
  15: { x: 100, y: 0 }, // down,left
  [-15]: { x: 0, y: 100 }, // up right
  17: { x: 100, y: 100 }, // down right
  [-17]: { x: 0, y: 0 }, // up left
};

/* draws grey lines in a transparent square.
   it is supposed to show player that a piece is pinned.
   and by not drawing in one of lines in the direction
   (both toward king and toward attacker)  it is clear which direction is pinned.
   note that such line is designed to show direction of attack,
   it doesn't show that it is actually possible to move along attacked direction. */
export function SVGPins({
  pinnedSquares,
  size,
}: {
  pinnedSquares: PinnedSquares;
  size: number;
}) {
  return (
    <>
      {Object.entries(pinnedSquares).map(([_, objOfVecs], i) => {
        const entries = Object.entries(objOfVecs);

        if (!entries.length) {
          return null;
        }

        return (
          <g key={i} className="pinned">
            {entries.map(([squareAsString, vecs]) => {
              const { x, y } = sqToXY[squareAsString];
              const directions = Object.values(vecs);
              return (
                <svg
                  className="pinned__svg"
                  key={`${i}${squareAsString}`}
                  viewBox="0 0 100 100"
                  x={x * size}
                  y={y * size}
                  width={size}
                  height={size}
                >
                  {Object.values(
                    reject(
                      (direction: Direction) =>
                        directions.includes(direction) ||
                        directions.includes(direction * -1),
                      DIRECTIONS_OF_QUEEN,
                    ),
                  ).map((direction) => {
                    const { x, y } = dirToXY[direction];

                    // stroke (the color of line) and stroke-width are set in css
                    return (
                      <line
                        className="pinned__line"
                        key={`${i}${squareAsString}${direction}`}
                        x1="50"
                        y1="50"
                        x2={x}
                        y2={y}
                      />
                    );
                  })}
                </svg>
              );
            })}
          </g>
        );
      })}
    </>
  );
}
