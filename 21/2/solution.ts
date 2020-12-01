const fs = require('fs').promises;
const path = require('path');
const cryptography = require('crypto');

/**
 * Set the result type for consistency
 */
type RESULT_TYPE = number;

/**
 * Solution begins
 */
type Combatant = Record<'hp'|'attack'|'defense', number>;

function extractStat(stat: string, line?: string): number {
    if (!line) {
        throw new Error(`No line for ${stat}`);
    }
    if (!line.startsWith(`${stat}: `)) {
        throw new Error(`Expected ${stat} but found ${line}`);
    }
    return +line.replace(`${stat}: `, '');
}

function parse(lines: Array<string>): Combatant {
    const hp = extractStat('Hit Points', lines[0]);
    const attack = extractStat('Damage', lines[1]);
    const defense = extractStat('Armor', lines[2]);
    
    return {
        hp,
        attack,
        defense,
    }

}

interface Gear {
    name: string,
    cost: number,
    damage: number,
    armor: number
}

function gear(name: string, cost: number, damage: number, armor: number) {
    return {name, cost, damage, armor};
}

const WEAPONS: Array<Gear> = [
    gear('Dagger', 8, 4, 0),
    gear('Shortsword', 10, 5, 0),
    gear('Warhammer', 25, 6, 0),
    gear('Longsword', 40, 7, 0),
    gear('Greataxe', 74, 8, 0)
]

const ARMOR: Array<Gear> = [
    gear('Leather', 13, 0, 1),
    gear('Chainmail', 31, 0, 2),
    gear('Splintmail', 53, 0, 3),
    gear('Bandedmail', 75, 0, 4),
    gear('Platemail', 102, 0, 5)
]

const RINGS: Array<Gear> = [
    gear('Damage +1', 25, 1, 0),
    gear('Damage +2', 50, 2, 0),
    gear('Damage +3', 100, 3, 0),
    gear('Defense +1', 20, 0, 1),
    gear('Defense +2', 40, 0, 2),
    gear('Defense +3', 80, 0, 3)
]

function powerArray<T>(elems: Array<T>): Array<Array<T>> {
    const head = elems[0];
    if (!head) {
        //empty Array only has one thing it its powerArray:
        return [[]]
    }
    const subArrays = powerArray(elems.slice(1));
    return [...subArrays, ...subArrays.map(s => [head, ...s])];
}

function crossProduct<T>(...arrays: Array<Array<Array<T>>>): Array<Array<T>> {
    const head = arrays[0];
    if (!head) {
        //empty Array only has one thing it its powerArray:
        return [[]]
    }
    const products = crossProduct(...arrays.slice(1));
    return head.flatMap(elem => products.map(product => [...elem, ...product]));
}

function sum(l: number, r: number): number { return l + r; }

function roundsToDefeat(attacker: Combatant, defender: Combatant): number {
    const dps = Math.max(attacker.attack - defender.defense, 1);
    return Math.ceil(defender.hp / dps);
}
function wouldWin(gear: Array<Gear>, boss: Combatant): boolean {
    const hero: Combatant = {
        hp: 100,
        attack: gear.map(g => g.damage).reduce(sum),
        defense: gear.map(g => g.armor).reduce(sum),
    }

    return roundsToDefeat(hero, boss) <= roundsToDefeat(boss, hero);
}

function solution(lines: Array<string>): RESULT_TYPE {
    const boss = parse(lines);

    const weaponSelections: Array<Array<Gear>> = WEAPONS.map(w => [w]);
    const armorSelections: Array<Array<Gear>> = [[], ...ARMOR.map(a => [a])];
    const ringSelections: Array<Array<Gear>> = powerArray(RINGS)
        .filter(s => s.length < 3);

    const winningLoadouts: Array<Array<Gear>> = crossProduct(weaponSelections, armorSelections, ringSelections)
        .filter(loadout => !wouldWin(loadout, boss))

    return winningLoadouts.map(loadout => loadout.map(gear => gear.cost).reduce(sum))
        .reduce((l, r) => Math.max(l, r));
}

const TEST_RESULTS: Array<RESULT_TYPE> = [
  // None given
];

/**
 * Bootstrapping, test running
 */
const INPUT_FILE: string = path.join(__dirname, '../input');

function solveFile(filename: string): Promise<RESULT_TYPE> {
    return fs.readFile(filename, 'utf8')
        .then((contents: string) => contents.split('\n').filter(l => l.length > 0))
        .then(solution);
}

function allOrRejections<T>(promises: Array<Promise<T>>): Promise<Array<T>> {
    return Promise.allSettled(promises)
        .then((results) => {
            const failures = results
                .flatMap(r => r.status === 'rejected' ? [r.reason.message ]: [])
                .join('\n');

            if (failures.length > 0) {
                throw failures;
            }

            return (results as Array<PromiseFulfilledResult<T>>)
                .map(r => r.value);
        });

}

function assertEquality(i: number): (result: RESULT_TYPE) => RESULT_TYPE {
    return function(result: RESULT_TYPE): RESULT_TYPE {
        if (result === TEST_RESULTS[i]) {
            return result;
        }
        throw new Error(`Test case ${i + 1} expected ${TEST_RESULTS[i]} but got ${result}`);
    }
}

const TESTS = Array.apply(null, Array(TEST_RESULTS.length))
    .map((_, i) => path.join(__dirname, '..', 'test' + (i + 1)))
    .map(solveFile)
    .map((p, i) => p.then(assertEquality(i)))

allOrRejections(TESTS)
   .then(() => solveFile(INPUT_FILE))
   .then(console.log)
   .catch(console.log)
