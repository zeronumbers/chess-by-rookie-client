import { useEffect, useRef, Dispatch, SetStateAction, RefObject } from 'react';
import { whereEq } from 'ramda';

export type Validate = (
  value: string,
  ref: RefObject<HTMLTextAreaElement>,
) => void;

/* tricky problem, i need button outside of this component to reset text to certain value.

   useEffect is not an option, it kind of works, but only once,
   if the button is pressed again, then effect won't run since prop didn't change,
   and as a result text will not change to the value from button.

   easiest solution is to lift state up. */
export function TextArea({
  text,
  setText,
  validate,
  labelText,
  isRequired,
  name,
}: {
  text: string;
  setText: Dispatch<SetStateAction<string>>;
  validate: Validate;
  labelText: string;
  isRequired?: boolean;
  name?: string;
}) {
  const ref = useRef(null);

  /* explaining why validate here instead of onChange of textarea:
     onChange would run only when you interact with textarea.
     effect would run when text changes,
     so if we change text using setText from outside of textarea, it would run validation. */
  useEffect(() => {
    validate(text, ref);
  }, [text]);

  return (
    <div>
      <label>
        {labelText}
        <textarea
          className="TextArea block"
          ref={ref}
          name={name}
          required={isRequired}
          onChange={(e) => {
            setText(e.target.value);
          }}
          value={text}
        />
      </label>
    </div>
  );
}

// object having unspecified props is not an error
/* ideally you would just take type from typescript
   and generate runtime function to test if input satisfies type. */
export const makeJSONObjectValidator =
  (
    requiredProps: string[],
    spec?: Record<string, unknown> | undefined,
  ): Validate =>
  (value, ref) => {
    try {
      const object = JSON.parse(value);

      const missingKeys = requiredProps.filter(
        (key: string) => !object.hasOwnProperty(key),
      );

      let errorMessage = ''; // empty string means valid

      if (missingKeys.length) {
        errorMessage += `Missing key${
          missingKeys.length > 1 ? 's' : ''
        }: ${missingKeys.join(', ')}.`;
      }

      if (spec && !whereEq(spec, object)) {
        const specErrorMessage = `Given object doesn't satisfy spec: ${JSON.stringify(
          spec,
        )}`;
        if (errorMessage.length) {
          errorMessage += `\n${specErrorMessage}`;
        } else {
          errorMessage = specErrorMessage;
        }
      }

      ref.current?.setCustomValidity(errorMessage);
    } catch (err) {
      ref.current?.setCustomValidity(err);
    }
  };
