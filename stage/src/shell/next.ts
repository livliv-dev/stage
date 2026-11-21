// The new start page, console and settings (the stage redesign) are reviewed behind ?ui=next before they become the
// only ones; the old ones stay until then.
export const uiNext = typeof location !== 'undefined' && new URLSearchParams(location.search).get('ui') === 'next'
