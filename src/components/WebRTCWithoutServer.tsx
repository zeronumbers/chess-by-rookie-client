import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Details } from './Details';
import { SubmitButton } from './SubmitButton';

import { ConnectionAndErrors } from './ConnectionAndErrors';

import { makeJSONObjectValidator, TextArea, Validate } from './TextArea';

import { Copy } from './Copy';

import {
  useWebRTCWithoutServer,
  mutateSetupAnswerer,
  mutateSetupOfferer,
  IceCandidates,
  LocalDescription,
  HasRemoteDescription,
} from '../hooks/useWebRTCWithoutServer';

import { PCRef } from '../hooks/useWebRTC';
import { GameStateForWebRTC } from '../core/globals';

const conf = JSON.parse(import.meta.env.VITE_RTC_PEER_CONNECTION_CONFIGURATION);

function Warning() {
  return (
    <div>
      <h2>Attention!</h2>
      <p>You will likely fail to connect.</p>
      <p>The problem is with browsers not expecting such use case.</p>
    </div>
  );
}

function ChromiumIssueWarning({
  nameOfferer,
  nameAnswerer,
}: {
  nameOfferer: string;
  nameAnswerer: string;
}) {
  return (
    <Details
      summaryText="Issues on chromium?"
      contentJSX={(
        <>
          <p>
            At the moment of writing this: [2023-12-29] chromium can connect if
            the right actions are taken.
          </p>
          {' '}
          <p>
            <strong>The time of this timer could be adjusted</strong>
            , using
            {' '}
            <code>about:config</code>
            {' '}
            menu
          </p>
          <p>
            Adjust property
            {' '}
            <strong>
              <code>media.peerconnection.ice.trickle_grace_period</code>
            </strong>
            {' '}
            to the time (in milliseconds) it would take it:
          </p>
          <ol>
            <li>
              send offer to
              {nameAnswerer}
            </li>
            <li>
              {nameAnswerer}
              {' '}
              submit offer
            </li>
            <li>
              send answer to
              {nameOfferer}
            </li>
            <li>
              {nameOfferer}
              {' '}
              submit answer
            </li>
            <li>
              now both of you should wait for all candidates to gather, when
              gathered, send them, but don't submit yet.
            </li>
            <li>
              try to simultaniously submit ice candidates, there is roughly 20
              seconds window.
            </li>
          </ol>
        </>
    )}
    />
  );
}

function FirefoxIssueWarning({
  nameOfferer,
  nameAnswerer,
}: {
  nameOfferer: string;
  nameAnswerer: string;
}) {
  return (
    <Details
      summaryText="Issues on firefox?"
      contentJSX={(
        <>
          <p>
            At the moment of writing this: [2023-12-19] firefox basically doesn't
            want you to use webrtc with manual signaling. As soon as offer is
            submitted by
            {' '}
            {nameAnswerer}
            , firefox
            {' '}
            <strong>sets a 5 seconds timer</strong>
            .
          </p>
          {' '}
          <p>
            <strong>
              connection will fail if timer runs out before answer is submitted
            </strong>
            .
          </p>
          <p>
            <strong>The time of this timer could be adjusted</strong>
            , using
            {' '}
            <code>about:config</code>
            {' '}
            menu
          </p>
          <p>
            Adjust property
            {' '}
            <strong>
              <code>media.peerconnection.ice.trickle_grace_period</code>
            </strong>
            {' '}
            to the time (in milliseconds) it would take it:
          </p>
          <ol>
            <li>
              for
              {nameAnswerer}
              {' '}
              to set offer
            </li>
            <li>for answer to be created</li>
            <li>
              for
              {' '}
              {nameAnswerer}
              {' '}
              to send answer to
              {' '}
              {nameOfferer}
            </li>
            <li>
              for
              {nameOfferer}
              {' '}
              to set answer
            </li>
          </ol>
          <p>
            default value is 5000 (which equals to 5 seconds, as mentioned above)
          </p>
          <p>
            <a href=">https://bugzilla.mozilla.org/show_bug.cgi?id=1647289">
              link to bug
            </a>
          </p>
        </>
    )}
    />
  );
}

const remoteIceCandidatesValidation: Validate = (value, ref) => {
  try {
    const array = JSON.parse(value);

    const elements =
      array[array.length - 1] === null ? array.slice(0, -1) : array;

    const wrongElements = elements.filter(
      (elem) => elem.candidate !== '' && !elem.candidate,
    );

    if (!wrongElements.length) {
      ref.current?.setCustomValidity('');
    } else {
      ref.current?.setCustomValidity(`
Wrong element${wrongElements.length > 1 ? 's' : ''}: ${wrongElements
        .map((e) => JSON.stringify(e))
        .join(', ')}.`);
    }
  } catch (err) {
    ref.current?.setCustomValidity(err);
  }
};

function IceCandidatesComp({
  iceCandidates,
  canGather,
  pcRef,
  localDescription,
  hasRemoteDescription,
}: {
  iceCandidates: IceCandidates;
  pcRef: PCRef;
  localDescription: LocalDescription;
  hasRemoteDescription: HasRemoteDescription;
  canGather: boolean;
}) {
  const iceCandidatesAsString = JSON.stringify(iceCandidates);
  const copy = (
    <>
      <textarea className="block" readOnly value={iceCandidatesAsString} />
      <Copy value={iceCandidatesAsString} description="ice candidates" />
    </>
  );

  const amountOfCandidates = iceCandidates.filter((c) => c !== null).length;
  const lastCandidate = iceCandidates[iceCandidates.length - 1];

  const [remoteIceCandidatesText, setRemoteIceCandidatesText] = useState('');

  return (
    <div>
      <p>send your ice candidates and recieve opponent's ice candidates</p>
      <ul>
        <li>
          {canGather ? (
            <>
              {lastCandidate === null ? (
                <>
                  <label htmlFor="icegatheringprogress">
                    <p>
                      Gathered all (
                      {amountOfCandidates}
                      ) ice candidates
                    </p>
                  </label>
                  <progress id="icegatheringprogress" value="100">
                    DONE
                  </progress>
                  <p>Copy all ice candidates and send them to opponent</p>
                  {' '}
                  {copy}
                </>
              ) : (
                <>
                  <label htmlFor="icegatheringprogress">
                    <p>
                      Gathering ice candidates, currently:
                      {' '}
                      {amountOfCandidates}
                    </p>
                  </label>
                  <progress id="icegatheringprogress">GATHERING</progress>
                  {amountOfCandidates ? (
                    <>
                      <p>
                        You can send current ice candidates to opponent (there
                        is no harm in it, but it does not guarantee that
                        connection will open, in which case you would need to
                        gather more ice candidates and send them). Or you can
                        wait for all ice candidates to send them once.
                      </p>
                      {copy}
                    </>
                  ) : null}
                </>
              )}
            </>
          ) : (
            <p>Offer (step 1) is needed to begin gathering ice candidates</p>
          )}
        </li>
        <li>
          {!localDescription || !hasRemoteDescription ? (
            <p>
              Complete previous steps to be able to paste ice candidates of
              opponent
            </p>
          ) : (
            <form
              autoComplete="off"
              onSubmit={(e) => {
                e.preventDefault();

                try {
                  const remoteIceCandidates = JSON.parse(
                    new FormData(e.target).get('remoteIceCandidates'),
                  );
                  remoteIceCandidates.forEach(
                    (iceCandidate: RTCIceCandidate) => {
                      console.log(
                        'recieved remote ice candidate:',
                        iceCandidate,
                      );
                      pcRef.current.addIceCandidate(iceCandidate);
                    },
                  );
                } catch (err) {
                  console.error(err);
                }
              }}
            >
              <TextArea
                labelText="opponent's ice candidates"
                text={remoteIceCandidatesText}
                setText={setRemoteIceCandidatesText}
                name="remoteIceCandidates"
                validate={remoteIceCandidatesValidation}
              />
              <SubmitButton />
            </form>
          )}
        </li>
      </ul>
    </div>
  );
}

function HowToConnectAnswerer({
  webRTCPropsWithoutSetErrors,
}: WebRTCPropsWithoutSetErrors) {
  const {
    pcRef,
    setHasRemoteDescription,
    hasRemoteDescription,
    localDescription,
    setLocalDescription,
    iceCandidates,
  } = webRTCPropsWithoutSetErrors;

  const [offerText, setOfferText] = useState('');

  const localDescriptionAsString = localDescription
    ? JSON.stringify(localDescription)
    : '';

  return (
    <>
      <Warning />
      <FirefoxIssueWarning nameOfferer="opponent" nameAnswerer="you" />
      <br />
      <ChromiumIssueWarning nameOfferer="opponent" nameAnswerer="you" />
      <ol>
        <li>
          {hasRemoteDescription ? (
            <p>offer exchange success</p>
          ) : (
            <form
              autoComplete="off"
              onSubmit={(e) => {
                e.preventDefault();

                try {
                  const offer = JSON.parse(new FormData(e.target).get('offer'));

                  pcRef.current
                    ?.setRemoteDescription(offer)
                    .then(() => {
                      setHasRemoteDescription(true);
                    })

                    .then(() => pcRef.current.createAnswer())
                    .then((answer) => ({
                        type: 'answer',
                        sdp: answer.sdp.replace(
                          /a=ice-options:trickle\s\n/g,
                          '',
                        ),
                      }))
                    .then((answer) => {
                      pcRef.current.setLocalDescription(answer);
                      return answer;
                    })
                    .then((answer) => setLocalDescription(answer));
                } catch (err) {}
              }}
            >
              <TextArea
                labelText="offer"
                text={offerText}
                setText={setOfferText}
                name="offer"
                validate={makeJSONObjectValidator(['type', 'sdp'], {
                  type: 'offer',
                })}
              />
              <SubmitButton />
            </form>
          )}
        </li>
        <li>
          {localDescription ? (
            <>
              <textarea
                className="block"
                readOnly
                value={localDescriptionAsString}
              />
              <Copy value={localDescriptionAsString} description="answer" />
            </>
          ) : (
            <p>paste offer to create answer</p>
          )}
        </li>

        <li>
          <IceCandidatesComp
            iceCandidates={iceCandidates}
            canGather={hasRemoteDescription}
            pcRef={pcRef}
            hasRemoteDescription={hasRemoteDescription}
            localDescription={localDescription}
          />
        </li>
      </ol>
    </>
  );
}

export function WebRTCWithoutServerAnswerer() {
  const webRTCProps = useWebRTCWithoutServer(conf, mutateSetupAnswerer);

  return (
    <ConnectionAndErrors
      webRTCProps={webRTCProps}
      HowToConnect={HowToConnectAnswerer}
      gameState={null}
    />
  );
}

function HowToConnectOfferer({
  webRTCPropsWithoutSetErrors,
}: WebRTCPropsWithoutSetErrors) {
  const {
    pcRef,
    setHasRemoteDescription,
    hasRemoteDescription,
    localDescription,
    setLocalDescription,
    iceCandidates,
  } = webRTCPropsWithoutSetErrors;

  const [answerText, setAnswerText] = useState('');

  const localDescriptionAsString = localDescription
    ? JSON.stringify(localDescription)
    : '';

  return (
    <>
      <Warning />
      <FirefoxIssueWarning nameAnswerer="opponent" nameOfferer="you" />
      <br />
      <ChromiumIssueWarning nameAnswerer="opponent" nameOfferer="you" />
      <ol>
        <li>
          send
          {' '}
          <Link to="/answerer">link</Link>
          {' '}
          to opponent
          <Copy value={`${window.location.host}/join`} description="link" />
        </li>
        <li>
          {hasRemoteDescription ? (
            <p>answer successfully exchanged</p>
          ) : localDescription ? (
            <>
              send offer to opponent
              <textarea
                className="block"
                readOnly
                value={localDescriptionAsString}
              />
              <Copy value={localDescriptionAsString} description="offer" />
            </>
          ) : (
            <p>preparing offer</p>
          )}
        </li>

        <li>
          {hasRemoteDescription ? (
            <p>answer is set</p>
          ) : (
            <form
              autoComplete="off"
              onSubmit={(e) => {
                e.preventDefault();

                try {
                  const answer = JSON.parse(
                    new FormData(e.target).get('answer'),
                  );

                  pcRef.current?.setRemoteDescription(answer).then(() => {
                    setHasRemoteDescription(true);
                  });
                } catch (err) {}
              }}
            >
              <TextArea
                labelText="answer"
                text={answerText}
                setText={setAnswerText}
                name="answer"
                validate={makeJSONObjectValidator(['type', 'sdp'], {
                  type: 'answer',
                })}
              />
              <SubmitButton />
            </form>
          )}
        </li>
        <li>
          <IceCandidatesComp
            iceCandidates={iceCandidates}
            canGather={!!localDescription}
            pcRef={pcRef}
            hasRemoteDescription={hasRemoteDescription}
            localDescription={localDescription}
          />
        </li>
      </ol>
    </>
  );
}

export function WebRTCWithoutServerOfferer({
  gameState,
}: {
  gameState: GameStateForWebRTC;
}) {
  const webRTCProps = useWebRTCWithoutServer(conf, mutateSetupOfferer);

  return (
    <ConnectionAndErrors
      webRTCProps={webRTCProps}
      HowToConnect={HowToConnectOfferer}
      gameState={gameState}
    />
  );
}
