import Anthropic from '@anthropic-ai/sdk';
import { Article } from '../types';
import { Config } from '../config';
import { withRetry } from '../utils/retry';

export type CategoryArticle = {
  title: string;
  url: string;
  source: string;
  lang: 'en' | 'ja';
};

export type CategorizedArticles = {
  [key: string]: CategoryArticle[];
};

export type SummaryResult = {
  slackText: string;
  allArticles: CategorizedArticles;
};

function buildPrompt(articles: Article[], moreUrl: string): string {
  const today = new Date();
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const dayOfWeek = days[today.getDay()];

  const articleList = articles
    .map(
      (a, i) =>
        `${i + 1}. [${a.lang}] ${a.title}\n   URL: ${a.url}\n   Source: ${a.source}\n   Summary: ${a.summary.slice(0, 200)}`
    )
    .join('\n\n');

  return `あなたはAI・テクノロジー分野の専門ニュースキュレーターです。
以下の記事リストを読んで、5つのカテゴリに分類し、2つの出力を生成してください。

【カテゴリ（この順序で出力）】
1. 🔥 Xで話題 — SNS（特にX）でバズっているAI関連トピック
2. 🟠 Anthropic — Anthropic社に関するニュース（製品・訴訟・研究）
3. 🧠 モデル・技術 — 新モデルリリース、技術的ブレイクスルー
4. 📝 ブログ記事 — 日本語の技術ブログ記事（Zenn, Qiita等）
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
  "x_trending": [{"title": "...", "url": "...", "source": "...", "lang": "en"}],
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
- Slack投稿には各カテゴリ上位2件のみ、JSONには最大10件
- 記事タイトルは日本語に翻訳する（英語のままにしない）
- 要約は不要。タイトルとリンクのみ出力する
- タイトルは短く簡潔にする（1行に収まる長さ）
- ブログ記事カテゴリは日本語ソースのみから選定する
- 該当する記事がないカテゴリはスキップしてよい
- 英語記事のGoogle翻訳URLは https://translate.google.com/translate?sl=en&tl=ja&u={元のURL} の形式で生成する

【記事リスト】
${articleList}`;
}

function extractJson(raw: string): string {
  // ```json ... ``` で囲まれている場合を除去
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return cleaned;
}

function parseResponse(text: string): SummaryResult {
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
  }

  return { slackText, allArticles };
}

export async function summarizeArticles(
  articles: Article[],
  config: Config
): Promise<SummaryResult> {
  const client = new Anthropic({ apiKey: config.anthropic.apiKey });

  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const moreUrl = `${config.pagesBaseUrl}/daily/${dateStr}/`;

  const prompt = buildPrompt(articles, moreUrl);

  console.log(`[Claude] ${articles.length}件の記事を要約中...`);

  const message = await withRetry(
    () =>
      client.messages.create({
        model: config.anthropic.model,
        max_tokens: 8192,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    'Claude API'
  );

  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude APIからテキスト応答を取得できませんでした');
  }

  console.log('[Claude] 要約完了');
  return parseResponse(textBlock.text);
}
