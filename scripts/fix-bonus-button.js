// Repairs the rollcall card action row in app/tracker/page.tsx:
// 1. removes the stale duplicate bonus button in the info column
// 2. rebuilds the action row: [named bonus button (Claim-styled)] [Claim!] [menu]
// 3. adds openedBonusIds state + openBonus handler (grey out after click)
const fs = require("fs");

const file = "app/tracker/page.tsx";
let raw = fs.readFileSync(file, "utf8");
const original = raw;
const problems = [];

// --- 1. remove stale info-column bonus button (contains disabled={!isAdmin}) ---
const staleRe = /\n * \{casino\.bonusUrl && \(\n *<button[\s\S]*?disabled=\{!isAdmin\}[\s\S]*?<\/button>\n *\)\}/;
if (!staleRe.test(raw)) {
  problems.push("stale bonus button not found");
} else {
  raw = raw.replace(staleRe, "");
}

// --- 2. rebuild the action row ---
const rowStart = '                      <div className="relative flex items-center gap-2">\n                        <div className="relative flex items-center gap-2">';
const rowEnd = '<MoreHorizontal size={18} />\n                        </button>\n                      </div>\n                      </div>';
const startIdx = raw.indexOf(rowStart);
const endIdx = raw.indexOf(rowEnd, startIdx >= 0 ? startIdx : 0);
if (startIdx < 0 || endIdx < 0) {
  problems.push(`action row anchors not found (startIdx=${startIdx}, endIdx=${endIdx})`);
} else {
  const bonusButton = `                        {casino.bonusUrl && (
                          <button
                            type="button"
                            onClick={() => openBonus(casino)}
                            disabled={openedBonusIds.has(casino.id)}
                            aria-label={\`Open \${casino.bonusTitle || "Bonus"} for \${casino.name}\`}
                            className={\`flex min-w-28 items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-bold shadow-[0_6px_16px_rgba(121,183,127,0.2)] transition \${openedBonusIds.has(casino.id) ? "cursor-not-allowed bg-[#2c3a30] text-[#718275] shadow-none" : "bg-[#79b77f] text-[#122519] hover:-translate-y-0.5 hover:bg-[#91c991] hover:shadow-[0_10px_22px_rgba(145,201,145,0.32)]"}\`}
                          >
                            <ExternalLink size={16} strokeWidth={2.5} />
                            {openedBonusIds.has(casino.id) ? "Opened" : casino.bonusTitle || "Bonus"}
                          </button>
                        )}`;
  const claimButton = `                        <button
                          type="button"
                          onClick={() => claim(casino)}
                          className={\`flex min-w-28 items-center justify-center gap-2 rounded-lg bg-[#79b77f] px-3.5 py-2 text-sm font-bold text-[#122519] shadow-[0_6px_16px_rgba(121,183,127,0.2)] transition hover:-translate-y-0.5 hover:bg-[#91c991] hover:shadow-[0_10px_22px_rgba(145,201,145,0.32)] \${status.ready ? "ring-2 ring-[#39ff6a] ring-offset-2 ring-offset-[#0f1a14]" : ""}\`}
                        >
                          {status.ready ? (
                            <CheckCircle2 size={16} strokeWidth={2.5} />
                          ) : (
                            <ExternalLink size={16} strokeWidth={2.5} />
                          )}
                          {status.ready ? "Claim!" : "Open link"}
                        </button>`;
  const menuButton = `                        <button
                          type="button"
                          onClick={() => setOpenActionMenu((open) => open === casino.id ? null : casino.id)}
                          aria-label={\`More actions for \${casino.name}\`}
                          aria-expanded={openActionMenu === casino.id}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-[#4c6d50] text-[#b7d5b5] hover:bg-[#2a4230]"
                        >
                          <MoreHorizontal size={18} />
                        </button>`;
  const newRow = `                      <div className="relative flex items-center gap-2">\n${bonusButton}\n${claimButton}\n${menuButton}\n                      </div>`;
  raw = raw.slice(0, startIdx) + newRow + raw.slice(endIdx + rowEnd.length);
}

// --- 3. state + handler ---
const stateAnchor = "  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);";
if (!raw.includes(stateAnchor)) {
  problems.push("state anchor not found");
} else if (!raw.includes("openedBonusIds")) {
  raw = raw.replace(
    stateAnchor,
    stateAnchor + "\n  const [openedBonusIds, setOpenedBonusIds] = useState<Set<string>>(new Set());",
  );
}

const handlerAnchor = `  function openCasino(casino: Casino) {
    const target = siteUrlFor(casino);
    if (target) window.open(target, "_blank", "noopener,noreferrer");
  }`;
if (!raw.includes(handlerAnchor)) {
  problems.push("openCasino handler anchor not found");
} else if (!raw.includes("function openBonus(")) {
  raw = raw.replace(
    handlerAnchor,
    handlerAnchor + `

  function openBonus(casino: Casino) {
    setOpenedBonusIds((prev) => new Set(prev).add(casino.id));
    if (casino.bonusUrl) window.open(casino.bonusUrl, "_blank", "noopener,noreferrer");
  }`,
  );
}

if (problems.length > 0 && raw === original) {
  console.error("FAILED — no changes written:");
  problems.forEach((p) => console.error(" - " + p));
  process.exit(1);
}
fs.writeFileSync(file, raw, "utf8");
console.log("OK — rewrote " + file);
if (problems.length > 0) {
  console.log("warnings:");
  problems.forEach((p) => console.log(" - " + p));
}
