describe('Dynamic Tier, Debt, and OTP Rules', () => {
  type Tier = { name: string; threshold: number; display_order: number; debt_limit: number | null };

  const resolveTierBySales = (tiers: Tier[], sales: number): Tier | undefined => {
    const ordered = [...tiers].sort((a, b) => a.display_order - b.display_order);
    let matched = ordered[0];
    for (const tier of ordered) {
      if (sales >= tier.threshold) {
        matched = tier;
      }
    }
    return matched;
  };

  const resolveDebtLimit = (customLimit: number | null, tierDebtLimit: number | null): number => {
    if (customLimit !== null) return customLimit;
    return tierDebtLimit ?? 0;
  };

  it('assigns tier from dynamic config order and threshold', () => {
    const tiers: Tier[] = [
      { name: 'Tier A', threshold: 0, display_order: 1, debt_limit: 50000 },
      { name: 'Tier B', threshold: 100000, display_order: 2, debt_limit: 100000 },
      { name: 'Tier C', threshold: 250000, display_order: 3, debt_limit: 200000 }
    ];

    expect(resolveTierBySales(tiers, 0)?.name).toBe('Tier A');
    expect(resolveTierBySales(tiers, 120000)?.name).toBe('Tier B');
    expect(resolveTierBySales(tiers, 500000)?.name).toBe('Tier C');
  });

  it('uses admin custom debt override before tier debt limit', () => {
    expect(resolveDebtLimit(250000, 100000)).toBe(250000);
    expect(resolveDebtLimit(null, 100000)).toBe(100000);
    expect(resolveDebtLimit(null, null)).toBe(0);
  });

  it('detects cooldown window for repeated OTP sends', () => {
    const cooldownSeconds = 60;
    const firstIssuedAt = new Date('2026-01-01T00:00:00.000Z');
    const retryAt40 = new Date('2026-01-01T00:00:40.000Z');
    const retryAt61 = new Date('2026-01-01T00:01:01.000Z');

    const isInCooldown = (issuedAt: Date, now: Date) =>
      now.getTime() - issuedAt.getTime() < cooldownSeconds * 1000;

    expect(isInCooldown(firstIssuedAt, retryAt40)).toBe(true);
    expect(isInCooldown(firstIssuedAt, retryAt61)).toBe(false);
  });
});

