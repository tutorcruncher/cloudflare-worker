import {Request, Sentry, router} from './src/utils'
import test from './src/test'

const routes = {
  default: test
}

async function handle_request(event) {
  const request = new Request(event.request)
  await request.prepare()
  const sentry = new Sentry(event, request)
  // sentry.captureMessage(`request ${request.url}`, {extra: {foo: 'bar', x: 42}})
  try {
    const handler = router(routes)
    return await handler(request)
  } catch (e) {
    sentry.captureException(e)
    return new Response('an error ocurred', {status: 500})
  }
}

addEventListener('fetch', event => {
  event.respondWith(handle_request(event))
})
