const foo = () => {
  throw Error('broken more')
}

export default async function handle_request(request) {
  foo()
  return new Response('this is a test response')
}
