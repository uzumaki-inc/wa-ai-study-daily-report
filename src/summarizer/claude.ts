import Anthropic from '@anthropic-ai/sdk';
import { Article } from '../types';
import { Config } from '../config';
import { withRetry } from '../utils/retry';
import { todayWithDayJST } from '../utils/date';

export type CategoryArticle = {
  title: string;
  url: string;
  source: string;
  lang: 'en' | 'ja';
  summary?: string;
};

export type CategorizedArticles = {
  [key: string]: CategoryArticle[];
};

export type SummaryResult = {
  slackText: string;
  allArticles: CategorizedArticles;
};

function buildPrompt(articles: Article[], moreUrl: string, blogArticles?: Article[]): string {
  const { dateStr, dayOfWeek } = todayWithDayJST();

  const newsOnly = articles.filter((a) => !a.feedCategory?.startsWith('blog_'));
  const articleList = newsOnly
    .map(
      (a, i) =>
        `${i + 1}. [${a.lang}] ${a.title}\n   URL: ${a.url}\n   Source: ${a.source}\n   Summary: ${a.summary.slice(0, 200)}`
    )
    .join('\n\n');

  const blogList = (blogArticles || [])
    .map(
      (a, i) =>
        `${i + 1}. [${a.feedCategory}] ${a.title}\n   URL: ${a.url}\n   Source: ${a.source}\n   Summary: ${a.summary.slice(0, 200)}`
    )
    .join('\n\n');

  return `あなたはAI・テクノロジー分野の専門ニュースキュレーターです。
以下の記事リストを読んで、5つのカテゴリに分類し、2つの出力を生成してください。
必ず <SLACK>...</SLACK> と <ARTICLES_JSON>...</ARTICLES_JSON> の両方のタグを出力すること。

【カテゴリ（この順序で出力）】
1. 🔥 Xで話題 — SNS（特にX）でバズっているAI関連トピック
2. 🟠 Anthropic — Anthropic社に関するニュース（製品・訴訟・研究）
3. 🧠 モデル・技術 — 新モデルリリース、技術的ブレイクスルー
4. 📝 ブログ記事 — 日本語の技術ブログ記事（はてなブックマーク・Zenn・note等）
5. 💬 その他話題のニュース — 上記に分類されないAI関連の重要ニュース

【出力1: Slack投稿テキスト（各カテゴリ上位2件）】
<SLACK>
📰 *今日のAIニュース*
${dateStr}（${dayOfWeek}）

{カテゴリ名}
• {記事タイトル — 日本語（短く簡潔に）}
  <{記事URL}|{ソースドメイン名}> {英語記事の場合: ｜ <{Google翻訳URL}|日本語で読む>}

（各カテゴリ2件ずつ。カテゴリ間に --- 区切り線は入れない）
（各カテゴリの最後に以下を追加）
＋ <${moreUrl}#{カテゴリキー}|もっと見る>
</SLACK>

【出力2: 全記事JSON（各カテゴリ最大10件）】
<ARTICLES_JSON>
{
  "x_trending": [{"title": "...", "url": "...", "source": "...", "lang": "en", "summary": "2〜3文の日本語要約"}],
  "anthropic": [...],
  "model_tech": [...],
  "blog_ja": [...],
  "other": [...]
}
</ARTICLES_JSON>

【カテゴリキーの対応】
- 🔥 Xで話題 → x_trending
- 🟠 Anthropic → anthropic
- 🧠 モデル・技術 → model_tech
- 📝 ブログ記事 → blog_ja
- 💬 その他話題のニュース → other

【選定基準】
- 各カテゴリ内で最もインパクトの大きい順に並べる
- Slack投稿には各カテゴリ上位2件のみ
- JSONには最大10件（ブログ記事カテゴリは下記の「ブログ記事リスト」の全件をそのまま使う）
- 記事タイトルは日本語に翻訳する（英語のままにしない）
- Slack投稿テキストには要約は不要。タイトルとリンクのみ出力する
- 全記事JSONには各記事に2〜3文の日本語要約（summary）を必ず含める
- タイトルは短く簡潔にする（1行に収まる長さ）
- 📝 ブログ記事カテゴリは「ブログ記事リスト」からのみ選定する。ニュース記事リストの記事をブログ記事カテゴリに入れないこと
- 該当する記事がないカテゴリはスキップしてよい
- 英語記事のGoogle翻訳URLは https://translate.google.com/translate?sl=en&tl=ja&u={元のURL} の形式で生成する

【ニュース記事リスト（🔥 Xで話題・🟠 Anthropic・🧠 モデル・技術・💬 その他 の4カテゴリに分類）】
${articleList}

【ブログ記事リスト（📝 ブログ記事カテゴリに全件使用）】
${blogList || '（ブログ記事なし）'}`;
}

export function extractJson(raw: string): string {
  // ```json ... ``` で囲まれている場合を除去
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return cleaned;
}

export function parseResponse(text: string): SummaryResult {
  const slackMatch = text.match(/<SLACK>([\s\S]*?)<\/SLACK>/);
  const jsonMatch = text.match(/<ARTICLES_JSON>([\s\S]*?)<\/ARTICLES_JSON>/);

  const slackText = slackMatch ? slackMatch[1].trim() : text;

  let allArticles: CategorizedArticles = {};
  if (jsonMatch) {
    try {
      allArticles = JSON.parse(extractJson(jsonMatch[1]));
    } catch (e) {
      console.warn('[Claude] 全記事JSONのパースに失敗。Webビュー生成をスキップします');
      console.warn('[Claude] JSON内容:', jsonMatch[1].slice(0, 200));
    }
  } else {
    console.warn('[Claude] ARTICLES_JSONタグが見つかりません');
    console.warn('[Claude] レスポンス末尾:', text.slice(-300));
  }

  return { slackText, allArticles };
}

export async function summarizeArticles(
  articles: Article[],
  config: Config,
  blogArticles?: Article[]
): Promise<SummaryResult> {
  const client = new Anthropic({ apiKey: config.anthropic.apiKey });

  const { dateStr } = todayWithDayJST();
  const moreUrl = `${config.pagesBaseUrl}/daily/${dateStr}/`;

  const prompt = buildPrompt(articles, moreUrl, blogArticles);

  console.log(`[Claude] ${articles.length}件の記事を要約中...`);

  const message = await withRetry(
    () =>
      client.messages.create({
        model: config.anthropic.model,
        max_tokens: 32768,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    'Claude API'
  );

  console.log(`[Claude] stop_reason: ${message.stop_reason}, output tokens: ${message.usage.output_tokens}`);

  if (message.stop_reason === 'max_tokens') {
    console.warn('[Claude] ⚠️ max_tokensに到達しました。出力が途中で切れている可能性があります');
  }

  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude APIからテキスト応答を取得できませんでした');
  }

  console.log('[Claude] 要約完了');
  return parseResponse(textBlock.text);
}
