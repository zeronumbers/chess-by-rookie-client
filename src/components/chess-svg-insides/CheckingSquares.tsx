import { Square, ObjectOfSquaresWithTrue } from '../../core/globals';
import { SquareControlledBy } from './SquaresControlledBy';

export function CheckingSquares({
  checkingSquares,
  size,
}: {
  checkingSquares: ObjectOfSquaresWithTrue;
  size: number;
}) {
  if (Object.keys(checkingSquares).length) {
    return (
      <>
        {Object.keys(checkingSquares).map((squareAsString) => (
          <SquareControlledBy
            classNameToAdd="check"
            square={Number(squareAsString) as Square}
            size={size}
            key={squareAsString}
          />
        ))}
      </>
    );
  }

  return null;
}
