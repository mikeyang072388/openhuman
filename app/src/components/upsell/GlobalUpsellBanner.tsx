import { useUsageState } from '../../hooks/useUsageState';
import { useT } from '../../lib/i18n/I18nContext';
import { BILLING_DASHBOARD_URL } from '../../utils/links';
import { openUrl } from '../../utils/openUrl';
import UpsellBanner from './UpsellBanner';

export default function GlobalUpsellBanner() {
  const { t } = useT();
  const { teamUsage, isLoading, isAtLimit, isNearLimit, isFreeTier, usagePct10h, usagePct7d } =
    useUsageState();

  if (isLoading || !teamUsage) return null;

  if (isAtLimit) {
    return (
      <div className="relative z-20">
        <UpsellBanner
          variant="upgrade"
          title={t('upsell.reachedLimit')}
          message={t('upsell.upgradeOrTopUp')}
          ctaLabel={t('upsell.upgrade')}
          rounded={false}
          onCtaClick={() => {
            void openUrl(BILLING_DASHBOARD_URL);
          }}
        />
      </div>
    );
  }

  if (isNearLimit && isFreeTier) {
    const pct = Math.round(Math.max(usagePct10h, usagePct7d) * 100);
    return (
      <div className="relative z-20">
        <UpsellBanner
          variant="warning"
          title={t('upsell.approachingLimit')}
          message={t('upsell.usedPercent').replace('{pct}', String(pct))}
          ctaLabel={t('upsell.upgrade')}
          rounded={false}
          onCtaClick={() => {
            void openUrl(BILLING_DASHBOARD_URL);
          }}
        />
      </div>
    );
  }

  return null;
}
