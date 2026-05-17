/**
 * Modal popped open when an `<openhuman-link path="...">` pill is clicked
 * inside an agent message bubble.
 *
 * The pill dispatches a `window` `CustomEvent('openhuman-link', { detail: { path } })`;
 * this component listens for it, opens the modal, and routes to a focused
 * mini-flow per path. Keeps the chat in view (no react-router navigation)
 * so the user can complete the action and return to the agent without
 * losing the conversation.
 *
 * Mounted once at AppShell root.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useChannelDefinitions } from '../hooks/useChannelDefinitions';
import { useT } from '../lib/i18n/I18nContext';
import {
  ensureNotificationPermission,
  getNotificationPermissionState,
  type NotificationPermissionState,
  showNativeNotification,
} from '../lib/nativeNotifications/tauriBridge';
import { isTauri, purgeWebviewAccount } from '../services/webviewAccountService';
import { addAccount, removeAccount, setActiveAccount } from '../store/accountsSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  type Account,
  type AccountProvider,
  type AccountStatus,
  PROVIDERS,
} from '../types/accounts';
import { BILLING_DASHBOARD_URL } from '../utils/links';
import { openUrl } from '../utils/openUrl';
import { ProviderIcon } from './accounts/providerIcons';
import ChannelSetupModal from './channels/ChannelSetupModal';

interface OpenhumanLinkEvent {
  path: string;
}

export const OPENHUMAN_LINK_EVENT = 'openhuman-link';

const OpenhumanLinkModal = () => {
  const { t } = useT();
  const [activePath, setActivePath] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<OpenhumanLinkEvent>).detail;
      if (detail?.path) setActivePath(detail.path);
    };
    window.addEventListener(OPENHUMAN_LINK_EVENT, handler);
    return () => window.removeEventListener(OPENHUMAN_LINK_EVENT, handler);
  }, []);

  const close = useCallback(() => setActivePath(null), []);

  if (!activePath) return null;

  // Telegram (and any future channel) gets the dedicated `ChannelSetupModal`
  // already used by Skills + Settings instead of a bespoke body wrapper.
  // It manages its own portal + backdrop, so render it standalone.
  if (activePath === 'settings/messaging') {
    return <MessagingSetupBridge onClose={close} />;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={close}
      role="dialog"
      aria-modal="true">
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-stone-900">{titleForPath(activePath, t)}</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="rounded p-1 text-stone-500 hover:bg-stone-100 hover:text-stone-800">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 6l12 12M6 18L18 6"
              />
            </svg>
          </button>
        </div>
        <div className="p-5">{renderBody(activePath, close, t)}</div>
      </div>
    </div>
  );
};

/**
 * Resolves the Telegram channel definition and hands it to the shared
 * `ChannelSetupModal` (same component the Settings → Messaging panel
 * uses). When definitions are still loading we render a tiny placeholder
 * so the user gets feedback instead of a flashing screen.
 */
const MessagingSetupBridge = ({ onClose }: { onClose: () => void }) => {
  const { t } = useT();
  const { definitions, loading } = useChannelDefinitions();
  const telegram = useMemo(() => definitions.find(d => d.id === 'telegram') ?? null, [definitions]);

  if (loading && !telegram) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="rounded-2xl bg-white px-6 py-4 text-sm text-stone-600 shadow-xl">
          {t('linkModal.loadingChannelSetup')}
        </div>
      </div>
    );
  }

  if (!telegram) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        onClick={onClose}>
        <div
          className="rounded-2xl bg-white p-6 text-sm text-stone-700 shadow-xl max-w-sm"
          onClick={e => e.stopPropagation()}>
          <p>
            {t('linkModal.telegramNotAvailable')}
          </p>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50">
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <ChannelSetupModal definition={telegram} onClose={onClose} />;
};

function titleForPath(path: string, t: (key: string) => string): string {
  switch (path) {
    case 'settings/notifications':
      return t('linkModal.title.allowNotifications');
    case 'settings/billing':
      return t('linkModal.title.billingCredits');
    case 'settings/messaging':
      return t('linkModal.title.connectChatChannel');
    case 'community/discord':
      return t('linkModal.title.joinCommunity');
    case 'accounts/setup':
      return t('linkModal.title.connectYourApps');
    default:
      return t('linkModal.title.settings');
  }
}

function renderBody(path: string, close: () => void, t: (key: string) => string) {
  switch (path) {
    case 'settings/notifications':
      return <NotificationsBody close={close} />;
    case 'settings/billing':
      return <BillingBody close={close} />;
    case 'settings/messaging':
      // Routed via the dedicated `MessagingSetupBridge` above; this case
      // is kept to satisfy the path-completeness check but is unreachable
      // because the parent component returns the bridge before calling
      // `renderBody`.
      return null;
    case 'community/discord':
      return <DiscordBody close={close} />;
    case 'accounts/setup':
      return <AccountsSetupBody close={close} />;
    default:
      return (
        <div className="space-y-3 text-sm text-stone-700">
          <p>
            {t('linkModal.settingNotReady')}
          </p>
          <DoneFooter close={close} t={t} />
        </div>
      );
  }
}

// ── Notifications ────────────────────────────────────────────────────────

const NotificationsBody = ({ close }: { close: () => void }) => {
  const { t } = useT();
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>('unknown');

  useEffect(() => {
    let mounted = true;
    void getNotificationPermissionState({ requestIfNeeded: false }).then(next => {
      if (!mounted) return;
      setPermissionState(next);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleAllow = async () => {
    if (status === 'sending') {
      return;
    }

    setStatus('sending');
    setError(null);
    try {
      if (!isTauri()) {
        setStatus('error');
        setError(
          t('linkModal.notifications.desktopOnly')
        );
        return;
      }

      const granted = await ensureNotificationPermission();
      if (!granted) {
        const nextState = await getNotificationPermissionState({ requestIfNeeded: false });
        setPermissionState(nextState);
        setStatus('error');
        setError(
          t('linkModal.notifications.permissionOff')
        );
        return;
      }
      const sendResult = await showNativeNotification({
        title: t('linkModal.notifications.testTitle'),
        body: t('linkModal.notifications.testBody'),
        tag: 'welcome-notification-test',
      });
      if (!sendResult.delivered) {
        setStatus('error');
        setError(
          sendResult.error ??
            t('linkModal.notifications.couldNotTrigger')
        );
        return;
      }
      setPermissionState('granted');
      setStatus('sent');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="space-y-4 text-sm text-stone-700">
      <p>
        {t('linkModal.notifications.description')}
      </p>
      {permissionState === 'denied' && (
        <div className="rounded-xl border border-coral-200 bg-coral-50 p-3 text-xs text-coral-700">
          {t('linkModal.notifications.blocked')}
          <br />
          {t('linkModal.notifications.blockedStep1')}
          <br />
          {t('linkModal.notifications.blockedStep2')}
          <br />
          {t('linkModal.notifications.blockedStep3')}
        </div>
      )}
      {(permissionState === 'prompt' || permissionState === 'unknown') && (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-700">
          {t('linkModal.notifications.firstStep')}
        </div>
      )}
      <button
        type="button"
        onClick={() => void handleAllow()}
        disabled={status === 'sending'}
        className="w-full rounded-xl bg-primary-500 text-white text-sm font-medium py-2.5 hover:bg-primary-600 transition-colors disabled:opacity-60">
        {status === 'sending'
          ? t('linkModal.notifications.askingOS')
          : status === 'error'
            ? t('linkModal.notifications.retryTest')
            : t('linkModal.notifications.sendTest')}
      </button>
      {status === 'sent' && (
        <p className="text-xs text-sage-700">
          {t('linkModal.notifications.testSent')}
        </p>
      )}
      {status === 'error' && <p className="text-xs text-coral-600">{t('linkModal.notifications.couldntSend').replace('{error}', error ?? '')}</p>}
      <DoneFooter close={close} t={t} />
    </div>
  );
};

// ── Billing ──────────────────────────────────────────────────────────────

const BillingBody = ({ close }: { close: () => void }) => {
  const { t } = useT();
  return (
    <div className="space-y-4 text-sm text-stone-700">
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
        <p className="text-xs uppercase tracking-wide text-stone-500">{t('linkModal.billing.trialCredit')}</p>
        <p className="mt-1 text-2xl font-semibold text-stone-900">$1.00</p>
        <p className="mt-1 text-xs text-stone-500">
          {t('linkModal.billing.trialDescription')}
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          void openUrl(BILLING_DASHBOARD_URL).catch(() => {});
        }}
        className="w-full rounded-xl bg-primary-500 text-white text-sm font-medium py-2.5 hover:bg-primary-600 transition-colors">
        {t('linkModal.billing.openDashboard')}
      </button>
      <DoneFooter close={close} skipLabel={t('linkModal.billing.stayOnTrial')} t={t} />
    </div>
  );
};

// ── Discord ──────────────────────────────────────────────────────────────

const DISCORD_INVITE_URL = 'https://discord.tinyhumans.ai/';

const DiscordBody = ({ close }: { close: () => void }) => {
  const { t } = useT();
  return (
    <div className="space-y-4 text-sm text-stone-700">
      <p>
        {t('linkModal.discord.description')}
      </p>
      <ul className="space-y-1.5 text-xs text-stone-600 pl-1">
        <li className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-400 flex-shrink-0" />
          {t('linkModal.discord.featureAccess')}
        </li>
        <li className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-400 flex-shrink-0" />
          {t('linkModal.discord.freeCredits')}
        </li>
        <li className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-400 flex-shrink-0" />
          {t('linkModal.discord.community')}
        </li>
        <li className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-400 flex-shrink-0" />
          {t('linkModal.discord.freeMerch')}
        </li>
      </ul>
      <button
        type="button"
        onClick={() => {
          void openUrl(DISCORD_INVITE_URL).catch(() => {});
        }}
        className="w-full rounded-xl bg-primary-500 text-white text-sm font-medium py-2.5 hover:bg-primary-600 transition-colors">
        {t('linkModal.discord.openInvite')}
      </button>
      <DoneFooter close={close} skipLabel={t('linkModal.discord.maybeLater')} t={t} />
    </div>
  );
};

// ── Accounts setup (multi-channel toggle list) ──────────────────────────

/**
 * Curated list of providers shown in the welcome flow's "Connect your apps"
 * step. Excludes call-only surfaces (`google-meet`, `zoom`) and dev-only
 * (`browserscan`) — those still appear in the full Add Account modal but
 * aren't a "set this up during onboarding" target.
 */
const ACCOUNTS_SETUP_PROVIDERS: readonly AccountProvider[] = [
  'whatsapp',
  'telegram',
  'slack',
  'discord',
  'linkedin',
];

function makeAccountId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  if (c && typeof c.getRandomValues === 'function') {
    const bytes = new Uint8Array(4);
    c.getRandomValues(bytes);
    const suffix = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return `acct-${Date.now().toString(36)}-${suffix}`;
  }
  return `acct-${Date.now().toString(36)}`;
}

const AccountsSetupBody = ({ close }: { close: () => void }) => {
  const { t } = useT();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const accountsById = useAppSelector(s => s.accounts.accounts);
  const order = useAppSelector(s => s.accounts.order);

  /** Status label + color for a given account lifecycle status. */
  function statusDisplay(status: AccountStatus): { label: string; dotClass: string } {
    switch (status) {
      case 'open':
        return { label: t('linkModal.accounts.status.connected'), dotClass: 'bg-emerald-500' };
      case 'loading':
        return { label: t('linkModal.accounts.status.loading'), dotClass: 'bg-amber-400' };
      case 'pending':
        return { label: t('linkModal.accounts.status.needsSignIn'), dotClass: 'bg-amber-400' };
      case 'timeout':
        return { label: t('linkModal.accounts.status.timedOut'), dotClass: 'bg-red-400' };
      case 'error':
        return { label: t('linkModal.accounts.status.error'), dotClass: 'bg-red-400' };
      case 'closed':
        return { label: t('linkModal.accounts.status.closed'), dotClass: 'bg-stone-300' };
    }
  }

  // Track accounts added during this modal session so "Done" can navigate.
  // Uses state (not ref) so the CTA label re-renders when toggles change.
  const [newlyAdded, setNewlyAdded] = useState<Map<string, string>>(new Map());

  // Map provider → first existing account (one provider, one row).
  const accountByProvider = useMemo(() => {
    const map = new Map<AccountProvider, Account>();
    for (const id of order) {
      const acct = accountsById[id];
      if (acct && !map.has(acct.provider)) map.set(acct.provider, acct);
    }
    return map;
  }, [accountsById, order]);

  const providerDescriptors = useMemo(
    () =>
      ACCOUNTS_SETUP_PROVIDERS.map(id => PROVIDERS.find(p => p.id === id)).filter(
        Boolean
      ) as typeof PROVIDERS,
    []
  );

  const handleToggle = (providerId: AccountProvider, label: string, currentlyOn: boolean) => {
    if (currentlyOn) {
      const existing = accountByProvider.get(providerId);
      if (!existing) return;
      void purgeWebviewAccount(existing.id).catch(() => {});
      setNewlyAdded(prev => {
        const next = new Map(prev);
        next.delete(existing.id);
        return next;
      });
      dispatch(removeAccount({ accountId: existing.id }));
      return;
    }
    const acct: Account = {
      id: makeAccountId(),
      provider: providerId,
      label,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    setNewlyAdded(prev => new Map(prev).set(acct.id, label));
    dispatch(addAccount(acct));
  };

  const handleDone = () => {
    close();
    // Navigate to /chat and activate the first newly-added account so its
    // WebviewHost mounts and the auth flow starts immediately.
    const firstNew = [...newlyAdded.keys()][0];
    if (firstNew) {
      dispatch(setActiveAccount(firstNew));
      navigate('/chat');
    }
  };

  // Dynamic CTA based on what's been toggled on
  const firstNewLabel = [...newlyAdded.values()][0];
  const doneLabel = firstNewLabel ? t('linkModal.accounts.continueWith').replace('{label}', firstNewLabel) : t('linkModal.accounts.done');

  return (
    <div className="space-y-4 text-sm text-stone-700">
      <p>
        {t('linkModal.accounts.description')}
      </p>
      <div className="space-y-2">
        {providerDescriptors.map(p => {
          const acct = accountByProvider.get(p.id);
          const on = !!acct;
          const status = acct?.status;
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-stone-100 bg-white p-3">
              <ProviderIcon provider={p.id} className="h-5 w-5 flex-none" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-stone-900">{p.label}</div>
                {on && status ? (
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${statusDisplay(status).dotClass}`}
                    />
                    <span className="text-xs text-stone-500">{statusDisplay(status).label}</span>
                  </div>
                ) : (
                  <p className="line-clamp-1 text-xs text-stone-500">{p.description}</p>
                )}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`${on ? t('linkModal.accounts.disconnect') : t('linkModal.accounts.connect')} ${p.label}`}
                onClick={() => handleToggle(p.id, p.label, on)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                  on ? 'bg-primary-500' : 'bg-stone-200'
                }`}>
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    on ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-stone-400">
        {t('linkModal.accounts.toggleHint')}
      </p>
      <DoneFooter close={close} onDone={handleDone} doneLabel={doneLabel} t={t} />
    </div>
  );
};

// ── Shared footer ────────────────────────────────────────────────────────

const DoneFooter = ({
  close,
  onDone,
  doneLabel,
  skipLabel,
  t,
}: {
  close: () => void;
  onDone?: () => void;
  doneLabel?: string;
  skipLabel?: string;
  t: (key: string) => string;
}) => (
  <div className="flex items-center justify-between gap-3 pt-1">
    <button
      type="button"
      onClick={close}
      className="text-xs font-medium text-stone-500 hover:text-stone-800">
      {skipLabel ?? t('linkModal.footer.skipForNow')}
    </button>
    <button
      type="button"
      onClick={onDone ?? close}
      className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50">
      {doneLabel ?? t('linkModal.footer.done')}
    </button>
  </div>
);

export default OpenhumanLinkModal;
