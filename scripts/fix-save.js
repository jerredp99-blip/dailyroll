const fs = require('fs');
let s = fs.readFileSync('C:/Users/jobin/bonus-tracker/app/tracker/page.tsx', 'utf8');

// Add admin URL field inputs to edit dialog after Trustpilot rating, before Bonus label
const oldDialog = `              {isAdmin && (
                <label className="text-xs font-semibold text-[#a9bbaa]">
                  Trustpilot rating
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={editTrustpilotRating}
                    onChange={(event) => setEditTrustpilotRating(event.target.value)}
                    placeholder="0 to 5"
                    className="mt-2 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
                  />
                </label>
              )}
              <label className="text-xs font-semibold text-[#a9bbaa]">
                Bonus label`;

const newDialog = `              {isAdmin && (
                <label className="text-xs font-semibold text-[#a9bbaa]">
                  Trustpilot rating
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={editTrustpilotRating}
                    onChange={(event) => setEditTrustpilotRating(event.target.value)}
                    placeholder="0 to 5"
                    className="mt-2 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
                  />
                </label>
              )}
              {isAdmin && (
                <label className="text-xs font-semibold text-[#a9bbaa]">
                  Affiliate URL (Sign up link)
                  <input
                    type="text"
                    inputMode="url"
                    value={editAffiliateUrl}
                    onChange={(event) => setEditAffiliateUrl(event.target.value)}
                    placeholder="https://casino.example?ref=..."
                    className="mt-2 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
                  />
                </label>
              )}
              {isAdmin && (
                <label className="text-xs font-semibold text-[#a9bbaa]">
                  Claim URL (Claim Now link)
                  <input
                    type="text"
                    inputMode="url"
                    value={editClaimUrl}
                    onChange={(event) => setEditClaimUrl(event.target.value)}
                    placeholder="https://casino.example"
                    className="mt-2 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
                  />
                </label>
              )}
              {isAdmin && (
                <label className="text-xs font-semibold text-[#a9bbaa]">
                  Bonus URL (bonus details link)
                  <input
                    type="text"
                    inputMode="url"
                    value={editBonusUrl}
                    onChange={(event) => setEditBonusUrl(event.target.value)}
                    placeholder="https://casino.example/bonus"
                    className="mt-2 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
                  />
                </label>
              )}
              {isAdmin && (
                <label className="text-xs font-semibold text-[#a9bbaa]">
                  Bonus button title
                  <input
                    type="text"
                    value={editBonusTitle}
                    onChange={(event) => setEditBonusTitle(event.target.value)}
                    placeholder="e.g. Daily Bonus, 100% Match"
                    className="mt-2 h-11 w-full rounded-xl border border-[#344d3b] bg-[#111b16] px-3 text-sm text-[#e0ece0] outline-none focus:border-[#78ae7e]"
                  />
                </label>
              )}
              <label className="text-xs font-semibold text-[#a9bbaa]">
                Bonus label`;

if (s.includes(oldDialog)) {
  s = s.replace(oldDialog, newDialog);
  console.log('OK: dialog JSX');
} else {
  console.log('FAIL: dialog JSX not found');
}

fs.writeFileSync('C:/Users/jobin/bonus-tracker/app/tracker/page.tsx', s);
console.log('Dialog patched.');

