"""Read committed HTML/JS only. No browser, network, form values or provider calls."""
import json
import re
import subprocess
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).with_name('source-inventory.json')


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT).decode('utf-8')


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.forms = []
        self.external_script_hosts = set()
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'form':
            url = urlsplit(attrs.get('action', ''))
            self.forms.append({
                'id': attrs.get('id'),
                'contract': attrs.get('data-contact-form'),
                'action_host': url.hostname,
                'action_path': url.path,
                'method': attrs.get('method', 'get'),
            })
        if tag == 'script' and attrs.get('src'):
            host = urlsplit(attrs['src']).hostname
            if host:
                self.external_script_hosts.add(host)


def inventory(ref):
    names = git('ls-tree', '-r', '--name-only', ref).splitlines()
    names = [n for n in names if n.endswith(('.html', '.js'))
             and not n.startswith(('docs/', 'scripts/'))]
    identifiers, forms, sources, explicit = {}, {}, {}, []
    for name in names:
        source = git('show', ref + ':' + name)
        for token in sorted(set(re.findall(r'\b(?:GTM-|GT-|AW-|G-)[A-Z0-9]+\b', source))):
            identifiers.setdefault(token, []).append(name)
        if re.search(r'\buser_data\b|enhanced_conversion|allow_enhanced|sha256|sha_256', source, re.I):
            explicit.append(name)
        if name.endswith('.html'):
            page = Page(source)
            if page.forms:
                forms[name] = page.forms
            for host in sorted(page.external_script_hosts):
                sources.setdefault(host, []).append(name)
    return {
        'sha': git('rev-parse', ref).strip(),
        'html_count': sum(n.endswith('.html') for n in names),
        'javascript_count': sum(n.endswith('.js') for n in names),
        'identifiers': identifiers,
        'forms': forms,
        'external_script_hosts': sources,
        'explicit_upd_or_hashing_pattern_files': explicit,
        'limits': 'Static tracked HTML/JS only; excludes docs/tests, remote script bodies, GTM-injected tags, other sites and offline/API uploads. ad_user_data consent flags are not user_data payloads.'
    }


result = {'audit_date': '2026-10-11', 'main': inventory('origin/main'), 'pr': inventory('HEAD')}
OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
for label in ('main', 'pr'):
    value = result[label]
    print(label, json.dumps({
        'sha': value['sha'], 'html_count': value['html_count'],
        'ids_file_counts': {k: len(v) for k, v in value['identifiers'].items()},
        'forms': value['forms'],
        'explicit_upd_or_hashing_pattern_files': value['explicit_upd_or_hashing_pattern_files'],
        'script_hosts': sorted(value['external_script_hosts']),
    }, ensure_ascii=False))
