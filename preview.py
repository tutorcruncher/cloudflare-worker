#!/usr/bin/env python3.6
import platform
import subprocess
import shlex
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


subprocess.run(('yarn', 'build'), check=True)

content = Path('dist/worker.js').read_bytes()
r = requests.post('https://cloudflareworkers.com/script', data=content)
assert r.status_code == 201, r.text

upload_id = r.json()['id']

page_url = f'https://cloudflareworkers.com/#{upload_id}:{worker_fake_url}'
print('opening "{}"'.format(page_url))
p = subprocess.Popen(shlex.split(f'{get_browser_opener()} {page_url}'), stderr=subprocess.PIPE, stdout=subprocess.PIPE)
p.wait()
assert p.returncode == 0
