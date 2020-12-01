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

function quantumEntanglement(packages: Array<number>): number {
    return packages.reduce((l, r) => l * r, 1);
}

function weight(packages: Array<number>): number {
    return packages.reduce((l, r) => l + r, 0);
}

/**
 * return < 0 iff l < r
 * return > 0 iff l > r
 * return 0 iff l == r
 */
function compare(l: Array<number>, r: Array<number>) {
    return quantumEntanglement(l) - quantumEntanglement(r);
}

function subsetsOfLength(l: number, superset: Array<number>, requireSum: number): Array<Array<number>> {
    if (l === 0) {
        if (requireSum == 0) {
            return [[]];
        }
        return [];
    }
    return superset.flatMap((elem, i) => 
        subsetsOfLength(l - 1, superset.slice(i + 1), requireSum - elem)
            .map(s => [elem, ...s])
    );
}

function* generateGroupings(targetWeight: number, candidates: Array<number>): Generator<Array<number>> {
    for (let i = 1; i < candidates.length; i++) {
        const toYield = subsetsOfLength(i, candidates, targetWeight)
            .sort(compare);
        for (const grouping of toYield) {
            yield grouping;
        }
    }
}

function solution(lines: Array<string>): RESULT_TYPE {
    const packages = new Set(lines.map(n => +n));
    if (packages.size !== lines.length) {
        throw new Error('Not all packages are of distinct size - this solution is invalid.');
    }
    const w = weight([...packages]);
    if (w % 3 !== 0) {
        throw new Error('Cannot Divide evenly into threes');
    }
    for (const sleighLoad of generateGroupings(w / 3, [...packages])) {
        const remain = [...packages].filter(p => sleighLoad.indexOf(p) === -1);

        if (!generateGroupings(w / 3, remain).next().done) {
            //If I can make a group of 1/3 weight with the outgroup, I have a valid sleighload.
            return quantumEntanglement(sleighLoad);
        }
    }
    throw new Error('No valid packings found');
}

const TEST_RESULTS: Array<RESULT_TYPE> = [
    99// None given
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
