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
interface RegisterOp {
    register: 'a' | 'b';
}

interface Halve extends RegisterOp {
    name: 'hlf';
}
interface Triple extends RegisterOp {
    name: 'tpl';
}
interface Increment extends RegisterOp {
    name: 'inc';
}

interface JumpOp {
    offset: number;
}

interface Jump extends JumpOp {
    name: 'jmp';
}

interface JumpIfEven extends JumpOp, RegisterOp {
    name: 'jie';
}

interface JumpIfOne extends JumpOp, RegisterOp {
    name: 'jio';
}

type Instruction = Halve | Triple | Increment | Jump | JumpIfEven | JumpIfOne

function registerOrError(register: string): 'a' | 'b' {
    if (register === 'a' || register === 'b') {
        return register;
    }
    throw new Error(`Invalid Register: ${register}`);
}

function parseOrError(num: string): number {
    const toReturn = +num;
    if (isNaN(toReturn)) {
        throw new Error(`Not a Number: ${num}`);
    }
    return toReturn;
}

function parse(line: string): Instruction {
    const name = line.slice(0,3)
    switch (name) {
        case 'tpl':
        case 'inc':
        case 'hlf': return {
            name, register: registerOrError(line.slice(4))
        }
        case 'jmp': return {
            name, offset: parseOrError(line.slice(4))
        }
        case 'jie':
        case 'jio': return {
            name,
            register: registerOrError(line.slice(4,5)),
            offset: parseOrError(line.slice(7))
        }
    }
    throw new Error(`Unrecognized Instruction: ${name} on line "${line}"`);
}

interface Computer {
    insPointer: number,
    a: number,
    b: number
}

function solution(lines: Array<string>): RESULT_TYPE {
    const program = lines.map(parse);
    let computer = {
        insPointer: 0,
        a: 1,
        b: 0
    }
    while (true) {
        const instruction = program[computer.insPointer];
        if (!instruction) {
            return computer.b
        }
        let jump = 1;
        switch(instruction.name) {
            case 'hlf':
                computer[instruction.register] = Math.floor(computer[instruction.register]/2);
                break;
            case 'tpl':
                computer[instruction.register] *= 3;
                break;
            case 'inc':
                computer[instruction.register]++;
                break;
            case 'jmp':
                jump = instruction.offset;
                break;
            case 'jie':
                if(computer[instruction.register] % 2 === 0) {
                    jump = instruction.offset;
                }
                break;
            case 'jio':
                if(computer[instruction.register] === 1) {
                    jump = instruction.offset;
                }
                break;
        }
        computer.insPointer += jump;
    }
}

const TEST_RESULTS: Array<RESULT_TYPE> = [
    0// None given
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
