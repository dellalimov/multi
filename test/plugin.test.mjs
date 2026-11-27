import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '../lib/workspace.mjs';

// claude.ai rejects plugins whose skill/agent descriptions contain XML-like tags.
const files = [
  ...fs.readdirSync('skills').map(d => path.join('skills', d, 'SKILL.md')).filter(f => fs.existsSync(f)),
  ...fs.readdirSync('agents').map(f => path.join('agents', f)),
];

test('every skill and agent has a name and a description without < >', () => {
  for (const f of files) {
    const { data } = parse(fs.readFileSync(f, 'utf8'));
    assert.ok(data.name, `${f}: missing name`);
    assert.ok(data.description, `${f}: missing description`);
    assert.doesNotMatch(String(data.description), /[<>]/, `${f}: description contains < or >`);
    assert.ok(String(data.description).length <= 1024, `${f}: description over 1024 chars`);
  }
});

test('plugin ships no bin/ directory', () => {
  assert.equal(fs.existsSync('bin'), false);
});
