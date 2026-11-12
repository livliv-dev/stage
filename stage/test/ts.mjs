import { registerHooks } from 'node:module'
registerHooks({
  resolve(spec, context, next) {
    try { return next(spec, context) }
    catch (error) {
      if (spec.startsWith('.') && !/\.[cm]?[jt]s$/.test(spec)) return next(`${spec}.ts`, context)
      throw error
    }
  },
})
