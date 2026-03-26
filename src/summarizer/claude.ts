import Anthropic from '@anthropic-ai/sdk';
import { Article } from '../types';
import { Config } from '../config';

function buildPrompt(articles: Article[]): string {
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
以下の記事リストを読んで、5つのカテゴリに分類し、各カテゴリから上位2件を選んで日本語の日報を作成してください。

【カテゴリ（この順序で出力）】
1. 🔥 Xで話題 — SNS（特にX）でバズっているAI関連トピック
2. 🟠 Anthropic — Anthropic社に関するニュース（製品・訴訟・研究）
3. 🧠 モデル・技術 — 新モデルリリース、技術的ブレイクスルー
4. 📝 ブログ記事 — 日本語の技術ブログ記事（Zenn, Qiita等）
5. 💬 その他話題のニュース — 上記に分類されないAI関連の重要ニュース

【出力フォーマット（Slack mrkdwn形式）】
📰 *今日のAIニュース*
${dateStr}（${dayOfWeek}）

{カテゴリ名}
• {記事タイトル — 日本語（短く簡潔に）}
  <{記事URL}|{ソースドメイン名}> {英語記事の場合: ｜ <{Google翻訳URL}|日本語で読む>}

（各カテゴリについて繰り返し。カテゴリ間に --- 区切り線は入れない）

【選定基準】
- 各カテゴリ内で最もインパクトの大きい2件を選ぶ
- 記事タイトルは日本語に翻訳する（英語のままにしない）
- 要約は不要。タイトルとリンクのみ出力する
- タイトルは短く簡潔にする（1行に収まる長さ）
- ブログ記事カテゴリは日本語ソースのみから選定する
- 該当する記事がないカテゴリはスキップしてよい
- 英語記事のGoogle翻訳URLは https://translate.google.com/translate?sl=en&tl=ja&u={元のURL} の形式で生成する

【記事リスト】
${articleList}`;
}

export async function summarizeArticles(
  articles: Article[],
  config: Config
): Promise<string> {
  const client = new Anthropic({ apiKey: config.anthropic.apiKey });
  const prompt = buildPrompt(articles);

  console.log(`[Claude] ${articles.length}件の記事を要約中...`);

  const message = await client.messages.create({
    model: config.anthropic.model,
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude APIからテキスト応答を取得できませんでした');
  }

  console.log('[Claude] 要約完了');
  return textBlock.text;
}
