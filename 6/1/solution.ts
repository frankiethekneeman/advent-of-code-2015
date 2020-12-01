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

function* getLights(upperLeft: Coordinate, lowerRight: Coordinate): Generator<string> {
    for (let x = upperLeft.x; x <= lowerRight.x; x++) {
        for (let y = upperLeft.y; y <= lowerRight.y; y++) {
            yield `${x}, ${y}`;
        }
    }
}

function turnOn(lights: Generator<string>): (state: Set<string>) => Set<string> {
    return (state: Set<string>) => {
        for (let light of lights) {
            state.add(light);
        }
        return state;
    }
}

function turnOff(lights: Generator<string>): (state: Set<string>) => Set<string> {
    return (state: Set<string>) => {
        for (let light of lights) {
            state.delete(light);
        }
        return state;
    }
}

function toggle(lights: Generator<string>): (state: Set<string>) => Set<string> {
    return (state: Set<string>) => {
        for (let light of lights) {
            if (state.has(light)) {
                state.delete(light);
            } else {
                state.add(light)
            }
        }
        return state;
    }
}

type Operation = (lights: Generator<string>) => (state: Set<string>) => Set<string>
const OPERATIONS: Map<string, Operation> = new Map();
OPERATIONS.set('turn on', turnOn);
OPERATIONS.set('turn off', turnOff);
OPERATIONS.set('toggle', toggle);

const COORDINATE_REGEX = /(\d+),(\d+)/g

function parse(line: string): (state: Set<string>) => Set<string> {
    const [upperLeft, lowerRight] = [...line.matchAll(COORDINATE_REGEX)]
        .map(match => ({
            x: +(match[1] ?? 0),
            y: +(match[2] ?? 0)
        }))

    if (upperLeft && lowerRight) {
      for (let [indicator, operation] of OPERATIONS) {
          if (line.startsWith(indicator)) {
              return operation(getLights(upperLeft, lowerRight));
          }
      }
    }
    throw new Error(`Error parsing: ${line}`);
}

function solution(lines: Array<string>): RESULT_TYPE {
    return lines
        .filter(l => l.length > 0)
        .map(parse)
        .reduce((state: Set<string>, step) => step(state), new Set<string>())
        .size;
}

const TEST_RESULTS: Array<RESULT_TYPE> = [
    1000000,
    1000,
    0,
    998996
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
