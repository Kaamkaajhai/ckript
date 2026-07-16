// Shared screenplay element definitions (kept separate from the component so React Fast
// Refresh stays happy). Each entry: value, label, optional Tab number (core six only), icon.
import {
  Clapperboard,
  AlignLeft,
  User,
  Parentheses,
  MessageSquare,
  ArrowRightLeft,
  Camera,
  PanelTop,
  PanelBottom,
  Music,
  Hash,
  Columns2,
} from "lucide-react";

export const SCREENPLAY_ELEMENT_BAR = [
  { value: "scene", label: "Scene", tab: 1, Icon: Clapperboard },
  { value: "action", label: "Action", tab: 2, Icon: AlignLeft },
  { value: "character", label: "Character", tab: 3, Icon: User },
  { value: "parenthetical", label: "Paren.", tab: 4, Icon: Parentheses },
  { value: "dialogue", label: "Dialogue", tab: 5, Icon: MessageSquare },
  { value: "transition", label: "Transition", tab: 6, Icon: ArrowRightLeft },
  { value: "shot", label: "Shot", Icon: Camera },
  { value: "act", label: "New Act", Icon: PanelTop },
  { value: "endact", label: "End Act", Icon: PanelBottom },
  { value: "lyrics", label: "Lyrics", Icon: Music },
  { value: "sequence", label: "Sequence", Icon: Hash },
  { value: "dual", label: "Dual", Icon: Columns2 },
];

// Core six (Tab cycle) vs. the rarer types (behind "More" in the wizard layout).
export const CORE_ELEMENTS = SCREENPLAY_ELEMENT_BAR.filter((e) => e.tab);
export const MORE_ELEMENT_ITEMS = SCREENPLAY_ELEMENT_BAR.filter((e) => !e.tab);
// Grouped for the More menu: structural elements together, dialogue-family together.
export const MORE_ELEMENT_GROUPS = [
  ["shot", "act", "endact", "sequence"],
  ["lyrics", "dual"],
].map((group) => group.map((v) => SCREENPLAY_ELEMENT_BAR.find((e) => e.value === v)));
