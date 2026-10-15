import re, os, json, urllib.request, urllib.parse, html as H
UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36'}
os.makedirs('neet-more/pdf', exist_ok=True)
def get(u):
    return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=90).read()

# 1) Official NTA files
OFFICIAL = {
  'nta-2020-qp-E1.pdf': 'https://cdnbbsr.s3waas.gov.in/s37bc1ec1d9c3426357e69acd5bf320061/uploads/2022/02/2022021555.pdf',
  'nta-2021-final-key.pdf': 'https://cdnbbsr.s3waas.gov.in/s37bc1ec1d9c3426357e69acd5bf320061/uploads/2022/02/2022021699.pdf',
  'nta-2022-final-key.pdf': 'https://cdnbbsr.s3waas.gov.in/s37bc1ec1d9c3426357e69acd5bf320061/uploads/2022/09/2022090743.pdf',
  'nta-2023-final-key.pdf': 'https://www.nta.ac.in/Download/Notice/Notice_20230615172159.pdf',
}
log = {}
for name, u in OFFICIAL.items():
    try:
        b = get(u); open('neet-more/pdf/' + name, 'wb').write(b); log[name] = len(b)
    except Exception as e:
        log[name] = 'ERROR ' + str(e)

# 2) Labelled PDF links from careers360 / other pages
PAGES = [f'https://medicine.careers360.com/articles/neet-{y}-question-paper' for y in (2019, 2020, 2021, 2022, 2023)] + [
  'https://neet.nta.nic.in/archive/', 'https://neet.nta.nic.in/document-category/archive/',
]
labels = {}
for p in PAGES:
    try:
        t = get(p).decode('utf-8', 'ignore')
        pairs = []
        for m in re.finditer(r'<a\b[^>]*href=["\']([^"\']+\.pdf[^"\']*)["\'][^>]*>(.*?)</a>', t, re.I | re.S):
            href = urllib.parse.urljoin(p, m.group(1).replace('\\u002F', '/'))
            text = H.unescape(re.sub(r'<[^>]+>', ' ', m.group(2))).strip()
            ctx = H.unescape(re.sub(r'<[^>]+>', ' ', t[max(0, m.start() - 300):m.start()]))[-160:].strip()
            pairs.append({'href': href, 'text': ' '.join(text.split()), 'before': ' '.join(ctx.split())})
        labels[p] = pairs
    except Exception as e:
        labels[p] = [{'error': str(e)}]
json.dump({'official': log, 'labels': labels}, open('neet-more/round2.json', 'w'), indent=1)
print(log)
