import { describe, expect, it } from 'vitest';
import { SHORTCUT_ITEMS, getShortcutDescription } from './richEditorConfig';

describe('richEditorConfig', () => {
  it('provides localized help descriptions for every shortcut item', () => {
    for (const item of SHORTCUT_ITEMS) {
      expect(getShortcutDescription(item.id, true)).not.toBe(item.id);
      expect(getShortcutDescription(item.id, false)).not.toBe(item.id);
    }
  });
});
