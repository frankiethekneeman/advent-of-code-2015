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

function parse(line: string): [string, string, number] {
    const [lhs, neighbor, ...lineOverflow] = line.split(' happiness units by sitting next to ');
    if (!lhs || !neighbor || lineOverflow.length > 0) {
        throw new Error(`Unparseable line ${line}`);
    }

    const [person, delta, ...lhsOverflow] = lhs.split(' would ');
    if (!person || !delta || lhsOverflow.length > 0) {
        throw new Error(`Unparseable lhs "${lhs}" from line "${line}"`);
    }

    const [sign, magnitude, ...deltaOverflow]  = delta.split(' ');
    if (!sign || !magnitude || isNaN(+magnitude) || deltaOverflow.length > 0) {
        throw new Error(`Unparseable delta "${delta}" from line "${line}"`);
    }

    const happiness = +magnitude * (sign === 'gain' ? 1 : -1); //I'll take a risk on some other verb here.
    
    return [person, neighbor.slice(0, -1), happiness]
}

type Preferences = Map<string, Map<string, number>>

function permute<T>(items: Array<T>): Array<Array<T>> {
    if (items.length === 0) {
        return [[]];
    }
    return items.flatMap(
        item => permute(items.filter(i => i !== item))
            .map(rest => [item, ...rest])
    )
}

function evaluate(seating: Array<string>, preferences: Preferences): number {
    let score = 0;
    for (let i = 0; i < seating.length; i++) {
        const current = seating[i];
        const next = seating[(i + 1) % seating.length];
        if (!current || !next) {
            throw new Error('Sparse Seating for evaluation');
        }
        const forwardHappiness = preferences.get(current)?.get(next)
        const backwardHappiness = preferences.get(next)?.get(current)
        if (forwardHappiness === undefined || backwardHappiness === undefined) {
            console.log(preferences, current, next);
            throw new Error('Incomplete preference information');
        }
        score += forwardHappiness + backwardHappiness;
    }
    return score;
}

function solution(lines: Array<string>): RESULT_TYPE {
    const parsed: Array<[string, string, number]> = lines.filter(l => l.length > 0)
        .map(parse)
    const selfMapping: Array<[string, string, number]> = [...new Set(parsed.map(p => p[0]))]
        .flatMap(guest => [
            [guest, 'self', 0],
            ['self', guest, 0]
        ]);
   
    const preferences: Preferences = new Map();
    for (const [person, neighbor, happiness] of [...parsed, ...selfMapping]) {
        const subMap = preferences.get(person) ?? new Map();
        subMap.set(neighbor, happiness);
        preferences.set(person, subMap);
    }
    return permute([...preferences.keys()])
      .map(s => evaluate(s, preferences))
      .reduce((l, r) => Math.max(l, r), -Infinity);
}


const TEST_RESULTS: Array<RESULT_TYPE> = [
    // No examples Given
];

/**
 * Bootstrapping, test running
 */
const INPUT_FILE: string = path.join(__dirname, '../input');

function solveFile(filename: string): Promise<RESULT_TYPE> {
    return fs.readFile(filename, 'utf8')
        .then((contents: string) => contents.split('\n'))
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
