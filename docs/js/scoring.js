/* WBJEE scoring engine
   Cat 1 single: +1 / -0.25
   Cat 2 single: +2 / -0.5
   Cat 3 multi : partial marking:
       - if any selected option is wrong  -> 0
       - if no selection                  -> 0
       - else +2 * (selected_correct / total_correct)
*/
const Scoring = {
  scoreQuestion(question, selected) {
    selected = selected || [];
    const correct = question.correct || [];
    const out = {
      attempted: selected.length > 0,
      correct_set: false,        // exactly all correct chosen
      partial: false,            // only correct chosen but not all
      wrong: false,
      marks: 0,
      status: 'unattempted'      // for analytics: correct | wrong | partial | unattempted
    };

    if (selected.length === 0) {
      return out;
    }

    if (!question.multi_correct) {
      // Cat 1 / 2 — only one selection allowed
      const choice = selected[0];
      if (correct.includes(choice)) {
        out.correct_set = true;
        out.marks = question.marks_correct;
        out.status = 'correct';
      } else {
        out.wrong = true;
        out.marks = question.marks_wrong; // negative
        out.status = 'wrong';
      }
      return out;
    }

    // Cat 3 — multi correct
    const totalCorrect = correct.length;
    const anyWrong = selected.some(s => !correct.includes(s));
    if (anyWrong) {
      out.wrong = true;
      out.marks = 0;
      out.status = 'wrong';
      return out;
    }
    const numSelectedCorrect = selected.filter(s => correct.includes(s)).length;
    if (numSelectedCorrect === totalCorrect) {
      out.correct_set = true;
      out.marks = question.marks_correct;
      out.status = 'correct';
    } else {
      out.partial = true;
      out.marks = (question.marks_correct * numSelectedCorrect) / totalCorrect;
      out.status = 'partial';
    }
    return out;
  },

  /**
   * Score an entire paper.
   * Returns object with total marks, category breakdown, subject breakdown,
   * per-question results, accuracy etc.
   */
  scorePaper(paperData, responses) {
    const results = [];
    let totalMarks = 0;
    let totalCorrect = 0, totalWrong = 0, totalPartial = 0, totalUnatt = 0;
    let attemptedCount = 0;

    const byCategory = { 1: {q:0,att:0,cor:0,wr:0,par:0,m:0,max:0},
                         2: {q:0,att:0,cor:0,wr:0,par:0,m:0,max:0},
                         3: {q:0,att:0,cor:0,wr:0,par:0,m:0,max:0} };
    const bySubject = {};

    paperData.questions.forEach(q => {
      const sel = responses[q.id] || [];
      const r = Scoring.scoreQuestion(q, sel);
      totalMarks += r.marks;
      if (r.status === 'correct') totalCorrect++;
      else if (r.status === 'wrong') totalWrong++;
      else if (r.status === 'partial') totalPartial++;
      else totalUnatt++;
      if (r.attempted) attemptedCount++;

      const cat = byCategory[q.category];
      cat.q++;
      cat.max += q.marks_correct;
      if (r.attempted) cat.att++;
      if (r.status === 'correct') cat.cor++;
      else if (r.status === 'wrong') cat.wr++;
      else if (r.status === 'partial') cat.par++;
      cat.m += r.marks;

      if (!bySubject[q.subject]) {
        bySubject[q.subject] = {q:0,att:0,cor:0,wr:0,par:0,m:0,max:0};
      }
      const sub = bySubject[q.subject];
      sub.q++;
      sub.max += q.marks_correct;
      if (r.attempted) sub.att++;
      if (r.status === 'correct') sub.cor++;
      else if (r.status === 'wrong') sub.wr++;
      else if (r.status === 'partial') sub.par++;
      sub.m += r.marks;

      results.push({
        id: q.id,
        number: q.number,
        subject: q.subject,
        category: q.category,
        selected: sel,
        correct_answer: q.correct,
        status: r.status,
        marks: r.marks,
        max_marks: q.marks_correct
      });
    });

    const accuracy = attemptedCount === 0 ? 0 :
        ((totalCorrect + totalPartial) / attemptedCount) * 100;

    return {
      paper: paperData.paper,
      paper_title: paperData.paper_title,
      year: paperData.year,
      total_marks: Number(totalMarks.toFixed(2)),
      max_marks: paperData.total_marks,
      total_questions: paperData.total_questions,
      attempted: attemptedCount,
      correct: totalCorrect,
      wrong: totalWrong,
      partial: totalPartial,
      unattempted: totalUnatt,
      accuracy: Number(accuracy.toFixed(2)),
      by_category: byCategory,
      by_subject: bySubject,
      per_question: results
    };
  }
};
