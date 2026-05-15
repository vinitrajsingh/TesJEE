/* Smoke test of scoring rules. Mirrors the JS in app/js/scoring.js. */
const fs = require('fs');
const code = fs.readFileSync('c:/Users/vinit/Desktop/TesJEE/app/js/scoring.js', 'utf8');
// eval in this context so `const Scoring = ...` becomes accessible
const Scoring = eval(code + '; Scoring');

function expect(actual, expected, label) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + label + (ok ? '' : `  expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`));
}

// Cat 1
const q1 = { id:'q1', category:1, multi_correct:false, correct:['A'], marks_correct:1, marks_wrong:-0.25 };
expect(Scoring.scoreQuestion(q1, ['A']).marks, 1, 'Cat1 correct');
expect(Scoring.scoreQuestion(q1, ['B']).marks, -0.25, 'Cat1 wrong');
expect(Scoring.scoreQuestion(q1, []).marks, 0, 'Cat1 unattempted');

// Cat 2
const q2 = { id:'q2', category:2, multi_correct:false, correct:['C'], marks_correct:2, marks_wrong:-0.5 };
expect(Scoring.scoreQuestion(q2, ['C']).marks, 2, 'Cat2 correct');
expect(Scoring.scoreQuestion(q2, ['A']).marks, -0.5, 'Cat2 wrong');

// Cat 3 — full correct
const q3 = { id:'q3', category:3, multi_correct:true, correct:['A','B','D'], marks_correct:2, marks_wrong:0 };
expect(Scoring.scoreQuestion(q3, ['A','B','D']).marks, 2, 'Cat3 full correct');
expect(Scoring.scoreQuestion(q3, ['A','B','D']).status, 'correct', 'Cat3 status=correct');

// Cat 3 — partial correct (one of three)
const r_part = Scoring.scoreQuestion(q3, ['A']);
expect(Number(r_part.marks.toFixed(4)), Number((2/3).toFixed(4)), 'Cat3 partial 1/3');
expect(r_part.status, 'partial', 'Cat3 partial status');

// Cat 3 — partial correct (two of three)
const r_part2 = Scoring.scoreQuestion(q3, ['A','D']);
expect(Number(r_part2.marks.toFixed(4)), Number((4/3).toFixed(4)), 'Cat3 partial 2/3');

// Cat 3 — any wrong included
expect(Scoring.scoreQuestion(q3, ['A','B','C']).marks, 0, 'Cat3 with wrong choice -> 0');
expect(Scoring.scoreQuestion(q3, ['C']).marks, 0, 'Cat3 only wrong -> 0');

// Cat 3 — unattempted
expect(Scoring.scoreQuestion(q3, []).marks, 0, 'Cat3 unattempted -> 0');

console.log('--- done ---');
