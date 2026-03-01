// CU Boulder semester dates for SubletBuff.
// Update this file each semester when CU Boulder publishes new academic dates.
// Remove past terms; add upcoming ones. No other files need to change.
const SCHOOL_TERMS = [
  { name: 'Spring 2026', start: 'Jan 12', end: 'May 8'  },
  { name: 'Summer 2026', start: 'May 9',  end: 'Aug 8'  },
  { name: 'Fall 2026',   start: 'Aug 24', end: 'Dec 19' },
  { name: 'Spring 2027', start: 'Jan 11', end: 'May 7'  },
];

// Populate the semester popup in form.html at page load.
document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('term-dates-text');
  if (!el || !SCHOOL_TERMS.length) return;
  el.innerHTML = SCHOOL_TERMS
    .map(t => `${t.name}: ${t.start} \u2013 ${t.end}`)
    .join('<br/>');
});
