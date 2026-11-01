/* ─────────────────────────────────────────────
   car 4 shield fukuoka ── サイト共通の設定（ここだけ書き換えれば全ページに効く）

   ■ Instagram のアカウントが変わったら、instagram の1行だけ書き換える。
     （新しい @car4shield_fukuoka に変わったら
       'https://www.instagram.com/car4shield_fukuoka/' にする）
     ページ内の「Instagram」リンク（data-link="instagram"）はすべてここから入る。
     ※ build.py もこの行を読むので、書き換えたら python3 src/build.py をもう一度流すと HTML の中の初期値もそろう。

   ■ 入場の動画（トップの一番上）の差し替え手順
     今は自社 YouTube の施工動画から、旧店名のナンバー板が映らない場面だけを切り出した28秒・無音の版
     （/files/hero_c4s.mp4・ポスター /img/hero_c4s_poster.jpg）が流れる。YouTube の埋め込みは使わない。
     1. 正式な動画が届いたら mp4（H.264・無音）にして site/files/ に置く。
        目安：横1920px以下・15〜30秒・8MB以下・faststart（重いと読み込みが遅くなる）。
        スマホ用に軽い版（横1080px以下・3MB以下）を作れたら heroVideoSp に入れる。
     2. 下の heroVideo の1行をその住所にする（最初の絵を jpg にしたら heroPoster も）。
     3. それだけで、トップに入ると無音・繰り返しで自動再生される。
        読み込み中・「動きを減らす」設定の端末・データ節約モードでは、heroPoster の写真で止める。
        heroVideo を空 '' にすると、元の六角の照明とフェラーリの演出に戻る。
   ───────────────────────────────────────────── */
window.C4S = {
  instagram: 'https://www.instagram.com/classics_fukuoka/',
  youtube: 'https://www.youtube.com/@classicsfukuoka4058',
  heroVideo: '/files/hero_c4s.mp4',          /* 正式な動画が届いたら、この1行を替える */
  heroPoster: '/img/hero_c4s_poster.jpg',    /* 読み込み中・動きを減らす設定の時に出す写真 */
  heroVideoSp: ''     /* 例：'/files/hero-sp.mp4'（無ければ空のまま。スマホも heroVideo を使う） */
};
(function () {
  function apply() {
    document.querySelectorAll('[data-link="instagram"]').forEach(function (a) { a.href = window.C4S.instagram; });
    document.querySelectorAll('[data-link="youtube"]').forEach(function (a) { a.href = window.C4S.youtube; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
})();
