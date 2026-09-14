"use client";

import { useState } from "react";

export const casinoOfficialLogoUrls: Record<string, string> = {
  "Lucky Bunny": "https://service.nyc3.cdn.digitaloceanspaces.com/files/luckybunnycasino.com/img/logo.png",
  "1UP": "https://www.google.com/s2/favicons?domain=play1up.co&sz=128",
  Coinsback: "https://www.google.com/s2/favicons?domain=coinsbackcasino.com&sz=128",
  "High 5 Casino": "https://www.google.com/s2/favicons?domain=high5casino.com&sz=128",
  ReBet: "https://www.google.com/s2/favicons?domain=rebet.app&sz=128",
  Pulsz: "https://www.google.com/s2/favicons?domain=pulsz.com&sz=128",
  Lucklake: "https://www.google.com/s2/favicons?domain=lucklake.com&sz=128",
  SidePot: "https://www.google.com/s2/favicons?domain=sidepotcasino.com&sz=128",
  RealPrize: "https://www.google.com/s2/favicons?domain=realprize.com&sz=128",
  KingPrize: "https://www.google.com/s2/favicons?domain=kingprize.com&sz=128",
  Ace: "https://www.google.com/s2/favicons?domain=ace.bet&sz=128",
  Spree: "https://www.google.com/s2/favicons?domain=spree.com&sz=128",
  "The Win Zone": "https://www.google.com/s2/favicons?domain=thewinzone.com&sz=128",
  "Dogg House": "https://www.google.com/s2/favicons?domain=dogghousecasino.com&sz=128",
  "Lucky Bits Vegas": "https://www.google.com/s2/favicons?domain=luckybitsvegas.com&sz=128",
  "Coin Wizard": "https://www.google.com/s2/favicons?domain=coinwizard.com&sz=128",
  "Golden Hearts Games": "https://www.google.com/s2/favicons?domain=goldenheartsgames.com&sz=128",
  "Rolling Riches": "https://www.google.com/s2/favicons?domain=rollingriches.com&sz=128",
  NewLuck: "https://newluck.com/favicon.ico",
  "Fortune Purple": "https://www.google.com/s2/favicons?domain=fortunepurple.com&sz=128",
  "Fortune Wins": "https://www.google.com/s2/favicons?domain=fortunewins.com&sz=128",
  Pulszbingo: "https://www.google.com/s2/favicons?domain=pulszbingo.com&sz=128",
  Sportzino: "https://www.google.com/s2/favicons?domain=sportzino.com&sz=128",
  "WOW Vegas": "https://cdn4.wowvegas.com/assets/wowvegas-og-open-graph-image-v3.jpg",
  Stake: "https://www.google.com/s2/favicons?domain=stake.us&sz=128",
  "Stake.us": "https://www.google.com/s2/favicons?domain=stake.us&sz=128",
  "Crown Coins": "https://www.google.com/s2/favicons?domain=crowncoinscasino.com&sz=128",
  McLuck: "https://www.google.com/s2/favicons?domain=mcluck.com&sz=128",
  Chanced: "https://www.google.com/s2/favicons?domain=chanced.com&sz=128",
  Modo: "https://www.google.com/s2/favicons?domain=modo.us&sz=128",
  "Hello Millions": "https://www.google.com/s2/favicons?domain=hellomillions.com&sz=128",
  PlayFame: "https://www.google.com/s2/favicons?domain=playfame.com&sz=128",
  Jackpota: "https://www.google.com/s2/favicons?domain=jackpota.com&sz=128",
};

export function getCasinoLogoUrl(name: string, siteUrl?: string | null): string {
  if (casinoOfficialLogoUrls[name]) {
    return casinoOfficialLogoUrls[name];
  }
  if (siteUrl) {
    try {
      const origin = new URL(siteUrl).origin;
      return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(origin)}&sz=128`;
    } catch {
      // Fallback
    }
  }
  return "";
}

export function CasinoLogo({
  name = "",
  siteUrl,
  width = 32,
  height = 32,
  className = "h-8 w-8 object-contain",
  fallbackClassName = "text-xs font-bold text-[#9bcf9c]",
}: {
  name?: string;
  siteUrl?: string | null;
  width?: number;
  height?: number;
  className?: string;
  fallbackClassName?: string;
}) {
  const [hasError, setHasError] = useState(false);
  const safeName = name || "Casino";
  const logoUrl = getCasinoLogoUrl(safeName, siteUrl);

  if (!logoUrl || hasError) {
    return <span className={fallbackClassName}>{(safeName.slice(0, 2) || "CR").toUpperCase()}</span>;
  }

  return (
    <img
      src={logoUrl}
      alt={`${safeName} logo`}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => setHasError(true)}
    />
  );
}

export default CasinoLogo;

