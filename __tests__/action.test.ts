/* eslint-disable camelcase */
import { beforeEach, describe, expect, it } from 'vitest';
import { generateMetrics, parseParameters } from '../src/action';

describe('parseParameters', () => {
  beforeEach(() => {
    process.env.GITHUB_REPOSITORY = 'foo/bar';
    process.env.GITHUB_EVENT_PATH = '__tests__/fixtures/payload.json';
  });

  it('takes owner/repo from env', async () => {
    const params = await parseParameters();
    expect(params?.owner).toEqual('foo');
    expect(params?.repo).toEqual('bar');
  });

  it('takes owner/repo from payload instead if the env is empty', async () => {
    delete process.env.GITHUB_REPOSITORY;
    const params = await parseParameters();
    expect(params?.owner).toEqual('owner-in-payload');
    expect(params?.repo).toEqual('repo-in-payload');
  });

  it('takes issue number and body from payload', async () => {
    const params = (await parseParameters())!;
    expect(params.number).toEqual(42);
  });

  it('takes timestamp', async () => {
    const params = (await parseParameters())!;
    expect(params.createdAt).toEqual('2006-01-02T15:04:06+0700');
  });

  describe('when the payload withoout a issue', async () => {
    beforeEach(() => {
      process.env.GITHUB_EVENT_PATH =
        '__tests__/fixtures/payload.no-issue.json';
    });

    it('is undefined', async () => {
      const params = await parseParameters();
      expect(params).toBeUndefined();
    });
  });

  describe('when the payload includes pull_request', () => {
    beforeEach(() => {
      process.env.GITHUB_EVENT_PATH =
        '__tests__/fixtures/payload.pull_request.json';
    });

    it('takes pull request number and body from payload', async () => {
      const params = (await parseParameters())!;
      expect(params.number).toEqual(4242);
      expect('merged' in params && params.merged).toEqual(true);
    });

    it('takes timestamp', async () => {
      const params = (await parseParameters())!;
      expect(params.createdAt).toEqual('2006-01-02T15:04:06+0700');
      expect(params.closedAt).toEqual('2016-01-02T15:04:06+0700');
    });
  });
});

describe('generateMetrics', () => {
  it('generates issue metrics', () => {
    const got = generateMetrics(
      {
        owner: 'foo',
        repo: 'bar',
        type: 'issue',
        action: 'opened',
        number: 42,
        labels: [{ name: 'feature' }, { name: 'needs:triage' }],
        createdAt: '2006-01-02T15:04:06+0700',
      },
      {
        epic: true,
        'needs:triage': true,
      },
    );

    const activities_count = {
      type: 'count',
      name: 'activities_count',
      tags: {
        repo: 'foo/bar',
        is: 'issue',
        number: '42',
        action: 'opened',
        'needs:triage': true,
      },
      value: 1,
    };
    expect(got).toStrictEqual({ activities_count });
  });

  it('generates PR metrics', () => {
    const got = generateMetrics(
      {
        owner: 'foo',
        repo: 'bar',
        type: 'pr',
        action: 'closed',
        number: 42,
        labels: [{ name: 'bugfix' }, { name: 'techdebt' }],
        createdAt: '2006-01-02T15:04:06+0700',
        closedAt: '2006-01-02T15:14:06+0700',
        merged: true,
      },
      {
        techdebt: true,
        bug: true,
      },
    );

    const activities_count = {
      type: 'count',
      name: 'activities_count',
      tags: {
        repo: 'foo/bar',
        is: 'pr',
        number: '42',
        action: 'closed',
        merged: true,
        techdebt: true,
      },
      value: 1,
    };
    const duration_seconds = {
      type: 'count',
      name: 'duration_seconds',
      tags: {
        repo: 'foo/bar',
        is: 'pr',
        number: '42',
        merged: true,
        techdebt: true,
      },
      value: 600,
    };
    expect(got).toStrictEqual({ activities_count, duration_seconds });
  });
});
