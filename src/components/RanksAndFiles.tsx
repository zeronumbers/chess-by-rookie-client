import { RANKS, FILES } from '../core/globals';

/* FIXME: both Ranks and Files are very similar
   is it better to create one complex component or keep two simple? */
export function Ranks({
  size,
  xPercent,
  isReverse,
}: {
  size: number;
  xPercent: 0 | 90;
  isReverse: boolean;
}) {
  return (
    <svg
      className="files-or-ranks"
      viewBox={`0 0 ${size} ${size * 8}`}
      x={`${xPercent}%`}
      y="10%"
      width="10%"
      height="80%"
    >
      {RANKS.map((s, i) => (
        <text
          className={isReverse ? 'rotate-svg-elem' : ''}
          key={`t${s}`}
          x="50%"
          y={`${12.5 * i + 6.25}%`}
        >
          {s}
        </text>
      ))}
    </svg>
  );
}

export function Files({
  size,
  yPercent,
  isReverse,
}: {
  size: number;
  yPercent: 0 | 90;
  isReverse: boolean;
}) {
  return (
    <svg
      className="files-or-ranks"
      viewBox={`0 0 ${size * 8} ${size}`}
      y={`${yPercent}%`}
      x="10%"
      width="80%"
      height="10%"
    >
      {FILES.map((s, i) => (
        <text
          className={isReverse ? 'rotate-svg-elem' : ''}
          key={`t${s}`}
          y="50%"
          x={`${12.5 * i + 6.25}%`}
        >
          {s}
        </text>
      ))}
    </svg>
  );
}
