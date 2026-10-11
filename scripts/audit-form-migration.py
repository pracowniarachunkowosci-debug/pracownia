"""Inventory and regression against the immutable stage-4 commit; no provider calls."""
import json, re, subprocess, sys
from pathlib import Path
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parent.parent
BASE = '872e7183f2128046136716a1300584d206cdf394'
PAGES = ['case-study-estonski-cit-ecommerce.html', 'estonski-cit-ecommerce.html',
         'estonski-cit-spolka-z-oo.html', 'interpretacje-estonski-cit.html',
         'ksiegowosc-ecommerce.html', 'ksiegowosc-spolka-z-oo.html',
         'ukryte-zyski-estonski-cit.html', 'zmiana-biura-estonski-cit.html']
OUT = ROOT / 'docs/zewnetrzny-dzial-finansowy/stage5'

class Inventory(HTMLParser):
    def __init__(self, text):
        super().__init__(); self.forms = []; self.current = None; self.feed(text)
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'form':
            self.current = {'attributes': a, 'controls': []}; self.forms.append(self.current)
        elif self.current is not None and tag in ('input', 'select', 'textarea'):
            self.current['controls'].append({'tag': tag, **a})
    def handle_endtag(self, tag):
        if tag == 'form': self.current = None

def original(name):
    return subprocess.check_output(['git', 'show', BASE + ':' + name], cwd=ROOT).decode('utf-8')

def safe_form(form):
    clean = json.loads(json.dumps(form))
    for c in clean['controls']:
        if c.get('name') in ('access_key', 'to', 'email', 'cc', 'bcc') and c.get('value'):
            c['value'] = '[present; not logged]'
    return clean

records = []
for name in PAGES:
    before = original(name)
    inv = Inventory(before)
    row = {'page': name, 'baselineFormCount': len(inv.forms), 'forms': [safe_form(f) for f in inv.forms],
           'legacySubmitCode': 'generate_lead' in before and '1600' in before,
           'providerReceiver': 'Resolved by the preserved Web3Forms key; mailbox not inferred' if inv.forms else 'No form/key/receiver in this page',
           'nativeBehaviour': 'POST into hidden iframe; submit conversion and 1600 ms redirect' if inv.forms else 'Calendly links; dead leadForm handler',
           'liveDeliveryTested': False}
    if '--verify' in sys.argv:
        after = (ROOT / name).read_text(encoding='utf-8')
        now = Inventory(after)
        assert len(now.forms) == len(inv.forms), name + ': form count changed'
        assert 'generate_lead' not in after and '1600' not in after, name + ': legacy tracking remains'
        # Metadata, content, packages and consent language remain unchanged.
        for pattern in [r'<title>.*?</title>', r'<h1\b[^>]*>.*?</h1>', r'<meta\b[^>]*>',
                        r'<link\b[^>]*rel="canonical"[^>]*>', r'<script type="application/ld\+json">.*?</script>',
                        r'<label class="consent">.*?</label>', r'<a\b[^>]*href="[^"]*"[^>]*>.*?</a>',
                        r'<option\b[^>]*>.*?</option>']:
            assert re.findall(pattern, before, re.S) == re.findall(pattern, after, re.S), name + ': existing content changed'
        scripts = lambda s: re.findall(r'<script\b[^>]*>.*?</script>', s.split('</head>')[0], re.S)
        assert scripts(before) == scripts(after), name + ': analytics bootstrap changed'
        for old, new in zip(inv.forms, now.forms):
            for attr in ('id', 'action', 'method'):
                assert old['attributes'].get(attr) == new['attributes'].get(attr), name + ': routing/id changed'
            assert old['controls'] == [c for c in new['controls'] if c.get('name') != 'inquiry_source'], name + ': fields/key changed'
            assert new['attributes'].get('target') is None, name + ': hidden native response'
            assert 'data-form-status' in after and 'role="status"' in after and 'tabindex="-1"' in after
            assert after.count('src="assets/js/contact-form.js"') == 1
        row['status'] = 'MIGRATED; original controls/routing preserved' if inv.forms else 'NO FORM; dead handler removed; content unchanged'
    records.append(row)
OUT.mkdir(parents=True, exist_ok=True)
report = {'baseline': BASE, 'mode': 'verification' if '--verify' in sys.argv else 'inventory-before-edit', 'pages': records,
          'actualLegacyForms': sum(r['baselineFormCount'] for r in records)}
(OUT / ('inventory-verified.json' if '--verify' in sys.argv else 'inventory-before.json')).write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'mode': report['mode'], 'actualLegacyForms': report['actualLegacyForms'], 'pages': [{'page':r['page'],'forms':r['baselineFormCount'],'status':r.get('status','inventoried')} for r in records]}, ensure_ascii=False, indent=2))
