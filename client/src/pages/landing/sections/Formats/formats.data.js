/* Story formats shown in the gallery. `offset` staggers every other
   card downward; `rd` is the reveal delay; `seed` feeds picsum. */
export const FORMATS = [
  { title: "Film", sub: "Feature & Short", seed: "ckript-film", offset: false, rd: "0.02" },
  { title: "Web Series", sub: "Episodic", seed: "ckript-series", offset: true, rd: "0.08" },
  { title: "Anime", sub: "Animation", seed: "ckript-anime", offset: false, rd: "0.14" },
  { title: "Television", sub: "Broadcast", seed: "ckript-tv", offset: true, rd: "0.2" },
  { title: "Cartoons", sub: "Family", seed: "ckript-cartoon", offset: false, rd: "0.26" },
];
