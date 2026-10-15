import re, os, json, urllib.request, html as H
UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36'}
def get(u): return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=120).read()
t = get('https://nta.ac.in/NoticeBoardArchive').decode('utf-8', 'ignore')
hits = []
for m in re.finditer(r'NEET', t):
    seg = t[max(0, m.start() - 600): m.start() + 400]
    if re.search(r'Answer\s*Key', seg, re.I) and '2020' in seg:
        pdfs = re.findall(r'[\w/\.:-]*Notice_\d+\.pdf', seg)
        txt = ' '.join(H.unescape(re.sub(r'<[^>]+>', ' ', seg)).split())
        hits.append([txt[-300:], pdfs])
json.dump(hits[:60], open('neet-more/round5.json', 'w'), indent=1)
os.makedirs('neet-more/pdf', exist_ok=True)
for txt, pdfs in hits:
    if re.search(r'final', txt, re.I):
        for u in pdfs:
            u = u if u.startswith('http') else 'https://nta.ac.in/' + u.lstrip('./')
            try:
                b = get(u)
                if b[:4] == b'%PDF': open('neet-more/pdf/cand-' + u.split('/')[-1], 'wb').write(b)
            except Exception: pass
