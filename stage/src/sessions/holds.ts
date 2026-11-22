// What holds a session's line or turn back: a game character talking (its dialogue ids), game actions being decided,
// you speaking (push to talk, hands-free). Each time you start speaking, or interrupt, the epoch moves on.
export const holds = { dialogue: new Set<string>(), decisions: 0, hearing: false, epoch: 0 }
