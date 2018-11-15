addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

const ic_token = ''
const intercom_url = 'https://api.intercom.io/'
const no_sup_msg = `
Thanks for getting in touch 😃

You currently do not have a \
support package, so we may take a little while longer to get back to you (up to 2 business days).

If you wish to upgrade your support plan, you can do that \
for only $12 by clicking <a href="https://secure.tutorcruncher.com/billing"/>here</a>! \
Please note this might take an hour to update, so just reply here saying you've changed your \
support plan and we'll check 😃
`

const bot_admin_id = '2693259'

const headers2obj = h => Object.assign(...Array.from(h.entries()).map(([k, v]) => ({[k]: v})))
const lenient_json = t => {
  try {
    return JSON.parse(t)
  } catch (err) {
    return t
  }
}

const log = async (message, data) => {
  console.log(`${message}:`, data)
  await fetch('https://events.scolvin.com/cf-worker-logging', {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({message, data})
  })
}

async function handleRequest(request) {
  const request_body = await request.text()
  const request_data = {
    start_time: (new Date()).toString(),
    method: request.method,
    url: request.url,
    headers: headers2obj(request.headers),
    body: lenient_json(request_body)
  }
  await log('request_data', request_data)

  if (request.method !== 'POST') {
    return new Response('', {status: 405})
  }
  let response_content = await process_intercom(request_body)
  response_content = response_content || {'message': 'ok'}
  const config = {
    headers: {'Content-Type': 'application/json'}
  }
  return new Response(JSON.stringify(response_content) + '\n', config)
}

async function process_intercom(body) {
  let r_payload
  try {
    r_payload = JSON.parse(body)
  } catch (err) {
    return {error: 'invalid json'}
  }

  if (r_payload.type !== 'notification_event') {
    return {message: 'Not an event notification'}
  }
  const conversation_id = r_payload.data.item.id
  const user_id = r_payload.data.item.user.user_id

  const conf = {
    headers: {
      'Authorization': 'Bearer ' + ic_token,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }
  const u_response = await fetch(`${intercom_url}/users/?user_id=${user_id}`, conf)
  const u_payload = await u_response.json()

  const companies = u_payload.companies
  if (!companies) {
    return {message: 'User has no companies'}
  }
  const company_id = companies.companies[0].company_id
  const c_response = await fetch(`${intercom_url}/companies/?company_id=${company_id}`, conf)
  const c_payload = await c_response.json()
  const c_support_level = c_payload.custom_attributes.support_plan
  if (c_support_level !== 'No Support') {
    return {message: 'Company has support'}
  }
  const con_data = {
    type: 'admin',
    message_type: 'comment',
    admin_id: bot_admin_id,
    body: no_sup_msg,
    assignee_id: bot_admin_id,
  }
  const post_conf = Object.assign({}, conf, {method: 'POST', body: JSON.stringify(con_data)})
  const conv_response = await fetch(intercom_url + `/conversations/${conversation_id}/reply`, post_conf)
  await conv_response.json()
}
