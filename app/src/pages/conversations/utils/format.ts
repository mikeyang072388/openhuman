export function formatRelativeTime(dateStr: string, t: (key: string) => string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  if (diffMs < 60_000) return t('timeFormat.justNow');
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return t('timeFormat.minAgo').replace('{n}', String(mins));
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('timeFormat.hrAgo').replace('{n}', String(hours));
  const days = Math.floor(hours / 24);
  return t('timeFormat.dayAgo').replace('{n}', String(days));
}

export function getInlineCompletionSuffix(input: string, suggestion: string): string {
  if (!input || !suggestion) return '';
  const normalize = (value: string) =>
    value
      .replace(/\u2192/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const normalizedInput = normalize(input);
  const normalizedSuggestion = normalize(suggestion);
  if (!normalizedSuggestion) return '';

  if (normalizedSuggestion.startsWith(normalizedInput)) {
    return normalizedSuggestion.slice(normalizedInput.length).trimStart();
  }

  const maxOverlap = Math.min(normalizedInput.length, normalizedSuggestion.length, 120);
  for (let overlap = maxOverlap; overlap >= 1; overlap -= 1) {
    if (
      normalizedInput.slice(normalizedInput.length - overlap) ===
      normalizedSuggestion.slice(0, overlap)
    ) {
      return normalizedSuggestion.slice(overlap).trimStart();
    }
  }

  if (normalizedInput.endsWith(normalizedSuggestion)) {
    return '';
  }
  return normalizedSuggestion;
}

export function buildAcceptedInlineCompletion(input: string, suffix: string): string {
  const normalizedInput = input.replace(/\u2192/g, ' ').replace(/\t+/g, ' ');
  const cleanSuffix = suffix
    .replace(/\u2192/g, ' ')
    .replace(/\t+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanSuffix) return normalizedInput;

  const needsSpace =
    normalizedInput.length > 0 && !/\s$/.test(normalizedInput) && !/^[,.;:!?)]/.test(cleanSuffix);

  return `${normalizedInput}${needsSpace ? ' ' : ''}${cleanSuffix}`;
}

export function isAllowedExternalHref(rawHref: string): boolean {
  try {
    const url = new URL(rawHref);
    return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:';
  } catch {
    return false;
  }
}

/**
 * Custom inline tag the welcome agent (and any future agent) can drop
 * inside a chat bubble to render an in-app navigation pill, e.g.
 *
 *     <openhuman-link path="settings/notifications">Allow notifications</openhuman-link>
 *
 * The conversation UI (`AgentMessageBubble`) parses these out of the
 * raw text, splitting the message into ordered text/link segments.
 * Text segments still render through Markdown; link segments render as
 * a clickable pill that calls `react-router`'s navigate(`/${path}`) on
 * click — no deep-link round-trip, no host browser involvement.
 *
 * Path is the hash route under HashRouter (e.g. `settings/notifications`
 * → `#/settings/notifications`). Leading/trailing slashes are tolerated.
 */
export interface OpenhumanLinkSegment {
  kind: 'link';
  path: string;
  label: string;
}

export interface TextSegment {
  kind: 'text';
  text: string;
}

export type BubbleSegment = TextSegment | OpenhumanLinkSegment;

const OPENHUMAN_LINK_RE =
  /<openhuman-link\s+path=(?:"([^"]+)"|'([^']+)')\s*>([\s\S]*?)<\/openhuman-link>/gi;

export function parseBubbleSegments(content: string): BubbleSegment[] {
  if (!content || !content.includes('<openhuman-link')) {
    return [{ kind: 'text', text: content }];
  }
  const segments: BubbleSegment[] = [];
  let cursor = 0;
  // Reset regex state between calls (the global flag preserves lastIndex).
  OPENHUMAN_LINK_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = OPENHUMAN_LINK_RE.exec(content)) !== null) {
    if (match.index > cursor) {
      segments.push({ kind: 'text', text: content.slice(cursor, match.index) });
    }
    const path = (match[1] ?? match[2] ?? '').trim().replace(/^\/+/, '').replace(/\/+$/, '');
    const label = (match[3] ?? '').trim();
    if (path && label) {
      segments.push({ kind: 'link', path, label });
    }
    cursor = match.index + match[0].length;
  }
  if (cursor < content.length) {
    segments.push({ kind: 'text', text: content.slice(cursor) });
  }
  return segments;
}

export type AgentBubblePosition = 'single' | 'first' | 'middle' | 'last';

export function getAgentBubbleChrome(position: AgentBubblePosition): string {
  if (position === 'single') return 'rounded-2xl rounded-bl-md';
  if (position === 'first') return 'rounded-2xl rounded-bl-lg';
  if (position === 'middle') return 'rounded-2xl rounded-tl-md rounded-bl-lg';
  return 'rounded-2xl rounded-tl-md rounded-bl-md';
}

export function formatResetTime(isoStr: string, t: (key: string) => string): string {
  const ms = new Date(isoStr).getTime() - Date.now();
  if (ms <= 0) return t('timeFormat.now');
  const mins = Math.ceil(ms / 60_000);
  if (mins < 60) return t('timeFormat.inMinutes').replace('{n}', String(mins));
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours < 24)
    return remMins > 0
      ? t('timeFormat.inHoursMinutes').replace('{n}', String(hours)).replace('{m}', String(remMins))
      : t('timeFormat.inHours').replace('{n}', String(hours));
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0
    ? t('timeFormat.inDaysHours').replace('{n}', String(days)).replace('{h}', String(remHours))
    : t('timeFormat.inDays').replace('{n}', String(days));
}
