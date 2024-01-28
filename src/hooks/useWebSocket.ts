import {
  useEffect,
  useRef,
  useState,
  Dispatch,
  SetStateAction,
  MutableRefObject,
} from 'react';

import { pick } from 'ramda';

export type WSState = null | 'open' | 'closed';
export type SetWSState = Dispatch<SetStateAction<WSState>>;

export type WSRef = MutableRefObject<WebSocket | null>;

export type WSErrorEvent = Pick<Event, 'type' | 'timeStamp'>;
export type WSMessageErrorException = Pick<DOMException, 'message' | 'name'>;
export type WSErrors = (WSErrorEvent | WSMessageErrorException)[];
export type SetWSErrors = Dispatch<SetStateAction<WSErrors>>;

export type WSClosedWhy = null | Pick<
  CloseEvent,
  'code' | 'reason' | 'wasClean' | 'timeStamp'
>;

export type MsgObj = {
  type: string;
  data: object;
};

export const sendMsg = (
  wsRef: WSRef,
  setWSErrors: SetWSErrors,
  msgObj: MsgObj,
) => {
  if (wsRef.current) {
    try {
      wsRef.current.send(JSON.stringify(msgObj));
    } catch (error) {
      console.log('websocket send error:', error);
      // FIXME: TS: why error? I expect error here to be WSMessageErrorException
      setWSErrors((prev) => [...prev, pick(['message', 'name'], error)]);
    }
  }
};

export const useWebSocket = (urlStr: string) => {
  const [wsState, setWSState] = useState<WSState>(null);
  const [wsErrors, setWSErrors] = useState<WSErrors>([]);
  const [wsClosedWhy, setWSClosedWhy] = useState<WSClosedWhy>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (
      wsRef.current === null ||
      wsRef.current?.readyState === WebSocket.CLOSED
    ) {
      // if (wsRef.current === null) {
      const ws = new WebSocket(urlStr);
      ws.onopen = (event) => {
        console.log('WebSocket opened:', event);
        setWSState('open');
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event);

        setWSState('closed');
        setWSClosedWhy(
          pick(['code', 'reason', 'wasClean', 'timeStamp'], event),
        );
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWSErrors((prev) => [...prev, pick(['type', 'timeStamp'], error)]);
      };

      wsRef.current = ws;
    }

    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        setWSState(null);
        setWSErrors([]);
        setWSClosedWhy(null);

        wsRef.current.close();
        wsRef.current = null;
      }
    };
    // never change url str
  }, [urlStr]);

  return {
    wsState,
    setWSState,
    wsErrors,
    setWSErrors,
    wsClosedWhy,
    setWSClosedWhy,
    wsRef,
  };
};

export type UseWebSocketReturn = ReturnType<typeof useWebSocket>;
