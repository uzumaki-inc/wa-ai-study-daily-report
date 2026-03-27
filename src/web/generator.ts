import fs from 'fs';
import path from 'path';
import { CategorizedArticles, CategoryArticle } from '../summarizer/claude';

const CATEGORY_META: { key: string; emoji: string; label: string }[] = [
  { key: 'x_trending', emoji: '🔥', label: 'Xで話題' },
  { key: 'anthropic', emoji: '🟠', label: 'Anthropic' },
  { key: 'model_tech', emoji: '🧠', label: 'モデル・技術' },
  { key: 'blog_ja', emoji: '📝', label: 'ブログ記事' },
  { key: 'other', emoji: '💬', label: 'その他話題のニュース' },
];

function safeUrl(url: string): string {
  return /^https?:\/\//.test(url) ? escapeHtml(url) : '#';
}

function articleToHtml(article: CategoryArticle): string {
  const url = safeUrl(article.url);
  const translateLink =
    article.lang === 'en'
      ? ` <a href="${safeUrl(`https://translate.google.com/translate?sl=en&tl=ja&u=${encodeURIComponent(article.url)}`)}">日本語で読む</a>`
      : '';
  return `<li>
  <a href="${url}" target="_blank">${escapeHtml(article.title)}</a>
  <span class="source">${escapeHtml(article.source)}${translateLink}</span>
</li>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildHtml(dateStr: string, articles: CategorizedArticles): string {
  const sections = CATEGORY_META
    .filter((cat) => articles[cat.key]?.length > 0)
    .map((cat) => {
      const items = articles[cat.key].map(articleToHtml).join('\n');
      return `<section id="${cat.key}">
  <h2>${cat.emoji} ${cat.label}</h2>
  <ul>${items}</ul>
</section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AIニュース ${dateStr}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background: #f8f9fa; color: #333; }
  h1 { font-size: 1.4em; border-bottom: 2px solid #333; padding-bottom: 8px; }
  h2 { font-size: 1.1em; margin-top: 24px; }
  ul { list-style: none; padding: 0; }
  li { margin-bottom: 12px; line-height: 1.5; }
  li a { color: #1a73e8; text-decoration: none; font-weight: 500; }
  li a:hover { text-decoration: underline; }
  .source { display: block; font-size: 0.85em; color: #666; margin-top: 2px; }
  .source a { color: #666; }
  footer { margin-top: 32px; font-size: 0.8em; color: #999; border-top: 1px solid #ddd; padding-top: 12px; }
</style>
</head>
<body>
<h1>📰 AIニュース ${dateStr}</h1>
${sections}
<footer>Powered by Claude API</footer>
</body>
</html>`;
}

export function generateWebView(
  dateStr: string,
  articles: CategorizedArticles
): string | null {
  if (Object.keys(articles).length === 0) {
    console.log('[Web] 全記事データがないため、Webビュー生成をスキップ');
    return null;
  }

  const outDir = path.join(process.cwd(), 'docs', 'daily', dateStr);
  fs.mkdirSync(outDir, { recursive: true });

  const html = buildHtml(dateStr, articles);
  const outPath = path.join(outDir, 'index.html');
  fs.writeFileSync(outPath, html, 'utf-8');

  console.log(`[Web] Webビューを生成: ${outPath}`);
  return outPath;
}
