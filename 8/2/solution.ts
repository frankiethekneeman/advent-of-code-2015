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
const ESCAPE_SEQUENCE_COSTS: Map<string, number> = new Map();
ESCAPE_SEQUENCE_COSTS.set('\\"', 2);
ESCAPE_SEQUENCE_COSTS.set('\\\\', 2);
ESCAPE_SEQUENCE_COSTS.set('\\x', 1);

function calculateEncodedLength(str: string): number {
    let encoded = str.length + 4;
    //Establish a sliding window of size two over the string - excepting the surrounding ""
    for (let i = 1; i < str.length - 2; i++) {
        let cost = ESCAPE_SEQUENCE_COSTS.get(str.slice(i, i+2));
        if (cost) {
            i++; //Skip the next window, since both of these are part of the sequence
            encoded += cost;
        }
    }

    return encoded;
}

function sum(l: number, r: number): number {
    return l + r;
}

function solution(lines: Array<string>): RESULT_TYPE {
    const strings = lines.filter(l => l.length > 0);
    const codeLength = strings.map(s => s.length).reduce(sum);
    const encodedLength = strings.map(calculateEncodedLength).reduce(sum);
    return encodedLength - codeLength;
}

const TEST_RESULTS: Array<RESULT_TYPE> = [
    4,
    4,
    6,
    5,
    19
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
