# TODO react: when navigating using Link from offerer to answerer, the rtcpc of offerer is not closed.

firefox closes, but chromium keeps boths pc. (this is on build, so without react strict mode)

cleanup of effect doesn't run.

# TODO Array.at()

can be used instead of length -1.

# TODO webrtc: how it actually works

This is about manual signaling, basically offer/answer can have minimal information, or if enough time given it may have all candidates inside itself.

But after one side recieves candidates, the other should recieve candidates shortly, otherwise some kind of hidden timer runs out and connection fails.

Because candidates of answerer are gathered only after an offer is set, waiting for all candidates of answerer will trigger such time out.

setting offer and answer without exchanging any candidates is fine, and you can wait for minutes before you begin exchanging candidates.

## webrtc: failed (for one side), can still be connected

This is mainly a problem with manual signaling.
1.  send/recieve offer answer.
2.  only one player sets candidates of opponent.
3.  wait 20 seconds.
4.  failed (for the side that did set candidates).
5.  now other player sets candidates.
6.  both connected.


## webrtc: chrome ice exchange 25 seconds timer

<https://github.com/rtcweb-wg/mdns-ice-candidates/issues/121>


##  webrtc: warn that firewall might have to be disabled

# TODO add option to give up


# TODO consider renaming move into ply

honestly absurd that move means an action of both players, and that should be changed ideally, however that is very unlikely to happen.

Move could be confusing for people that do not know my definition.
While ply is very meaningless word (if u don't know what it means), it would at least force people to look up definition. As opposed to thinking about move being action of two people.


# TODO maybe view and core should be split into their own packages?
# TODO on reverse tabbing is not reversed.

 **Not sure if this problem should be fixed**
you can select right square with tabbing, but the order of tabbing could be wrong, like it would go from bottom to top, instead of top to bottom.

you can manually set tab index, but thats dangerous.

Honestly a bigger problem is accessibility, and this is part of it, I guess to make it more accessibile I need to put handlers on svg elements, and have them have text, like 'c6: white king' and make it live area etc.

