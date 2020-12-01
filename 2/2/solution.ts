const fs = require('fs').promises;
const path = require('path');

/**
 * Set the result type for consistency
 */
type RESULT_TYPE = number;

/**
 * Solution begins
 */

const UP_INSTRUCTION = '(';

function parsePresent(line: string): Array<number> {
    return line.split('x').map(n => +n);
}

function sum(l: number, r: number): number {
    return l + r;
}

function calculateRibbon(dimensions: Array<number>): number {
    const smallestPerimiter: number = dimensions.sort((l, r) => l - r)
        .slice(0,2)
        .reduce(sum) * 2;
    const volume: number = dimensions.reduce((l, r) => l * r);
    return smallestPerimiter + volume;
}

function solution(lines: Array<string>): RESULT_TYPE {
    return lines
        .filter(line => line != '')
        .map(parsePresent)
        .map(calculateRibbon)
        .reduce(sum);
}

const TEST_RESULTS: Array<RESULT_TYPE> = [
    34,
    14,
    48
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
