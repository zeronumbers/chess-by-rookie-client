export function Details({ summaryText, contentJSX }) {
  return (
    <details className="details">
      <summary className="details__summary">{summaryText}</summary>
      <div className="details__content">{contentJSX}</div>
    </details>
  );
}
