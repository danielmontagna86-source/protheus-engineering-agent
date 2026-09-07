import { spawnSync } from 'node:child_process';

export function createHermesAdapter(options = {}) {
  const command = options.command ?? 'hermes';
  const spawnSyncImpl = options.spawnSyncImpl ?? spawnSync;
  const hermesHome = options.hermesHome;
  const descriptorEnv = hermesHome ? { HERMES_HOME: hermesHome } : undefined;

  return {
    getLaunchDescriptor(workspace) {
      return {
        transport: 'stdio',
        command,
        args: ['acp'],
        cwd: workspace,
        ...(descriptorEnv ? { env: descriptorEnv } : {}),
      };
    },
    getSessionMcpServerDescriptor(workspace) {
      if (!options.mcpServerPath) {
        throw new Error('mcpServerPath is required to describe the product MCP server');
      }
      const env = [
        { name: 'PEA_ENVIRONMENT', value: options.environment ?? 'production' },
        { name: 'PEA_WORKSPACE', value: workspace },
      ];
      if (options.electronRunAsNode) {
        env.push({ name: 'ELECTRON_RUN_AS_NODE', value: '1' });
      }
      return {
        name: 'protheus-engineering-agent',
        command: options.nodeCommand ?? process.execPath,
        args: [options.mcpServerPath],
        env,
      };
    },
    probe() {
      try {
        const result = spawnSyncImpl(command, ['acp', '--check'], {
          encoding: 'utf8',
          timeout: options.timeoutMs ?? 10_000,
          windowsHide: true,
          ...(descriptorEnv ? { env: { ...process.env, ...descriptorEnv } } : {}),
        });
        if (result.error) {
          return { available: false, reason: result.error.code ?? 'spawn-failed' };
        }
        return {
          available: result.status === 0,
          reason: result.status === 0 ? 'available' : 'check-failed',
          detail: String(result.stdout ?? result.stderr ?? '').trim().slice(0, 500),
        };
      } catch (error) {
        return { available: false, reason: error?.code ?? 'spawn-failed' };
      }
    },
  };
}
