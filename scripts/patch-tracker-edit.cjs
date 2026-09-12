const fs = require('fs');
function R(s, find, repl, label) {
  if (!s.includes(find)) { console.log('FAIL: ' + label); return s; }
  console.log('OK: ' + label);
  return s.replace(find, repl);
}
let s = fs.readFileSync('C:/Users/jobin/bonus-tracker/app/tracker/page.tsx', 'utf8');

s = R(s,
'    const updatedDirectoryUrls = isAdmin\n      ? { ...directoryUrls, [editingCasino.name]: normalizedUrl }\n      : directoryUrls;\n    const rating = editTrustpilotRating.trim()',
'    const normalizedAffiliateUrl = editAffiliateUrl.trim().startsWith("http") ? editAffiliateUrl.trim() : (editAffiliateUrl.trim() ? `https://${editAffiliateUrl.trim()}` : "");\n    const normalizedClaimUrl = editClaimUrl.trim().startsWith("http") ? editClaimUrl.trim() : (editClaimUrl.trim() ? `https://${editClaimUrl.trim()}` : "");\n    const normalizedBonusUrl = editBonusUrl.trim().startsWith("http") ? editBonusUrl.trim() : (editBonusUrl.trim() ? `https://${editBonusUrl.trim()}` : "");\n    const bonusTitle = editBonusTitle.trim() || "";\n    const updatedDirectoryUrls = isAdmin\n      ? { ...directoryUrls, [editingCasino.name]: normalizedUrl }\n      : directoryUrls;\n    const rating = editTrustpilotRating.trim()',
'saveCasinoEdits vars');

fs.writeFileSync('C:/Users/jobin/bonus-tracker/app/tracker/page.tsx', s);
console.log('DONE');
