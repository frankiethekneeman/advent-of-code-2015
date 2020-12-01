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
interface Reindeer {
    name: string;
    speed: number;
    sprintDuration: number;
    restDuration: number;
}

function parse(line: string): Reindeer {
    const [ name, speed, sprintDuration, restDuration, emptyString, ...rest] = 
        line.split(/ can fly | km\/s for | seconds, but then must rest for | seconds\./);

    if( !name
        || !speed || isNaN(+speed)
        || !sprintDuration || isNaN(+sprintDuration)
        || !restDuration || isNaN(+restDuration)
        || emptyString !== ''
        || rest.length > 0
    ) {
        throw new Error(`Failed to parse: ${line}`);
    }
    return {
        name,
        speed: +speed,
        sprintDuration: +sprintDuration,
        restDuration: +restDuration
    };
}

function isMoving(reindeer: Reindeer, time: number): boolean {
    const interval = reindeer.sprintDuration + reindeer.restDuration;
    const overflow = time % interval
    return overflow > 0 && overflow <= reindeer.sprintDuration;
}

function simulate(reindeer: Reindeer, time: number): Array<number> {
    let distances = []
    let current = 0;
    for (let second = 1; second <= time; second++) {
        if (isMoving(reindeer, second)) {
            current += reindeer.speed;
        }
        distances.push(current);
    }
    return distances;
    
}

function zip<T>(...arrs: Array<Array<T>>): Array<Array<T>> {
    const length = Math.max(...arrs.map(a => a.length))
    return [...Array(length)].map(
        (_ignored, i): Array<T> => arrs.map(a => a[i])
            .filter((elem): elem is T => elem !== undefined)
    );
}

function awardPoints(positions: Array<number>): Array<1|0> {
    const leadPosition = Math.max(...positions);
    return positions.map(pos => pos === leadPosition ? 1 : 0);
}

function solution(lines: Array<string>): RESULT_TYPE {
    const TIME = 2503;
    const simulations = lines.map(parse)
        .map(reindeer => simulate(reindeer, TIME));
    const secondScores = zip(...simulations)
        .map(awardPoints);
    const finalScores = zip(...secondScores)
        .map(points => points.reduce((l: number, r): number => l + r, 0));
    return Math.max(...finalScores);
}

const TEST_RESULTS: Array<RESULT_TYPE> = [
    1564 // No actual example given, but... here's what I got when I ran the test.
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
