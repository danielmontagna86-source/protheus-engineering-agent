const SEVERITY_ORDER = Object.freeze({ CRITICAL: 0, MAJOR: 1, MINOR: 2, INFO: 3 });

function maskStringsAndComments(source) {
  const chars = Array.from(source);
  let mode = 'code';
  for (let index = 0; index < chars.length; index += 1) {
    const current = chars[index];
    const next = chars[index + 1];
    if (mode === 'comment') {
      if (current === '\n') mode = 'code';
      else chars[index] = ' ';
    } else if (mode === 'block') {
      if (current === '*' && next === '/') {
        chars[index] = chars[index + 1] = ' ';
        index += 1;
        mode = 'code';
      } else if (current !== '\n') chars[index] = ' ';
    } else if (mode === 'double' || mode === 'single') {
      const quote = mode === 'double' ? '"' : "'";
      if (current === quote) mode = 'code';
      if (current !== '\n') chars[index] = ' ';
    } else if (current === '/' && next === '/') {
      chars[index] = chars[index + 1] = ' ';
      index += 1;
      mode = 'comment';
    } else if (current === '/' && next === '*') {
      chars[index] = chars[index + 1] = ' ';
      index += 1;
      mode = 'block';
    } else if (current === '"' || current === "'") {
      chars[index] = ' ';
      mode = current === '"' ? 'double' : 'single';
    }
  }
  return chars.join('');
}

function assessmentFor(findings) {
  const critical = findings.filter((item) => item.severity === 'CRITICAL').length;
  const major = findings.filter((item) => item.severity === 'MAJOR').length;
  if (critical > 0) return 'FAIL';
  if (major > 3) return 'NEEDS REVISION';
  if (major > 0 || findings.length > 0) return 'PASS WITH OBSERVATIONS';
  return 'PASS';
}

export function reviewSource(source, options = {}) {
  const file = options.file ?? '<memory>';
  const rawLines = source.split(/\r?\n/);
  const codeLines = maskStringsAndComments(source).split(/\r?\n/);
  const findings = [];
  let loopDepth = 0;
  let transactionDepth = 0;

  function add(line, ruleId, severity, category, title, guidance) {
    findings.push({
      ruleId,
      severity,
      category,
      title,
      line,
      guidance,
      evidence: { file, line, excerpt: rawLines[line - 1]?.trim().slice(0, 240) ?? '' },
    });
  }

  for (let index = 0; index < rawLines.length; index += 1) {
    const line = index + 1;
    const raw = rawLines[index];
    const code = codeLines[index];
    const trimmed = code.trim();
    if (/^(While|For\b)/i.test(trimmed)) loopDepth += 1;
    if (/^Begin\s+Transaction\b/i.test(trimmed)) transactionDepth += 1;

    if (/^\s*#INCLUDE\s+["'<]protheus\.ch["'>]/i.test(raw)) {
      add(line, 'CA3001', 'MINOR', 'Legacy', 'Obsolete include', 'Use the project-approved modern include after validating compatibility.');
    }
    if (/\b(?:ConOut|OutErr)\s*\(/i.test(code)) {
      add(line, 'CA1004', 'MINOR', 'Legacy', 'Console output API', 'Route diagnostics through the project logging abstraction.');
    }
    if (/\bIIF\s*\(/i.test(code)) {
      add(line, 'CA4000', 'INFO', 'Clean Code', 'Inline conditional', 'Prefer an explicit conditional block for maintainability.');
    }
    const insideIteration = loopDepth > 0 || /\bDbEval\s*\(/i.test(code);
    if (insideIteration && /\b(GetMV|SuperGetMV|ExistBlock|AllUsers|Type|Pergunte)\s*\(/i.test(code)) {
      add(line, 'CA1003', 'MAJOR', 'Performance', 'Expensive API inside loop', 'Resolve the invariant value before entering the loop.');
    }
    if (transactionDepth > 0 && /\b(?:MsgAlert|MsgYesNo|MsgInfo|Aviso|Help|Pergunte|ParamBox)\s*\(/i.test(code)) {
      add(line, 'CA1002', 'MAJOR', 'Transaction', 'User interaction inside transaction', 'Collect the result and interact with the user only after the transaction ends.');
    }
    if (/\b(?:MSCREATE|DBCREATE)\s*\(/i.test(code)) {
      add(line, 'CA1000', 'MAJOR', 'Legacy', 'Legacy ISAM table creation', 'Use the project-approved relational temporary-table abstraction.');
    }
    if (/\bStaticCall\s*\(/i.test(code)) {
      add(line, 'CA2022', 'CRITICAL', 'Security', 'Restricted dynamic call', 'Replace the restricted call with an approved explicit integration boundary.');
    }
    if (/\bPTInternal\s*\(/i.test(code)) {
      add(line, 'CA2023', 'CRITICAL', 'Security', 'Prohibited internal API', 'Remove the prohibited internal API call or document an approved vendor exception.');
    }
    if (/\b__cUserID\s*:=/i.test(code)) {
      add(line, 'CA2024', 'CRITICAL', 'Security', 'System user identity assignment', 'Do not assign the read-only system user identity.');
    }
    if (/\bcEmpAnt\s*:=/i.test(code)) {
      add(line, 'CA2025', 'CRITICAL', 'Environment', 'Company environment assignment', 'Use an approved environment boundary instead of assigning the system company variable.');
    }
    if (/\bCREATE\s+PROCEDURE\b/i.test(code)) {
      add(line, 'CA2053', 'CRITICAL', 'Database', 'Direct procedure creation', 'Move procedure management behind the project-approved supervised database integration.');
    }
    if (/\bDbSelectArea\s*\(/i.test(code)
      && /\bDbSelectArea\s*\(\s*["'](?:SX[A-Z0-9]|SM0|SIX|SE5|SPF)["']/i.test(raw)) {
      add(line, 'CA2000', 'CRITICAL', 'Metadata', 'Direct system-table access', 'Use a validated framework metadata API; do not access SX-family tables directly.');
    }

    if (/^(EndDo|Next)\b/i.test(trimmed)) loopDepth = Math.max(0, loopDepth - 1);
    if (/^End\s+Transaction\b/i.test(trimmed)) transactionDepth = Math.max(0, transactionDepth - 1);
  }

  findings.sort((left, right) =>
    SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity] || left.line - right.line,
  );
  return {
    schemaVersion: 1,
    file,
    findings,
    counts: Object.fromEntries(['CRITICAL', 'MAJOR', 'MINOR', 'INFO'].map((severity) => [
      severity,
      findings.filter((item) => item.severity === severity).length,
    ])),
    assessment: assessmentFor(findings),
    disclaimer: 'Deterministic pre-review only; compilation and release compatibility are not asserted.',
  };
}

export function createBugReview(input) {
  const canonical = String(input.targetSymbol ?? '').toLowerCase();
  const target = input.graph.nodes.find((node) => node.name.toLowerCase() === canonical) ?? null;
  const callers = [...new Set(input.graph.edges
    .filter((edge) => edge.resolved && edge.to.toLowerCase() === canonical)
    .map((edge) => edge.from))]
    .sort((left, right) => left.localeCompare(right));

  return {
    schemaVersion: 1,
    title: input.title,
    status: target ? 'diagnosed' : 'needs-evidence',
    target: target ? { name: target.name, file: target.file, line: target.line } : null,
    impact: { callers, callerCount: callers.length },
    findings: input.sourceReport.findings,
    evidence: [
      {
        type: 'source-review',
        file: input.sourceReport.file,
        findingCount: input.sourceReport.findings.length,
      },
      {
        type: 'codegraph',
        targetFound: Boolean(target),
        callerCount: callers.length,
      },
    ],
  };
}
