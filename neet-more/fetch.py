import re, os, json, urllib.request, urllib.parse
UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36'}
PAGES = [
  'https://allen.in/neet/question-paper-2023', 'https://allen.in/neet/question-paper-2022', 'https://allen.in/neet/question-paper-2021',
  'https://allen.in/neet/question-paper-2020', 'https://allen.in/neet/question-paper-2019', 'https://allen.in/neet/previous-year-question-papers',
  'https://www.aakash.ac.in/neet-question-papers-solutions-pdf',
  'https://medicine.careers360.com/articles/neet-2023-question-paper', 'https://medicine.careers360.com/articles/neet-2022-question-paper',
  'https://medicine.careers360.com/articles/neet-2021-question-paper', 'https://medicine.careers360.com/articles/neet-2020-question-paper',
  'https://medicine.careers360.com/articles/neet-2019-question-paper',
  'https://motion.ac.in/neet-answer-key-solutions-2022/',
]
out = {}
for p in PAGES:
    try:
        html = urllib.request.urlopen(urllib.request.Request(p, headers=UA), timeout=40).read().decode('utf-8', 'ignore')
        links = sorted(set(urllib.parse.urljoin(p, m) for m in re.findall(r'''["'(]([^"'()\s]+?\.pdf[^"'()\s]*)["')]''', html, re.I)))
        out[p] = links
    except Exception as e:
        out[p] = ['ERROR ' + str(e)]
os.makedirs('neet-more', exist_ok=True)
json.dump(out, open('neet-more/links.json', 'w'), indent=1)
print(sum(len(v) for v in out.values()), 'links')
