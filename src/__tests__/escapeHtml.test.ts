import { describe, it, expect } from 'vitest';
import { escapeHtml, safeUrl } from '../web/generator';

describe('escapeHtml', () => {
  it('特殊文字をエスケープする', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('アンパサンドをエスケープする', () => {
    expect(escapeHtml('a&b')).toBe('a&amp;b');
  });

  it('シングルクォートをエスケープする', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('エスケープ不要なテキストはそのまま返す', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });

  it('空文字列を処理できる', () => {
    expect(escapeHtml('')).toBe('');
  });
});

describe('safeUrl', () => {
  it('httpスキームを許可する', () => {
    expect(safeUrl('http://example.com')).toBe('http://example.com');
  });

  it('httpsスキームを許可する', () => {
    expect(safeUrl('https://example.com')).toBe('https://example.com');
  });

  it('javascriptスキームを拒否する', () => {
    expect(safeUrl('javascript:alert(1)')).toBe('#');
  });

  it('dataスキームを拒否する', () => {
    expect(safeUrl('data:text/html,<h1>xss</h1>')).toBe('#');
  });

  it('空文字列を拒否する', () => {
    expect(safeUrl('')).toBe('#');
  });

  it('URL内の特殊文字をエスケープする', () => {
    expect(safeUrl('https://example.com/a&b"c')).toBe(
      'https://example.com/a&amp;b&quot;c'
    );
  });
});
