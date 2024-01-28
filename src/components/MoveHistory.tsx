import { FixedSizeList as List } from 'react-window';
import { GameState } from '../core/globals';

const reverseIndex = (length: number, index: number) => length - 1 - index;

function Row({
  data,
  style,
  index,
}: {
  data: any[];
  style: Record<string, unknown> | undefined;
  index: number;
}) {
  const reversedIndex = reverseIndex(data.length, index);

  return (
    <li
      className={
        reversedIndex % 2
          ? 'move-history__row--black'
          : 'move-history__row--white'
      }
      style={style}
    >
      {reversedIndex + 1}
      .
      {data[index]}
    </li>
  );
}

/* it works, but idk if performance is ok, after all index manipulations
   and data is being reversed, additionally itemKey function is inline
   because I need moveHistory. */
export function MoveHistory({ moveHistory }: Pick<GameState, 'moveHistory'>) {
  if (!moveHistory.length) {
    return null;
  }

  const itemHeight = 21; // it has to be same value as the height normal list item takes.
  const maxAmount = 20;

  // FIXME: is <aside> better than <section> here?
  return (
    <section className="move-history">
      <h2>Half moves:</h2>
      <List
        itemKey={(index: number, data: any[]) => {
          const reversedIndex = reverseIndex(data.length, index);
          return moveHistory[reversedIndex] + reversedIndex;
        }}
        itemData={moveHistory.toReversed()}
        className="move-history__list"
        innerElementType="ol"
        itemSize={itemHeight}
        itemCount={moveHistory.length}
        height={
          moveHistory.length > maxAmount
            ? maxAmount * itemHeight
            : itemHeight * moveHistory.length
        }
        width={120}
      >
        {Row}
      </List>
    </section>
  );
}
