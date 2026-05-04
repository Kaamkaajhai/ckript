import DiffMatchPatch from 'diff-match-patch';
const dmp = new DiffMatchPatch();
const text1 = "line1\nline2\nline3\n";
const text2 = "line1\nline2 changed\nline3\n";

const a = dmp.diff_linesToChars_(text1, text2);
const diffs = dmp.diff_main(a.chars1, a.chars2, false);
dmp.diff_charsToLines_(diffs, a.lineArray);
console.log(JSON.stringify(diffs));
