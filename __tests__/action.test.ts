import { describe, expect, it, beforeEach } from 'vitest'
import { parseParameters } from '../src/action'

describe('parseParameters', () => {
  beforeEach(() => {
    process.env.GITHUB_REPOSITORY = 'foo/bar'
    process.env.GITHUB_EVENT_PATH = '__tests__/fixtures/payload.json'
  })

  it('takes owner/repo from env', async () => {
    const params = await parseParameters()
    expect(params?.owner).toEqual('foo')
    expect(params?.repo).toEqual('bar')
  })

  it('takes owner/repo from payload instead if the env is empty', async () => {
    delete process.env.GITHUB_REPOSITORY
    const params = await parseParameters()
    expect(params?.owner).toEqual('owner-in-payload')
    expect(params?.repo).toEqual('repo-in-payload')
  })

  it('takes issue number and body from payload', async () => {
    const params = (await parseParameters())!
    expect(params.number).toEqual(42)
  })

  describe('when the payload withoout a issue', async () => {
    beforeEach(() => {
      process.env.GITHUB_EVENT_PATH = '__tests__/fixtures/payload.no-issue.json'
    })

    it('is undefined', async () => {
      const params = await parseParameters()
      expect(params).toBeUndefined()
    })
  })

  describe('when the payload includes pull_request', () => {
    beforeEach(() => {
      process.env.GITHUB_EVENT_PATH = '__tests__/fixtures/payload.pull_request.json'
    })

    it('takes pull request number and body from payload', async () => {
      const params = (await parseParameters())!
      expect(params.number).toEqual(4242)
      expect('merged' in params && params.merged).toEqual(true)
    })
  })
})
