// Themed page background — original, hand-drawn motifs (no copyrighted
// characters). Ties the four collections together in one seamless tile:
//   • One Piece — jolly roger (skull + straw hat + crossbones), devil fruit
//   • Pokémon  — monster-ball, energy bolt
//   • Football — soccer ball
//   • Basketball — basketball
//   • the hobby itself — a trophy + a foil trading card with a star
// Built as a tiling SVG and turned into a data URI with encodeURIComponent so it
// is always valid inside CSS url() — no reliance on the bundler's asset encoding.

const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'>
  <g opacity='0.42'>

    <!-- One Piece: jolly roger (skull + straw hat + crossbones) -->
    <g transform='translate(64,68)'>
      <g stroke='#37474f' stroke-width='4' stroke-linecap='round'>
        <line x1='-21' y1='14' x2='21' y2='31'/>
        <line x1='21' y1='14' x2='-21' y2='31'/>
      </g>
      <path d='M0,-6 C13,-6 19,3 19,12 C19,18 15,21 12,23 L12,26 L-12,26 L-12,23 C-15,21 -19,18 -19,12 C-19,3 -13,-6 0,-6 Z' fill='#fafafa' stroke='#37474f' stroke-width='2'/>
      <circle cx='-7.5' cy='10' r='4' fill='#37474f'/>
      <circle cx='7.5' cy='10' r='4' fill='#37474f'/>
      <path d='M-4,18 h8' stroke='#37474f' stroke-width='2'/>
      <ellipse cx='0' cy='-8' rx='27' ry='7' fill='#e6c766' stroke='#b8902f' stroke-width='2'/>
      <path d='M-13,-8 Q-13,-24 0,-24 Q13,-24 13,-8 Z' fill='#e6c766' stroke='#b8902f' stroke-width='2'/>
      <rect x='-13' y='-12' width='26' height='5' rx='2' fill='#d8392b'/>
    </g>

    <!-- Pokémon: monster-ball -->
    <g transform='translate(236,62)'>
      <circle r='20' fill='#ffffff' stroke='#263238' stroke-width='2.5'/>
      <path d='M-20,0 A20,20 0 0 1 20,0 Z' fill='#e53935'/>
      <line x1='-20' y1='0' x2='-7' y2='0' stroke='#263238' stroke-width='2.5'/>
      <line x1='7' y1='0' x2='20' y2='0' stroke='#263238' stroke-width='2.5'/>
      <circle r='6' fill='#ffffff' stroke='#263238' stroke-width='2.5'/>
      <circle r='2.5' fill='#263238'/>
    </g>

    <!-- Basketball -->
    <g transform='translate(58,156)'>
      <circle r='19' fill='#ef8e3a' stroke='#8a4418' stroke-width='2'/>
      <line x1='-19' y1='0' x2='19' y2='0' stroke='#8a4418' stroke-width='2'/>
      <line x1='0' y1='-19' x2='0' y2='19' stroke='#8a4418' stroke-width='2'/>
      <path d='M-9,-16.7 Q-1,0 -9,16.7' fill='none' stroke='#8a4418' stroke-width='2'/>
      <path d='M9,-16.7 Q1,0 9,16.7' fill='none' stroke='#8a4418' stroke-width='2'/>
    </g>

    <!-- One Piece: devil fruit -->
    <g transform='translate(150,150)'>
      <circle r='19' fill='#7e57c2' stroke='#4a148c' stroke-width='2'/>
      <path d='M-11,-3 q11,-13 22,0' fill='none' stroke='#4a148c' stroke-width='2'/>
      <path d='M-11,4 q11,-13 22,0' fill='none' stroke='#4a148c' stroke-width='2'/>
      <path d='M-7,11 q7,-8 14,0' fill='none' stroke='#4a148c' stroke-width='2'/>
      <path d='M3,-19 q7,-7 12,-2' fill='none' stroke='#2e7d32' stroke-width='3'/>
    </g>

    <!-- Football: soccer ball -->
    <g transform='translate(242,156)'>
      <circle r='19' fill='#ffffff' stroke='#263238' stroke-width='2'/>
      <path d='M0,-10 L9.5,-3.1 L5.9,8.1 L-5.9,8.1 L-9.5,-3.1 Z' fill='#263238'/>
      <line x1='0' y1='-10' x2='0' y2='-19' stroke='#263238' stroke-width='2'/>
      <line x1='9.5' y1='-3.1' x2='17.5' y2='-7' stroke='#263238' stroke-width='2'/>
      <line x1='5.9' y1='8.1' x2='11' y2='16' stroke='#263238' stroke-width='2'/>
      <line x1='-5.9' y1='8.1' x2='-11' y2='16' stroke='#263238' stroke-width='2'/>
      <line x1='-9.5' y1='-3.1' x2='-17.5' y2='-7' stroke='#263238' stroke-width='2'/>
    </g>

    <!-- Pokémon: energy bolt -->
    <g transform='translate(62,244)'>
      <path d='M5,-20 L-9,5 L-1,5 L-5,21 L13,-5 L3,-5 Z' fill='#f9a825' stroke='#c17900' stroke-width='1.5'/>
    </g>

    <!-- The hobby: trophy -->
    <g transform='translate(238,242)' stroke='#b8902f' stroke-width='2'>
      <path d='M-11,-15 h22 v4 a11,11 0 0 1 -22,0 Z' fill='#e6c766'/>
      <path d='M-11,-13 h-5 a6,7 0 0 0 7,9' fill='none'/>
      <path d='M11,-13 h5 a6,7 0 0 1 -7,9' fill='none'/>
      <line x1='0' y1='0' x2='0' y2='8'/>
      <rect x='-9' y='8' width='18' height='4' rx='1' fill='#e6c766'/>
    </g>

    <!-- The hobby: foil trading card with a star -->
    <g transform='translate(150,250) rotate(-12)'>
      <rect x='-13' y='-19' width='26' height='38' rx='3' fill='#fdf6e3' stroke='#b8902f' stroke-width='2'/>
      <path d='M0,-11 l2.7,5.5 6,0.9 -4.4,4.2 1,6 -5.3,-2.8 -5.3,2.8 1,-6 -4.4,-4.2 6,-0.9 Z' fill='#f9a825'/>
    </g>

    <!-- scattered accents -->
    <g fill='#f9a825'>
      <path transform='translate(150,56)' d='M0,-7 l1.8,5.2 5.2,1.8 -5.2,1.8 -1.8,5.2 -1.8,-5.2 -5.2,-1.8 5.2,-1.8 Z'/>
      <path transform='translate(106,206) scale(0.8)' d='M0,-7 l1.8,5.2 5.2,1.8 -5.2,1.8 -1.8,5.2 -1.8,-5.2 -5.2,-1.8 5.2,-1.8 Z'/>
      <path transform='translate(196,206) scale(0.8)' d='M0,-7 l1.8,5.2 5.2,1.8 -5.2,1.8 -1.8,5.2 -1.8,-5.2 -5.2,-1.8 5.2,-1.8 Z'/>
    </g>
    <circle cx='110' cy='110' r='3' fill='#7e57c2'/>
    <circle cx='198' cy='110' r='3' fill='#7e57c2'/>
    <circle cx='150' cy='108' r='3' fill='#d8392b'/>

  </g>
</svg>`;

export const themeBgUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;
