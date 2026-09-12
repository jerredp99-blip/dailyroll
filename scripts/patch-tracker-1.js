const fs = require('fs');

let p = 'C:\\Users\\jobin\\bonus-tracker\\app\\tracker\\page.tsx';
let s = fs.readFileSync(p, 'utf8');

function doReplace(find, repl, label) {
  if (!s.includes(find)) { console.log('FAIL: ' + label); process.exit(1); }
  s = s.replace(find, repl);
  console.log('OK: ' + label);
}

// 2. Hydration — add setDirectoryBonusTitles
doReplace(
  `      setDirectoryBonusUrls({
        ...sharedBonusUrls,
      });
      setDirectoryRatings(currentRatings);`,
  `      setDirectoryBonusUrls({
        ...sharedBonusUrls,
      });
      setDirectoryBonusTitles({
        ...sharedBonusTitles,
      });
      setDirectoryRatings(currentRatings);`,
  'hydration setDirectoryBonusTitles'
);

fs.writeFileSync(p, s);
console.log('Tracker Part 2 DONE.');


fs.writeFileSync(p, s);
console.log('Tracker Part 1 DONE.');
