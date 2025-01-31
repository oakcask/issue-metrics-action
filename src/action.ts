import fs from 'node:fs/promises'
import * as core from '@actions/core'
import { Octokit } from '@octokit/action'
import { Label, WebhookEvent } from '@octokit/webhooks-types'
import { queryIssueTimestaps } from './github.js'
import { Metric } from './metrics.js'
import Template from './template.js'

type Parameters = {
  owner: string,
  repo: string
} & (
  {
    type: 'issue',
    action: string,
    number: number,
    labels: Label[]
  } | {
    type: 'pr',
    action: string,
    number: number,
    labels: Label[],
    merged: boolean | null
  })

export async function parseParameters (): Promise<Parameters | undefined> {
  const payload = JSON.parse(await fs.readFile(process.env.GITHUB_EVENT_PATH!, 'utf8')) as WebhookEvent
  const repo = parseRepo(payload)
  if ('issue' in payload && payload.issue) {
    return {
      ...repo,
      type: 'issue',
      action: payload.action,
      number: payload.issue.number,
      labels: payload.issue.labels || []
    }
  }
  if ('pull_request' in payload && payload.pull_request) {
    return {
      ...repo,
      type: 'pr',
      action: payload.action,
      number: payload.pull_request.number,
      labels: payload.pull_request.labels || [],
      merged: payload.pull_request.state === 'closed' && 'merged' in payload.pull_request && payload.pull_request.merged
    }
  }

  return undefined
}

function parseRepo (payload: WebhookEvent): { owner: string, repo: string } {
  if (process.env.GITHUB_REPOSITORY) {
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/')
    return { owner, repo }
  }
  if ('repository' in payload && payload.repository) {
    return { owner: payload.repository.owner.login, repo: payload.repository.name }
  }

  throw new Error('cannot recognize the repository')
}

export async function main () {
  const octokit = new Octokit()
  const params = await parseParameters()
  const labelWhitelist = core.getMultilineInput('tag-labels').reduce((a, e) => {
    a[e] = true
    return a
  }, {} as { [key: string]: true })
  const template = Template.compile(core.getInput('template', { required: true }))
  const outputPath = core.getInput('output-path')

  if (!params) {
    core.info('cannot find a issue or pull request to update.')
    return
  }

  const timestamps = await queryIssueTimestaps(octokit, params)
  const metrics: { [key: string]: Metric } = {}

  if (timestamps.repository?.issueOrPullRequest) {
    const tags: { [key: string]: string | true } = {}
    const labels = params.labels.filter(o => labelWhitelist[o.name]).map(o => o.name)

    for (const label of labels) {
      tags[label] = true
    }
    tags.is = params.type
    if ('merged' in params && params.merged) {
      tags.merged = true
    }

    metrics.activities_count_metric = {
      type: 'count',
      name: 'activities_count',
      tags: { ...tags, action: params.action },
      value: 1
    }

    const { createdAt, closedAt } = timestamps.repository.issueOrPullRequest
    if (closedAt) {
      const durationSeconds = Date.parse(closedAt) - Date.parse(createdAt)

      metrics.duration_seconds_metric = {
        type: 'count',
        name: 'duration_seconds',
        tags,
        value: durationSeconds < 1 ? durationSeconds : Math.round(durationSeconds)
      }
    }
  }

  const result = template({
    ...metrics,
    metrics: Object.values(metrics)
  })

  if (outputPath === '') {
    for (const ln of result.split(/$/)) {
      core.info(ln)
    }
  } else {
    await fs.writeFile(outputPath, result)
  }
}
