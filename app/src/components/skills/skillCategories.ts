/** Skill category identifiers. The corresponding translation keys are `skillCategories.*`. */
export type SkillCategory =
  | 'All'
  | 'Built-in'
  | 'Channels'
  | 'Productivity'
  | 'Chat'
  | 'Tools & Automation'
  | 'Social'
  | 'Platform'
  | 'Other';

/** Maps a SkillCategory to its translation key for display in the UI. */
export const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
  All: 'skillCategories.all',
  'Built-in': 'skillCategories.builtIn',
  Channels: 'skillCategories.channels',
  Chat: 'skillCategories.chat',
  Productivity: 'skillCategories.productivity',
  'Tools & Automation': 'skillCategories.toolsAutomation',
  Social: 'skillCategories.social',
  Platform: 'skillCategories.platform',
  Other: 'skillCategories.other',
};

export const SKILL_CATEGORY_ORDER: SkillCategory[] = [
  'All',
  'Built-in',
  'Channels',
  'Chat',
  'Productivity',
  'Tools & Automation',
  'Social',
  'Platform',
  'Other',
];
