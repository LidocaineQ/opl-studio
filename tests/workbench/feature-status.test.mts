import { describe, expect, test } from 'bun:test';
import { deriveFeatureRefs, featureRefsWithCodexStatus } from '../../src/workbench/featureModel';
import { deriveWorkbenchModelFromState, deriveThreadMessages } from '../../src/workbench/workbenchModel';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { FeatureStatusPanel } from '../../src/workbench/FeatureStatusPanel';

const feature = (state: unknown, id: string) => deriveWorkbenchModelFromState({ app_state: state }).features.find(row => row.featureId === id)!;
describe('feature ownership and local degradation', () => {
  test('all 27 rows have a destination and source; absent projections do not impersonate owners', () => {
    const features = deriveFeatureRefs(undefined);
    expect(new Set(features.map(row => row.featureId)).size).toBe(27);
    for (const row of features) { expect(row.owner).toBeTruthy(); expect(row.sourceRef).toBeTruthy(); expect(row.nextStep).toBeTruthy(); }
    expect(features.find(row => row.featureId === 'B0-12')?.state).toBe('owner_action_required');
    expect(features.find(row => row.featureId === 'U1-01')?.state).toBe('owner_action_required');
  });
  test('empty but current package directory is available, stale and failure remain distinct', () => {
    expect(feature({ agent_packages: { directory: { status: 'current', entries: [] } } }, 'U1-01').state).toBe('available');
    expect(feature({ agent_packages: { directory: { status: 'stale', entries: [] } } }, 'U1-01').state).toBe('degraded');
    expect(feature({ agent_packages: { status: 'error' } }, 'U1-01').state).toBe('unavailable');
  });
  test('Gateway config and freshness never affect ordinary Codex readiness', () => {
    const state = { settings_control_center: { app_settings_read_model: { opl_gateway_account: { status: 'setup_required' } } } };
    expect(feature(state, 'R1-01').state).toBe('not_configured');
    const rows = featureRefsWithCodexStatus(deriveFeatureRefs(state), 'ready', '', 'error');
    expect(rows.find(row => row.featureId === 'B0-03')?.state).toBe('available');
    expect(rows.find(row => row.featureId === 'R1-01')?.state).toBe('degraded');
  });
  test('scheduler health alone does not imply task operations; unrelated catalog actions are not exposed', () => {
    const state = { provider: { temporal: { details: { scheduler: { status: 'ready' } } } }, actions: [{ action_id: 'delete_everything', label: 'Delete' }] };
    expect(feature(state, 'B0-12').state).toBe('owner_action_required');
    expect(feature(state, 'B0-12').actions).toEqual([]);
  });
  test('only explicit owner refs bind catalog actions, invalid runtime remains unavailable', () => {
    const state = { provider: { temporal: { details: { scheduler: { status: 'ready', actions: ['run_task'] } } } }, actions: [{ action_id: 'run_task', label: 'Run task', payload_fields: ['task_id'], confirmation_required: true, dry_run_supported: true }] };
    expect(feature(state, 'B0-12').actions.map(row => row.id)).toEqual(['run_task']);
    expect(feature({ operator: { workbench: { work_item_projection_v2: { schema_version: 'unknown' } } } }, 'U1-03').state).toBe('unavailable');
  });
  test('rendered owner-required state has a next step, navigation, and no fake action', () => {
    const html = renderToStaticMarkup(createElement(FeatureStatusPanel, { features: deriveFeatureRefs(undefined), locale: 'zh', destination: 'services', onNavigate() {}, onRefresh() {}, onAction() {}, busy: false }));
    expect(html).toContain('计划任务与后台'); expect(html).toContain('刷新状态'); expect(html).toContain('owner_action_required');
    expect(html).not.toContain('执行操作');
  });
  test('canonical subagent and process events retain IDs and output', () => {
    const messages = deriveThreadMessages({ turns: [{ items: [
      { id: 'sub', type: 'collabAgentToolCall', receiverThreadIds: ['child-1'], agentsStates: { 'child-1': { status: 'completed' } }, status: 'completed' },
      { id: 'process', type: 'commandExecution', aggregatedOutput: 'process output' },
    ] }] });
    expect(messages.find(item => item.id === 'sub')?.subagent?.childThreadIds).toEqual(['child-1']);
    expect(messages.find(item => item.id === 'process')?.text).toBe('process output');
  });
});
