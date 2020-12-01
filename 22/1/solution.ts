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
type Boss = Readonly<Record<'hp'|'attack', number>>;
type Player = Readonly<Record<'hp'|'mana'|'defense', number>>;

interface Effect {
    readonly spellName: string;
    readonly timer: number;
    readonly occur: (before: Combat) => Combat;
}

interface Combat {
    readonly player: Player;
    readonly boss: Boss;
    readonly activeEffects: Array<Effect>;
    readonly manaSpent: number;
}

interface Spell {
    readonly name: string;
    readonly cost: number;
    readonly cast: (before: Combat) => Combat;
}

const SPELLS: Array<Spell> = [{
    name: 'Magic Missile',
    cost: 53,
    cast: (before: Combat) => {
        return {
            ...before,
            boss: {
                ...before.boss,
                hp: (before.boss.hp - 4)
            }
        };
    }
}, {
    name: 'Drain',
    cost: 73,
    cast: (before: Combat) => {
        return {
            ...before,
            boss: {
                ...before.boss,
                hp: (before.boss.hp - 2)
            },
            player: {
                ...before.player,
                hp: (before.player.hp + 2)
            }
        }
    }
}, {
    name: 'Shield',
    cost: 113, 
    cast: (preCast: Combat) => {
        return  {
            ...preCast,
            activeEffects: [...preCast.activeEffects, {
                spellName: 'Shield',
                timer: 6,
                occur: (before: Combat) => {
                    return {
                        ...before,
                        player: {
                            ...before.player,
                            defense: before.player.defense + 7
                        }
                    }
                }
            }]
        }
    }
}, {
    name: 'Poison',
    cost: 173, 
    cast: (preCast: Combat) => {
        return  {
            ...preCast,
            activeEffects: [...preCast.activeEffects, {
                spellName: 'Poison',
                timer: 6,
                occur: (before: Combat) => {
                    return {
                        ...before,
                        boss: {
                            ...before.boss,
                            hp: before.boss.hp - 3
                        }
                    }
                }
            }]
        }
    }
}, {
    name: 'Recharge',
    cost: 229, 
    cast: (preCast: Combat) => {
        return  {
            ...preCast,
            activeEffects: [...preCast.activeEffects, {
                spellName: 'Recharge',
                timer: 5,
                occur: (before: Combat) => {
                    return {
                        ...before,
                        player: {
                            ...before.player,
                            mana: before.player.mana + 101
                        }
                    }
                }
            }]
        }
    }
}];


function extractStat(stat: string, line?: string): number {
    if (!line) {
        throw new Error(`No line for ${stat}`);
    }
    if (!line.startsWith(`${stat}: `)) {
        throw new Error(`Expected ${stat} but found ${line}`);
    }
    return +line.replace(`${stat}: `, '');
}

function parse(lines: Array<string>): Boss {
    const hp = extractStat('Hit Points', lines[0]);
    const attack = extractStat('Damage', lines[1]);
    
    return {
        hp,
        attack,
    }
}
function resolveEffects(before: Combat): Combat {
    const resolved: Combat = before.activeEffects
        .reduce((state: Combat, effect: Effect) => effect.occur(state), before);
    return {
        ...resolved,
        activeEffects: resolved.activeEffects
            .map(effect => ({...effect, timer: effect.timer - 1}))
            .filter(effect => effect.timer > 0)
    }
}

function isComplete(combat: Combat): boolean {
    return  combat.boss.hp <= 0 || combat.player.hp <= 0;
}

function simulateRound(preRound: Combat, spell?: Spell): Combat {
    //A round has 4 phases:
    //ResolveEffect (player)
    const preSpell = resolveEffects({...preRound, player: {...preRound.player, defense: 0}} );
    if (isComplete(preSpell)) return preSpell;
    if (!spell || spell.cost > preSpell.player.mana) {
        return {
            ...preSpell,
            player: {
                ...preSpell.player,
                hp: 0
            }
        }
    }
    //Cast Spell(player)
    const postSpell = spell.cast({
        ...preSpell,
        manaSpent: preSpell.manaSpent + spell.cost,
        player: {
            ...preSpell.player,
            mana: preSpell.player.mana - spell.cost
        }
    })
    if (isComplete(postSpell)) return postSpell;
    //ResolveEffects (boss)
    const preBoss = resolveEffects({...postSpell, player: {...postSpell.player, defense: 0}} );
    if (isComplete(preBoss)) return preBoss;
    //Deal Damage (boss)
    return {
        ...preBoss,
        player: {
            ...preBoss.player,
            hp: preBoss.player.hp - Math.max(preBoss.boss.attack - preBoss.player.defense, 1)
        }
    }
    
}
//A Minimum Priority Queue for the Paths
class CombatQueue {
    storage: Array<Combat> = [];
    insertPosition: number = 0;
    static calculateParent(location: number): number {
        return Math.floor((location - 1) / 2);
    }

    static calculateChildren(location: number): [number, number] {
        return [location * 2 + 1, location * 2 + 2];
    }
    
    safeGet(position: number): Combat {
        const toReturn = this.storage[position];
        if (!toReturn) {
            throw new Error('Sparse Array detected in Priority Queue');
        }
        return toReturn;
    }

    insert(candidate: Combat): void {
        this.storage[this.insertPosition] = candidate;
        this.insertPosition++;
        this.heapUp(this.insertPosition - 1);
    }

    heapUp(position: number): void {
        if (position === 0) {
            return //can't heapUp the root.
        }
        const target = this.safeGet(position);
        const parentPosition = CombatQueue.calculateParent(position);
        const parent = this.safeGet(parentPosition);
        if(parent.manaSpent < target.manaSpent) {
            return //Heap is satisfied.
        }
        // Heap is not satisfied, swap and recurse
        this.storage[position] = parent;
        this.storage[parentPosition] = target;
        this.heapUp(parentPosition);
    }

    getCheapestCandidate(): Combat {
        if (this.insertPosition === 0) {
            throw new Error('pop on empty priority queue');
        }

        const toReturn = this.safeGet(0);

        this.insertPosition--;

        if (this.insertPosition !== 0) {
            //heap is not empty...
            this.storage[0] = this.safeGet(this.insertPosition);
            this.heapDown(0);
        }

        return toReturn;
    }

    getBestChild(position: number): [number, Combat] | [] {
        const [leftChildPosition, rightChildPosition] = CombatQueue.calculateChildren(position);
        if (leftChildPosition >= this.insertPosition) {
            return [] //No children
        }

        const leftChild = this.safeGet(leftChildPosition);
        if (rightChildPosition >= this.insertPosition) {
            //No right child, therefore left is automatically best
            return [leftChildPosition, leftChild];
        }

        const rightChild = this.safeGet(rightChildPosition);
        return leftChild.manaSpent < rightChild.manaSpent
            ? [leftChildPosition, leftChild]
            : [rightChildPosition, rightChild];
    }

    heapDown(position: number): void {
        const target = this.safeGet(position);
        const [bestChildPosition, bestChild] = this.getBestChild(position);

        if (bestChildPosition && bestChild && (bestChild.manaSpent < target.manaSpent)) {
            this.storage[bestChildPosition] = target;
            this.storage[position] = bestChild;
            this.heapDown(bestChildPosition);
        }
    }
    
}

function solution(lines: Array<string>): RESULT_TYPE {
    const boss = parse(lines);
    const states = new CombatQueue();
    states.insert({
        boss,
        player: {
            hp: 50,
            mana: 500,
            defense: 0
        },
        manaSpent: 0,
        activeEffects: []
    });

    do {
        const curr = states.getCheapestCandidate(); 
        if (curr.player.hp <= 0) {
            continue; //Already lost, move on.
        }
        if (curr.boss.hp <= 0) {
            return curr.manaSpent;
        }
        const activeSpells: Set<String> = new Set(curr.activeEffects.filter(e => e.timer > 1).map(e => e.spellName));
        SPELLS.filter(s => !activeSpells.has(s.name))
            .forEach(spell => states.insert(simulateRound(curr, spell)))
        states.insert(simulateRound(curr)) // Maybe I don't have enough mana to cast a spell, but I don't need to?
    } while (states.insertPosition !== 0); //whoops, leaky abstraction.
    throw new Error('Ran out of combat states');


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
