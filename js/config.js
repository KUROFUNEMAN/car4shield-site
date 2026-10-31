/* ─────────────────────────────────────────────
   car 4 shield fukuoka ── サイト共通の設定
   Instagram のアカウントが変わったら、この1行だけ書き換える。
   （新しい @car4shield_fukuoka に変わったら下の行を
     'https://www.instagram.com/car4shield_fukuoka/' にする）
   ページ内の「Instagram」リンクはすべてここから入る。
   ───────────────────────────────────────────── */
window.C4S = {
  instagram: 'https://www.instagram.com/classics_fukuoka/',
  youtube: 'https://www.youtube.com/@classicsfukuoka4058'
};
(function () {
  function apply() {
    document.querySelectorAll('[data-link="instagram"]').forEach(function (a) { a.href = window.C4S.instagram; });
    document.querySelectorAll('[data-link="youtube"]').forEach(function (a) { a.href = window.C4S.youtube; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
})();
