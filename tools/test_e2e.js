/* End-to-end scoring simulation:
   - load both paper JSONs
   - simulate "all correct" attempt -> expect 100, 100, 200
   - simulate "all wrong" attempt
   - simulate "all unattempted"
   - simulate "all correct in cat 1 only"
*/
const fs = require('fs');
const Scoring = eval(fs.readFileSync('c:/Users/vinit/Desktop/TesJEE/app/js/scoring.js', 'utf8') + '; Scoring');

const p1 = JSON.parse(fs.readFileSync('c:/Users/vinit/Desktop/TesJEE/app/data/2024_paper1.json', 'utf8'));
const p2 = JSON.parse(fs.readFileSync('c:/Users/vinit/Desktop/TesJEE/app/data/2024_paper2.json', 'utf8'));

function allCorrect(p) {
  const r = {};
  p.questions.forEach(q => { r[q.id] = [...q.correct]; });
  return r;
}
function allWrong(p) {
  const r = {};
  p.questions.forEach(q => {
    // Pick first option NOT in correct
    const wrong = q.options.find(o => !q.correct.includes(o));
    r[q.id] = wrong ? [wrong] : [];
  });
  return r;
}
function none(p) {
  const r = {};
  p.questions.forEach(q => { r[q.id] = []; });
  return r;
}

function summarize(label, paper, responses) {
  const result = Scoring.scorePaper(paper, responses);
  console.log(`\n[${label}] paper=${paper.paper} title=${paper.paper_title}`);
  console.log(`  total=${result.total_marks}/${result.max_marks}`);
  console.log(`  correct=${result.correct} wrong=${result.wrong} partial=${result.partial} unatt=${result.unattempted}`);
  console.log(`  accuracy=${result.accuracy}%`);
  console.log(`  by_cat=${JSON.stringify(result.by_category)}`);
  return result;
}

console.log('===== Paper 1 (Mathematics) =====');
summarize('All correct', p1, allCorrect(p1));
summarize('All wrong', p1, allWrong(p1));
summarize('Unattempted', p1, none(p1));

console.log('\n===== Paper 2 (Phy + Chem) =====');
summarize('All correct', p2, allCorrect(p2));
summarize('All wrong', p2, allWrong(p2));
summarize('Unattempted', p2, none(p2));

// Quick check question counts
console.log('\n===== Counts =====');
console.log('P1 total questions:', p1.questions.length);
console.log('P1 by category:', p1.questions.reduce((a,q)=>{a[q.category]=(a[q.category]||0)+1;return a;},{}));
console.log('P2 total questions:', p2.questions.length);
console.log('P2 by category:', p2.questions.reduce((a,q)=>{a[q.category]=(a[q.category]||0)+1;return a;},{}));
console.log('P2 by subject:', p2.questions.reduce((a,q)=>{a[q.subject]=(a[q.subject]||0)+1;return a;},{}));
