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
type Life = Array<Array<1|0>>;

const STEPS = 100;
const OFFSETS = [-1, 0, 1];

function countNeighbors(x: number, y: number, state: Life): number {
    return OFFSETS.flatMap(dx => OFFSETS.map(dy => {
        if (dx !== 0 || dy !== 0) {
            return state[x + dx]?.[y + dy];
        }
        return undefined;
    })).filter(n => n === 1)
    .length;
}

function increment(state: Life): Life {
    return state.map((row, x) => 
        row.map((cell, y) => {
            const neighborInfluence = countNeighbors(x, y, state);
            return neighborInfluence === 3 || (cell === 1 && neighborInfluence === 2) ? 1 : 0;
        })
    )
}

function parse(lines: Array<string>): Life {
    return lines.map( l => l.split('').map(c => c === '#' ? 1 : 0));
}

function solution(lines: Array<string>): RESULT_TYPE {
    let state = parse(lines);
    for (let i = 0; i < STEPS; i++) {
        state = increment(state)
    }
    return state.flat().filter(l => l === 1).length;

}

const TEST_RESULTS: Array<RESULT_TYPE> = [
    4 //Turns out the square is stable in Conway's game of life.
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
