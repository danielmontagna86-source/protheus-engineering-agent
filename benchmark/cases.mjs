export const reviewCases = Object.freeze([
  Object.freeze({
    id: 'clean-minimal',
    source: 'User Function SafeEntry()\nReturn\n',
    expected: Object.freeze([]),
  }),
  Object.freeze({
    id: 'legacy-include',
    source: '#include <protheus.ch>\nUser Function LegacyEntry()\nReturn\n',
    expected: Object.freeze(['CA3001:1']),
  }),
  Object.freeze({
    id: 'identity-assignment',
    source: 'User Function IdentityRisk()\n    __cUserID := "admin"\nReturn\n',
    expected: Object.freeze(['CA2024:2']),
  }),
  Object.freeze({
    id: 'environment-assignment',
    source: 'User Function EnvironmentRisk()\n    cEmpAnt := "01"\nReturn\n',
    expected: Object.freeze(['CA2025:2']),
  }),
  Object.freeze({
    id: 'masked-risk-text',
    source: 'User Function MaskedText()\n    // __cUserID := "admin"\n    cText := "cEmpAnt := 01"\nReturn\n',
    expected: Object.freeze([]),
  }),
]);

export const codegraphCases = Object.freeze([
  Object.freeze({
    id: 'resolved-helper',
    source: 'User Function Entry()\n    Helper()\nReturn\n\nStatic Function Helper()\nReturn\n',
    expectedSymbols: Object.freeze(['Entry', 'Helper']),
    expectedCalls: Object.freeze(['Entry->Helper']),
  }),
  Object.freeze({
    id: 'masked-call',
    source: 'User Function Entry()\n    // Hidden()\n    cText := "AlsoHidden()"\nReturn\n',
    expectedSymbols: Object.freeze(['Entry']),
    expectedCalls: Object.freeze([]),
  }),
]);
