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
function parse(line: string): [string, string] {
    const [ lhs, rhs, ...rest ] = line.split(' => ');
    if (!lhs || !rhs || rest.length > 0) {
        throw new Error(`Could not parse: ${line}`);
    }
    return [lhs, rhs];
}

function replace(toFind: string, toPlace: string, startingMolecule: string): Array<string> {
    const bits = startingMolecule.split(toFind);
    if (bits.length == 1) {
        return [];
    }
    return [...Array(bits.length - 1)].map((_undef, i) =>
        bits.slice(0, i + 1).join(toFind) + toPlace + bits.slice(i + 1).join(toFind)
    );
}

function solution(lines: Array<string>): RESULT_TYPE {
    const startingMolecule = lines.pop();
    if (!startingMolecule) {
        throw new Error('Something is wrong with this Array');
    }
    const translations: Array<[string, string]> = lines.map(parse);
    return new Set(translations.flatMap(
        ([toFind, toPlace]) => replace(toFind, toPlace, startingMolecule)
    )).size;

}

const TEST_RESULTS: Array<RESULT_TYPE> = [
    4,
    7
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
