import { describe, it, expect } from 'vitest';
import type { Routes } from '@angular/router';
import { routes } from './app.routes';

function collectTitles(routeList: Routes): string[] {
  return routeList.flatMap((route) => [
    ...(typeof route.title === 'string' ? [route.title] : []),
    ...collectTitles(route.children ?? []),
  ]);
}

describe('route titles', () => {
  it('has exactly 18 titles', () => {
    expect(collectTitles(routes)).toHaveLength(18);
  });

  it('ends every title with the Diddit suffix', () => {
    expect(collectTitles(routes).every((title) => title.endsWith(' - Diddit!'))).toBe(true);
  });

  it('does not contain English route-title words', () => {
    const englishWords =
      /\b(?:Login|Register|Password|Accept|Invitation|Invitations|Home|Tasks|Family|Progress|Rewards|Create|Household|Households|Settings|Manage|My|Child|Forgot|Reset)\b/i;
    expect(collectTitles(routes).every((title) => !englishWords.test(title))).toBe(true);
  });
});
