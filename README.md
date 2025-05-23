# issue-metrics-action

Generate metric on triggered issues or pull requests event.

## Getting Started

```yaml
name: example / statsd
on:
  issues:
    types:
      - opened
      - edited
      - deleted
      - transferred
      - closed
      - reopened
  pull_request:
    types:
      - assigned
      - unassigned
      - opened
      - edited
      - closed
      - reopened
      - synchronize
      - ready_for_review
      - converted_to_draft
jobs:
  export:
    runs-on: ubuntu-latest
    steps:
      - uses: oakcask/issue-metrics-action@v1
        with:
          # This is a example to generate StatsD format with tags.
          # (Note that tags are Datadog extension)
          #
          # https://github.com/b/statsd_spec
          # https://docs.datadoghq.com/developers/dogstatsd/datagram_shell/?tab=metrics
          template: |-
            {{#each metrics}}{{name}}:{{value}}|{{statsdType type}}|#{{ddtags tags}}
            {{/each}}

```

### Template

`template` is a template that specifies how the metrics are serialized,
written in [Handlebars](https://handlebarsjs.com/).
