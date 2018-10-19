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
