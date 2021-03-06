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

function sum(l: number, r: number) {
    return l + r;
}

function checkSum(subject: unknown): number {
    if (typeof subject === 'string') {
        return 0;
    }
    if (typeof subject === 'number') {
        return subject;
    }
    if (subject instanceof Array) {
        return subject.map(checkSum).reduce(sum, 0);
    }
    if (typeof subject === 'object' && subject) {
        return Object.values(subject).map(checkSum).reduce(sum, 0);
    }
    throw new Error(`Cannot checkSum Subject: ${subject}`);
}

function solution(lines: Array<string>): RESULT_TYPE {
    return checkSum(JSON.parse(lines.join('')));
}

const TEST_RESULTS: Array<RESULT_TYPE> = [
    6,
    6,
    3,
    3,
    0,
    0,
    0,
    0
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
