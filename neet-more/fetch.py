import re, os, json, urllib.request, urllib.parse, html as H
UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36'}
os.makedirs('neet-more/pdf', exist_ok=True)
def get(u):
    return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=120).read()
DIRECT = {
  'c360-2023-E1.pdf': 'https://cache.careers360.mobi/media/uploads/froala_editor/files/NEET-E1.pdf',
  'c360-2021-M1N1O1P1-en.pdf': 'https://cache.careers360.mobi/media/private/ebooks/pdf/2025/Sep/13/M1_N1_O1_P1_merged.pdf',
  'c360-2019-P1.pdf': 'https://cache.careers360.mobi/media/private/ebooks/pdf/2025/Aug/21/P1-paper.pdf',
  'c360-2019-final-key.pdf': 'https://cache.careers360.mobi/media/private/ebooks/pdf/2025/Aug/21/final-neet-official-answer-key.pdf',
}
log = {}
for name, u in DIRECT.items():
    try:
        b = get(u); open('neet-more/pdf/' + name, 'wb').write(b); log[name] = len(b)
    except Exception as e:
        log[name] = 'ERROR ' + str(e)
# Pages whose PDF links we download (labelled), to find the 2022 paper and 2020 key.
PAGES = {
  '2022-S1': 'https://collegedunia.com/articles/e-457-neet-2022-question-paper-with-answer-key-pdf-in-english-s1',
  '2022-Q1': 'https://collegedunia.com/news/e-457-neet-2022-question-paper-with-answer-key-pdf-in-english-q1',
  '2020-key': 'https://news.aglasem.com/neet-2020-official-answer-key-2020-released-by-nta/',
  '2020-qp': 'https://admission.aglasem.com/neet-2020-question-paper/',
}
found = {}
for tag, p in PAGES.items():
    try:
        t = get(p).decode('utf-8', 'ignore')
        links = []
        for m in re.finditer(r'''["'(=]((?:https?:)?[^"'()\s=]+?\.pdf)(?:[?#][^"'()\s]*)?["')&]''', t, re.I):
            u = urllib.parse.urljoin(p, H.unescape(m.group(1)))
            if u not in links: links.append(u)
        found[tag] = links[:15]
        for i, u in enumerate(links[:6]):
            try:
                b = get(u)
                if b[:4] == b'%PDF' and len(b) < 40_000_000:
                    fn = f'{tag}-{i}.pdf'; open('neet-more/pdf/' + fn, 'wb').write(b); log[fn] = [len(b), u]
            except Exception as e:
                log[f'{tag}-{i}'] = 'ERROR ' + str(e) + ' ' + u
    except Exception as e:
        found[tag] = ['ERROR ' + str(e)]
json.dump({'log': log, 'found': found}, open('neet-more/round3.json', 'w'), indent=1)
print(json.dumps(log, indent=1))
