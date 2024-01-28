import { useState } from 'react';

export function Copy({
  value,
  description,
  className,
}: {
  value: string;
  description: string;
  className?: string;
}) {
  const [didCopy, setDidCopy] = useState<null | boolean>(null);
  return (
    <span
      className={
        didCopy === true
          ? 'copy copy--success'
          : didCopy === false
          ? 'copy copy--fail'
          : 'copy'
      }
    >
      <button
        className={className ? `copy__button ${className}` : 'copy__button'}
        type="button"
        onClick={() => {
          try {
            navigator.clipboard.writeText(value).then(
              () => {
                setDidCopy(true);
                /* clipboard successfully set */
              },
              () => {
                setDidCopy(false);
                /* clipboard write failed */
              },
            );
          } catch (err) {
            console.log(err);
            setDidCopy(false);
          }
        }}
      >
        copy
        {' '}
        {description}
      </button>
      {didCopy === true ? (
        <span className="copy__status copy__status--success">copied!</span>
      ) : didCopy === false ? (
        <span className="copy__status copy__status--fail">failed to copy</span>
      ) : null}
    </span>
  );
}
