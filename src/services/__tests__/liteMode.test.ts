/// <reference types="node" />
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { isLowMemory, memoryGbLabel } from '../liteMode';

const GIB = 1024 ** 3;

describe('lite mode', () => {
  it('flags phones with about 4 GB of memory or less', () => {
    assert.equal(isLowMemory(2.8 * GIB), true);
    assert.equal(isLowMemory(3.6 * GIB), true);
    assert.equal(isLowMemory(5.5 * GIB), false);
    assert.equal(isLowMemory(null), false);
    assert.equal(isLowMemory(undefined), false);
  });

  it('labels memory in whole GB', () => {
    assert.equal(memoryGbLabel(3.6 * GIB), '4');
    assert.equal(memoryGbLabel(7.5 * GIB), '8');
  });
});
