import fs from 'node:fs/promises'
import * as core from '@actions/core'
import { Label, WebhookEvent } from '@octokit/webhooks-types'
import Template from './template.js'
import { Metric, Tags } from './metrics-types.js'

type Parameters = {
  owner: string,
  repo: string,
  action: string,
  number: number,
  labels: Pick<Label, 'name'>[],
  createdAt: string,
  closedAt?: string
} & (
  {
    type: 'issue',
  } | {
    type: 'pr',
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
      labels: payload.issue.labels || [],
      createdAt: payload.issue.created_at,
      closedAt: payload.issue.closed_at ?? undefined
    }
  }
  if ('pull_request' in payload && payload.pull_request) {
    return {
      ...repo,
      type: 'pr',
      action: payload.action,
      number: payload.pull_request.number,
      labels: payload.pull_request.labels || [],
      merged: payload.pull_request.state === 'closed' && 'merged' in payload.pull_request && payload.pull_request.merged,
      createdAt: payload.pull_request.created_at,
      closedAt: payload.pull_request.closed_at ?? undefined
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

type LabelWhitelist = {
  [key: string]: true
}

type Metrics = {
  activities_count: Metric,
  duration_seconds?: Metric
}

function generateActionsCount (params: Parameters, tags: Tags): Metric {
  return {
    type: 'count',
    name: 'activities_count',
    tags: { ...tags, action: params.action },
    value: 1
  }
}

function generateDurationSeconds (params: Parameters, tags: Tags): Metric | undefined {
  const { createdAt, closedAt } = params
  if (closedAt) {
    const durationMillis = Date.parse(closedAt) - Date.parse(createdAt)
    const durationSeconds = durationMillis / 1000
    return {
      type: 'count',
      name: 'duration_seconds',
      tags,
      value: durationSeconds < 1 ? durationSeconds : Math.round(durationSeconds)
    }
  }
}

export function generateMetrics (params: Parameters, labelWhitelist: LabelWhitelist): Metrics {
  const tags: { [key: string]: string | true } = {}
  const labels = params.labels.filter(o => labelWhitelist[o.name]).map(o => o.name)

  for (const label of labels) {
    tags[label] = true
  }
  tags.is = params.type
  if ('merged' in params && params.merged) {
    tags.merged = true
  }
  tags.repo = `${params.owner}/${params.repo}`

  const metrics = {
    // eslint-disable-next-line camelcase
    activities_count: generateActionsCount(params, tags),
    // eslint-disable-next-line camelcase
    duration_seconds: generateDurationSeconds(params, tags)
  }

  // prevent enumerating undefined properties
  for (const key in metrics) {
    if (typeof metrics[key] === 'undefined') {
      delete metrics[key]
    }
  }

  return metrics
}

export async function main () {
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

  const metrics = generateMetrics(params, labelWhitelist)
  const result = template({ metrics })

  if (outputPath === '') {
    for (const ln of result.split(/$/)) {
      core.info(ln)
    }
  } else {
    await fs.writeFile(outputPath, result)
  }
}
