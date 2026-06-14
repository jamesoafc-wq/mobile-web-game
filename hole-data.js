const YARDS_PER_PIXEL = 0.92;

const HOLES = [
  {
    id: 1,
    name: 'Hole 1',
    par: 4,
    start: { x: 208, y: 664 },
    cup: { x: 222, y: 126, r: 4.2 },
    tee: [
      { x: 162, y: 701 }, { x: 242, y: 702 }, { x: 263, y: 677 }, { x: 252, y: 642 },
      { x: 201, y: 627 }, { x: 156, y: 642 }, { x: 148, y: 674 }
    ],
    fairway: [
      { x: 145, y: 676 }, { x: 267, y: 676 }, { x: 284, y: 627 }, { x: 286, y: 577 },
      { x: 270, y: 528 }, { x: 279, y: 474 }, { x: 303, y: 418 }, { x: 302, y: 362 },
      { x: 275, y: 312 }, { x: 257, y: 266 }, { x: 274, y: 214 }, { x: 297, y: 168 },
      { x: 287, y: 132 }, { x: 254, y: 110 }, { x: 214, y: 96 }, { x: 177, y: 101 },
      { x: 152, y: 126 }, { x: 144, y: 165 }, { x: 152, y: 214 }, { x: 168, y: 256 },
      { x: 154, y: 307 }, { x: 127, y: 359 }, { x: 122, y: 419 }, { x: 138, y: 470 },
      { x: 151, y: 524 }, { x: 149, y: 582 }, { x: 146, y: 630 }
    ],
    greenRing: [
      { x: 150, y: 147 }, { x: 168, y: 118 }, { x: 193, y: 95 }, { x: 226, y: 84 },
      { x: 259, y: 89 }, { x: 287, y: 110 }, { x: 301, y: 139 }, { x: 297, y: 170 },
      { x: 276, y: 194 }, { x: 245, y: 208 }, { x: 211, y: 210 }, { x: 180, y: 202 },
      { x: 158, y: 182 }, { x: 147, y: 161 }
    ],
    green: [
      { x: 162, y: 148 }, { x: 179, y: 123 }, { x: 200, y: 108 }, { x: 227, y: 102 },
      { x: 253, y: 106 }, { x: 273, y: 122 }, { x: 284, y: 145 }, { x: 279, y: 167 },
      { x: 263, y: 184 }, { x: 239, y: 194 }, { x: 212, y: 195 }, { x: 188, y: 188 },
      { x: 171, y: 173 }, { x: 163, y: 158 }
    ],
    bunkers: [
      [
        { x: 112, y: 134 }, { x: 124, y: 111 }, { x: 144, y: 96 }, { x: 165, y: 101 },
        { x: 173, y: 122 }, { x: 162, y: 146 }, { x: 138, y: 156 }, { x: 119, y: 151 }
      ],
      [
        { x: 283, y: 183 }, { x: 301, y: 171 }, { x: 326, y: 174 }, { x: 341, y: 188 },
        { x: 337, y: 209 }, { x: 318, y: 220 }, { x: 292, y: 216 }, { x: 280, y: 200 }
      ],
      [
        { x: 94, y: 388 }, { x: 108, y: 366 }, { x: 136, y: 359 }, { x: 157, y: 374 },
        { x: 152, y: 400 }, { x: 125, y: 415 }, { x: 101, y: 409 }
      ]
    ],
    water: [
      { x: 34, y: 448 }, { x: 49, y: 413 }, { x: 71, y: 390 }, { x: 97, y: 376 },
      { x: 122, y: 380 }, { x: 139, y: 398 }, { x: 146, y: 424 }, { x: 139, y: 451 },
      { x: 121, y: 478 }, { x: 92, y: 494 }, { x: 63, y: 493 }, { x: 42, y: 475 }
    ],
    trees: [
      { x: 84, y: 670, variant: 'tree_round_oak_a', scale: 1 },
      { x: 117, y: 625, variant: 'tree_round_oak_b', scale: 0.96 },
      { x: 309, y: 655, variant: 'tree_round_oak_a', scale: 1.08 },
      { x: 332, y: 605, variant: 'tree_round_oak_b', scale: 0.94 },
      { x: 63, y: 543, variant: 'tree_round_oak_a', scale: 1.1 },
      { x: 338, y: 511, variant: 'tree_round_oak_b', scale: 1.02 },
      { x: 67, y: 316, variant: 'tree_round_oak_a', scale: 1.06 },
      { x: 354, y: 279, variant: 'tree_round_oak_b', scale: 1.02 },
      { x: 86, y: 198, variant: 'tree_round_oak_a', scale: 0.98 },
      { x: 347, y: 164, variant: 'tree_round_oak_b', scale: 0.94 },
      { x: 52, y: 104, variant: 'tree_round_oak_a', scale: 1.03 },
      { x: 340, y: 90, variant: 'tree_round_oak_b', scale: 1.1 }
    ],
    props: [
      { type: 'tee_sign_small', x: 132, y: 674, text: 'Hole 1' },
      { type: 'tee_marker_blue', x: 193, y: 655 },
      { type: 'tee_marker_white', x: 223, y: 655 },
      { type: 'bench_wood_small', x: 292, y: 689, rotation: -0.18 },
      { type: 'ball_washer_basic', x: 317, y: 668 },
      { type: 'yardage_marker_150', x: 318, y: 447 },
      { type: 'yardage_marker_100', x: 304, y: 269 },
      { type: 'shrub_cluster_a', x: 73, y: 442 },
      { type: 'shrub_cluster_b', x: 318, y: 238 },
      { type: 'rock_small_a', x: 351, y: 435 },
      { type: 'reeds_small', x: 53, y: 470 },
      { type: 'reeds_small', x: 126, y: 470, rotation: 0.2 }
    ],
    futureOptionalProps: ['bridge_wood_small', 'rope_post_a', 'flower_bed_small', 'stone_wall_short'],
    slopeZones: [
      { x: 210, y: 145, rx: 92, ry: 44, rotation: -0.12, dx: 0.42, dy: 0.06, strength: 0.0008 },
      { x: 257, y: 118, rx: 56, ry: 26, rotation: 0.2, dx: -0.38, dy: 0.1, strength: 0.0007 },
      { x: 186, y: 170, rx: 58, ry: 22, rotation: 0.18, dx: 0.1, dy: -0.36, strength: 0.00055 }
    ]
  }
];
