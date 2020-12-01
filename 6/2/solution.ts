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
enum ACTION {
    ON,
    OFF,
    TOGGLE
}

interface Coordinate {
    x: number,
    y: number
}

function* getLights(upperLeft: Coordinate, lowerRight: Coordinate): Generator<Coordinate> {
    for (let x = upperLeft.x; x <= lowerRight.x; x++) {
        for (let y = upperLeft.y; y <= lowerRight.y; y++) {
            yield { x, y };
        }
    }
}

function dimLight(state: Array<Array<number>>, address: Coordinate, delta: number): Array<Array<number>> {
    const previousLevel: number = state[address.x]?.[address.y] ?? 0
    const newLevel: number = Math.max(0, previousLevel + delta);
    const row: Array<number> = state[address.x] ?? []

    row[address.y] = newLevel;
    state[address.x] = row;

    return state;
}


const DIMMINGS: Map<string, number> = new Map();
DIMMINGS.set('turn on', 1);
DIMMINGS.set('turn off', -1);
DIMMINGS.set('toggle', 2);

const COORDINATE_REGEX = /(\d+),(\d+)/g

function parse(line: string): (state: Array<Array<number>>) => Array<Array<number>> {
    const [upperLeft, lowerRight] = [...line.matchAll(COORDINATE_REGEX)]
        .map(match => ({
            x: +(match[1] ?? 0),
            y: +(match[2] ?? 0)
        }))

    if (upperLeft && lowerRight) {
        for (let [indicator, dimming] of DIMMINGS) {
            if (line.startsWith(indicator)) {
                return (state: Array<Array<number>>) => {
                    for (let light of getLights(upperLeft, lowerRight)) {
                        state = dimLight(state, light, dimming);
                    }
                    return state;
                }
            }
        }
    }
    throw new Error(`Error parsing: ${line}`);
}

function sum(x: number, y: number): number {
    return x + y;
}

function solution(lines: Array<string>): RESULT_TYPE {
    return lines
        .filter(l => l.length > 0)
        .map(parse)
        .reduce((state: Array<Array<number>>, step) => step(state), [])
        .map(row => row.reduce(sum))
        .reduce(sum)
}

const TEST_RESULTS: Array<RESULT_TYPE> = [
    1000000,
    2000,
    0,
    1001996,
    1,
    2000000
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
