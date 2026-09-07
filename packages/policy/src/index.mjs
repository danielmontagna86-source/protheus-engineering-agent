const POLICIES = Object.freeze({
  development: Object.freeze({
    capabilities: Object.freeze([
      'workspace:read',
      'context:read',
      'context:write',
      'workspace:write',
      'build:execute',
    ]),
    approvalRequired: Object.freeze(['workspace:write', 'build:execute']),
  }),
  test: Object.freeze({
    capabilities: Object.freeze(['workspace:read', 'context:read', 'context:write']),
    approvalRequired: Object.freeze([]),
  }),
  production: Object.freeze({
    capabilities: Object.freeze([
      'workspace:read',
      'context:read',
      'context:write',
      'workspace:write',
      'build:execute',
      'oracle:read',
    ]),
    approvalRequired: Object.freeze([
      'context:write',
      'workspace:write',
      'build:execute',
      'oracle:read',
    ]),
  }),
});

export function getEnvironmentPolicy(environment) {
  const policy = POLICIES[environment];
  if (!policy) {
    return { environment, capabilities: [], approvalRequired: [] };
  }
  return {
    environment,
    capabilities: [...policy.capabilities],
    approvalRequired: [...policy.approvalRequired],
  };
}

export function decideCapability(environment, capability, options = {}) {
  const policy = POLICIES[environment];
  if (!policy || !policy.capabilities.includes(capability)) {
    return {
      allowed: false,
      reason: 'capability-not-declared',
      requiresApproval: false,
    };
  }

  const requiresApproval = policy.approvalRequired.includes(capability);
  const grants = new Set(options.grants ?? []);
  if (requiresApproval && !grants.has(capability)) {
    return {
      allowed: false,
      reason: 'explicit-grant-required',
      requiresApproval: true,
    };
  }

  return { allowed: true, reason: 'allowed', requiresApproval };
}
