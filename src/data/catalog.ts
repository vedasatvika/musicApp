import type { CatalogItem } from '../types'

/**
 * A small shared catalog. In a real app this would come from a music API
 * (Spotify / Apple Music). IDs are stable so different users can rank the same
 * item and we can compute compatibility.
 */
export const CATALOG: CatalogItem[] = [
  { id: 'blond', type: 'album', title: 'Blonde', artist: 'Frank Ocean', year: 2016, hue: 28, emoji: '🍊' },
  { id: 'ctrl', type: 'album', title: 'CTRL', artist: 'SZA', year: 2017, hue: 200, emoji: '🦋' },
  { id: 'damn', type: 'album', title: 'DAMN.', artist: 'Kendrick Lamar', year: 2017, hue: 0, emoji: '🔥' },
  { id: 'igor', type: 'album', title: 'IGOR', artist: 'Tyler, the Creator', year: 2019, hue: 320, emoji: '🐝' },
  { id: 'rumours', type: 'album', title: 'Rumours', artist: 'Fleetwood Mac', year: 1977, hue: 40, emoji: '🕊️' },
  { id: 'aja', type: 'album', title: 'Aja', artist: 'Steely Dan', year: 1977, hue: 180, emoji: '🎷' },
  { id: 'currents', type: 'album', title: 'Currents', artist: 'Tame Impala', year: 2015, hue: 260, emoji: '🌀' },
  { id: 'gkmc', type: 'album', title: 'good kid, m.A.A.d city', artist: 'Kendrick Lamar', year: 2012, hue: 15, emoji: '🚲' },
  { id: 'sos', type: 'album', title: 'SOS', artist: 'SZA', year: 2022, hue: 210, emoji: '🌊' },
  { id: 'renaissance', type: 'album', title: 'RENAISSANCE', artist: 'Beyoncé', year: 2022, hue: 300, emoji: '🪩' },
  { id: 'mbdtf', type: 'album', title: 'MBDTF', artist: 'Kanye West', year: 2010, hue: 350, emoji: '🎈' },
  { id: 'chp', type: 'album', title: 'Channel Orange', artist: 'Frank Ocean', year: 2012, hue: 25, emoji: '🌅' },

  { id: 'nights', type: 'song', title: 'Nights', artist: 'Frank Ocean', year: 2016, hue: 30, emoji: '🌙' },
  { id: 'good-days', type: 'song', title: 'Good Days', artist: 'SZA', year: 2020, hue: 150, emoji: '🌤️' },
  { id: 'the-less-i-know', type: 'song', title: 'The Less I Know the Better', artist: 'Tame Impala', year: 2015, hue: 280, emoji: '💔' },
  { id: 'nikes', type: 'song', title: 'Nikes', artist: 'Frank Ocean', year: 2016, hue: 340, emoji: '👟' },
  { id: 'earfquake', type: 'song', title: 'EARFQUAKE', artist: 'Tyler, the Creator', year: 2019, hue: 310, emoji: '🌍' },
  { id: 'money-trees', type: 'song', title: 'Money Trees', artist: 'Kendrick Lamar', year: 2012, hue: 120, emoji: '🌳' },
  { id: 'dreams', type: 'song', title: 'Dreams', artist: 'Fleetwood Mac', year: 1977, hue: 50, emoji: '✨' },
  { id: 'redbone', type: 'song', title: 'Redbone', artist: 'Childish Gambino', year: 2016, hue: 20, emoji: '🩸' },
  { id: 'flashing-lights', type: 'song', title: 'Flashing Lights', artist: 'Kanye West', year: 2007, hue: 220, emoji: '💡' },
  { id: 'cuff-it', type: 'song', title: 'CUFF IT', artist: 'Beyoncé', year: 2022, hue: 290, emoji: '💃' },
  { id: 'kill-bill', type: 'song', title: 'Kill Bill', artist: 'SZA', year: 2022, hue: 5, emoji: '🗡️' },
  { id: 'sunflower', type: 'song', title: 'Sunflower', artist: 'Post Malone', year: 2018, hue: 45, emoji: '🌻' },
]

export const CATALOG_BY_ID: Record<string, CatalogItem> = Object.fromEntries(
  CATALOG.map((c) => [c.id, c]),
)

export function getItem(id: string): CatalogItem | undefined {
  return CATALOG_BY_ID[id]
}
