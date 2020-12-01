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
interface Sue {
    num: number;
    knownAspects: Map<string, number>;
}

function parsedNumber(str: string | undefined): str is string {
    return !!str && !isNaN(+str);
}

function parseAspect(str: string): [string, number] {
    const [aspect, count, ...rest] = str.split(': ');
    if (!aspect || !parsedNumber(count) || rest.length > 0) {
        throw new Error(`Failed to parse aspect: ${str}`);
    }
    return [aspect, +count];
}

function parse(line: string): Sue {
    const [ empty, sueNum, aspectString, ...rest] = line.split(/Sue (\d+): /);

    if( empty !== ''
        || !parsedNumber(sueNum)
        || !aspectString
        || rest.length > 0
    ) {
        throw new Error(`Failed to parse: ${line}`);
    }
    return {
        num: +sueNum,
        knownAspects: new Map(aspectString.split(', ').map(parseAspect))
    };
}

abstract class  Clue {
    result: number;
    constructor(result: number) {
        this.result = result;
    }
    abstract isSatisfiedBy(n: number): boolean
}

class Exactly extends Clue {
    isSatisfiedBy(n: number): boolean {
        return n === this.result;
    }
}

class FewerThan extends Clue {
    isSatisfiedBy(n: number): boolean {
        return n < this.result;
    }
}

class GreaterThan extends Clue {
    isSatisfiedBy(n: number): boolean {
        return n > this.result;
    }
}

const MFCSAM_RESULTS: Map<string, Clue> = new Map([
    [ 'children', new Exactly(3) ],
    [ 'cats', new GreaterThan(7) ],
    [ 'samoyeds', new Exactly(2) ],
    [ 'pomeranians', new FewerThan(3) ],
    [ 'akitas', new Exactly(0) ],
    [ 'vizslas', new Exactly(0) ],
    [ 'goldfish', new FewerThan(5) ],
    [ 'trees', new GreaterThan(3) ],
    [ 'cars', new Exactly(2) ],
    [ 'perfumes', new Exactly(1) ]
])



function matchesCrimeScene(sue: Sue, scene: Map<string, Clue>): boolean {
    for (const [ aspect, clue ] of scene) {
        if (sue.knownAspects.has(aspect) && !clue.isSatisfiedBy(sue.knownAspects.get(aspect) ?? 0)) {
            return false;
        }
    }
    return true;
}

function solution(lines: Array<string>): RESULT_TYPE {
    const suspects = lines.map(parse)
        .filter(sue => matchesCrimeScene(sue, MFCSAM_RESULTS))
    if (suspects.length !== 1) {
        new Error(`Could not Identify Sue.  ${suspects.length} Suspects remained.`);
    }
    return suspects[0]?.num ?? -1
}

const TEST_RESULTS: Array<RESULT_TYPE> = [
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
