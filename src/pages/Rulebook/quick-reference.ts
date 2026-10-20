// GM quick reference: short summaries of the Pokérole 3.0 corebook's battle rules,
// checked against the book's text. Page numbers are book (= PDF) pages.
export interface QuickReferenceSection {
  title: string;
  /** Corebook pages the summary comes from. */
  pages: number[];
  points: string[];
}

export const quickReference: QuickReferenceSection[] = [
  {
    title: "Combat flow",
    pages: [33, 56, 57, 93],
    points: [
      "Initiative Score is Dexterity + Alert. At the start of combat, roll one die and add it to get the Initiative.",
      "Highest Initiative acts first. Ties go to the higher Initiative Score, then a re-roll between the tied.",
      "Roll Initiative once per combat, and again when a new participant joins. A returning switched-out Pokémon may keep its old roll.",
      "A Round is about a minute. Everyone takes turns in order, then cycles again until all actions are used.",
      "Each fighter can take up to 5 actions per Round, one per turn. Reactions also use up one of the 5.",
      "Each Move or Maneuver can be used only once per Round.",
      "There is no grid. Everything in the Main Arena is in range of both sides, unless a Move takes someone out of range.",
    ],
  },
  {
    title: "Accuracy & action difficulty",
    pages: [35, 57],
    points: [
      "Roll a dice pool of d6s (Attribute + Skill). Each die showing 4, 5 or 6 is a success.",
      "Rolling Accuracy uses one Action. Failing means the user could not gather the energy to perform the Move.",
      "Successes needed rise with each action in the Round: 1st needs 1, 2nd needs 2, 3rd needs 3, 4th needs 4, 5th needs 5.",
      "Skill check difficulty: 1 Troublesome, 2 Challenging, 3 Hard, 4 Very Hard, 5+ Almost Impossible.",
      "Rolling 3 or more successes below the requirement is a Critical Failure: something bad happens at the Storyteller's discretion.",
      "Moves can list an Accuracy roll such as Dexterity/Strength + Athletic. The player chooses which Attribute to use.",
    ],
  },
  {
    title: "Reactions",
    pages: [58, 59, 70, 71],
    points: [
      "A Reaction is used during another's turn and costs one of your 5 Actions. Only one Reaction per turn.",
      "Reactions resolve before the foe's action hits. Late Reactions resolve after it.",
      "Answer a Reaction with another one only if its number is higher. Late Reactions can only be answered by Late Reactions.",
      "A Late Reaction can answer a Reaction, but not the other way around. Higher Late Reaction numbers resolve later.",
      "Evasion (Dexterity + Evasion) must match or beat the attacker's Accuracy successes. Success means no damage and no effects.",
      "Clash is Strength + Clash vs Physical or Special + Clash vs Special. Match the successes and both sides take 1 damage; added effects do not trigger.",
      "Evasion and Clash ignore the Multiple Action chart but cost an Action even on failure. They are all-or-nothing.",
      "Neither works against social-Attribute Moves or Moves that target the battlefield. Evasion also fails against Never Miss.",
    ],
  },
  {
    title: "Damage",
    pages: [34, 52, 60, 61],
    points: [
      "Damage pool is Strength (Physical) or Special (Special) + the Move's Power. Subtract the target's Defense or Sp. Defense.",
      "Defenses never reduce the pool below 1 die. Each success is 1 damage, and 0 successes still deals 1 damage.",
      "S.T.A.B.: a Physical or Special Move matching one of the user's types adds 1 extra die.",
      "Super-effective adds 1 damage to the total. Not very effective subtracts 1. Immune types take no damage from Physical or Special Moves.",
      "Dual-typed: both types weak adds 2 damage (extremely effective). Both resistant subtracts 2 (barely effective).",
      "Super-effective needs at least one success rolled to apply its bonus.",
      "Critical Hit: Accuracy successes 3 above the requirement (2 above for High-Critical Moves) adds 2 extra dice to the damage pool.",
      "Set Damage is not rolled and ignores defenses, but gets no S.T.A.B. or critical bonus.",
    ],
  },
  {
    title: "Pain penalization",
    pages: [62],
    points: [
      "Pain removes successes from rolls. Full HP: none. At half HP or less (rounded down): 1 removed. At 1 HP: 2 removed.",
      "Affects Accuracy, Damage, Social Attributes, Strength, Dexterity, Special and Insight. Vitality and Will rolls are not affected.",
      "Penalties vanish as soon as enough HP is healed. They stack with other effects that remove successes.",
      "Spend 1 Will Point to ignore 1 removed success for the rest of the scene. Ignoring all takes up to 3 Will Points.",
      "The Storyteller may also assign pain narratively, for example from exhaustion, hunger or lack of sleep.",
    ],
  },
  {
    title: "Will Points",
    pages: [28],
    points: [
      "Will Score is Insight + 3. It is also the pool of Will Points players can spend.",
      "Power through the Pain: 1 WP ignores 1 Pain Penalization for the rest of the scene, up to 3.",
      "Take your chances: 1 WP re-rolls 1 failed die on every Action roll that Round. Out of combat it lasts the whole scene.",
      "Pushing Fate: 1 WP gives 1 automatic, un-removable success on one roll. It does not work on Damage or Chance Dice rolls.",
      "Take your chances and Pushing Fate cannot be used in the same Round.",
      "A character who spends all their Will Points faints at the end of the scene.",
      "Recover Will Points by resting a few days, winning a battle, completing an achievement or training with a Pokémon.",
    ],
  },
  {
    title: "Common conditions",
    pages: [84, 85, 87],
    points: [
      "Burn: 1st degree deals 1 damage per Round, 2nd deals 2, 3rd deals 3. Treat with Dexterity + Athletic, needing 4, 6 or 8 successes. Fire types immune.",
      "Poison: 2 damage per Round, lasts 8 hours. Badly Poisoned also deals 2 and worsens each Round. Poison and Steel types immune.",
      "Paralysis: the subject loses 2 Dexterity for 12 hours. Electric types immune.",
      "Sleep: no actions. In battle, roll Insight at the start of the turn (counts as an action) and wake after 5 total successes.",
      "Frozen Solid: no actions. The ice block has 5 HP and Def and Sp. Def 2. Super-effective Moves break it instantly. Ice types immune.",
      "Confusion: roll Insight at the Round start, 2 successes act normally. Otherwise remove 1 success (Starter to Standard), 2 (Advanced to Ace) or 3 (Master+), and a failed action deals 1 damage.",
      "Flinch: the subject's next action is wasted and it cannot use Reactions until that turn ends. Only one Flinch per subject per Round.",
      "In Love: the subject holds back against the beloved foe and its allies. A Loyalty or Insight roll of 3 successes lets it attack at full power.",
    ],
  },
  {
    title: "Weather",
    pages: [88, 89, 90],
    points: [
      "Sunny: Fire Moves get +1 die, Water Moves deal 1 less damage, and no one can be Frozen Solid.",
      "Rain: Water Moves get +1 die, Fire Moves deal 1 less damage, and no one can get 2nd or 3rd degree Burn.",
      "Sandstorm: non-Rock, Ground or Steel types take 1 typeless damage at the end of the Round. Rock types get +1 Sp. Defense.",
      "Snowy: Ice Moves get +1 die, Ice types get +1 Defense, and Frozen Solid chance rolls get +1 Chance Die. The ice block becomes 7 HP, Def 3.",
      "Hail: non-Ice types take 1 typeless damage at the end of the Round, and Frozen Solid chance rolls get +1 Chance Die.",
      "Desolate (extreme sun): Fire Moves get +2 dice, Water Moves fail, and no one can be Frozen. Only Typhoon or Strong Winds override it.",
      "Typhoon: Water Moves get +2 dice, Fire Moves fail, and no one can be Burned. Only Desolate or Strong Winds override it.",
      "Strong Winds: Flying Moves get +2 dice, Flying types take no Super-Effective bonus, and it cannot be overridden once active.",
    ],
  },
        {
          title: "Pokéball capture power",
          pages: [98, 99, 100],
          points: [
            "Capture power is the number of dice the Pokéball provides: Pokéball 4, Great Ball 6, Ultra Ball 8, and up to 9 for customized balls.",
            "Successes needed to capture depend on the wild Pokémon's current Rank: Starter 3, Rookie 4, Standard 6, Advanced 8, Expert 9, Ace 10.",
            "Gain 1 success if the Pokémon is at half HP or less, and 2 successes if it is at 1 HP.",
            "Gain 1 success per Status Ailment on the Pokémon (see Common Conditions).",
            "A Critical Failure (3 or more successes below the required amount) breaks the Pokéball.",
          ],
        },
      ];
