import re, os, json, urllib.request, urllib.parse, html as H
UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36'}
def get(u): return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=120).read()
PAGES = ['https://nta.ac.in/NoticeBoardArchive', 'https://www.nta.ac.in/NoticeBoardArchive', 'https://nta.ac.in/Notices', 'https://ntaneet.nic.in/', 'https://nta.ac.in/Neetexam']
out = {}
for p in PAGES:
    try:
        t = get(p).decode('utf-8', 'ignore')
        hits = []
        for m in re.finditer(r'<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', t, re.I | re.S):
            txt = ' '.join(H.unescape(re.sub(r'<[^>]+>', ' ', m.group(2))).split())
            if re.search(r'NEET', txt, re.I) and re.search(r'answer|key', txt, re.I):
                hits.append([txt[:150], urllib.parse.urljoin(p, m.group(1))])
        out[p] = hits or ['no hits, len %d' % len(t)]
    except Exception as e:
        out[p] = ['ERROR ' + str(e)]
os.makedirs('neet-more/pdf', exist_ok=True)
for p, hits in out.items():
    for h in hits:
        if isinstance(h, list) and '2020' in h[0] and re.search(r'final', h[0], re.I):
            try:
                b = get(h[1])
                if b[:4] == b'%PDF': open('neet-more/pdf/nta-2020-final-key.pdf', 'wb').write(b); out['saved'] = h
            except Exception as e:
                out.setdefault('errors', []).append(str(e))
json.dump(out, open('neet-more/round4.json', 'w'), indent=1)
