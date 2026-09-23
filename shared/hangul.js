/* 한글 글자 도구 - 읽기 앱들이 함께 쓴다
   유니코드 한글 음절 = 0xAC00 + (초성 × 21 + 중성) × 28 + 종성 */
(function (global) {
  'use strict';
  var BASE = 0xAC00;
  var CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  var JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
  var JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  /* 받침은 일곱 소리로만 난다 (대표음) */
  var REP = { 'ㄱ': 'ㄱ', 'ㄲ': 'ㄱ', 'ㅋ': 'ㄱ', 'ㄴ': 'ㄴ', 'ㄷ': 'ㄷ', 'ㅅ': 'ㄷ', 'ㅆ': 'ㄷ', 'ㅈ': 'ㄷ', 'ㅊ': 'ㄷ', 'ㅌ': 'ㄷ', 'ㅎ': 'ㄷ', 'ㄹ': 'ㄹ', 'ㅁ': 'ㅁ', 'ㅂ': 'ㅂ', 'ㅍ': 'ㅂ', 'ㅇ': 'ㅇ' };

  function isSyl(ch) { var c = ch.charCodeAt(0) - BASE; return c >= 0 && c <= 11171; }
  function split(ch) {
    if (!ch || !isSyl(ch)) return null;
    var c = ch.charCodeAt(0) - BASE;
    return { cho: CHO[Math.floor(c / 588)], jung: JUNG[Math.floor((c % 588) / 28)], jong: JONG[c % 28] };
  }
  function join(cho, jung, jong) {
    var a = CHO.indexOf(cho), b = JUNG.indexOf(jung), c = JONG.indexOf(jong || '');
    if (a < 0 || b < 0 || c < 0) return null;
    return String.fromCharCode(BASE + (a * 21 + b) * 28 + c);
  }
  function withJong(ch, jong) { var s = split(ch); return s ? join(s.cho, s.jung, jong) : null; }
  function hasJong(ch) { var s = split(ch); return !!(s && s.jong); }
  function lastJong(word) { return hasJong(String(word).slice(-1)); }
  function syllables(word) { return String(word).split(''); }
  /* 끝소리가 같은가: 마지막 글자의 모음과 받침이 같고 첫소리만 다르다 */
  function rhyme(a, b) {
    var x = split(String(a).slice(-1)), y = split(String(b).slice(-1));
    return !!(x && y && x.jung === y.jung && x.jong === y.jong && x.cho !== y.cho);
  }
  function first(word) { var s = split(String(word).charAt(0)); return s ? s.cho : null; }
  /* 조사: 받침이 있으면 앞 것, 없으면 뒤 것 */
  function josa(word, pair) { var p = pair.split('/'); return lastJong(word) ? p[0] : p[1]; }

  global.Hangul = {
    CHO: CHO, JUNG: JUNG, JONG: JONG, REP: REP,
    isSyl: isSyl, split: split, join: join, withJong: withJong, hasJong: hasJong, lastJong: lastJong,
    syllables: syllables, rhyme: rhyme, first: first, josa: josa
  };
})(window);
