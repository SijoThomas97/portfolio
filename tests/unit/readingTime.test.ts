import { describe, it, expect } from 'vitest';
import { readingTime } from '../../src/utils/readingTime';

describe('readingTime', () => {
  it('returns at least "1 min read" for empty input', () => {
    expect(readingTime('')).toBe('1 min read');
  });

  it('returns "1 min read" for short text', () => {
    expect(readingTime('Just a few words here.')).toBe('1 min read');
  });

  it('scales with word count (200 wpm)', () => {
    const words = Array.from({ length: 400 }, (_, i) => `word${i}`).join(' ');
    expect(readingTime(words)).toBe('2 min read');
  });

  it('ignores fenced code blocks', () => {
    const code = '```js\n' + 'const x = 1;\n'.repeat(500) + '```\n';
    expect(readingTime(code + 'A short sentence.')).toBe('1 min read');
  });

  it('ignores inline code content only, keeps surrounding text', () => {
    const md = 'Use `npm run build` to build the site.';
    expect(readingTime(md)).toBe('1 min read');
  });

  it('counts link text but not URLs', () => {
    const linkText = Array.from({ length: 200 }, (_, i) => `w${i}`).join(' ');
    const md = `[${linkText}](https://example.com/very/long/url/that/should/not/count)`;
    expect(readingTime(md)).toBe('1 min read');
  });
});
