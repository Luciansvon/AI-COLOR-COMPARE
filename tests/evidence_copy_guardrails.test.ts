import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/components/qc/EvidenceCard.tsx', import.meta.url), 'utf8');

assert.doesNotMatch(source, /Hasil foto aman untuk lolos QC studio/i);
assert.doesNotMatch(source, /Bahan finishing kayu sebenarnya sudah cocok/i);
assert.doesNotMatch(source, /Toleransi Acuan:/i);
assert.doesNotMatch(source, /unifiedFusion \? `\$\{\(unifiedFusion\.textureSimilarityScore \* 100\).*: '100%'/s);
assert.match(source, /Belum Diukur/);
assert.match(source, /Keputusan PASS\/FAIL tetap milik operator/);

console.log('Evidence copy guardrail tests: PASS');
