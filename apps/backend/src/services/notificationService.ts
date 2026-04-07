import nodemailer from 'nodemailer';
import { config } from '../config.js';
import { logger } from '../logger.js';

export interface NotificationPayload {
  alertId: string;
  message: string;
  severity: string;
  hostName: string;
  triggerName: string;
  timestamp: string;
}

export interface ChannelConfig {
  type: 'email' | 'webhook' | 'slack' | 'discord';
  config: Record<string, unknown>;
}

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: config.smtp.user
    ? {
        user: config.smtp.user,
        pass: config.smtp.pass,
      }
    : undefined,
});

export async function sendNotification(
  channel: ChannelConfig,
  payload: NotificationPayload,
): Promise<{ success: boolean; error?: string }> {
  try {
    switch (channel.type) {
      case 'email':
        await sendEmail(channel.config, payload);
        break;
      case 'webhook':
        await sendWebhook(channel.config, payload);
        break;
      case 'slack':
        await sendSlack(channel.config, payload);
        break;
      case 'discord':
        await sendDiscord(channel.config, payload);
        break;
      default:
        throw new Error(`Unknown channel type: ${channel.type}`);
    }
    return { success: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error(`Notification failed for channel ${channel.type}`, err);
    return { success: false, error };
  }
}

async function sendEmail(cfg: Record<string, unknown>, payload: NotificationPayload) {
  const to = cfg['to'] as string;
  const subject = `[${payload.severity}] Alert: ${payload.triggerName} on ${payload.hostName}`;
  const html = `
    <h2>Alert: ${payload.triggerName}</h2>
    <p><strong>Host:</strong> ${payload.hostName}</p>
    <p><strong>Severity:</strong> ${payload.severity}</p>
    <p><strong>Message:</strong> ${payload.message}</p>
    <p><strong>Time:</strong> ${payload.timestamp}</p>
  `;

  await transporter.sendMail({
    from: config.smtp.from,
    to,
    subject,
    html,
  });
}

async function sendWebhook(cfg: Record<string, unknown>, payload: NotificationPayload) {
  const url = cfg['url'] as string;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Webhook returned ${response.status}`);
  }
}

async function sendSlack(cfg: Record<string, unknown>, payload: NotificationPayload) {
  const webhookUrl = cfg['webhookUrl'] as string;
  const severityEmoji: Record<string, string> = {
    INFO: 'ℹ️',
    WARNING: '⚠️',
    HIGH: '🔴',
    DISASTER: '🚨',
  };

  const emoji = severityEmoji[payload.severity] ?? '⚠️';

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `${emoji} *Alert: ${payload.triggerName}*`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${emoji} *Alert: ${payload.triggerName}*\n*Host:* ${payload.hostName}\n*Severity:* ${payload.severity}\n*Message:* ${payload.message}`,
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Slack webhook returned ${response.status}`);
  }
}

async function sendDiscord(cfg: Record<string, unknown>, payload: NotificationPayload) {
  const webhookUrl = cfg['webhookUrl'] as string;
  const colorMap: Record<string, number> = {
    INFO: 0x5865f2,
    WARNING: 0xfee75c,
    HIGH: 0xed4245,
    DISASTER: 0xed4245,
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [
        {
          title: `Alert: ${payload.triggerName}`,
          description: payload.message,
          color: colorMap[payload.severity] ?? 0xfee75c,
          fields: [
            { name: 'Host', value: payload.hostName, inline: true },
            { name: 'Severity', value: payload.severity, inline: true },
            { name: 'Time', value: payload.timestamp, inline: false },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Discord webhook returned ${response.status}`);
  }
}
