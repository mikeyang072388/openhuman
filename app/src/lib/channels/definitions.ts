import type { ChannelConnectionStatus, ChannelDefinition } from '../../types/channels';

/** Status badge styles for channel connection states. The label field now holds a translation key resolved at the UI layer. */
export const STATUS_STYLES: Record<ChannelConnectionStatus, { label: string; className: string }> =
  {
    connected: {
      label: 'channels.status.connected',
      className: 'bg-sage-500/10 text-sage-700 border-sage-500/30',
    },
    connecting: {
      label: 'channels.status.connecting',
      className: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
    },
    disconnected: {
      label: 'channels.status.disconnected',
      className: 'bg-stone-100 text-stone-500 border-stone-200',
    },
    error: {
      label: 'channels.status.error',
      className: 'bg-coral-500/10 text-coral-700 border-coral-500/30',
    },
  };

/** Human-readable labels for auth modes. Values are translation keys resolved at the UI layer. */
export const AUTH_MODE_LABELS: Record<string, string> = {
  managed_dm: 'channels.authMode.managedDm',
  oauth: 'channels.authMode.oauth',
  bot_token: 'channels.authMode.botToken',
  api_key: 'channels.authMode.apiKey',
};

/** Fallback definitions used when the core sidecar is unreachable. Labels, descriptions and placeholders are translation keys; display_name values are proper names kept as-is. */
export const FALLBACK_DEFINITIONS: ChannelDefinition[] = [
  {
    id: 'telegram',
    display_name: 'Telegram',
    description: 'channels.telegram.desc',
    icon: 'telegram',
    auth_modes: [
      {
        mode: 'managed_dm',
        description: 'channels.telegram.managedDmDesc',
        fields: [],
        auth_action: 'telegram_managed_dm',
      },
      {
        mode: 'bot_token',
        description: 'channels.telegram.botTokenDesc',
        fields: [
          {
            key: 'bot_token',
            label: 'channels.telegram.botTokenLabel',
            field_type: 'secret',
            required: true,
            placeholder: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
          },
          {
            key: 'allowed_users',
            label: 'channels.telegram.allowedUsersLabel',
            field_type: 'string',
            required: false,
            placeholder: 'Comma-separated Telegram usernames',
          },
        ],
        auth_action: undefined,
      },
    ],
    capabilities: ['send_text', 'receive_text', 'typing', 'draft_updates'],
  },
  {
    id: 'discord',
    display_name: 'Discord',
    description: 'channels.discord.desc',
    icon: 'discord',
    auth_modes: [
      {
        mode: 'bot_token',
        description: 'channels.discord.botTokenDesc',
        fields: [
          {
            key: 'bot_token',
            label: 'channels.discord.botTokenLabel',
            field_type: 'secret',
            required: true,
            placeholder: 'Your Discord bot token',
          },
          {
            key: 'guild_id',
            label: 'channels.discord.guildIdLabel',
            field_type: 'string',
            required: false,
            placeholder: 'Optional: restrict to a specific server',
          },
        ],
        auth_action: undefined,
      },
      {
        mode: 'oauth',
        description: 'channels.discord.oauthDesc',
        fields: [],
        auth_action: 'discord_oauth',
      },
      {
        mode: 'managed_dm',
        description: 'channels.discord.managedDmDesc',
        fields: [],
        auth_action: 'discord_managed_link',
      },
    ],
    capabilities: ['send_text', 'receive_text', 'typing', 'threaded_replies'],
  },
  {
    id: 'web',
    display_name: 'Web',
    description: 'channels.web.desc',
    icon: 'web',
    auth_modes: [
      {
        mode: 'managed_dm',
        description: 'channels.web.managedDmDesc',
        fields: [],
        auth_action: undefined,
      },
    ],
    capabilities: ['send_text', 'send_rich_text', 'receive_text'],
  },
];
