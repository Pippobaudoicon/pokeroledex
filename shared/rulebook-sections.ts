// The corebook's table of contents (pages 6-7): chapter, then [first page, section].
// Book page numbers equal PDF page numbers. A section ends where the next one starts;
// sections starting on the same page share one file. Pages 1-8 (cover, credits,
// contents) are left out of search.
export const chapters: [string, [number, string][]][] = [
  ['Introduction', [[9, 'Introduction']]],
  ['The Marvelous World of Pokémon', [
    [10, 'A Whole New World of Adventure'], [10, 'Pocket Monsters'],
    [11, 'Life in the World of Pokémon'], [12, 'Main Regions'], [14, 'The Pokémon League'], [17, 'Antagonists'],
    [19, 'Becoming a Trainer'],
  ]],
  ['System Explained', [
    [22, 'Core Concepts'], [22, 'Mental and Physical Attributes'], [24, 'Social Attributes'], [25, 'Skills'],
    [26, 'Health Points (HP)'], [27, 'Defense & Special Defense'], [28, 'Will Points'], [28, 'Happiness & Loyalty'],
    [29, 'Disobedience'], [30, 'Ranks'], [32, 'Training Points'], [32, 'Time & Battle Concepts'],
    [35, 'Rolling the Dice'], [36, 'Starting the Game'], [37, 'Chapter Recap'],
  ]],
  ['Character Creation', [
    [40, 'Creating a Character'], [42, 'Trainer Character Sheet'], [43, 'Filling a Trainer Character Sheet'],
    [44, 'Creating a Pokémon'], [44, 'Filling a Pokémon Character Sheet'], [45, 'Pokémon Character Sheet'],
    [46, 'Natures'], [50, 'Chapter Recap'],
  ]],
  ['Pokémon Battles', [
    [52, 'The Different Pokémon Types'], [53, 'Defensive Type Chart'], [54, 'Pokémon Battle Guide'],
    [56, 'Battle Mechanics'], [56, 'Initiative'], [56, 'Battlefield'], [57, 'Accuracy'],
    [57, 'Time for Multiple Actions'], [58, 'For Every Action, a Reaction'], [60, 'Damage Dice Pools'],
    [61, 'Damage'], [62, 'Pain Penalization'], [63, 'Fainting'], [63, 'Lethal Damage'],
    [64, 'Trainer Actions In-Battle'], [66, 'Multiple Pokémon In-Battle'], [68, 'Target Acquired'],
    [70, 'Clash & Evasion'], [72, 'Useful Strategies'], [74, 'The Added Effect'],
    [84, 'Status Ailments & Conditions'], [88, 'Weather Conditions'], [90, 'Environmental Challenges'],
    [93, 'Chapter Recap'],
  ]],
  ['Catching Pokémon', [
    [96, 'Habitats'], [97, 'Special Pokémon'], [98, 'Pokéballs'], [99, 'Catching Wild Pokémon'],
    [100, 'Pokémon Catching Guide'], [101, 'Alternatives to Catching Pokémon'], [102, 'Chapter Recap'],
  ]],
  ['Training Pokémon', [
    [104, 'How to Train Your Pokémon'], [104, 'Training Through Battle'], [105, 'Training Sessions'],
    [106, 'Training a Disobedient Pokémon'], [107, 'Training Points'], [107, 'Rank Up'], [108, 'Pokémon Evolution'],
    [109, 'Learn New Moves'], [111, 'Over-Ranking'], [112, 'Re-Training'], [113, 'Day-Care Centers'],
    [114, 'Chapter Recap'],
  ]],
  ['Items for the Journey', [
    [116, "Trainer's Basics"], [118, 'Healing Items'], [122, 'Pokéballs'], [123, 'Items for Pokémon Care'],
    [126, 'Technical Machines & Records'], [126, 'Held Items'],
  ]],
  ['Pokédex', [
    [132, 'How to Read a Pokédex Entry'], [133, 'Handling Alternate Forms'], [133, 'Legendary & Mythical Pokémon'],
    [134, 'Kanto Pokédex'], [184, 'Johto Pokédex'], [212, 'Hoenn Pokédex'], [253, 'Sinnoh Pokédex'],
    [284, 'Unova Pokédex'], [328, 'Kalos Pokédex'], [348, 'Alola Pokédex'], [373, 'Galar Pokédex'],
    [398, 'Hisui Pokédex'], [400, 'Paldea Pokédex'], [427, 'Kitakami Pokédex'],
  ]],
  ['Pokémon Moves', [
    [434, 'Basic Rules for Moves'], [434, 'Rules for Moves during Battle'], [435, 'How to Read a Movedex Entry'],
    [436, 'Effect Icons'], [440, 'Bug Moves'], [443, 'Dark Moves'], [448, 'Dragon Moves'], [451, 'Electric Moves'],
    [455, 'Fairy Moves'], [458, 'Fighting Moves'], [463, 'Fire Moves'], [469, 'Flying Moves'], [472, 'Ghost Moves'],
    [475, 'Grass Moves'], [481, 'Ground Moves'], [484, 'Ice Moves'], [487, 'Normal Moves'], [506, 'Poison Moves'],
    [510, 'Psychic Moves'], [517, 'Rock Moves'], [520, 'Steel Moves'], [523, 'Water Moves'],
    [528, 'Typeless Maneuvers'], [529, 'Move Clarifications'], [531, 'Narrative Approaches to Moves'],
    [532, 'Strength Chart'], [532, 'Dexterity Chart'],
  ]],
  ['Pokémon Abilities', [
    [534, 'Rules for Abilities'], [534, 'Rules for Abilities in-Battle'], [535, 'How to Read an Abilitydex Entry'],
    [535, 'Hidden Abilities'], [536, 'Abilitydex'],
  ]],
  ['Game Master', [
    [582, 'Challenges Ahead'], [582, 'Creating a Story'], [583, 'One-Shot'], [583, 'Episodic Story'],
    [583, 'Chronicle'], [584, 'All Kinds of Stories'], [586, 'Storytelling Styles'], [587, 'Laws of Storytelling'],
    [588, 'Laws for Players'], [589, "Creating NPC's"], [589, 'Making Encounters'], [591, 'Horde Encounters'],
    [594, 'Random Encounters'], [596, 'Organizing Combat Flow'], [598, 'Advanced Battle'], [598, 'Battle Bonds'],
    [600, 'Dynamax & Gigantamax'], [606, 'Mega Evolution'], [608, 'Terastallization'], [610, 'Z-Moves'],
    [614, 'League Challenge'], [618, 'Rival'],
  ]],
  ['Spirit of Champions', [
    [624, 'The Road to Champion'], [626, 'Myths & Legends'], [628, 'Legendary Ranks'],
  ]],
  ['Final Words', [
    [632, 'Final Words'], [634, 'Character Sheets'], [636, 'Battle Organizer Sheet'], [638, 'Glossary'],
  ]],
];

export interface RulebookSection {
  chapter: string;
  /** 1-based chapter number, for ordering (search/04-character-creation/...). */
  chapterNumber: number;
  start: number;
  end: number;
  titles: string[];
}

/** The contents as page ranges, used by the Text tab and the AI Search files. */
export const rulebookSections = (pageCount: number): RulebookSection[] => {
  const sections: RulebookSection[] = [];
  chapters.forEach(([chapter, list], i) => {
    for (const [start, title] of list) {
      const last = sections.at(-1);
      if (last?.start === start) last.titles.push(title);
      else sections.push({ chapter, chapterNumber: i + 1, start, end: 0, titles: [title] });
    }
  });
  sections.forEach((section, i) => {
    section.end = (sections[i + 1]?.start ?? pageCount + 1) - 1;
  });
  return sections;
};
