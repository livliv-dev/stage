// A reply that streams (AIRI), said as it comes: each sentence made ready (its voice) while the one before is said, so
// they follow each other at once. The stream is closed when it is done, fails or is stopped (its request with it).

/** says each utterance of `answer`; `first` just before the first is said. How many were said */
export async function sayEach<U, R>(answer: AsyncIterator<U>, signal: AbortSignal, ready: (said: U) => Promise<R>, say: (said: U, made: R) => Promise<void>, first: () => void) {
  const prepare = async () => {
    const result = await answer.next()
    signal.throwIfAborted()
    return result.done ? null : { said: result.value, made: await ready(result.value) }
  }
  let count = 0
  try {
    let next = await prepare()
    while (next) {
      if (count++ === 0) first()
      const after = prepare()
      // a sentence given up before it is reached may fail meanwhile
      void after.catch(() => {})
      await say(next.said, next.made)
      next = await after
    }
    return count
  } finally {
    await answer.return?.()
  }
}
