import { describe, it, expect } from 'vitest';

// claude.ts の parseResponse と extractJson を再現してテスト
function extractJson(raw: string): string {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return cleaned;
}

function parseResponse(text: string) {
  const slackMatch = text.match(/<SLACK>([\s\S]*?)<\/SLACK>/);
  const jsonMatch = text.match(/<ARTICLES_JSON>([\s\S]*?)<\/ARTICLES_JSON>/);

  const slackText = slackMatch ? slackMatch[1].trim() : text;

  let allArticles: Record<string, unknown[]> = {};
  if (jsonMatch) {
    try {
      allArticles = JSON.parse(extractJson(jsonMatch[1]));
    } catch {
      // パース失敗
    }
  }

  return { slackText, allArticles };
}

describe('extractJson', () => {
  it('プレーンJSONをそのまま返す', () => {
    expect(extractJson('{"key": "value"}')).toBe('{"key": "value"}');
  });

  it('```json で囲まれたJSONを抽出する', () => {
    expect(extractJson('```json\n{"key": "value"}\n```')).toBe('{"key": "value"}');
  });

  it('``` で囲まれたJSONを抽出する', () => {
    expect(extractJson('```\n{"key": "value"}\n```')).toBe('{"key": "value"}');
  });
});

describe('parseResponse', () => {
  it('SLACKタグからテキストを抽出する', () => {
    const text = '<SLACK>hello world</SLACK><ARTICLES_JSON>{"x_trending":[]}</ARTICLES_JSON>';
    const result = parseResponse(text);
    expect(result.slackText).toBe('hello world');
  });

  it('ARTICLES_JSONタグからJSONをパースする', () => {
    const json = JSON.stringify({ x_trending: [{ title: 'test', url: 'https://example.com' }] });
    const text = `<SLACK>slack text</SLACK><ARTICLES_JSON>${json}</ARTICLES_JSON>`;
    const result = parseResponse(text);
    expect(result.allArticles.x_trending).toHaveLength(1);
  });

  it('SLACKタグがない場合はテキスト全体を返す', () => {
    const result = parseResponse('plain text without tags');
    expect(result.slackText).toBe('plain text without tags');
  });

  it('ARTICLES_JSONタグがない場合は空オブジェクトを返す', () => {
    const result = parseResponse('<SLACK>text</SLACK>');
    expect(result.allArticles).toEqual({});
  });

  it('不正なJSONでもクラッシュしない', () => {
    const text = '<SLACK>text</SLACK><ARTICLES_JSON>{invalid json}</ARTICLES_JSON>';
    const result = parseResponse(text);
    expect(result.slackText).toBe('text');
    expect(result.allArticles).toEqual({});
  });

  it('```json で囲まれたJSONもパースできる', () => {
    const json = JSON.stringify({ anthropic: [{ title: 'a' }] });
    const text = `<SLACK>text</SLACK><ARTICLES_JSON>\n\`\`\`json\n${json}\n\`\`\`\n</ARTICLES_JSON>`;
    const result = parseResponse(text);
    expect(result.allArticles.anthropic).toHaveLength(1);
  });
});
