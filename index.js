import Raven from 'raven-js'
import {Request, router} from './src/utils'
import test from './src/test'

Raven.config(process.env.RAVEN_DSN).install()

const routes = {
  default: test
}

async function handle_request(raw_request) {
  const request = new Request(raw_request)
  await request.prepare()
  Raven.captureMessage(`request ${request.url}`, {extra: {request: request.debug_info()}})
  try {
    const handler = router(routes)
    return handler(event.request)
  } catch (e) {
    Raven.captureException(e)
  }
}

addEventListener('fetch', event => {
  event.respondWith(handle_request(event.request))
})
