import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = readFileSync(new URL('../src/scripts/byte-order.ts', import.meta.url), 'utf8');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, context);
const { decodeHex } = context.exports;
test('byte lab accepts the complete unsigned 32-bit range', () => {
  for (const [input, hex, value] of [['0', '00000000', 0], ['12345678', '12345678', 305419896], ['0xFFFFFFFF', 'FFFFFFFF', 4294967295], ['  aBcD ', '0000ABCD', 43981]]) {
    const result = decodeHex(input);
    assert.equal(result.hex, hex); assert.equal(result.value, value);
    assert.equal(result.bytes.join(''), hex);
    assert.equal(result.bytes.slice().reverse().join(''), hex.match(/../g).reverse().join(''));
  }
});
test('byte lab rejects malformed and out-of-range values', () => {
  for (const value of ['', '0x', '-1', 'GG', '100000000', '12 34', '1.2', '<script>']) assert.equal(decodeHex(value), null);
});
