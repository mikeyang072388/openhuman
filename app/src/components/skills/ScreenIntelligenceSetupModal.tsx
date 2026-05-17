/**
 * Screen Intelligence setup/enable modal.
 *
 * Guides the user through permission grants, enables the feature,
 * and shows a success confirmation — matching the UX of third-party
 * skill setup flows (Gmail, etc.).
 */
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import { useT } from '../../lib/i18n/I18nContext';
import { useScreenIntelligenceState } from '../../features/screen-intelligence/useScreenIntelligenceState';
import { openhumanUpdateScreenIntelligenceSettings } from '../../utils/tauriCommands';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'permissions' | 'enable' | 'success';

interface Props {
  onClose: () => void;
  /** Skip straight to manage mode when permissions are already granted. */
  initialStep?: Step;
}

type TFunc = ReturnType<typeof useT>['t'];

// ─── Permission badge (reusable) ──────────────────────────────────────────────

const PermissionRow = ({
  label,
  value,
  onRequest,
  isRequesting,
  t,
}: {
  label: string;
  value: string;
  onRequest: () => void;
  isRequesting: boolean;
  t: TFunc;
}) => {
  const granted = value === 'granted';
  const badgeColor = granted
    ? 'bg-sage-50 text-sage-700 border-sage-200'
    : value === 'denied'
      ? 'bg-coral-50 text-coral-700 border-coral-200'
      : 'bg-stone-100 text-stone-600 border-stone-200';

  return (
    <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-2.5">
      <div className="flex items-center gap-2">
        {granted ? (
          <svg className="w-4 h-4 text-sage-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth={2} />
          </svg>
        )}
        <span className="text-sm text-stone-700">{label}</span>
      </div>
      {granted ? (
        <span className={`rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wide ${badgeColor}`}>
          {t('screenIntelligence.setup.granted')}
        </span>
      ) : (
        <button
          type="button"
          disabled={isRequesting}
          onClick={onRequest}
          className="rounded-lg border border-primary-300 bg-primary-50 px-2.5 py-1 text-[11px] font-medium text-primary-700 hover:bg-primary-100 disabled:opacity-50 transition-colors">
          {isRequesting ? t('screenIntelligence.setup.opening') : t('screenIntelligence.setup.grant')}
        </button>
      )}
    </div>
  );
};

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function ScreenIntelligenceSetupModal({ onClose, initialStep }: Props) {
  const { t } = useT();
  const navigate = useNavigate();
  const {
    status,
    isRequestingPermissions,
    isRestartingCore,
    lastRestartSummary,
    lastError,
    requestPermission,
    refreshPermissionsWithRestart,
    refreshStatus,
  } = useScreenIntelligenceState({ loadVision: false });

  const [isEnabling, setIsEnabling] = useState(false);
  const [enableError, setEnableError] = useState<string | null>(null);

  const allGranted = useMemo(() => {
    if (!status) return false;
    return (
      status.permissions.screen_recording === 'granted' &&
      status.permissions.accessibility === 'granted' &&
      status.permissions.input_monitoring === 'granted'
    );
  }, [status]);

  const anyDenied = useMemo(() => {
    if (!status) return false;
    return (
      status.permissions.screen_recording === 'denied' ||
      status.permissions.accessibility === 'denied' ||
      status.permissions.input_monitoring === 'denied'
    );
  }, [status]);

  // Derive current step
  const [step, setStep] = useState<Step>(initialStep ?? 'permissions');

  // Auto-advance: when permissions are all granted, move past the permissions step
  useEffect(() => {
    if (step === 'permissions' && allGranted) {
      setStep('enable');
    }
  }, [step, allGranted]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleEnable = async () => {
    setIsEnabling(true);
    setEnableError(null);
    try {
      await openhumanUpdateScreenIntelligenceSettings({ enabled: true });
      await refreshStatus();
      setStep('success');
    } catch (error) {
      setEnableError(error instanceof Error ? error.message : t('screenIntelligence.setup.failedToEnable'));
    } finally {
      setIsEnabling(false);
    }
  };

  const handleGoToSettings = () => {
    onClose();
    navigate('/settings/screen-intelligence');
  };

  if (status?.platform_supported === false) {
    return createPortal(
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={e => {
          if (e.target === e.currentTarget) onClose();
        }}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="si-setup-title"
          className="w-full max-w-md mx-4 rounded-2xl bg-white shadow-xl overflow-hidden animate-fade-up">
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5h18v12H3zM8 21h8m-4-4v4" />
                </svg>
              </div>
              <h2 id="si-setup-title" className="text-sm font-semibold text-stone-900">{t('screenIntelligence.title')}</h2>
            </div>
            <button
              type="button"
              aria-label={t('common.close')}
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="px-5 py-6 space-y-4">
            <p className="text-sm text-stone-600 leading-relaxed">
              {t('screenIntelligence.setup.macosOnly')}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors">
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="si-setup-title"
        className="w-full max-w-md mx-4 rounded-2xl bg-white shadow-xl overflow-hidden animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5h18v12H3zM8 21h8m-4-4v4" />
              </svg>
            </div>
            <div>
              <h2 id="si-setup-title" className="text-sm font-semibold text-stone-900">{t('screenIntelligence.title')}</h2>
              <p className="text-xs text-stone-500">
                {step === 'permissions' && t('screenIntelligence.setup.grantPermissions')}
                {step === 'enable' && t('screenIntelligence.setup.enableSkill')}
                {step === 'success' && t('screenIntelligence.setup.readyToGo')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {/* ─── Step 1: Permissions ─── */}
          {step === 'permissions' && (
            <div className="space-y-3">
              <p className="text-xs text-stone-500 leading-relaxed">
                {t('screenIntelligence.setup.permissionsDescription')}
              </p>

              <div className="space-y-2">
                <PermissionRow
                  label={t('screenIntelligence.setup.permScreenRecording')}
                  value={status?.permissions.screen_recording ?? 'unknown'}
                  onRequest={() => void requestPermission('screen_recording')}
                  isRequesting={isRequestingPermissions}
                  t={t}
                />
                <PermissionRow
                  label={t('screenIntelligence.setup.permAccessibility')}
                  value={status?.permissions.accessibility ?? 'unknown'}
                  onRequest={() => void requestPermission('accessibility')}
                  isRequesting={isRequestingPermissions}
                  t={t}
                />
                <PermissionRow
                  label={t('screenIntelligence.setup.permInputMonitoring')}
                  value={status?.permissions.input_monitoring ?? 'unknown'}
                  onRequest={() => void requestPermission('input_monitoring')}
                  isRequesting={isRequestingPermissions}
                  t={t}
                />
              </div>

              {anyDenied && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 leading-relaxed">
                  <p>{t('screenIntelligence.setup.restartHint')}</p>
                  {status?.permission_check_process_path && (
                    <p className="mt-1 opacity-75 text-[10px]">
                      {t('screenIntelligence.setup.macosPrivacyTo')}{' '}
                      <span className="font-mono break-all text-stone-600">
                        {status.permission_check_process_path}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {lastRestartSummary && (
                <div className="rounded-xl border border-sage-200 bg-sage-50 p-3 text-xs text-sage-700">
                  {lastRestartSummary}
                </div>
              )}

              {lastError && (
                <div className="rounded-xl border border-coral-200 bg-coral-50 p-3 text-xs text-coral-700">
                  {lastError}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                {anyDenied ? (
                  <button
                    type="button"
                    onClick={() => void refreshPermissionsWithRestart()}
                    disabled={isRestartingCore}
                    className="flex-1 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors">
                    {isRestartingCore ? t('screenIntelligence.setup.restarting') : t('screenIntelligence.setup.restartAndRefresh')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void refreshStatus()}
                    disabled={isRestartingCore}
                    className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-100 disabled:opacity-50 transition-colors">
                    {t('screenIntelligence.setup.refreshStatus')}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ─── Step 2: Enable ─── */}
          {step === 'enable' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-sage-200 bg-sage-50 p-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-sage-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs text-sage-700">{t('screenIntelligence.setup.allPermissionsGranted')}</span>
              </div>

              <p className="text-xs text-stone-500 leading-relaxed">
                {t('screenIntelligence.setup.enableDescription')}
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5">
                  <span className="text-sm text-stone-700">{t('screenIntelligence.setup.captureMode')}</span>
                  <span className="text-xs text-stone-500">{t('screenIntelligence.setup.allWindowsConfigurableLater')}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5">
                  <span className="text-sm text-stone-700">{t('screenIntelligence.setup.visionModel')}</span>
                  <span className="text-xs text-stone-500">{t('screenIntelligence.setup.enabled')}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5">
                  <span className="text-sm text-stone-700">{t('screenIntelligence.setup.panicHotkey')}</span>
                  <span className="text-xs font-mono text-stone-500">{status?.session.panic_hotkey ?? 'Cmd+Shift+.'}</span>
                </div>
              </div>

              {enableError && (
                <div className="rounded-xl border border-coral-200 bg-coral-50 p-3 text-xs text-coral-700">
                  {enableError}
                </div>
              )}

              <button
                type="button"
                onClick={() => void handleEnable()}
                disabled={isEnabling}
                className="w-full rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50 transition-colors">
                {isEnabling ? t('screenIntelligence.setup.enabling') : t('screenIntelligence.setup.enableButton')}
              </button>
            </div>
          )}

          {/* ─── Step 3: Success ─── */}
          {step === 'success' && (
            <div className="space-y-4 text-center py-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-sage-50 flex items-center justify-center">
                <svg className="w-6 h-6 text-sage-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-stone-900">{t('screenIntelligence.setup.active')}</h3>
                <p className="mt-1 text-xs text-stone-500 leading-relaxed">
                  {t('screenIntelligence.setup.activeDescription')}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleGoToSettings}
                  className="w-full rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5 text-sm font-medium text-primary-700 hover:bg-primary-100 transition-colors">
                  {t('screenIntelligence.setup.advancedSettings')}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors">
                  {t('screenIntelligence.setup.done')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
