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
const TARGET = 150;

function findTotaling(nums: Array<number>, target: number): Array<Array<number>> {
    return nums.flatMap((n, i) => {
        if (n > target) {
            return [];
        } else if (n === target) {
            return [[n]];
        }
        return findTotaling(nums.slice(i + 1), target - n)
            .map(rest => [n, ...rest]);
    });
}

function solution(lines: Array<string>): RESULT_TYPE {
    const ways = findTotaling(lines.map(l => +l), TARGET);
    const minContainers = ways.map(w => w.length)
        .reduce((l, r) => Math.min(l, r), Infinity);

    return ways.filter(w => w.length === minContainers).length;

}

const TEST_RESULTS: Array<RESULT_TYPE> = [
    0//No examples provided with the same target
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
