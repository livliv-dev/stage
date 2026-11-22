// A request the desktop app passes on for the page (LivLiv's site, a model API through /__ai) that gets no answer at all:
// the service out of reach, or no network. Its 502 carries this header naming the host it tried, so the page says so in
// its own words, in the visitor's language (stage/src/request.ts), rather than the app's fixed text.
export const UNREACHABLE_HEADER = 'x-livliv-unreachable'
