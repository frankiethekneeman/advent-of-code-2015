const fs = require('fs').promises;
const path = require('path');
const cryptography = require('crypto');

/**
 * Set the result type for consistency
 */
type RESULT_TYPE = string;

/**
 * Solution begins
 */
function increment(str: string): string {
    if (str === '') {
        return 'a';
    }
    return str.slice(0, str.length - 1) + String.fromCharCode(str.charCodeAt(str.length - 1) + 1);
}

function splitZs(str: string): [string, string] {
    let lastNonZ = str.length -1;
    while(lastNonZ > 0 && str.charAt(lastNonZ) === 'z') {
        lastNonZ--;
    }
    const zHead = lastNonZ + 1;
    return [
        str.slice(0, zHead),
        str.slice(zHead)
    ];
}

function carryingIncrement(password: string): string {
    const [stem, zs] = splitZs(password);
    return increment(stem) + 'a'.repeat(zs.length);
}

function* generatePasswords(password: string): Generator<string> {
    while (true) {
        password = carryingIncrement(password);
        yield password;
    }
}

function has3IncreasingLetters(password: string): boolean {
    for (let i = 0; i < password.length - 3; i++) {
        const first = password.charCodeAt(i);
        const second = password.charCodeAt(i + 1);
        const third = password.charCodeAt(i + 2);
        if (first + 1 === second && second + 1 === third) {
            return true;
        }
    }
    return false;
}

function doesNotContainIOL(password: string): boolean {
    return !/[iol]/.test(password);
}

function hasTwoDoubles(password: string): boolean {
    const doubles = new Set(
        [...password.matchAll(/(.)\1/g)].map(match => match.shift())
            .flat()
    )
    return doubles.size >= 2;
}

function solution(lines: Array<string>): RESULT_TYPE {
    const tests = [
        has3IncreasingLetters,
        doesNotContainIOL,
        hasTwoDoubles
    ]
    for (const password of generatePasswords(lines.join(''))) {
        if (tests.every(test => test(password))) {
            return password;
        }
    }
    return lines.join('');
}

const TEST_RESULTS: Array<RESULT_TYPE> = [
   'abcdffaa', 
   'ghjaabcc'
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
