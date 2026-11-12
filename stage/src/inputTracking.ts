import { defaultParams, PARAM_RANGES, type Host, type Params } from '@livliv-dev/player'
import { TrackingFilter, type TrackingProfile, type TrackingSample } from '@livliv-dev/player/tracking'

export type InputPose = { id: string; params: Params; active: boolean; channels: readonly (keyof Params)[] }
export type InputTracking = { readonly active: boolean; readonly canCalibrate: boolean; readonly channels: readonly (keyof Params)[]; readonly sample: TrackingSample | null; profile: TrackingProfile; calibrate(): boolean; stop(): void }
const ANGLES = ['angleX', 'angleY', 'angleZ', 'bodyX', 'bodyZ'] as const

/** Controllers and network sources enter the same normalized Player parameter space. */
export function startInputTracking(player: Host, poll: () => InputPose, options: { profile: TrackingProfile; smoothing(): number; status(active: boolean, error: Error | null): void; calibrate?(): boolean }): InputTracking {
  const filter = new TrackingFilter(options.profile), current = defaultParams()
  let active = false, identity = '', message = '', seen: InputPose | null = null, weight = 0, offset: Partial<Params> = {}, stopped = false
  const status = (on: boolean, error: Error | null) => {
    const next = error?.message ?? ''
    if (active !== on || message !== next) { active = on; message = next; options.status(on, error) }
  }
  const remove = player.use({ order: -10, update(frame) {
    if (stopped) return
    try {
      const pose = poll()
      if (pose.active && pose.id !== identity) { identity = pose.id; offset = {}; filter.reset(); Object.assign(current, defaultParams()); weight = 0 }
      seen = pose; status(pose.active, null)
    } catch (error) { if (seen) seen = { ...seen, active: false }; status(false, error instanceof Error ? error : new Error(String(error))) }
    const dt = Math.min(.1, Math.max(0, frame.dt))
    weight = Math.min(1, Math.max(0, weight + (active ? dt / .15 : -dt / .35)))
    if (!weight || !seen) { filter.reset(); return }
    const target = { ...seen.params }
    for (const key of seen.channels) {
      const angular = (ANGLES as readonly string[]).includes(key)
      const raw = angular ? ((target[key] - (offset[key] ?? 0) + 180) % 360 + 360) % 360 - 180 : target[key]
      const [lo, hi] = PARAM_RANGES[key]; target[key] = Math.max(lo, Math.min(hi, raw))
    }
    for (const key of seen.channels) {
      const seconds = (ANGLES as readonly string[]).includes(key) ? .015 + options.smoothing() * .2 : .02
      current[key] += (target[key] - current[key]) * (1 - Math.exp(-dt / seconds))
    }
    const adjusted = filter.apply(current, dt), blend = weight * weight * (3 - 2 * weight)
    frame.tracked = seen.channels.length > 0
    for (const key of seen.channels) frame.params[key] += (adjusted[key] - frame.params[key]) * blend
  } })
  return {
    get active() { return active },
    get channels() { return seen?.channels ?? [] },
    get canCalibrate() { return active && !!seen?.channels.some((key) => (ANGLES as readonly string[]).includes(key)) },
    get sample() { return filter.sample },
    get profile() { return filter.profile }, set profile(value) { filter.profile = value },
    calibrate() {
      if (!active || !seen || !seen.channels.some((key) => (ANGLES as readonly string[]).includes(key))) return false
      if (options.calibrate) { if (!options.calibrate()) return false; offset = {}; filter.reset(); Object.assign(current, defaultParams()); return true }
      offset = Object.fromEntries(ANGLES.map((key) => [key, seen!.params[key]])); filter.reset(); Object.assign(current, defaultParams()); return true
    },
    stop() { if (stopped) return; stopped = true; remove(); filter.reset(); active = false; seen = null },
  }
}
