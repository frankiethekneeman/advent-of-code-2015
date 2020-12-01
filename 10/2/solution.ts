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

function takeWhileSame(sequence: string): [string, string] {
    const character = sequence.charAt(0);
    let firstDifferentCharacterIndex = 1;
    while( firstDifferentCharacterIndex < sequence.length && sequence.charAt(firstDifferentCharacterIndex) === character) {
        firstDifferentCharacterIndex++;
    }
    return [sequence.slice(0, firstDifferentCharacterIndex), sequence.slice(firstDifferentCharacterIndex)];
}

function lookAndSay(sequence: string): string {
    let leadingSeq: string = '';
    const parts = []
    while(sequence.length > 0) {
        [leadingSeq, sequence] = takeWhileSame(sequence);
        parts.push(leadingSeq.length + leadingSeq.charAt(0));
    }
    return parts.join('');
}

function solution(lines: Array<string>): RESULT_TYPE {
    let iterations = 50;
    let sequence = lines.join('');
    while (iterations > 0) {
        sequence = lookAndSay(sequence);
        iterations --;
    }
    return sequence.length;
}

const TEST_RESULTS: Array<RESULT_TYPE> = [
   1166642, //No tests provided, but this is what I get from the example
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
