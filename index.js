import * as Sentry from '@sentry/minimal'
import {Request, router} from './src/utils'
import test from './src/test'

Sentry.init({dsn: process.env.RAVEN_DSN})

const routes = {
  default: test
}

async function handle_request(raw_request) {
  const request = new Request(raw_request)
  await request.prepare()
  Sentry.captureMessage(`request ${request.url}`, {extra: {request: request.debug_info()}})
  try {
    const handler = router(routes)
    return handler(event.request)
  } catch (e) {
    Sentry.captureException(e)
  }
}

addEventListener('fetch', event => {
  event.respondWith(handle_request(event.request))
})
