const fs = require('fs').promises;
const path = require('path');

/**
 * Set the result type for consistency
 */
type RESULT_TYPE = number;

type Direction = '<' | '>' | '^' | 'v'
interface Coordinate {
    x: number,
    y: number
}

const BASIS_VECTORS: Record<Direction, Coordinate> = {
    '<': { x: -1, y: 0 },
    '>': { x: 1, y: 0 },
    '^': { x: 0, y: 1 },
    'v': { x: 0, y: -1 },
};

function isValidInstruction(candidate: string): candidate is Direction {
    return candidate.length === 1 && candidate in BASIS_VECTORS;
}

function add(location: Coordinate, movement: Coordinate): Coordinate {
    return {
        x: location.x + movement.x,
        y: location.y + movement.y
    };
}

function  toString(location: Coordinate): string {
    return `${location.x}, ${location.y}`;
}

/**
 * Solution begins
 */

function solution(lines: Array<string>): RESULT_TYPE {
    let location: Coordinate = { x: 0, y: 0};
    const seen: Set<string> = new Set();
    seen.add(toString(location));

    for (const instruction of lines.join('')) {
        if (isValidInstruction(instruction)) {
            location = add(location, BASIS_VECTORS[instruction]);
            seen.add(toString(location));
        }
    }
    return seen.size;
}

const TEST_RESULTS: Array<RESULT_TYPE> = [
    2,
    4,
    2
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
