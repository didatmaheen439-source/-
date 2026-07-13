import { describe, expect, it } from 'vitest';
import {
  advancedLearningStrategies,
  precheckAdvancedStrategy,
  runStrategyMatch,
  strategyEffects,
  strategyMockProfiles,
} from '../../mock/advancedLearningStrategyStore';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

describe('advancedLearningStrategyStore', () => {
  it('matches only published strategies and selects the lowest numeric priority', () => {
    const profile = strategyMockProfiles.find((item) => item.id === 'mock-cet4-reading');
    if (!profile) throw new Error('Missing profile');
    const source = clone(advancedLearningStrategies);
    const lowerPriority = clone(source.find((item) => item.id === 'strategy-light-cet4-reading'));
    if (!lowerPriority) throw new Error('Missing strategy');
    lowerPriority.id = 'strategy-light-lower-priority';
    lowerPriority.name = '低优先级轻量任务';
    lowerPriority.priority = 30;
    source.push(lowerPriority);
    const result = runStrategyMatch(profile, 'light_task', source);
    expect(result.matched).toBe(true);
    expect(result.strategyId).toBe('strategy-light-cet4-reading');
    expect(result.strategyVersion).toBe('V1.1');
  });

  it('serves rolled back strategies with the online rollback version', () => {
    const profile = strategyMockProfiles.find((item) => item.id === 'mock-cet4-reading');
    if (!profile) throw new Error('Missing profile');
    const source = clone(advancedLearningStrategies);
    const strategy = source.find((item) => item.id === 'strategy-light-cet4-reading');
    if (!strategy) throw new Error('Missing strategy');
    strategy.status = 'rolled_back';
    strategy.version = 'V1.2';
    strategy.onlineVersion = 'V1.0';
    strategy.priority = 1;
    const result = runStrategyMatch(profile, 'light_task', source);
    expect(result.matched).toBe(true);
    expect(result.strategyId).toBe('strategy-light-cet4-reading');
    expect(result.strategyVersion).toBe('V1.0');
  });

  it('blocks invalid light duration and unavailable references', () => {
    const source = clone(advancedLearningStrategies.find((item) => item.kind === 'light_task'));
    if (!source) throw new Error('Missing light strategy');
    source.estimatedMinutes = 20;
    source.primaryReference.available = false;
    const result = precheckAdvancedStrategy(source, [source]);
    expect(result.level).toBe('error');
    expect(result.issues.some((item) => item.code === 'light_duration')).toBe(true);
    expect(result.issues.some((item) => item.code === 'reference_unavailable')).toBe(true);
  });

  it('warns on same-scope priority conflicts', () => {
    const source = clone(advancedLearningStrategies.find((item) => item.id === 'strategy-light-cet4-reading'));
    if (!source) throw new Error('Missing strategy');
    const conflict = { ...clone(source), id: 'strategy-light-conflict', name: '同优先级冲突策略' };
    const result = precheckAdvancedStrategy(source, [source, conflict]);
    expect(result.level).toBe('warning');
    expect(result.issues.some((item) => item.code === 'priority_conflict')).toBe(true);
  });

  it('derives completion from shared run records', () => {
    const effects = strategyEffects('strategy-light-cet4-reading');
    expect(effects.hits).toBeGreaterThan(0);
    expect(effects.completed).toBeGreaterThan(0);
    expect(effects.completionRate).toBeGreaterThan(0);
  });
});
