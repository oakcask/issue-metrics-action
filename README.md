# issue-metrics-action

Generate metric on triggered issues or pull requests event.

## Getting Started

```yaml
name: example
on:
  issues:
  pull_request:
jobs:
  mark:
    runs-on: ubuntu-latest
    steps:
      - uses: oakcask/issue-metrics-action@v1
        with:
          token: "${{ secrets.GITHUB_TOKEN }}"
          template: |-
            {{#each metrics}}{{name}}:{{value}}|{{statsdType type}}|{{ddtags tags}}
            {{/each}}
```
