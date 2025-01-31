import { describe, expect, it } from 'vitest'
import Template, { ddtags, statsdType } from '../src/template'
import { Metric } from '../src/metrics'

describe('statsdType', () => {
  it('returns c if count given', () => {
    expect(statsdType('count')).toEqual('c')
  })
  it('returns g if gauge given', () => {
    expect(statsdType('gauge')).toEqual('g')
  })
  it('return nothing if otherwise', () => {
    expect(statsdType('rate')).toEqual('')
  })
})

describe('ddtags', () => {
  it('serializes tags', () => {
    expect(ddtags({
      one: '42',
      two: true,
      three: 42 // value will be removed because not string
    })).toEqual('one:42,two,three')
  })
  it('removes , and |', () => {
    expect(ddtags({
      one: '1,2',
      't|wo': '3,4'
    })).toEqual('one:12,two:34')
  })
  it('preserves already serialized tags', () => {
    const given = {
      one: '42',
      two: true
    }
    expect(ddtags(ddtags(given))).toEqual(ddtags(given))
  })
})

describe('example', () => {
  it('example to generate dd-statsd', () => {
    const templ = `{{#each metrics}}{{name}}:{{value}}|{{statsdType type}}|{{ddtags tags}}
{{/each}}`
    const t = Template.compile(templ)
    const metrics: Metric[] = [
      { type: 'count', name: 'c1', value: 42, tags: { t: '3' } },
      { type: 'gauge', name: 'g1', value: 4242, tags: { t: '33' } }
    ]
    expect(t({ metrics })).toEqual('c1:42|c|t:3\ng1:4242|g|t:33\n')
  })
})
