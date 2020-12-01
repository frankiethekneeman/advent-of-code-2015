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

const MULTIPLIER = 252533;
const MODULUS = 33554393;
const IV = 20151125;

const FORMAT = /To continue, please consult the code grid in the manual.  Enter the code at row (\d+), column (\d+)./

function parse(line: string): [number, number] {
	const [empty, row, col, alsoEmpty, ...rest] = line.split(FORMAT);
    if (
        empty !== ''
        || !row || isNaN(+row)
        || !col || isNaN(+col)
        || alsoEmpty !== ''
        || rest.length > 0
    ) {
        throw new Error(`Unable to parse: ${line}`);
    }
	return [+row, +col];
}

function codeNumber(row: number, col: number): number {
    const rowOffset = col * (col + 1) / 2
    const colOffset = ((row - 1) * col) + ((row - 2) * (row - 1) / 2)
    return rowOffset + colOffset
}

function moduloPower(base: number, power: number, modulus: number): number {
    if (power == 0) {
        return 1;
    }
    const halfPower = moduloPower(base, Math.floor(power / 2), modulus);
    const candidate = halfPower * halfPower % modulus;
    if (power % 2 == 0) {
        return candidate;
    } else {
        return candidate * base % modulus;
    }
}

function solution(lines: Array<string>): RESULT_TYPE {
    const [row, col] = parse(lines.join(''));
    const codeN = codeNumber(row, col);
    const multiplier = moduloPower(MULTIPLIER, codeN - 1, MODULUS);
    return IV * multiplier % MODULUS;
}

const TEST_RESULTS: Array<RESULT_TYPE> = [
    20151125,
    31916031,
    16080970,
    24592653,
    77061,
    33071741,
    18749137,
    21629792,
    8057251,
    32451966,
    17552253,
    6796745,
    17289845,
    16929656,
    1601130,
    21345942,
    28094349,
    25397450,
    30943339,
    7726640,
    7981243,
    9380097,
    6899651,
    24659492,
    10071777,
    15514188,
    11661866,
    10600672,
    9250759,
    1534922,
    33511524,
    4041754,
    16474243,
    31527494,
    31663883,
    27995004
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
