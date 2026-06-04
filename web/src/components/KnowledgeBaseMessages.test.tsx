/**
 * @vitest-environment jsdom
 */
// charset: utf-8
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { KnowledgeBaseMessages } from './KnowledgeBaseMessages';

afterEach(() => {
  cleanup();
});

describe('KnowledgeBaseMessages', () => {
  it('renders warning and danger status items in a status stack', () => {
    const { container, getAllByRole } = render(
      <KnowledgeBaseMessages
        draftSaveFailed
        errorMessage="导入失败"
        isZh
        missingImageAssetCount={2}
      />
    );

    expect(container.querySelector('.knowledge-status-stack')).not.toBeNull();

    const alerts = getAllByRole('alert');
    expect(alerts).toHaveLength(3);
    expect(alerts[0].classList.contains('knowledge-status-item--warning')).toBe(true);
    expect(alerts[1].textContent).toContain('2 个图片资源缺失');
    expect(alerts[2].classList.contains('knowledge-status-item--danger')).toBe(true);
  });

  it('renders nothing when no status messages are present', () => {
    const { container } = render(
      <KnowledgeBaseMessages
        draftSaveFailed={false}
        errorMessage={null}
        isZh
        missingImageAssetCount={0}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
