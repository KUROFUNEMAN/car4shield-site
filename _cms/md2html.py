#!/usr/bin/env python3
"""car 4 shield fukuoka：CMS（Sveltia）で書いたブログ記事 content/blog/*.md を、今のブログ記事と同じデザインの HTML にする。
標準ライブラリだけ。GitHub Actions（.github/workflows/blog.yml）と手元の build.py の両方から呼ぶ。
  python3 _cms/md2html.py [サイトの一番上のフォルダ]   （省略時はこのファイルの1つ上）
作るもの：blog/<slug>/index.html（CMS の記事だけ）・blog/index.html（旧14記事＋CMS の記事）・トップ index.html の最新3件・sitemap.xml
旧14記事の HTML には触らない。型は build.py が書き出した _cms/post.tpl.html・blog_index.tpl.html・legacy.json・sitemap_urls.json。
"""
import html, json, os, re, shutil, sys, urllib.parse

ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
CMS = os.path.join(ROOT, '_cms')
SRC = os.path.join(ROOT, 'content', 'blog')
esc = html.escape
SITE_URL = 'https://car4shield.co.jp'
TAGS = {'PPF': 'プロテクションフィルム', 'プロテクションフィルム': 'プロテクションフィルム', 'カーラッピング': 'カーラッピング', 'ラッピング': 'カーラッピング',
        'コーティング': 'カーコーティング', 'カーコーティング': 'カーコーティング', 'フロントガラス保護': 'フロントガラス保護', '洗車・磨き': '洗車・磨き'}


# ── front matter（YAML の簡単なもの／JSON）──
def _scalar(v):
    v = v.strip()
    if not v: return ''
    if v[0] == v[-1] and v[0] in '"\'' and len(v) >= 2:
        if v[0] == '"':
            try: return json.loads(v)
            except Exception: return v[1:-1]
        return v[1:-1].replace("''", "'")
    if v in ('true', 'false'): return v == 'true'
    if v in ('null', '~'): return None
    if v.startswith('[') and v.endswith(']'):
        return [_scalar(x) for x in v[1:-1].split(',') if x.strip()]
    return v

def _ja_join(m):
    s = m.string; a = s[m.start() - 1] if m.start() else ''; b = s[m.end()] if m.end() < len(s) else ''
    return (a and ord(a) > 0x2e80) or (b and ord(b) > 0x2e80)

def parse_front(text):
    text = text.lstrip('﻿')
    if text.startswith('{'):                      # json-frontmatter
        dec = json.JSONDecoder(); meta, end = dec.raw_decode(text)
        return meta, text[end:].lstrip('\n')
    if not text.startswith('---'):
        return {}, text
    m = re.match(r'---[ \t]*\n(.*?)\n---[ \t]*(?:\n|$)', text, re.S)
    if not m: return {}, text
    lines = m.group(1).split('\n'); body = text[m.end():]
    meta = {}; i = 0
    while i < len(lines):
        ln = lines[i]
        mm = re.match(r'^([A-Za-z_][\w-]*):(.*)$', ln)
        if not mm: i += 1; continue
        k, v = mm.group(1), mm.group(2).strip()
        if v in ('|', '|-', '|+', '>', '>-', '>+'):
            blk = []; i += 1
            while i < len(lines) and (lines[i].startswith(' ') or not lines[i].strip()):
                blk.append(lines[i]); i += 1
            ind = min((len(x) - len(x.lstrip()) for x in blk if x.strip()), default=0)
            blk = [x[ind:] for x in blk]
            s = '\n'.join(blk).rstrip('\n') if v.startswith('|') else re.sub(r'\s*\n\s*', lambda m: '' if _ja_join(m) else ' ', '\n'.join(blk)).strip()
            meta[k] = s; continue
        if v == '':
            items = []; i += 1
            while i < len(lines) and re.match(r'^\s*-\s', lines[i]):
                items.append(_scalar(re.sub(r'^\s*-\s', '', lines[i]))); i += 1
            # 「- image: xxx」形の時は値だけ取る
            items = [re.sub(r'^[\w-]+:\s*', '', x) if isinstance(x, str) and re.match(r'^[\w-]+:\s', x) else x for x in items]
            meta[k] = [_scalar(x) if isinstance(x, str) else x for x in items] if items else ''
            continue
        meta[k] = _scalar(v); i += 1
    return meta, body


# ── Markdown → HTML（よく使う形だけ）──
SAFE_HREF = re.compile(r'^(https?:|/|#|mailto:|tel:)', re.I)

def inline(s):
    # 作ったタグは \x00番号\x00 で預けて、あとの置き換え（自動リンクなど）が属性の中に入り込まないようにする
    tags = []
    def keep(t): tags.append(t); return f'\x00{len(tags) - 1}\x00'
    s = esc(s.replace('\x00', ''), quote=True)
    def img(m):
        src = html.unescape(m.group(2))
        if not SAFE_HREF.match(src): return m.group(0)
        return keep(f'<img src="{esc(src)}" alt="{esc(html.unescape(m.group(1)))}" loading="lazy">')
    s = re.sub(r'!\[([^\]]*)\]\(([^)\s]+)[^)]*\)', img, s)
    def link(m):
        text, href = m.group(1), html.unescape(m.group(2))
        if not SAFE_HREF.match(href): return m.group(0)     # javascript: などはリンクにしない
        if re.match(r'^(https?:)?//', href) and 'car4shield.co.jp' not in href:
            return keep(f'<a href="{esc(href)}" target="_blank" rel="noopener">') + text + keep('</a>')
        return keep(f'<a href="{esc(href)}">') + text + keep('</a>')
    s = re.sub(r'\[([^\]]+)\]\(([^)\s]+)\)', link, s)
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'(?<![A-Za-z0-9*])\*(?![\s*])(.+?)(?<![\s*])\*(?![A-Za-z0-9*])', r'<em>\1</em>', s)
    s = re.sub(r'~~(.+?)~~', r'<del>\1</del>', s)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    s = re.sub(r'(?<![\w/\x00])(https?://(?:[^\s<&\x00]|&amp;)+)', lambda m: keep(f'<a href="{m.group(1)}"' + ('' if 'car4shield.co.jp' in m.group(1) else ' target="_blank" rel="noopener"') + '>') + m.group(1) + keep('</a>'), s)
    s = re.sub(r'(?: {2,}|\\)\n', '<br>', s)
    s = re.sub(r'\x00(\d+)\x00', lambda m: tags[int(m.group(1))], s)
    return s.replace('\n', '<br>')

def md_to_html(md):
    md = md.replace('\r\n', '\n').replace('\r', '\n')
    out = []; para = []; lst = None; quote = []
    def flush_p():
        nonlocal para
        if para:
            t = '\n'.join(para).strip()
            if re.fullmatch(r'!\[[^\]]*\]\([^)]+\)', t): out.append(inline(t).replace('<img ', '<img class="cms-img" '))
            elif t: out.append(f'<p>{inline(t)}</p>')
            para = []
    def flush_l():
        nonlocal lst
        if lst: out.append(f'<{lst[0]}>' + ''.join(f'<li>{inline(x)}</li>' for x in lst[1]) + f'</{lst[0]}>'); lst = None
    def flush_q():
        nonlocal quote
        if quote: out.append('<blockquote>' + inline('\n'.join(quote)) + '</blockquote>'); quote = []
    for ln in md.split('\n'):
        h = re.match(r'^(#{1,6})\s+(.*?)\s*#*\s*$', ln)
        ul = re.match(r'^\s*[-*+]\s+(.*)$', ln)
        ol = re.match(r'^\s*\d+[.)]\s+(.*)$', ln)
        if h:
            flush_p(); flush_l(); flush_q()
            n = len(h.group(1)); tag = 'h2' if n <= 2 else ('h3' if n == 3 else 'h4')
            out.append(f'<{tag}>{inline(h.group(2))}</{tag}>')
        elif re.match(r'^\s*([-*_])(\s*\1){2,}\s*$', ln):
            flush_p(); flush_l(); flush_q(); out.append('<hr>')
        elif ln.startswith('>'):
            flush_p(); flush_l(); quote.append(re.sub(r'^>\s?', '', ln))
        elif ul or ol:
            flush_p(); flush_q()
            kind = 'ul' if ul else 'ol'
            if not lst or lst[0] != kind: flush_l(); lst = (kind, [])
            lst[1].append((ul or ol).group(1))
        elif not ln.strip():
            flush_p(); flush_l(); flush_q()
        else:
            if lst and ln.startswith('  '): lst[1][-1] += '\n' + ln.strip(); continue
            flush_l(); flush_q(); para.append(ln)
    flush_p(); flush_l(); flush_q()
    return '\n'.join(out)

def plain(md):
    t = re.sub(r'!\[[^\]]*\]\([^)]*\)', '', md)
    t = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', t)
    t = re.sub(r'[#>*_`~]|^\s*[-+]\s|^\s*\d+[.)]\s', '', t, flags=re.M)
    return re.sub(r'\s+', ' ', t).strip()

def jdate(iso): y, m, d = iso[:10].split('-'); return f'{y}.{m}.{d}'

def norm_date(v):
    v = str(v or '').strip()
    m = re.match(r'(\d{4})-(\d{1,2})-(\d{1,2})(.*)', v)
    if not m: return None
    return f'{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}{m.group(4)}'

def future(iso):
    """公開の予約：日付が今より先なら True（日本時間。時刻の無い日付はその日の0時）"""
    import datetime as dt
    m = re.match(r'(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?', iso)
    if not m: return False
    y, mo, d, h, mi, se = (int(x or 0) for x in m.groups())
    jst = dt.timezone(dt.timedelta(hours=9))
    return dt.datetime(y, mo, d, h, mi, se, tzinfo=jst) > dt.datetime.now(jst)

def img_url(v):
    v = str(v or '').strip()
    if not v: return ''
    if re.match(r'^https?://', v): return v
    return '/' + v.lstrip('/')

def fill(tpl, rep):
    # href の中のトークンは URL の形で、それ以外は HTML の形で入れる
    def in_href(m):
        s = m.group(0)
        for k, (h, u) in rep.items(): s = s.replace(k, u)
        return s
    tpl = re.sub(r'href="[^"]*"', in_href, tpl)
    for k, (h, u) in rep.items(): tpl = tpl.replace(k, h)
    return tpl


def main():
    need = ['post.tpl.html', 'blog_index.tpl.html', 'legacy.json', 'sitemap_urls.json']
    for n in need:
        if not os.path.exists(os.path.join(CMS, n)): sys.exit(f'型がありません：_cms/{n}（build.py を一度走らせてください）')
    tpl = open(os.path.join(CMS, 'post.tpl.html'), encoding='utf-8').read()
    legacy = json.load(open(os.path.join(CMS, 'legacy.json'), encoding='utf-8'))
    legacy_slugs = {p['slug'] for p in legacy}
    posts = []
    if os.path.isdir(SRC):
        for fn in sorted(os.listdir(SRC)):
            if not fn.endswith('.md') or fn.startswith(('_', '.')): continue
            meta, body = parse_front(open(os.path.join(SRC, fn), encoding='utf-8').read())
            if meta.get('draft') is True or meta.get('published') is False: continue
            title = str(meta.get('title') or '').strip()
            date = norm_date(meta.get('date'))
            if not title or not date:
                print(f'とばした（題名か日付が無い）：{fn}'); continue
            if future(date):
                print(f'予約（まだ載せない）：{fn} {date}'); continue
            slug = re.sub(r'[^a-z0-9-]+', '-', os.path.splitext(fn)[0].lower()).strip('-') or 'post'
            if slug in legacy_slugs: slug = 'n-' + slug
            imgs = meta.get('images') or []
            if isinstance(imgs, str): imgs = [imgs]
            imgs = [img_url(x.get('image') if isinstance(x, dict) else x) for x in imgs]
            imgs = [x for x in imgs if x]
            svc = str(meta.get('service') or '').strip(); car = str(meta.get('car') or '').strip()
            desc = str(meta.get('description') or '').strip() or plain(body)
            # 型の差し込み印（CMS◯◯0）と同じ文字が書かれても組み立てが止まらないように、間に見えない文字を挟む
            sf = lambda x: re.sub(r'CMS(?=[A-Z]+0)', 'CMS\u200b', x)
            title, desc, body, svc, car = sf(title), sf(desc), sf(body), sf(svc), sf(car)
            posts.append(dict(fn=fn, slug=slug, title=title, date=date, imgs=imgs, svc=svc, car=car, tag=TAGS.get(svc, svc or 'ブログ'), desc=desc, body=body))
    # 新しい順（旧記事と混ぜる）
    allp = [dict(kind='old', **p) for p in legacy] + [dict(kind='new', slug=p['slug'], title=p['title'], date=p['date'], p=p) for p in posts]
    allp.sort(key=lambda x: x['date'][:19], reverse=True)

    def card(p, latest=False):
        cover = p['imgs'][0] if p['imgs'] else ''
        im = '<img src="' + esc(cover) + '" alt="' + esc(p['title']) + '" loading="lazy">' if cover else ''
        th = '<div class="th">' + im + '</div>'
        if latest:
            return f'<a class="rv" href="/blog/{p["slug"]}/">{th}<time datetime="{p["date"][:10]}">{jdate(p["date"])}</time><h3>{esc(p["title"])}</h3></a>'
        ex = p['desc'][:120] + ('…' if len(p['desc']) > 120 else '')
        return (f'<li class="rv"><a href="/blog/{p["slug"]}/">\n      {th}\n      <div><time datetime="{p["date"][:10]}">{jdate(p["date"])}</time>'
                f'<span class="tag">{esc(p["tag"])}</span><h2>{esc(p["title"])}</h2><p>{esc(ex)}</p></div>\n    </a></li>')

    # 記事のページ
    gen_list_path = os.path.join(CMS, 'generated.json')
    before = set(json.load(open(gen_list_path))) if os.path.exists(gen_list_path) else set()
    made = []
    for k, x in enumerate(allp):
        if x['kind'] != 'new': continue
        p = x['p']
        newer = allp[k - 1] if k > 0 else None
        older = allp[k + 1] if k + 1 < len(allp) else None
        pager = '<nav class="pager" aria-label="前後の記事">' + \
            (f'<a href="/blog/{older["slug"]}/"><small>← Previous</small>{esc(older["title"])}</a>' if older else '<span></span>') + \
            (f'<a class="nx" href="/blog/{newer["slug"]}/"><small>Next →</small>{esc(newer["title"])}</a>' if newer else '<span></span>') + '</nav>'
        prose = ''
        if p['car'] or p['svc']:
            prose += '<p class="cms-meta">' + '　'.join(esc(s) for s in [('車種：' + p['car']) if p['car'] else '', ('施工：' + p['svc']) if p['svc'] else ''] if s) + '</p>\n'
        prose += md_to_html(p['body'])
        if len(p['imgs']) > 1:
            prose += '\n' + ''.join(f'<img class="cms-img" src="{esc(u)}" alt="{esc(p["title"])}（{i + 2}）" loading="lazy">' for i, u in enumerate(p['imgs'][1:]))
        cover = p['imgs'][0] if p['imgs'] else ''
        cover_html = f'<img src="{esc(cover)}" alt="{esc(p["title"])}">' if cover else ''
        abs_img = (cover if cover.startswith('http') else SITE_URL + cover) if cover else SITE_URL + '/img/hero-ferrari.jpg'
        ld = json.dumps({"@context": "https://schema.org", "@type": "BlogPosting", "headline": p['title'], "datePublished": p['date'], "dateModified": p['date'],
                         "author": {"@type": "Organization", "name": "car 4 shield fukuoka", "url": SITE_URL + "/"}, "publisher": {"@type": "Organization", "name": "株式会社NEOトレーディング"},
                         "image": abs_img, "mainEntityOfPage": f"{SITE_URL}/blog/{p['slug']}/"}, ensure_ascii=False).replace('</', '<\\/')
        desc = p['desc'][:110] + ('…' if len(p['desc']) > 110 else '')
        pg = tpl
        if not cover:
            pg = pg.replace('<div class="cover">CMSCOVER0</div>', '<div style="height:56px"></div>')
        rep = {'CMSTITLE0': (esc(p['title']), urllib.parse.quote_plus(p['title'])), 'CMSDESC0': (esc(desc), ''), 'CMSSLUG0': (p['slug'], p['slug']),
               'CMSDATEISO0': (p['date'][:10], ''), 'CMSDATE0': (jdate(p['date']), ''), 'CMSTAG0': (esc(p['tag']), ''), 'CMSCOVER0': (cover_html, ''),
               'CMSPROSE0': (prose, ''), 'CMSPAGER0': (pager, ''), 'CMSLDJSON0': (ld, ''),
               'CMSOGIMAGE0': (f'<meta property="og:image" content="{esc(abs_img)}">', '')}
        pg = fill(pg, rep)
        left = re.findall(r'CMS[A-Z]+0', pg); assert not left, left
        d = os.path.join(ROOT, 'blog', p['slug']); os.makedirs(d, exist_ok=True)
        open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(pg)
        made.append(p['slug'])
    # CMS で消された記事のページを片付ける（旧記事は消さない）
    for s in before - set(made):
        if s in legacy_slugs: continue
        d = os.path.join(ROOT, 'blog', s)
        if os.path.isdir(d): shutil.rmtree(d); print('消した：', s)
    json.dump(sorted(made), open(gen_list_path, 'w'), indent=1)

    # ブログ一覧
    items = ''.join(x['item'] if x['kind'] == 'old' else card(x['p']) for x in allp)
    lt = open(os.path.join(CMS, 'blog_index.tpl.html'), encoding='utf-8').read().replace('CMSITEMS0', items)
    open(os.path.join(ROOT, 'blog', 'index.html'), 'w', encoding='utf-8').write(lt)
    # トップの最新3件
    ip = os.path.join(ROOT, 'index.html')
    if os.path.exists(ip):
        t = open(ip, encoding='utf-8').read()
        latest = '\n      '.join(x['latest'] if x['kind'] == 'old' else card(x['p'], True) for x in allp[:3])
        t2 = re.sub(r'<!--CMS:LATEST-->.*?<!--/CMS:LATEST-->', lambda m: f'<!--CMS:LATEST-->{latest}<!--/CMS:LATEST-->', t, flags=re.S)
        if t2 != t: open(ip, 'w', encoding='utf-8').write(t2)
    # sitemap
    urls = json.load(open(os.path.join(CMS, 'sitemap_urls.json'), encoding='utf-8'))
    for s in made:
        u = f'/blog/{s}/'
        if u not in urls: urls.insert(urls.index('/blog/') + 1 if '/blog/' in urls else len(urls), u)
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(f'<url><loc>{SITE_URL}{u}</loc></url>\n' for u in urls) + '</urlset>\n'
    open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8').write(sm)
    print(f'CMS の記事 {len(made)} 本を HTML にした（一覧は全 {len(allp)} 本）')

if __name__ == '__main__':
    main()
