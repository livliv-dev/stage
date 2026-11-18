// The chat loop asks here before it calls Stage's own model. The AIRI host installs the answer.
export type AiriForward = 'sent' | 'unavailable' | 'ignore'

let take: (text: string) => AiriForward = () => 'ignore'

export function setAiriForward(next: (text: string) => AiriForward) {
  take = next
  return () => { if (take === next) take = () => 'ignore' }
}

export function takeAiriLine(text: string): AiriForward {
  return take(text)
}
