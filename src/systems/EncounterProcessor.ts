import { ExpeditionRun, EncounterRoom, EncounterChoice } from '../models/ExpeditionRun';
import { ITEM_DEFS } from '../data/items';
import { ROUTE_DEFS } from '../data/routes';
import { SeededRNG } from '../utils/RNG';
import { pickRandomSpecialist } from '../data/specialists';
import { SPECIAL_EFFECT_DEFS } from '../data/specialEffects';
import { hasEffect } from './CombatEngine';

/**
 * Processes non-combat encounter rooms: rest, hazard, find, merchant, survivor.
 */
export class EncounterProcessor {
  processRest(run: ExpeditionRun, room: EncounterRoom, rng: SeededRNG): void {
    const { optionA, optionB } = festeWahl(run, room) ?? this.zufallsWahlRast(room, rng);
    room.encounterChoices = { optionA, optionB };
    run.pendingChoice = { roomIndex: room.index, optionA, optionB };
    run.combatLog.push('>> Rastplatz gefunden! Wähle eine Aktion.');

    // Bei Unterwasser-Routen: Rest erholt zusätzlich +25 Luft
    const restRoute = ROUTE_DEFS[run.routeId];
    if (restRoute?.isUnderwater && run.airShield !== undefined) {
      run.airShield = Math.min(run.airShieldMax ?? 100, run.airShield + 25);
      run.combatLog.push('💨 Atemstille — Luftschild erholt sich um 25 Luft.');
    }
  }

  /** Feature #11: Begegnungs-Wahl für Rast-Räume (Rasten oder eine zufällige zweite Option) */
  private zufallsWahlRast(room: EncounterRoom, rng: SeededRNG): { optionA: EncounterChoice; optionB: EncounterChoice } {
    const optionA: EncounterChoice = {
      label: `Rasten (+${room.healPercent}% HP)`,
      flavorText: 'Das Team legt eine kurze Rast ein und erholt sich.',
      effect: 'heal',
      value: room.healPercent,
    };

    // Zweite Option variiert per RNG
    const roll = rng.nextInt(0, 2); // 0, 1 oder 2
    let optionB: EncounterChoice;
    if (roll === 0) {
      optionB = {
        label: 'Kräuter sammeln (+2 Grüne Kräuter)',
        flavorText: 'Ein aufmerksamer Blick entdeckt heilsame Kräuter am Wegesrand.',
        effect: 'item',
        value: 2,
        itemId: 'herb_green',
      };
    } else if (roll === 1) {
      optionB = {
        label: 'Meditieren (+5 XP)',
        flavorText: 'Stille Besinnung bringt neue Erkenntnisse.',
        effect: 'xp',
        value: 5,
      };
    } else {
      optionB = {
        label: 'Riskant heilen (60% Chance: +60% HP, sonst -30% HP)',
        flavorText: 'Ein unbekanntes Gebräu – könnte Wunder wirken oder schaden.',
        effect: 'risky_heal',
        value: 30,
      };
    }
    return { optionA, optionB };
  }

  processHazard(run: ExpeditionRun, room: EncounterRoom): void {
    for (const unit of run.party) {
      if (unit.hp > 0) {
        let dmg = room.hazardDamage;
        // fire_resist: reduce hazard damage by 30% (Vulkan-Hazards)
        if (hasEffect(unit, 'fire_resist')) {
          dmg = Math.floor(dmg * (1 - SPECIAL_EFFECT_DEFS.fire_resist.power));
        }
        unit.hp -= dmg;
      }
    }
    const hasResist = run.party.some(u => hasEffect(u, 'fire_resist'));
    run.combatLog.push(`>> Hazard! Team erleidet ${room.hazardDamage} Schaden.${hasResist ? ' (Feuerresistenz aktiv!)' : ''}`);
  }

  processFind(run: ExpeditionRun, room: EncounterRoom, rng: SeededRNG): void {
    run.combatLog.push('>> Fundstätte entdeckt!');

    const { optionA, optionB } = festeWahl(run, room) ?? this.zufallsWahlFund(room, rng);
    room.encounterChoices = { optionA, optionB };
    run.pendingChoice = { roomIndex: room.index, optionA, optionB };

    // air_crystal als Fund: Luftschild auffüllen (+30)
    const findRoute = ROUTE_DEFS[run.routeId];
    if (findRoute?.isUnderwater && run.airShield !== undefined) {
      const hasAirCrystal = room.findItems?.some(fi => fi.itemId === 'air_crystal');
      if (hasAirCrystal) {
        run.airShield = Math.min(run.airShieldMax ?? 100, run.airShield + 30);
        run.combatLog.push('💎 Luftkristall! Luftschild +30 Luft.');
      }
    }
  }

  /** Feature #11: Begegnungs-Wahl für Fund-Räume (Truhe oder eine zufällige zweite Option) */
  private zufallsWahlFund(room: EncounterRoom, rng: SeededRNG): { optionA: EncounterChoice; optionB: EncounterChoice } {
    const gold = room.findGold ?? 20;

    const optionA: EncounterChoice = {
      label: `Truhe öffnen (+${gold} Gold)`,
      flavorText: 'Eine verschlossene Truhe wartet auf euch. Euer Dieb knackt das Schloss.',
      effect: 'gold',
      value: gold,
    };

    // Zweite Option variiert per RNG
    const roll = rng.nextInt(0, 2); // 0, 1 oder 2
    let optionB: EncounterChoice;
    if (roll === 0) {
      optionB = {
        label: 'Weitergehen (+5% HP)',
        flavorText: 'Ihr ignoriert die Truhe und schont eure Kräfte für das Kommende.',
        effect: 'heal',
        value: 5,
      };
    } else if (roll === 1) {
      // Erstes findItem oder Fallback auf herb_green
      const firstItem = room.findItems?.[0];
      if (firstItem) {
        const itemName = ITEM_DEFS[firstItem.itemId]?.name ?? firstItem.itemId;
        optionB = {
          label: `Versteck durchsuchen (+${firstItem.qty}× ${itemName})`,
          flavorText: 'Ein gut verborgenes Versteck birgt nützliche Ausrüstung.',
          effect: 'item',
          value: firstItem.qty,
          itemId: firstItem.itemId,
        };
      } else {
        optionB = {
          label: 'Altes Lager plündern (+2 Grüne Kräuter)',
          flavorText: 'Ein verlassenes Lager hält noch einige Vorräte bereit.',
          effect: 'item',
          value: 2,
          itemId: 'herb_green',
        };
      }
    } else {
      optionB = {
        label: 'Wissen sammeln (+8 XP)',
        flavorText: 'Auf dem Boden liegen alte Bücher und Schriftrollen.',
        effect: 'xp',
        value: 8,
      };
    }
    return { optionA, optionB };
  }

  processMerchant(run: ExpeditionRun, _room: EncounterRoom): void {
    // Feature #16: Händler-Interaktion – pendingMerchant setzen, NICHT auto-healen
    run.pendingMerchant = true;
    run.merchantPurchases = 0;
    run.combatLog.push('>> Ein reisender Händler bietet seine Waren an! (Max. 2 Käufe)');
    run.combatLog.push('   Heiltrankh: 15 Gold | Brot: 8 Gold | Kraft-Brot: 25 Gold');
  }

  processSurvivor(run: ExpeditionRun, _room: EncounterRoom, rng: SeededRNG): void {
    // 3 XP für jedes lebende Party-Mitglied
    const aliveParty = run.party.filter(u => u.hp > 0);
    if (!run.xpEarned) run.xpEarned = {};
    for (const u of aliveParty) {
      run.xpEarned[u.id] = (run.xpEarned[u.id] ?? 0) + 3;
    }
    run.combatLog.push('>> Ihr findet einen Überlebenden! Er teilt wertvolle Erfahrungen. (+3 XP)');

    // Feature #17: 20% Chance einen Spezialisten zu finden
    if (rng.chance(0.2)) {
      // Bereits gefundene Spezialisten ausschließen
      const ownedSpecialists: string[] = [];
      if (run.specialistFound) ownedSpecialists.push(run.specialistFound);

      const specialist = pickRandomSpecialist(ownedSpecialists, () => rng.next());
      if (specialist) {
        run.specialistFound = specialist.id;
        run.combatLog.push(`>> SPEZIALIST! ${specialist.name} schließt sich euch an! (${specialist.flavorText})`);
      }
    }
  }
}

/**
 * Fest vorgegebene Wahl dieses Raums aus der Route (EncounterTemplate.wahl), z. B. die
 * Hort-Schätze im Drachenhort. Räume entsprechen den Route-Begegnungen der Reihe nach.
 */
function festeWahl(run: ExpeditionRun, room: EncounterRoom): { optionA: EncounterChoice; optionB: EncounterChoice } | null {
  const wahl = run.treppe ? undefined : ROUTE_DEFS[run.routeId]?.encounters[room.index]?.wahl;
  return wahl ? { optionA: { ...wahl.a }, optionB: { ...wahl.b } } : null;
}
