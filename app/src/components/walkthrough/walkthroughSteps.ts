import type { Step } from 'react-joyride';
import type { NavigateFunction } from 'react-router-dom';

import { TOUR_WELCOME_MESSAGE } from '../../constants/onboardingChat';
import { store } from '../../store';
import { addMessageLocal, createNewThread, setSelectedThread } from '../../store/threadSlice';
import type { ThreadMessage } from '../../types/thread';

/**
 * Polls via setTimeout until `[data-walkthrough="<selector>"]` appears in the
 * DOM, then resolves. Rejects after `timeout` ms (default 3000).
 *
 * Uses setTimeout (not rAF) so tests can advance time with fake timers.
 */
export function waitForTarget(selector: string, timeout = 3000): Promise<void> {
  const POLL_INTERVAL = 50;

  return new Promise<void>((resolve, reject) => {
    let elapsed = 0;

    function check() {
      if (document.querySelector(`[data-walkthrough="${selector}"]`)) {
        resolve();
        return;
      }
      elapsed += POLL_INTERVAL;
      if (elapsed >= timeout) {
        reject(
          new Error(`[walkthrough] waitForTarget timed out: [data-walkthrough="${selector}"]`)
        );
        return;
      }
      setTimeout(check, POLL_INTERVAL);
    }

    // Initial check — element may already be present.
    if (document.querySelector(`[data-walkthrough="${selector}"]`)) {
      resolve();
      return;
    }
    setTimeout(check, POLL_INTERVAL);
  });
}

/**
 * Factory that produces the 10-step walkthrough sequence.
 *
 * Steps that navigate to a different page receive a `before` async hook that
 * calls `navigate(path)` and then waits for the target element to appear in
 * the DOM via `waitForTarget`.
 *
 * All targets follow the `[data-walkthrough="<name>"]` convention — add the
 * attribute to the corresponding DOM element in the page/component.
 *
 * @param t Translation function from useT()
 */
export function createWalkthroughSteps(
  navigate: NavigateFunction,
  t: (key: string) => string
): Step[] {
  return [
    // ── Step 1 — /home ────────────────────────────────────────────────────
    {
      target: '[data-walkthrough="home-card"]',
      title: t('walkthrough.step1.title'),
      content: t('walkthrough.step1.content'),
      placement: 'bottom',
      skipBeacon: true,
    },

    // ── Step 2 — /home ────────────────────────────────────────────────────
    {
      target: '[data-walkthrough="home-cta"]',
      title: t('walkthrough.step2.title'),
      content: t('walkthrough.step2.content'),
      placement: 'bottom',
      skipBeacon: true,
    },

    // ── Step 3 — /chat ────────────────────────────────────────────────────
    {
      target: '[data-walkthrough="chat-agent-panel"]',
      title: t('walkthrough.step3.title'),
      content: t('walkthrough.step3.content'),
      placement: 'bottom',
      skipBeacon: true,
      before: async () => {
        navigate('/chat');
        await waitForTarget('chat-agent-panel');
      },
    },

    // ── Step 4 — /skills ──────────────────────────────────────────────────
    {
      target: '[data-walkthrough="skills-grid"]',
      title: t('walkthrough.step4.title'),
      content: t('walkthrough.step4.content'),
      placement: 'top',
      skipBeacon: true,
      before: async () => {
        navigate('/skills');
        await waitForTarget('skills-grid');
      },
    },

    // ── Step 5 — /skills (channels) ─────────────────────────────────────
    {
      target: '[data-walkthrough="skills-channels"]',
      title: t('walkthrough.step5.title'),
      content: t('walkthrough.step5.content'),
      placement: 'bottom',
      skipBeacon: true,
      before: async () => {
        await waitForTarget('skills-channels');
      },
    },

    // ── Step 6 — /intelligence ────────────────────────────────────────────
    {
      target: '[data-walkthrough="intelligence-header"]',
      title: t('walkthrough.step6.title'),
      content: t('walkthrough.step6.content'),
      placement: 'bottom',
      skipBeacon: true,
      before: async () => {
        navigate('/intelligence');
        await waitForTarget('intelligence-header');
      },
    },

    // ── Step 7 — /settings ────────────────────────────────────────────────
    {
      target: '[data-walkthrough="settings-menu"]',
      title: t('walkthrough.step7.title'),
      content: t('walkthrough.step7.content'),
      placement: 'top',
      skipBeacon: true,
      before: async () => {
        navigate('/settings');
        await waitForTarget('settings-menu');
      },
    },

    // ── Step 8 — /home ────────────────────────────────────────────────────
    {
      target: '[data-walkthrough="tab-chat"]',
      title: t('walkthrough.step8.title'),
      content: t('walkthrough.step8.content'),
      placement: 'top',
      skipBeacon: true,
      before: async () => {
        navigate('/home');
        await waitForTarget('tab-chat');
      },
    },

    // ── Step 9 — /home (already there) ───────────────────────────────────
    {
      target: '[data-walkthrough="tab-notifications"]',
      title: t('walkthrough.step9.title'),
      content: t('walkthrough.step9.content'),
      placement: 'top',
      skipBeacon: true,
    },

    // ── Step 10 — /chat (pre-seeded welcome message) ───────────────────────
    {
      target: '[data-walkthrough="chat-agent-panel"]',
      title: t('walkthrough.step10.title'),
      content: t('walkthrough.step10.content'),
      placement: 'bottom',
      skipBeacon: true,
      before: async () => {
        try {
          const thread = await store.dispatch(createNewThread()).unwrap();
          const welcomeMessage: ThreadMessage = {
            id: `msg_${crypto.randomUUID()}`,
            content: TOUR_WELCOME_MESSAGE,
            type: 'text',
            sender: 'agent',
            createdAt: new Date().toISOString(),
            extraMetadata: {},
          };
          await store
            .dispatch(addMessageLocal({ threadId: thread.id, message: welcomeMessage }))
            .unwrap();
          store.dispatch(setSelectedThread(thread.id));
          navigate('/chat');
        } catch (err) {
          console.debug('[walkthrough] step-10 before hook failed, falling back to /chat', err);
          navigate('/chat');
        }
        await waitForTarget('chat-agent-panel');
      },
    },
  ];
}
