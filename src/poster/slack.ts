import fs from 'fs';
import path from 'path';
import { IncomingWebhook } from '@slack/webhook';
import { SectionBlock, ContextBlock, KnownBlock } from '@slack/types';
import { withRetry } from '../utils/retry';

type SlackConfig = {
  slack: { webhookUrl: string; channel: string };
};

export async function postToSlack(
  summaryText: string,
  config: SlackConfig
): Promise<void> {
  const webhook = new IncomingWebhook(config.slack.webhookUrl, {
    channel: config.slack.channel || undefined,
    username: 'AI News Bot',
    icon_emoji: ':newspaper:',
  });

  // Slack Block Kit limits section text to 3000 chars
  // Split into multiple sections if needed
  const sections = splitText(summaryText, 3000);

  const sectionBlocks: SectionBlock[] = sections.map((text) => ({
    type: 'section' as const,
    text: {
      type: 'mrkdwn' as const,
      text,
    },
  }));

  const context: ContextBlock = {
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: '毎朝9時自動投稿 | Powered by Claude API',
      },
    ],
  };

  const blocks: KnownBlock[] = [...sectionBlocks, context];

  console.log('[Slack] 投稿中...');

  try {
    await withRetry(() => webhook.send({ blocks }), 'Slack投稿');
  } catch (error) {
    const logPath = path.join(process.cwd(), `slack-failed-${Date.now()}.log`);
    fs.writeFileSync(logPath, summaryText, 'utf-8');
    console.error(`[Slack] 投稿失敗。要約テキストを保存: ${logPath}`);
    throw error;
  }

  console.log('[Slack] 投稿完了');
}

export function splitText(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];

  const parts: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      parts.push(remaining);
      break;
    }

    // Find a good split point (newline near the limit)
    let splitIndex = remaining.lastIndexOf('\n', maxLength);
    if (splitIndex === -1 || splitIndex < maxLength * 0.5) {
      splitIndex = maxLength;
    }

    parts.push(remaining.slice(0, splitIndex));
    remaining = remaining.slice(splitIndex).trimStart();
  }

  return parts;
}
