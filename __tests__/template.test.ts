import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import Template, { ddtags, statsdType } from '../lib/template.js';
import type { Metric } from '../src/metrics-types.ts';

describe('statsdType', () => {
  it('returns c if count given', () => {
    assert.equal(statsdType('count'), 'c');
  });
  it('returns g if gauge given', () => {
    assert.equal(statsdType('gauge'), 'g');
  });
  it('return nothing if otherwise', () => {
    assert.equal(statsdType('rate'), '');
  });
});

describe('ddtags', () => {
  it('serializes tags', () => {
    assert.equal(
      ddtags({
        one: '42',
        two: true,
        three: 42, // value will be removed because not string
      }),
      'one:42,two,three',
    );
  });
  it('removes , and |', () => {
    assert.equal(
      ddtags({
        one: '1,2',
        't|wo': '3,4',
      }),
      'one:12,two:34',
    );
  });
  it('preserves already serialized tags', () => {
    const given = {
      one: '42',
      two: true,
    };
    assert.equal(ddtags(ddtags(given)), ddtags(given));
  });
});

describe('example', () => {
  it('example to generate dd-statsd', () => {
    const templ = `{{#each metrics}}{{name}}:{{value}}|{{statsdType type}}|{{ddtags tags}}
{{/each}}`;
    const t = Template.compile(templ);
    const metrics: Metric[] = [
      { type: 'count', name: 'c1', value: 42, tags: { t: '3' } },
      { type: 'gauge', name: 'g1', value: 4242, tags: { t: '33' } },
    ];
    assert.equal(t({ metrics }), 'c1:42|c|t:3\ng1:4242|g|t:33\n');
  });
});
