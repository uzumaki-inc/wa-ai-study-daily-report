export type Category =
  | 'x_trending'
  | 'anthropic'
  | 'model_tech'
  | 'blog_ja'
  | 'other';

export type Article = {
  title: string;
  url: string;
  summary: string;
  publishedAt: Date;
  source: string;
  lang: 'en' | 'ja';
  category?: Category;
};

export type CategoryConfig = {
  key: Category;
  emoji: string;
  label: string;
};

export const CATEGORIES: CategoryConfig[] = [
  { key: 'x_trending', emoji: '🔥', label: 'Xで話題' },
  { key: 'anthropic', emoji: '🟠', label: 'Anthropic' },
  { key: 'model_tech', emoji: '🧠', label: 'モデル・技術' },
  { key: 'blog_ja', emoji: '📝', label: 'ブログ記事' },
  { key: 'other', emoji: '💬', label: 'その他話題のニュース' },
];
