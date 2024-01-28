import { useEffect, useState, useRef } from 'react';

// ms means milliseconds
const createTimer = (msToWait: number) => {
  const msStartedAt = Number(new Date());
  const msEndsAt = msStartedAt + msToWait;

  return () => {
    // FIXME: is it a problem that it will create `new Date()` every time it's called?
    // interval or timeout could be used instead but it does not guarantee precision.
    const diff = msEndsAt - Number(new Date());

    if (diff > 0) {
      return diff;
    }

    return 0;
  };
};

const startState = 1;
const endState = 0;

// this works, a bit clunky (when rendered, the first 3 ms are random, ideally i d want 000)
export const useTimer = (msToWait: number) => {
  const [state, setState] = useState<
    null | typeof startState | typeof endState
  >(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  // begin timer
  useEffect(() => {
    if (state === startState) {
      const timer = createTimer(msToWait);
      const intervalId = setInterval(() => {
        const ms = timer();
        setTimeLeft(ms);

        if (!ms) {
          clearInterval(intervalId);
        }
      }, 1000);

      intervalRef.current = intervalId;
    }

    if (state === endState && intervalRef.current !== null) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
    // FIXME: dependency
  }, [state]);

  const start = () => {
    setState(startState);
  };

  const end = () => {
    setState(endState);
    // FIXME: is this desired behaviour?
    setTimeLeft(0);
  };

  return { timeLeft, start, end };
};
