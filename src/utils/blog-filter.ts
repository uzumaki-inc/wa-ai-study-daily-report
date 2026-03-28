import { Article } from '../types';

const AI_KEYWORDS = [
  'ai', 'AI', 'ＡＩ',
  '人工知能', '機械学習', 'ディープラーニング', '深層学習',
  'LLM', 'GPT', 'Claude', 'Gemini', 'ChatGPT', 'Copilot',
  'プロンプト', 'ファインチューニング', 'RAG',
  'エージェント', 'agent',
  '生成AI', '生成ＡＩ',
  'OpenAI', 'Anthropic', 'Google AI',
  'Stable Diffusion', 'Midjourney',
  'transformer', 'ニューラル',
];

function isAiRelated(article: Article): boolean {
  const text = `${article.title} ${article.summary}`.toLowerCase();
  return AI_KEYWORDS.some((kw) => text.includes(kw.toLowerCase()));
}

export type BlogArticles = {
  hatena: Article[];
  zenn: Article[];
  note: Article[];
};

export function extractBlogArticles(
  articles: Article[]
): { blogArticles: BlogArticles; newsArticles: Article[] } {
  const hatena: Article[] = [];
  const zenn: Article[] = [];
  const note: Article[] = [];
  const newsArticles: Article[] = [];

  for (const article of articles) {
    switch (article.feedCategory) {
      case 'blog_hatena':
        hatena.push(article);
        break;
      case 'blog_zenn':
        zenn.push(article);
        break;
      case 'blog_note':
        if (isAiRelated(article)) {
          note.push(article);
        }
        break;
      default:
        newsArticles.push(article);
        break;
    }
  }

  // 件数制限: はてぶ6件・Zenn4件・note5件
  const blogArticles: BlogArticles = {
    hatena: hatena.slice(0, 6),
    zenn: zenn.slice(0, 4),
    note: note.slice(0, 5),
  };

  const totalBlog = blogArticles.hatena.length + blogArticles.zenn.length + blogArticles.note.length;
  console.log(
    `[Blog] ブログ記事: はてぶ${blogArticles.hatena.length}件, Zenn${blogArticles.zenn.length}件, note${blogArticles.note.length}件 (計${totalBlog}件)`
  );

  return { blogArticles, newsArticles };
}

export function blogArticlesToList(blog: BlogArticles): Article[] {
  return [...blog.hatena, ...blog.zenn, ...blog.note];
}
