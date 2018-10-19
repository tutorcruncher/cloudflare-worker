const headers2obj = h => Object.assign(...Array.from(h.entries()).map(([k, v]) => ({[k]: v})))
const lenient_json = t => {
  try {
    return JSON.parse(t)
  } catch (err) {
    return t
  }
}

export class Request {
  constructor (raw_request) {
    this.raw_request = raw_request
    this.headers = headers2obj(raw_request.headers)
    this.start_time = new Date()
    this.method = raw_request.method
    this.url = raw_request.url
  }

  async prepare () {
    this._text = await this.raw_request.text()
  }

  async json () {
    return JSON.parse(this.text)
  }

  async text () {
    return this._text
  }

  debug_info () {
    return {
      start_time: this.start_time.toString(),
      method: this.method,
      url: this.url,
      headers: this.headers,
      body: lenient_json(this._text)
    }
  }
}

export function router (routes) {
  return routes['default']
}

function get_frames (stack) {
  const lines = stack.split('\n')
  lines.splice(0, 1)
  return lines.map(l => {
    const func = l.match(/at (\S+)/)[1]
    const b = l.match(/\((.*)\)/)[1]
    const [filename, lineno, colno] = b.split(':')
    return {
      in_app: true,
      filename: '~/dist/' + filename,
      function: func,
      lineno,
      colno,
    }
  })
}

export class Sentry {
  constructor (event, request) {
    this.event = event
    this.request = request
    const dsn = process.env.RAVEN_DSN
    if (!dsn) {
      return
    }
    const api_key = dsn.match(/\/\/(.+?)@/)[1]
    const project_id = dsn.match(/\.io\/(.+)/)[1]
    this.sentry_url = `https://sentry.io/api/${project_id}/store/` +
                      `?sentry_version=7&sentry_client=cloudflare-worker-custom&sentry_key=${api_key}`
    this.release = process.env.RELEASE
  }

  capture (data) {
    const defaults = {
      platform: 'javascript',
      fingerprint: [`${this.request.method}-${this.request.url}-${data.message || 'null'}`],
      user: {
        ip_address: this.request.headers['cf-connecting-ip']
      },
      request: {
          url: this.request.url,
          method: this.request.method,
          headers: this.request.headers,
      },
    }
    if (this.release) {
      defaults.release = this.release
    }
    const promise = fetch(this.sentry_url, {body: JSON.stringify(Object.assign(defaults, data)), method: 'POST'})
    this.event.waitUntil(promise)
  }

  captureMessage (message, config) {
    config = config || {}
    return this.capture({
      message,
      level: config.level || 'info',
      extra: config.extra || null
    })
  }

  captureException (exc, config) {
    config = config || {}
    return this.capture({
      exception: {
        mechanism: {handled: true, type: 'generic'},
        values: [
          {
            type: 'Error',
            value: exc.message || 'Unknown error',
            stacktrace: {frames: get_frames(exc.stack)},
          }
        ]
      },
      level: config.level || 'error',
      extra: config.extra || null,
    })
  }
}
