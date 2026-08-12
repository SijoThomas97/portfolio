import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { withBase } from '../../src/utils/links';

// withBase() reads import.meta.env.BASE_URL at call time, so we stub it to
// the value Astro injects for the production build (base: '/portfolio').
describe('withBase with base "/portfolio/" (production)', () => {
  beforeEach(() => vi.stubEnv('BASE_URL', '/portfolio/'));
  afterEach(() => vi.unstubAllEnvs());

  it('prefixes root-relative paths with the base', () => {
    expect(withBase('/projects')).toBe('/portfolio/projects');
    expect(withBase('/blog')).toBe('/portfolio/blog');
    expect(withBase('/contact')).toBe('/portfolio/contact');
  });

  it('handles the home path without producing a double slash', () => {
    expect(withBase('/')).toBe('/portfolio/');
  });

  it('collapses repeated slashes anywhere in the result', () => {
    expect(withBase('//projects//')).toBe('/portfolio/projects/');
    expect(withBase('/blog//post-1')).toBe('/portfolio/blog/post-1');
  });

  it('preserves nested paths', () => {
    expect(withBase('/projects/handwritten-text-recognition')).toBe(
      '/portfolio/projects/handwritten-text-recognition'
    );
  });

  it('never returns a path containing "//"', () => {
    for (const p of ['/', '/a', '//a', '/a/b/', '/a//b']) {
      expect(withBase(p)).not.toMatch(/\/\//);
    }
  });
});

describe('withBase with base "/" (local dev without base)', () => {
  beforeEach(() => vi.stubEnv('BASE_URL', '/'));
  afterEach(() => vi.unstubAllEnvs());

  it('leaves root-relative paths intact', () => {
    expect(withBase('/projects')).toBe('/projects');
    expect(withBase('/')).toBe('/');
  });
});
