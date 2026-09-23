/* 학습 코스 - 런처의 📅 코스와 사용 가이드(guide.html)가 함께 쓴다.
   하루 할 일 = [앱, 이벤트, 횟수, 어디서 하는지]. 앱이 그 이벤트를 오늘 횟수만큼 내면 한 칸 끝난다.
   이벤트: correct(퀴즈 정답) · read(책·글 읽기) · heard(이야기 듣기) · trace(따라 쓰기 한 글자)
          copy(필사 한 글자) · win(한 판 끝내기) · save(일기·그림·이야기 저장)
   한 주는 5일(월~금 기준). 다음 날 할 일은 이튿날 열린다. */
(function (global) {
  'use strict';
  function t(app, key, n, where) { return [app, key, n, where]; }

  var COURSES = [
    /* ================= 연령별 기본 코스 ================= */
    { id: 'k5', type: '연령별', icon: '🐣', name: '한글·숫자 첫걸음', age: '5세', minutes: 15,
      desc: '자음·모음을 소리로 익히고, 1~10을 세고 더하는 데까지. 매일 책 한 권이나 놀이 하나로 마무리해요.',
      goal: ['자음 14자·모음 10자를 듣고 찾기', '가~하 글자 만들기와 쉬운 낱말 읽기', '10까지 세기, 한 자리 더하기·빼기'],
      weeks: [
        { title: '자음과 숫자 1~5', days: [
          [t('hangul', 'correct', 5, '자음 배우기 → 듣고 찾기'), t('math', 'correct', 4, '몇 개일까?'), t('memory', 'win', 1, '동물 카드')],
          [t('hangul', 'trace', 3, '따라 쓰기 (자음)'), t('math', 'correct', 4, '하나씩 세기'), t('shapes', 'correct', 4, '모양 찾기')],
          [t('hangul', 'correct', 5, '듣고 찾기'), t('math', 'trace', 3, '숫자 따라 쓰기'), t('books', 'read', 1, '첫 책 한 권')],
          [t('hangul', 'correct', 5, '첫소리 찾기'), t('math', 'correct', 4, '어느 쪽이 많을까?'), t('music', 'win', 1, '리듬 따라하기')],
          [t('sounds', 'correct', 4, '첫소리 같은 말'), t('math', 'correct', 4, '몇 개일까?'), t('draw', 'save', 1, '자유롭게 그리기')]] },
        { title: '모음과 글자 만들기', days: [
          [t('hangul', 'correct', 5, '모음 배우기 → 듣고 찾기'), t('math', 'correct', 4, '더하기'), t('shapes', 'correct', 4, '색깔 찾기')],
          [t('hangul', 'trace', 3, '따라 쓰기 (모음)'), t('blocks', 'correct', 4, '블록 더하기'), t('memory', 'win', 1, '과일 카드')],
          [t('hangul', 'correct', 5, '글자 만들기'), t('math', 'correct', 4, '빠진 숫자'), t('listen', 'heard', 1, '이야기 듣고 맞히기')],
          [t('hangul', 'correct', 5, '낱말과 그림'), t('math', 'correct', 4, '크기 순서'), t('books', 'read', 1, '첫 책 한 권')],
          [t('sounds', 'correct', 4, '몇 글자일까?'), t('blocks', 'correct', 4, '몇 개일까?'), t('maze', 'win', 1, '작은 미로')]] },
        { title: '낱말 읽기와 빼기', days: [
          [t('hangul', 'correct', 5, '낱말과 그림'), t('math', 'correct', 4, '빼기'), t('feelings', 'correct', 4, '표정 읽기')],
          [t('wordmake', 'correct', 4, '글자 붙여 낱말'), t('blocks', 'correct', 4, '블록 빼기'), t('books', 'read', 1, '첫 책 한 권')],
          [t('hangul', 'trace', 4, '따라 쓰기 (가~하)'), t('math', 'correct', 4, '더하기'), t('safety', 'correct', 4, '위험할까?')],
          [t('sounds', 'correct', 4, '소리 합치기'), t('shapes', 'correct', 4, '패턴 이어가기'), t('listen', 'heard', 1, '이야기 듣고 맞히기')],
          [t('wordmake', 'correct', 4, '듣고 낱말 찾기'), t('math', 'correct', 4, '빠진 숫자'), t('story', 'save', 1, '뚝딱 랜덤 이야기')]] },
        { title: '모아서 복습하고 책 읽기', days: [
          [t('batchim', 'correct', 4, '받침 소리 배우기 → 듣고 고르기'), t('math', 'correct', 4, '10 만들기'), t('books', 'read', 1, '조금 긴 책')],
          [t('sentence', 'correct', 4, '읽고 그림 고르기'), t('clock', 'correct', 3, '몇 시일까?'), t('memory', 'win', 1, '한글 카드')],
          [t('hangul', 'correct', 6, '듣고 찾기 (복습)'), t('blocks', 'correct', 4, '짝꿍 수 만들기'), t('daily', 'correct', 4, '순서 맞추기')],
          [t('wordmake', 'correct', 4, '빠진 글자'), t('math', 'correct', 5, '더하기'), t('books', 'read', 1, '조금 긴 책')],
          [t('sequence', 'correct', 3, '순서대로 놓기'), t('arcade', 'win', 1, '글자 낚시'), t('diary', 'save', 1, '오늘 기분 기록')]] }
      ] },

    { id: 'k67', type: '연령별', icon: '🌱', name: '혼자 읽기 독립', age: '6~7세', minutes: 20,
      desc: '받침 → 낱말 → 문장 → 책 순서로 한 계단씩. 4주째에는 옛이야기와 탈무드 이야기를 혼자 읽어요.',
      goal: ['받침 일곱 소리를 듣고 구별하기', '낱말 뜻·반대말·같은 편 알기', '문장을 읽고 그림 고르기, 그림책 혼자 읽기'],
      weeks: [
        { title: '받침 소리', days: [
          [t('batchim', 'correct', 5, '받침 소리 배우기 → 듣고 고르기'), t('sounds', 'correct', 4, '끝소리 같은 말'), t('books', 'read', 1, '첫 책')],
          [t('batchim', 'correct', 5, '그림 보고 받침'), t('batchim', 'trace', 3, '받침 글자 쓰기'), t('listen', 'heard', 1, '이야기 듣고 맞히기')],
          [t('batchim', 'correct', 5, '받침 바꾸기'), t('wordmake', 'correct', 4, '글자 붙여 낱말'), t('books', 'read', 1, '첫 책')],
          [t('batchim', 'correct', 5, '받침 낱말 읽기'), t('sounds', 'correct', 4, '소리 빼기'), t('arcade', 'win', 1, '글자 낚시')],
          [t('batchim', 'correct', 5, '듣고 고르기 (복습)'), t('batchim', 'trace', 3, '받침 글자 쓰기'), t('books', 'read', 1, '조금 긴 책')]] },
        { title: '낱말과 뜻', days: [
          [t('wordmake', 'correct', 5, '빠진 글자'), t('vocab', 'correct', 5, '같은 편 찾기'), t('books', 'read', 1, '조금 긴 책')],
          [t('wordmake', 'correct', 5, '듣고 낱말 찾기'), t('vocab', 'correct', 5, '반대말'), t('listen', 'heard', 1, '이야기 듣고 맞히기')],
          [t('sounds', 'correct', 5, '소리 합치기'), t('vocab', 'correct', 5, '움직임 말'), t('books', 'read', 1, '조금 긴 책')],
          [t('wordmake', 'correct', 5, '글자 붙여 낱말'), t('vocab', 'correct', 5, '꾸미는 말'), t('memory', 'win', 1, '한글 카드')],
          [t('korean', 'correct', 5, '낱말 뜻 (초1~2)'), t('hangul', 'trace', 3, '따라 쓰기'), t('books', 'read', 1, '긴 책')]] },
        { title: '문장 읽기', days: [
          [t('sentence', 'correct', 5, '읽고 그림 고르기'), t('sequence', 'correct', 3, '순서대로 놓기'), t('books', 'read', 1, '긴 책')],
          [t('sentence', 'correct', 5, '그림 보고 문장 고르기'), t('listen', 'heard', 1, '이야기 듣고 맞히기'), t('story', 'save', 1, '새 이야기 만들기')],
          [t('sentence', 'correct', 5, '이/가 을/를 넣기'), t('sequence', 'correct', 3, '다음엔 어떻게 될까?'), t('books', 'read', 1, '긴 책')],
          [t('sentence', 'correct', 5, '읽고 그림 고르기'), t('vocab', 'correct', 5, '반대말'), t('listen', 'heard', 1, '이야기 듣고 맞히기')],
          [t('passage', 'correct', 3, '초등 1학년 글 한 편'), t('books', 'read', 1, '옛이야기'), t('diary', 'save', 1, '한 줄 일기')]] },
        { title: '혼자 책 읽기', days: [
          [t('books', 'read', 1, '옛이야기'), t('passage', 'correct', 3, '초등 1학년'), t('sentence', 'correct', 5, '그림 보고 문장 고르기')],
          [t('books', 'read', 1, '옛이야기'), t('listen', 'heard', 2, '이야기 듣고 맞히기'), t('korean', 'correct', 5, '낱말 뜻 (초1~2)')],
          [t('books', 'read', 1, '탈무드 지혜 이야기'), t('sequence', 'correct', 3, '다음엔 어떻게 될까?'), t('story', 'save', 1, '새 이야기 만들기')],
          [t('books', 'read', 1, '탈무드 지혜 이야기'), t('passage', 'correct', 3, '초등 1학년'), t('vocab', 'correct', 5, '같은 편 찾기')],
          [t('books', 'read', 2, '좋아하는 책 두 권'), t('classic', 'read', 1, '오늘의 한 문장'), t('diary', 'save', 1, '한 줄 일기')]] }
      ] },

    { id: 'e12', type: '연령별', icon: '📘', name: '문해력 다지기', age: '초1~2', minutes: 20,
      desc: '학년 지문을 읽고 사실·중심·낱말·추론 문제를 풀어요. 속담과 낱말 뜻, 글로 된 수학 문제로 읽는 힘을 넓혀요.',
      goal: ['초1~2 지문을 읽고 문제 갈래(사실·중심·낱말·추론) 알기', '학년 낱말 40개와 속담 20개', '문장제 수학을 끝까지 읽고 풀기'],
      weeks: [
        { title: '짧은 글 꼼꼼히', days: [
          [t('passage', 'correct', 3, '초등 1학년'), t('korean', 'correct', 5, '낱말 뜻 (초1~2)'), t('classic', 'read', 1, '오늘의 한 문장')],
          [t('books', 'read', 1, '옛이야기'), t('vocab', 'correct', 5, '반대말'), t('korean', 'correct', 5, '속담 완성하기')],
          [t('passage', 'correct', 3, '초등 1학년'), t('sentence', 'correct', 5, '이/가 을/를 넣기'), t('wordmath', 'correct', 4, '읽고 답 구하기')],
          [t('listen', 'heard', 1, '이야기 듣고 맞히기'), t('korean', 'correct', 5, '낱말 뜻 (초1~2)'), t('sequence', 'correct', 3, '다음엔 어떻게 될까?')],
          [t('passage', 'correct', 3, '초등 2학년'), t('classic', 'read', 1, '오늘의 한 문장'), t('diary', 'save', 1, '한 줄 일기')]] },
        { title: '중심 생각 찾기', days: [
          [t('passage', 'correct', 3, '초등 2학년'), t('korean', 'correct', 5, '속담 뜻 맞히기'), t('books', 'read', 1, '탈무드 지혜 이야기')],
          [t('wordmath', 'correct', 4, '읽고 답 구하기'), t('vocab', 'correct', 5, '꾸미는 말'), t('media', 'correct', 4, '제목이 맞을까?')],
          [t('passage', 'correct', 3, '초등 2학년'), t('korean', 'correct', 5, '낱말 뜻 (초1~2)'), t('classic', 'read', 1, '오늘의 한 문장')],
          [t('books', 'read', 1, '탈무드 지혜 이야기'), t('sentence', 'correct', 5, '그림 보고 문장 고르기'), t('story', 'save', 1, '새 이야기 만들기')],
          [t('passage', 'correct', 3, '초등 2학년'), t('korean', 'correct', 5, '속담 완성하기'), t('diary', 'save', 1, '한 줄 일기')]] },
        { title: '낱말 넓히기', days: [
          [t('passage', 'correct', 3, '초등 2학년'), t('korean', 'correct', 5, '낱말 뜻 (초3~4)'), t('media', 'correct', 4, '광고일까 정보일까?')],
          [t('wordmath', 'correct', 4, '알맞은 식 고르기'), t('korean', 'correct', 5, '사자성어 뜻'), t('classic', 'read', 1, '오늘의 한 문장')],
          [t('passage', 'correct', 3, '초등 2학년'), t('vocab', 'correct', 5, '움직임 말'), t('books', 'read', 1, '옛이야기')],
          [t('listen', 'heard', 1, '이야기 듣고 맞히기'), t('korean', 'correct', 5, '낱말 뜻 (초3~4)'), t('sequence', 'correct', 3, '순서대로 놓기')],
          [t('passage', 'correct', 3, '초등 3학년 (도전)'), t('classic', 'copy', 8, '뜻 따라 쓰기'), t('diary', 'save', 1, '한 줄 일기')]] },
        { title: '한 단계 위 글 도전', days: [
          [t('passage', 'correct', 3, '초등 3학년'), t('korean', 'correct', 5, '속담 뜻 맞히기'), t('wordmath', 'correct', 4, '읽고 답 구하기')],
          [t('books', 'read', 1, '탈무드 지혜 이야기'), t('korean', 'correct', 5, '뜻 보고 사자성어'), t('media', 'correct', 4, '믿어도 될까?')],
          [t('passage', 'correct', 3, '초등 3학년'), t('classic', 'copy', 8, '뜻 따라 쓰기'), t('vocab', 'correct', 5, '같은 편 찾기')],
          [t('passage', 'correct', 3, '초등 3학년'), t('korean', 'correct', 5, '낱말 뜻 (초3~4)'), t('story', 'save', 1, '새 이야기 만들기')],
          [t('passage', 'correct', 3, '가장 어려웠던 글 다시'), t('classic', 'read', 1, '오늘의 한 문장'), t('diary', 'save', 1, '한 줄 일기')]] }
      ] },

    { id: 'e34', type: '연령별', icon: '🌳', name: '생각하며 읽기', age: '초3~4', minutes: 25,
      desc: '논설문·기사문·설명문을 읽고 추론 문제까지. 고전 한 문장 필사, 사자성어, 두 단계 문장제로 생각을 길게 이어요.',
      goal: ['초3~중1 지문의 갈래와 짜임 알기', '초3~6 낱말과 사자성어', '미디어 속 광고·부풀린 제목 가려내기'],
      weeks: [
        { title: '설명하는 글', days: [
          [t('passage', 'correct', 4, '초등 3학년'), t('korean', 'correct', 5, '낱말 뜻 (초3~4)'), t('classic', 'read', 1, '오늘의 한 문장')],
          [t('wordmath', 'correct', 5, '읽고 답 구하기'), t('korean', 'correct', 5, '사자성어 뜻'), t('media', 'correct', 4, '광고일까 정보일까?')],
          [t('passage', 'correct', 4, '초등 3학년'), t('hanja', 'correct', 5, '뜻 맞히기'), t('earth', 'correct', 5, '먹이 사슬')],
          [t('passage', 'correct', 4, '초등 4학년'), t('korean', 'correct', 5, '속담 뜻 맞히기'), t('typing', 'win', 1, '한글 낱말')],
          [t('passage', 'correct', 4, '초등 4학년'), t('classic', 'copy', 12, '원문·뜻 따라 쓰기'), t('diary', 'save', 1, '한 줄 일기')]] },
        { title: '주장하는 글', days: [
          [t('passage', 'correct', 4, '초등 4학년'), t('korean', 'correct', 5, '낱말 뜻 (초3~4)'), t('media', 'correct', 4, '믿어도 될까?')],
          [t('wordmath', 'correct', 5, '알맞은 식 고르기'), t('korean', 'correct', 5, '뜻 보고 사자성어'), t('classic', 'correct', 4, '뜻 맞히기')],
          [t('passage', 'correct', 4, '초등 5학년 (도전)'), t('hanja', 'correct', 5, '천자문 훈음 맞히기'), t('world', 'correct', 5, '어느 대륙에 있을까?')],
          [t('passage', 'correct', 4, '초등 5학년'), t('korean', 'correct', 5, '낱말 뜻 (초5~6)'), t('media', 'correct', 4, '제목이 맞을까?')],
          [t('passage', 'correct', 4, '초등 5학년'), t('classic', 'copy', 12, '원문·뜻 따라 쓰기'), t('story', 'save', 1, '새 이야기 만들기')]] },
        { title: '기사와 미디어', days: [
          [t('passage', 'correct', 4, '초등 5학년'), t('media', 'correct', 4, '제목이 맞을까?'), t('korean', 'correct', 5, '속담 완성하기')],
          [t('wordmath', 'correct', 5, '읽고 답 구하기'), t('media', 'correct', 4, '누를까 말까?'), t('aiteach', 'win', 1, '로보의 실수')],
          [t('passage', 'correct', 4, '초등 6학년 (도전)'), t('korean', 'correct', 5, '낱말 뜻 (초5~6)'), t('classic', 'read', 1, '오늘의 한 문장')],
          [t('passage', 'correct', 4, '초등 6학년'), t('money', 'correct', 5, '어느 게 더 알뜰할까?'), t('media', 'correct', 4, '내 정보 지키기')],
          [t('passage', 'correct', 4, '초등 6학년'), t('classic', 'copy', 12, '원문·뜻 따라 쓰기'), t('diary', 'save', 1, '한 줄 일기')]] },
        { title: '긴 글과 고전', days: [
          [t('passage', 'correct', 4, '중학교 1학년 (도전)'), t('korean', 'correct', 5, '사자성어 뜻'), t('hanja', 'correct', 5, '천자문 훈음 맞히기')],
          [t('wordmath', 'correct', 5, '알맞은 식 고르기'), t('classic', 'correct', 5, '뜻 맞히기'), t('space', 'correct', 4, '쌓기나무 몇 개?')],
          [t('passage', 'correct', 4, '중학교 1학년'), t('korean', 'correct', 5, '낱말 뜻 (초5~6)'), t('books', 'read', 1, '탈무드 지혜 이야기')],
          [t('passage', 'correct', 4, '가장 어려웠던 글 다시'), t('korean', 'correct', 5, '뜻 보고 사자성어'), t('typing', 'win', 1, '한글 낱말')],
          [t('classic', 'copy', 15, '고전 한 문장 필사'), t('passage', 'correct', 4, '중학교 1학년'), t('diary', 'save', 1, '한 줄 일기')]] }
      ] },

    /* ================= 과목 집중 코스 ================= */
    { id: 'en', type: '과목별', icon: '🔤', name: '영어 첫걸음', age: '5~8세', minutes: 15,
      desc: '알파벳 소리 → 파닉스 → 그림 낱말 → 짧은 문장 → 영어 그림책. 매일 듣고, 고르고, 한 번은 따라 써요.',
      goal: ['대문자·소문자 52자 알아보고 쓰기', '세 글자 낱말(cat, pig…) 소리 내어 읽기', 'It is / I like / I can 문장과 그림책 6권'],
      weeks: [
        { title: '알파벳', days: [
          [t('english', 'correct', 5, 'ABC 배우기 → 알파벳 듣고 찾기'), t('english', 'trace', 3, '따라 쓰기 (대문자)'), t('memory', 'win', 1, '알파벳 카드')],
          [t('english', 'correct', 5, '대문자·소문자'), t('english', 'trace', 3, '따라 쓰기 (소문자)'), t('english', 'correct', 4, '인사말')],
          [t('english', 'correct', 5, '첫 글자 찾기'), t('english', 'trace', 3, '따라 쓰기'), t('english', 'correct', 4, '색깔 영어')],
          [t('english', 'correct', 5, '알파벳 듣고 찾기'), t('english', 'correct', 4, '숫자 영어'), t('memory', 'win', 1, '알파벳 카드')],
          [t('english', 'correct', 5, '그림 낱말'), t('english', 'trace', 3, '따라 쓰기'), t('ebooks', 'read', 1, 'Colors')]] },
        { title: '파닉스', days: [
          [t('phonics', 'correct', 5, '읽고 그림 고르기'), t('english', 'correct', 5, '첫 글자 찾기'), t('phonics', 'learn', 1, '낱말 가족 보기')],
          [t('phonics', 'correct', 5, '가운데 소리 찾기'), t('english', 'correct', 5, '영단어 단계 1'), t('ebooks', 'read', 1, 'My Cat')],
          [t('phonics', 'correct', 5, '끝소리가 같은 말'), t('english', 'trace', 3, '따라 쓰기'), t('esent', 'correct', 4, '그림 보고 문장 고르기')],
          [t('phonics', 'correct', 5, '듣고 낱말 고르기'), t('english', 'correct', 5, '영단어 단계 1'), t('ebooks', 'read', 1, 'Count with Me')],
          [t('phonics', 'correct', 5, '읽고 그림 고르기'), t('phonics', 'correct', 5, '가운데 소리 찾기'), t('typing', 'win', 1, 'ABC 가운뎃줄')]] },
        { title: '그림 낱말', days: [
          [t('english', 'correct', 5, '영단어 단계 2'), t('phonics', 'correct', 5, '끝소리가 같은 말'), t('ebooks', 'read', 1, 'Good Morning')],
          [t('english', 'correct', 5, '영단어 단계 2'), t('esent', 'correct', 5, '듣고 그림 고르기'), t('english', 'correct', 4, '인사말')],
          [t('english', 'correct', 5, '영단어 단계 3'), t('phonics', 'correct', 5, '듣고 낱말 고르기'), t('ebooks', 'read', 1, 'At the Zoo')],
          [t('english', 'correct', 5, '영단어 단계 3'), t('esent', 'correct', 5, '그림 보고 문장 고르기'), t('memory', 'win', 1, '알파벳 카드')],
          [t('esent', 'win', 1, '문장 만들기'), t('english', 'correct', 5, '영단어 단계 2'), t('ebooks', 'read', 1, 'Rainy Day')]] },
        { title: '문장과 그림책', days: [
          [t('esent', 'correct', 5, '그림 보고 문장 고르기'), t('english', 'correct', 5, '영단어 단계 4'), t('ebooks', 'read', 1, 'My Cat')],
          [t('esent', 'win', 1, '문장 만들기'), t('phonics', 'correct', 5, '읽고 그림 고르기'), t('ebooks', 'read', 1, 'Colors')],
          [t('esent', 'correct', 5, '듣고 그림 고르기'), t('english', 'correct', 5, '영단어 단계 4'), t('typing', 'win', 1, '영어 낱말')],
          [t('esent', 'win', 1, '문장 만들기'), t('english', 'correct', 5, '영단어 단계 5'), t('ebooks', 'read', 1, 'At the Zoo')],
          [t('ebooks', 'read', 2, '좋아하는 책 두 권'), t('esent', 'correct', 5, '그림 보고 문장 고르기'), t('world', 'correct', 5, '나라별 인사말')]] }
      ] },

    { id: 'ma', type: '과목별', icon: '🔢', name: '수학 감각 키우기', age: '6~9세', minutes: 15,
      desc: '수 세기 → 더하기·빼기 → 모양과 공간 → 시계·돈 → 글로 된 문제. 블록과 쌓기나무로 눈으로 보며 익혀요.',
      goal: ['20까지 더하기·빼기, 짝꿍 수와 10 만들기', '쌓기나무·칠교로 공간 감각', '시계 읽기, 돈 계산, 문장제 풀기'],
      weeks: [
        { title: '수와 더하기', days: [
          [t('math', 'correct', 5, '더하기'), t('blocks', 'correct', 4, '짝꿍 수 만들기'), t('shapes', 'correct', 4, '패턴 이어가기')],
          [t('math', 'correct', 5, '10 만들기'), t('blocks', 'correct', 4, '블록 더하기'), t('memory', 'win', 1, '숫자 카드')],
          [t('math', 'correct', 5, '빠진 숫자'), t('blocks', 'correct', 4, '홀수 짝수'), t('calc', 'correct', 4, '숫자 읽기')],
          [t('math', 'correct', 5, '크기 순서'), t('blocks', 'correct', 4, '두 배 블록'), t('arcade', 'win', 1, '두더지 잡기')],
          [t('math', 'correct', 6, '더하기'), t('wordmath', 'correct', 3, '읽고 답 구하기'), t('maze', 'win', 1, '보통 미로')]] },
        { title: '빼기와 자릿값', days: [
          [t('math', 'correct', 5, '빼기'), t('blocks', 'correct', 4, '블록 빼기'), t('space', 'correct', 4, '쌓기나무 몇 개?')],
          [t('blocks', 'correct', 4, '십과 일'), t('calc', 'correct', 4, '자릿값 놀이'), t('shapes', 'correct', 4, '다른 것 찾기')],
          [t('math', 'correct', 5, '빼기'), t('wordmath', 'correct', 4, '읽고 답 구하기'), t('space', 'win', 1, '칠교 맞추기')],
          [t('calc', 'correct', 4, '얼마나 큰 수?'), t('blocks', 'correct', 4, '십과 일'), t('memory', 'win', 1, '순서 기억하기')],
          [t('math', 'correct', 6, '빼기'), t('wordmath', 'correct', 4, '알맞은 식 고르기'), t('space', 'win', 1, '칠교 맞추기')]] },
        { title: '모양과 공간', days: [
          [t('shapes', 'correct', 5, '생활 속 모양'), t('space', 'correct', 4, '쌓기나무 몇 개?'), t('space', 'win', 1, '칠교 맞추기')],
          [t('space', 'correct', 4, '바닥에 닿은 자리'), t('shapes', 'correct', 5, '패턴 이어가기'), t('maze', 'win', 1, '큰 미로')],
          [t('space', 'correct', 5, '쌓기나무 몇 개?'), t('coding', 'win', 1, '로봇 코딩 한 단계'), t('space', 'win', 1, '칠교 맞추기')],
          [t('space', 'correct', 4, '바닥에 닿은 자리'), t('shapes', 'correct', 5, '다른 것 찾기'), t('memory', 'win', 1, '뭐가 사라졌지?')],
          [t('space', 'win', 2, '칠교 두 개'), t('wordmath', 'correct', 4, '읽고 답 구하기'), t('coding', 'win', 1, '로봇 코딩 한 단계')]] },
        { title: '시계·돈·문장제', days: [
          [t('clock', 'correct', 5, '몇 시일까?'), t('shop', 'correct', 4, '얼마일까?'), t('wordmath', 'correct', 4, '읽고 답 구하기')],
          [t('clock', 'correct', 5, '시계 찾기'), t('shop', 'correct', 4, '거스름돈'), t('money', 'correct', 4, '며칠 모아야 할까?')],
          [t('clock', 'correct', 4, '뭐가 더 길까?'), t('money', 'correct', 4, '어느 게 더 알뜰할까?'), t('wordmath', 'correct', 4, '알맞은 식 고르기')],
          [t('clock', 'correct', 4, '하루의 시간'), t('shop', 'correct', 4, '살 수 있을까?'), t('money', 'win', 1, '저금통 모으기')],
          [t('wordmath', 'correct', 6, '읽고 답 구하기'), t('space', 'correct', 5, '쌓기나무 몇 개?'), t('calc', 'correct', 4, '얼마나 큰 수?')]] }
      ] },

    { id: 'hj', type: '과목별', icon: '📜', name: '한자·고전 입문', age: '초1~4', minutes: 15,
      desc: '기초 한자 31자와 천자문 첫 16구절, 논어·명심보감·탈무드 명구. 뜻을 먼저 알고, 매일 한 줄씩 따라 써요.',
      goal: ['기초 한자 31자 뜻·소리와 필순', '천자문 첫 16구절(64자) 훈음', '고전 한 문장 10개 필사'],
      weeks: [
        { title: '기초 한자', days: [
          [t('hanja', 'correct', 5, '한자 카드 → 뜻 맞히기'), t('hanja', 'trace', 3, '한자 따라 쓰기'), t('classic', 'read', 1, '오늘의 한 문장')],
          [t('hanja', 'correct', 5, '듣고 한자 찾기'), t('hanja', 'trace', 3, '한자 따라 쓰기'), t('korean', 'correct', 4, '사자성어 뜻')],
          [t('hanja', 'correct', 5, '요일 한자'), t('hanja', 'trace', 3, '한자 따라 쓰기'), t('classic', 'copy', 8, '뜻 따라 쓰기')],
          [t('hanja', 'correct', 5, '뜻 맞히기'), t('hanja', 'trace', 3, '한자 따라 쓰기'), t('classic', 'correct', 4, '뜻 맞히기')],
          [t('hanja', 'correct', 5, '듣고 한자 찾기'), t('korean', 'correct', 4, '뜻 보고 사자성어'), t('classic', 'copy', 8, '뜻 따라 쓰기')]] },
        { title: '천자문과 고전', days: [
          [t('hanja', 'learn', 1, '천자문 1~4구절 보기'), t('hanja', 'correct', 4, '천자문 훈음 맞히기'), t('classic', 'read', 1, '오늘의 한 문장')],
          [t('hanja', 'copy', 8, '천자문 필사하기'), t('hanja', 'correct', 4, '천자문 훈음 맞히기'), t('korean', 'correct', 4, '사자성어 뜻')],
          [t('hanja', 'learn', 1, '천자문 5~8구절 보기'), t('hanja', 'correct', 5, '천자문 훈음 맞히기'), t('classic', 'copy', 10, '원문 따라 쓰기')],
          [t('hanja', 'copy', 8, '천자문 필사하기'), t('classic', 'correct', 5, '뜻 맞히기'), t('books', 'read', 1, '탈무드 지혜 이야기')],
          [t('hanja', 'correct', 5, '천자문 훈음 맞히기'), t('classic', 'copy', 10, '원문 따라 쓰기'), t('korean', 'correct', 4, '뜻 보고 사자성어')]] }
      ] },

    /* ================= 주제별 단기 코스 ================= */
    { id: 'dg', type: '주제별', icon: '💻', name: '디지털 시민', age: '7~10세', minutes: 15,
      desc: '인터넷 글을 믿기 전에 확인하기, 내 정보 지키기, AI가 배우는 방법, 자판과 코딩까지. 2주 동안 하루 15분.',
      goal: ['광고·부풀린 제목·수상한 링크 가려내기', 'AI는 예를 보고 배우고, 틀릴 수 있다는 것 알기', '자판 가운뎃줄과 순서대로 명령하기'],
      weeks: [
        { title: '똑똑하게 보기', days: [
          [t('media', 'learn', 1, '기억해요 (약속 7개)'), t('media', 'correct', 4, '광고일까 정보일까?'), t('typing', 'win', 1, '가운뎃줄 왼손')],
          [t('media', 'correct', 4, '믿어도 될까?'), t('aiteach', 'learn', 1, 'AI는 어떻게 배울까?'), t('typing', 'win', 1, '가운뎃줄 오른손')],
          [t('media', 'correct', 4, '제목이 맞을까?'), t('aiteach', 'win', 1, '날 수 있을까? 가르치기'), t('coding', 'win', 1, '로봇 코딩 한 단계')],
          [t('media', 'correct', 4, '내 정보 지키기'), t('aiteach', 'win', 1, '과일일까 채소일까? 가르치기'), t('typing', 'win', 1, 'ABC 가운뎃줄')],
          [t('media', 'correct', 4, '누를까 말까?'), t('aiteach', 'win', 1, '로보의 실수'), t('coding', 'win', 1, '로봇 코딩 한 단계')]] },
        { title: '만들고 지키기', days: [
          [t('media', 'correct', 5, '광고일까 정보일까?'), t('typing', 'win', 1, '윗줄'), t('coding', 'win', 1, '로봇 코딩 한 단계')],
          [t('media', 'correct', 5, '믿어도 될까?'), t('typing', 'win', 1, '아랫줄'), t('story', 'save', 1, '새 이야기 만들기')],
          [t('media', 'correct', 5, '내 정보 지키기'), t('aiteach', 'win', 1, '날 수 있을까? 가르치기'), t('coding', 'win', 1, '로봇 코딩 한 단계')],
          [t('media', 'correct', 5, '누를까 말까?'), t('typing', 'win', 1, '한글 낱말'), t('money', 'correct', 4, '필요한 것? 갖고 싶은 것?')],
          [t('media', 'correct', 5, '제목이 맞을까?'), t('typing', 'win', 1, '영어 낱말'), t('coding', 'win', 1, '로봇 코딩 한 단계')]] }
      ] },

    { id: 'lf', type: '주제별', icon: '🦺', name: '생활·안전 습관', age: '5~8세', minutes: 15,
      desc: '신호등·낯선 사람·119, 이 닦기와 옷 고르기, 마음 알기, 분리배출과 용돈까지. 2주 동안 매일 습관 체크로 시작해요.',
      goal: ['위험한 상황에서 할 일 말하기', '하루 습관과 정리 정돈', '내 마음 알고 진정하기, 지구와 돈 아끼기'],
      weeks: [
        { title: '나를 지키기', days: [
          [t('daily', 'habit', 1, '오늘의 습관 체크'), t('safety', 'correct', 4, '신호등 건너기 → 길에서는?'), t('feelings', 'correct', 4, '표정 읽기')],
          [t('daily', 'habit', 1, '오늘의 습관 체크'), t('safety', 'correct', 4, '싫어요! 안 돼요!'), t('daily', 'correct', 4, '무엇을 입을까?')],
          [t('daily', 'habit', 1, '오늘의 습관 체크'), t('safety', 'correct', 4, '119 · 112'), t('feelings', 'correct', 4, '어떻게 할까?')],
          [t('daily', 'habit', 1, '오늘의 습관 체크'), t('safety', 'correct', 4, '위험할까?'), t('daily', 'win', 1, '엘리베이터 타기')],
          [t('daily', 'habit', 1, '오늘의 습관 체크'), t('safety', 'correct', 4, '이럴 땐 어떻게?'), t('feelings', 'calm', 1, '마음 진정하기')]] },
        { title: '함께 살기', days: [
          [t('daily', 'habit', 1, '오늘의 습관 체크'), t('daily', 'correct', 4, '정리 정돈'), t('earth', 'correct', 4, '어디에 버릴까?')],
          [t('daily', 'habit', 1, '오늘의 습관 체크'), t('daily', 'correct', 4, '바른 말 바른 행동'), t('earth', 'correct', 4, '아껴 쓰기')],
          [t('daily', 'habit', 1, '오늘의 습관 체크'), t('daily', 'correct', 4, '몸에 좋은 음식'), t('money', 'correct', 4, '필요한 것? 갖고 싶은 것?')],
          [t('daily', 'habit', 1, '오늘의 습관 체크'), t('shop', 'correct', 4, '물건 사기'), t('earth', 'save', 1, '오늘의 지구 약속 3개')],
          [t('daily', 'habit', 1, '오늘의 습관 체크'), t('money', 'win', 1, '저금통 모으기'), t('diary', 'save', 1, '오늘 기분 기록')]] }
      ] },

    { id: 'vc', type: '주제별', icon: '🏖️', name: '방학 매일 20분', age: '5~9세', minutes: 20,
      desc: '읽기 하나, 수학 하나, 세상 공부 하나. 2주 동안 과목을 골고루 돌아가며 방학에도 리듬을 지켜요.',
      goal: ['매일 책이나 글 하나 읽기', '매일 수학 한 판', '영어·과학·세계·생활을 번갈아'],
      weeks: [
        { title: '첫째 주', days: [
          [t('books', 'read', 1, '읽기 책 한 권'), t('math', 'correct', 5, '더하기'), t('science', 'correct', 4, '어디에 살까?')],
          [t('listen', 'heard', 1, '이야기 듣고 맞히기'), t('space', 'win', 1, '칠교 맞추기'), t('english', 'correct', 5, '그림 낱말')],
          [t('sentence', 'correct', 5, '읽고 그림 고르기'), t('clock', 'correct', 4, '몇 시일까?'), t('world', 'correct', 5, '국기 보고 나라 찾기')],
          [t('books', 'read', 1, '옛이야기'), t('wordmath', 'correct', 4, '읽고 답 구하기'), t('earth', 'correct', 4, '어디에 버릴까?')],
          [t('classic', 'read', 1, '오늘의 한 문장'), t('shop', 'correct', 4, '물건 사기'), t('draw', 'save', 1, '오늘의 그림 주제')]] },
        { title: '둘째 주', days: [
          [t('books', 'read', 1, '탈무드 지혜 이야기'), t('blocks', 'correct', 4, '십과 일'), t('science', 'correct', 4, '하늘과 우주')],
          [t('passage', 'correct', 3, '내 학년 글 한 편'), t('math', 'correct', 5, '빼기'), t('phonics', 'correct', 5, '읽고 그림 고르기')],
          [t('korean', 'correct', 5, '속담 완성하기'), t('space', 'correct', 4, '쌓기나무 몇 개?'), t('world', 'correct', 5, '무엇으로 유명할까?')],
          [t('books', 'read', 1, '좋아하는 책'), t('money', 'win', 1, '저금통 모으기'), t('ebooks', 'read', 1, '영어 그림책')],
          [t('story', 'save', 1, '새 이야기 만들기'), t('wordmath', 'correct', 4, '알맞은 식 고르기'), t('diary', 'save', 1, '방학 일기')]] }
      ] }
  ];

  var TYPES = [
    ['연령별', '나이에 맞춰 한글·읽기·수학을 고루 잡는 기본 코스 (4주)'],
    ['과목별', '한 과목을 깊게 파는 집중 코스 (2~4주)'],
    ['주제별', '요즘 꼭 필요한 주제를 짧게 익히는 코스 (2주)']
  ];
  global.KIDLAB_COURSES = { list: COURSES, types: TYPES };
})(window);
