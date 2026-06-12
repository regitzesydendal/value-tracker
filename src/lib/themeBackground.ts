// Themed page background — original, hand-drawn motifs (no copyrighted
// characters): straw hat, devil fruit, skull (One Piece) + monster-ball,
// lightning, stars (Pokémon). Built as a tiling SVG and turned into a data URI
// with encodeURIComponent so it is always valid inside CSS url() — no reliance
// on the bundler's asset encoding.

const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'>
  <g opacity='0.32'>
    <g transform='translate(50,52) scale(0.7) rotate(-10)'>
      <ellipse cx='0' cy='10' rx='30' ry='10' fill='#c9a227'/>
      <path d='M-17,10 Q-17,-15 0,-15 Q17,-15 17,10 Z' fill='#e6c766'/>
      <rect x='-17' y='2' width='34' height='6' rx='3' fill='#c0392b'/>
    </g>
    <g transform='translate(150,50) scale(0.72)'>
      <circle r='18' fill='#ffffff'/>
      <path d='M-18,0 A18,18 0 0 1 18,0 Z' fill='#e53935'/>
      <circle r='18' fill='none' stroke='#263238' stroke-width='2.5'/>
      <line x1='-18' y1='0' x2='18' y2='0' stroke='#263238' stroke-width='2.5'/>
      <circle r='5.5' fill='#ffffff' stroke='#263238' stroke-width='2.5'/>
    </g>
    <g transform='translate(50,150) scale(0.72)'>
      <circle r='20' fill='#7e57c2'/>
      <path d='M-11,-3 q11,-13 21,0 q-11,13 -21,0' fill='none' stroke='#4a148c' stroke-width='2.2'/>
      <path d='M-6,6 q7,-8 13,0' fill='none' stroke='#4a148c' stroke-width='2.2'/>
      <path d='M3,-20 q7,-7 11,-2' fill='none' stroke='#2e7d32' stroke-width='3.5'/>
    </g>
    <g transform='translate(150,150) scale(0.72)'>
      <path d='M0,-16 C12,-16 18,-8 18,2 C18,9 13,12 10,14 L10,18 L-10,18 L-10,14 C-13,12 -18,9 -18,2 C-18,-8 -12,-16 0,-16 Z' fill='#eceff1' stroke='#90a4ae' stroke-width='1.5'/>
      <circle cx='-7' cy='0' r='4' fill='#37474f'/>
      <circle cx='7' cy='0' r='4' fill='#37474f'/>
      <rect x='-2.5' y='6' width='5' height='6' rx='1' fill='#37474f'/>
    </g>
    <g transform='translate(100,100) scale(0.72) rotate(8)'>
      <path d='M4,-22 L-10,4 L-1,4 L-5,22 L13,-6 L2,-6 Z' fill='#f9a825'/>
    </g>
    <g fill='#ffca28'>
      <path d='M102,34 l2.3,6.7 l6.7,2.3 l-6.7,2.3 l-2.3,6.7 l-2.3,-6.7 l-6.7,-2.3 l6.7,-2.3 Z'/>
      <path d='M36,104 l2,5.9 l5.9,2 l-5.9,2 l-2,5.9 l-2,-5.9 l-5.9,-2 l5.9,-2 Z'/>
      <path d='M168,106 l2,5.9 l5.9,2 l-5.9,2 l-2,5.9 l-2,-5.9 l-5.9,-2 l5.9,-2 Z'/>
      <path d='M100,170 l2,5.9 l5.9,2 l-5.9,2 l-2,5.9 l-2,-5.9 l-5.9,-2 l5.9,-2 Z'/>
    </g>
  </g>
</svg>`;

export const themeBgUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;
