const fs = require('fs');

function doReplace(s, find, repl, label) {
  if (!s.includes(find)) {
    console.log('FAIL: ' + label);
    return null;
  }
  console.log('OK: ' + label);
  return s.replace(find, repl);
}

// === TRACKER ===
let tp = 'C:/Users/jobin/bonus-tracker/app/tracker/page.tsx';
let s = fs.readFileSync(tp, 'utf8');

// 1. State declarations — insert directoryBonusTitles before directoryRatings
s = doReplace(s,
`  const [directoryBonusUrls, setDirectoryBonusUrls] = useState<Record<string, string>>({});
  const [directoryRatings, setDirectoryRatings] = useState<Record<string, number>>({});`,
`  const [directoryBonusUrls, setDirectoryBonusUrls] = useState<Record<string, string>>({});
  const [directoryBonusTitles, setDirectoryBonusTitles] = useState<Record<string, string>>({});
  const [directoryRatings, setDirectoryRatings] = useState<Record<string, number>>({});`);

// 2. Add edit field states after editUrl
s = doReplace(s,
`  const [editUrl, setEditUrl] = useState("");
  const [editDetails, setEditDetails] = useState("");`,
`  const [editUrl, setEditUrl] = useState("");
  const [editAffiliateUrl, setEditAffiliateUrl] = useState("");
  const [editClaimUrl, setEditClaimUrl] = useState("");
  const [editBonusUrl, setEditBonusUrl] = useState("");
  const [editBonusTitle, setEditBonusTitle] = useState("");
  const [editDetails, setEditDetails] = useState("");`);

// 3. Hydration — add setDirectoryBonusTitles
s = doReplace(s,
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
      setDirectoryRatings(currentRatings);`);

// 4. openCasinoEditor — init new edit states
s = doReplace(s,
`    setEditResetTime(casino.resetAtTime || "00:00");
  }

  function openDirectoryEditor`,
`    setEditResetTime(casino.resetAtTime || "00:00");
    setEditAffiliateUrl(casino.affiliateUrl ?? "");
    setEditClaimUrl(casino.claimUrl ?? "");
    setEditBonusUrl(casino.bonusUrl ?? "");
    setEditBonusTitle(casino.bonusTitle ?? "");
  }

  function openDirectoryEditor`);

// 5. openDirectoryEditor — include bonusTitle
s = doReplace(s,
`      trustpilotRating: directoryRatings[casinoName],
    });
  }`,
`      trustpilotRating: directoryRatings[casinoName],
      bonusTitle: directoryBonusTitles[casinoName] || undefined,
    });
  }`);

fs.writeFileSync(tp, s);
console.log('TRACKER DONE.');


