import type { Octokit } from '@octokit/action'
import type { RequestParameters } from '@octokit/types'
import { IssueTimestampsQuery, IssueTimestampsQueryVariables } from './generated/graphql.js'

type Request = {
  __typename?: 'Query' | 'Mutation'
}

function req<T extends Request> (gh: Octokit, query: string, variables: RequestParameters): Promise<T> {
  return gh.graphql<T>(query, variables)
}

const issueTimestampsQuery = /* GraphQL */ `
  query issueTimestamps($repo: String!, $owner: String!, $number: Int!) {
    repository(name: $repo, owner: $owner) {
      issueOrPullRequest(number: $number) {
        ... on Issue {
          createdAt
          closedAt
        }
        ... on PullRequest {
          createdAt
          closedAt
        }
      }
    }
  }
`

export function queryIssueTimestaps (gh: Octokit, variables: IssueTimestampsQueryVariables): Promise<IssueTimestampsQuery> {
  return req(gh, issueTimestampsQuery, variables)
}
