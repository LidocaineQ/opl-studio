// Synthetic descriptors exercise renderer contracts; they do not attest domain execution.
export function featureCompletenessFixture(workspace = '/fixture/workspace') {
  const agents = [
    ['med-autoscience', 'MAS', 'med-autoscience'], ['med-autogrant', 'MAG', 'med-autogrant'], ['redcube-ai', 'RCA', 'redcube-ai'],
  ];
  return { meta: { profile: 'fast', generated_at: '2026-09-15T00:00:00Z' },
    actions: [{ action_id: 'agent_package_update', label: 'Update Package', route: 'opl app action execute --action agent_package_update', payload_fields: ['package_id'], mutates: 'opl_packages', owner: 'OPL Framework', dry_run_supported: true, confirmation_required: true, can_submit_to_safe_action_shell: true }],
    agent_packages: { directory: { status: 'current', entries: agents.map(([id, name, skill]) => ({
      package_id: id, display_name: name, display_name_i18n: { 'zh-CN': name, 'en-US': name }, description: `${name} synthetic fixture`, publisher: 'One Person Lab', package_role: 'standard_agent', official: true,
      capability_metadata: { source: 'normalized_owner_manifest', required_skill_ids: [skill] },
      version: '0.0.0-fixture', readiness: { status: 'ready', operational_ready: true, launch_allowed: true },
      installed_readiness: { installed: true, physical_status: 'available', callability: 'callable' },
      home_shortcuts: [{ shortcut_id: 'start', label: name, default_visible: true, route: { route_kind: 'agent_package_shortcut', executor: 'codex_cli', codex_visible_entry: skill } }],
      available_actions: [{ action_id: 'agent_package_update', semantic: 'update', payload: { package_id: id }, confirmation_required: true }],
    })) }, status_index: { packages: Object.fromEntries(agents.map(([id]) => [id, {
      package_id: id, status: 'available',
      presence: { registered: true, installed: true, present: true, callable: true, status: 'present' },
      capability_exposure: { status: 'visible', codex_visible: true },
      dependency_readiness: { status: 'ready', required_count: 0, present_count: 0, callable_count: 0, checks: [] },
    }])) } },
    operator: { workbench: { work_item_projection_v2: {
      schema_version: 'work-item-projection.v2', generated_at: '2026-09-15T00:00:00Z', summary: { work_item_count: 3, agent_count: 3, project_count: 3 },
      agent_catalog: agents.map(([id, name]) => ({ agent_id: id, display_name: name })),
      project_catalog: agents.map(([id, name]) => ({ project_id: `${id}-project`, agent_id: id, display_name: `${name} Project`, workspace_path: workspace })),
      items: agents.map(([id, name], index) => ({ item_id: `${id}-item`,
        identity: { agent_id: id, agent_display_name: name, project_id: `${id}-project`, project_display_name: `${name} Project`, workspace_path: workspace, work_item_id: `${id}-work`, work_item_display_name: `${name} fixture work` },
        lifecycle: { primary_state: index === 0 ? 'active' : 'completed', primary_state_label: index === 0 ? '进行中' : '已完成', current_stage_id: 'draft', current_stage_display_name: '草稿' },
        execution: { state: 'idle', attempt_id: `${id}-attempt` },
        session_activity: { active_session_count: 0, latest_session_ref: index === 0 ? 'codex://threads/thread-source' : index === 1 ? 'codex://threads/missing-thread' : null },
        attention: { kind: 'none' }, telemetry: { state: 'missing' },
        domain_detail_views: index === 0 ? [{ item_id: `${id}-item`, view_id: 'roadmap', view_kind: 'research-roadmap', availability: 'stale' }] : index === 1 ? [{ item_id: `${id}-item`, view_id: 'future', view_kind: 'future-view', availability: 'unread' }] : [{ item_id: 'wrong-item', view_id: 'invalid', view_kind: 'future-view', availability: 'available' }],
      })),
    } } },
  };
}
