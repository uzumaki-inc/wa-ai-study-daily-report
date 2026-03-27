import { describe, it, expect } from 'vitest';
import { splitText } from '../poster/slack';

describe('splitText', () => {
  it('短いテキストはそのまま返す', () => {
    expect(splitText('hello', 3000)).toEqual(['hello']);
  });

  it('空文字列はそのまま返す', () => {
    expect(splitText('', 3000)).toEqual(['']);
  });

  it('ちょうど上限のテキストは分割しない', () => {
    const text = 'a'.repeat(3000);
    expect(splitText(text, 3000)).toEqual([text]);
  });

  it('上限超過時に改行位置で分割する', () => {
    const line1 = 'a'.repeat(50);
    const line2 = 'b'.repeat(50);
    const text = `${line1}\n${line2}`;
    const result = splitText(text, 60);
    expect(result).toEqual([line1, line2]);
  });

  it('改行がない場合は上限位置で分割する', () => {
    const text = 'a'.repeat(100);
    const result = splitText(text, 60);
    expect(result[0]).toHaveLength(60);
    expect(result[1]).toHaveLength(40);
  });
});
