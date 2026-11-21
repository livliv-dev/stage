// One loop for every session (sessions/policies: the characters among themselves, a chat with you, a 直播间). It opens
// the session (the policy's set-up: its record, its cast loaded), takes a step at a time until the policy says it is
// done, and closes it; what a step is (who speaks next, what it waits for, what it answers) is the policy's. What comes
// in goes through the inbox (sessions/inbox.ts); a turn is said by the speak path (sessions/speak.ts).

export type Policy = {
  /** before the steps: the record opened, the cast loaded (may throw: the session fails) */
  open(signal: AbortSignal): Promise<void>
  /** one step: false when the session is done */
  step(signal: AbortSignal): Promise<boolean>
  /** the policy ended it (a limit reached) */
  done?(): void
  /** an error ended it, or stopping it did (the signal aborted) */
  failed(error: unknown, signal: AbortSignal): void
  /** last, whatever ended it */
  close(): Promise<void> | void
}

/** runs a session to its end */
export async function runSession(policy: Policy, controller: AbortController) {
  try {
    await policy.open(controller.signal)
    while (await policy.step(controller.signal)) { /* the next step */ }
    policy.done?.()
  } catch (error) {
    policy.failed(error, controller.signal)
  } finally {
    await policy.close()
  }
}
