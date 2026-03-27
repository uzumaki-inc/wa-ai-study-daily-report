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
