#!/usr/bin/env python3.6
import platform
import os
import shlex
import subprocess
import sys
from pathlib import Path
import requests

worker_fake_url = 'https://workers.tutorcruncher.com'
if len(sys.argv) > 1:
    worker_fake_url += f'/{sys.argv[1]}'


def get_browser_opener():
    system = platform.system()
    if system == 'Linux':
        # what about linux without gnome?
        # on some version this should be `gnome-open`
        return 'gvfs-open'
    elif system == 'Windows':
        return 'start chrome'  # random guess, I don't much care
    else:
        return 'open'  # osx at least


p = subprocess.run(('git', 'rev-parse', 'HEAD'), check=True, stdout=subprocess.PIPE)
release = p.stdout.decode().strip('\n')
subprocess.run(('yarn', 'build'), check=True, env={'RELEASE': release, 'RAVEN_DSN': os.getenv('RAVEN_DSN', '')})

bearer_token = os.getenv('BEARER_TOKEN')
headers = {
    'Authorization': f'Bearer {bearer_token}',
}
data = {'version': release}
r = requests.post('https://sentry.io/api/0/projects/tutorcruncher/cf-workers/releases/', json=data, headers=headers)
assert r.status_code in (201, 208), (r.status_code, r.text)

dist = Path('dist')
assert dist.is_dir()

files = {'file': ('~/worker.js.map', (dist / 'worker.js.map').open('rb'))}

if r.status_code == 208:
    print('release already existing, deleting release and recreating')
    r = requests.delete(f'https://sentry.io/api/0/projects/tutorcruncher/cf-workers/releases/{release}/',
                        headers=headers)
    assert r.status_code == 204, (r.status_code, r.text)

    r = requests.post('https://sentry.io/api/0/projects/tutorcruncher/cf-workers/releases/', json=data, headers=headers)
    assert r.status_code in (201, 208), (r.status_code, r.text)

print('uploading release assets')
r = requests.post(f'https://sentry.io/api/0/projects/tutorcruncher/cf-workers/releases/{release}/files/',
                  files=files, headers=headers)
assert r.status_code == 201, (r.status_code, r.text)

content = (dist / 'worker.js').read_bytes()
r = requests.post('https://cloudflareworkers.com/script', data=content)
assert r.status_code == 201, (r.status_code, r.text)

upload_id = r.json()['id']

page_url = f'https://cloudflareworkers.com/#{upload_id}:{worker_fake_url}'
print('opening "{}"'.format(page_url))
p = subprocess.Popen(shlex.split(f'{get_browser_opener()} {page_url}'), stderr=subprocess.PIPE, stdout=subprocess.PIPE)
p.wait()
assert p.returncode == 0
