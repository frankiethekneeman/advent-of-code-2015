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

function arrayDifference(full: Array<number>, toRemove: Array<number>) {
    const complete = [...full].sort((l, r) => l - r);
    const unwanted = [...toRemove].sort((l, r) => l - r);
    const toReturn = [];
    let i_u = 0;
    for (let i_c = 0; i_c < complete.length; i_c++) {
        const candidate = complete[i_c];
        if (candidate === undefined){
            continue;
        } else if (candidate === unwanted[i_u]) {
            i_u++;
        } else {
            toReturn.push(candidate);
        }
    }
    return toReturn;
}

function verifyGroupings(targetWeight: number, disJointGroupings: number, items: Array<number>): boolean {
    for (const match of generateGroupings(targetWeight, items)) {
        if (
            disJointGroupings === 1 //recursion base case
            || verifyGroupings(targetWeight, disJointGroupings - 1, arrayDifference(items, match))
        ) {
            return true;
        }
    }
    return false;
}

const DIVISIONS = 4;
function solution(lines: Array<string>): RESULT_TYPE {
    const packages = lines.map(n => +n);
    const fullWeight = weight(packages);
    if (fullWeight % DIVISIONS !== 0) {
        throw new Error(`Cannot Divide evenly into ${DIVISIONS} divisions`);
    }
    const targetWeight = fullWeight / DIVISIONS
    for (const sleighLoad of generateGroupings(targetWeight, packages)) {
        const remain = arrayDifference(packages, sleighLoad);

        if (verifyGroupings(targetWeight, DIVISIONS - 2, remain)) {
            return quantumEntanglement(sleighLoad);
        }
    }
    throw new Error('No valid packings found');
}

const TEST_RESULTS: Array<RESULT_TYPE> = [
    44
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
