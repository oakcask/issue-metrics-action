import Handlebars from 'handlebars'

export function statsdType (type: unknown): string {
  if (type === 'count') {
    return 'c'
  }
  if (type === 'gauge') {
    return 'g'
  }
  return ''
}

function escapeDDTag (tag: string): string {
  return tag.replaceAll(/[,|]/g, '')
}

// Serializes into Datadog StatsD tags
export function ddtags (tags: unknown): string {
  if (typeof tags !== 'object') {
    const t = String(tags).split(',').map(o => {
      const [name, ...value] = o.split(':')
      if (value.length > 0) {
        return escapeDDTag(`${name}:${value.join('')}`)
      } else {
        return escapeDDTag(String(name))
      }
    })
    return t.join(',')
  }

  const t: string[] = []
  for (const name in tags) {
    const value = tags[name]
    if (typeof value === 'string') {
      t.push(escapeDDTag(`${name}:${value}`))
    } else {
      t.push(escapeDDTag(String(name)))
    }
  }

  return t.join(',')
}

Handlebars.registerHelper('statsdType', statsdType)
Handlebars.registerHelper('ddtags', ddtags)

export default Handlebars
