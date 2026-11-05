// Hash routing: the studio is a static page (no server routes), so every view is
// a hash path that survives reload and can be linked.
//   #/                      home
//   #/week/<id>[/<anchor>]  a handout; anchor is an item like exercise-3
//   #/map[/<node>]          the territory map
//   #/tutor                 the learning-edge bridge
//   #/proof/<slug>          a ReductionLab walk-through
import { useEffect, useState } from 'react';

export type Route =
  | { view: 'home' }
  | { view: 'week'; week: string; anchor?: string }
  | { view: 'map'; node?: string }
  | { view: 'tutor' }
  | { view: 'proof'; slug: string };

export function parseHash(hash: string): Route {
  let parts: string[];
  try {
    parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    return { view: 'home' }; // malformed escape such as `#/map/%`
  }
  switch (parts[0]) {
    case 'week':
      return parts[1] ? { view: 'week', week: parts[1], anchor: parts[2] } : { view: 'home' };
    case 'map':
      return { view: 'map', node: parts[1] };
    case 'tutor':
      return { view: 'tutor' };
    case 'proof':
      return parts[1] ? { view: 'proof', slug: parts[1] } : { view: 'home' };
    default:
      return { view: 'home' };
  }
}

export const href = {
  home: () => '#/',
  week: (week: string, anchor?: string) => `#/week/${week}${anchor ? `/${anchor}` : ''}`,
  /** Link to an item id like `2b/exercise-7`. */
  item: (id: string) => {
    const [week, anchor] = id.split('/');
    return `#/week/${week}/${anchor}`;
  },
  map: (node?: string) => `#/map${node ? `/${node}` : ''}`,
  tutor: () => '#/tutor',
  proof: (slug: string) => `#/proof/${slug}`,
};

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

/** DOM id for an item anchor, so `#/week/3/exercise-2` can scroll to it. */
export const anchorId = (itemId: string) => `item-${itemId.replace('/', '-')}`;
