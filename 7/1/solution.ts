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

const BITMASK = 65535;

type Scope = Map<string,Expression>

abstract class Expression {
    result?: number = undefined;
    getResult(scope: Scope): number {
        if (!this.result) {
            this.result = this.resolve(scope);
        }
        return this.result;
    }
    abstract resolve(scope: Scope): number;
}

class Literal extends Expression {
    value: number;
    constructor(value: number) {
        super();
        this.value = value;
    }
    resolve(): number {
        return this.value;
    }
}

class Variable extends Expression {
    name: string;
    value?: number = undefined;
    constructor(name: string) {
        super();
        this.name = name;
    }
    resolve(scope: Scope): number {
        const underlyingExpression: Expression | undefined = scope.get(this.name)
        if (underlyingExpression) {
            return underlyingExpression.getResult(scope);
        }
        throw new Error(`Uninitialized variable expression: ${name}`)
    }
}

abstract class BinaryOperator extends Expression {
  lhs: Expression;
  rhs: Expression;

  constructor(lhs: Expression, rhs: Expression) {
    super();
    this.lhs = lhs;
    this.rhs = rhs;
  }

  resolve(scope: Scope): number {
    return this.combine(this.lhs.getResult(scope), this.rhs.getResult(scope)) & BITMASK;
  }

  abstract combine(lhs: number, rhs: number): number;
}

class And extends BinaryOperator {
    combine(lhs: number, rhs: number): number {
        return lhs & rhs;
    }
}

class Or extends BinaryOperator {
    combine(lhs: number, rhs: number): number {
        return lhs | rhs;
    }
}

class LShift extends BinaryOperator {
    combine(lhs: number, rhs: number): number {
        return lhs << rhs;
    }
}

class RShift extends BinaryOperator {
    combine(lhs: number, rhs: number): number {
        return lhs >>> rhs;
    }
}

abstract class UnaryOperator extends Expression {
  operand: Expression;

  constructor(operand: Expression) {
    super();
    this.operand = operand;
  }

  resolve(scope: Scope): number {
    return this.act(this.operand.getResult(scope)) & BITMASK;
  }

  abstract act(operand: number): number;
}

class Not extends UnaryOperator {
    act(operand: number) : number {
        return ~operand;
    }
}

const BINARY_OPERATORS = new Map<string, { new (lhs: Expression, rhs: Expression): BinaryOperator }>();
BINARY_OPERATORS.set(' AND ', And);
BINARY_OPERATORS.set(' OR ', Or);
BINARY_OPERATORS.set(' LSHIFT ', LShift);
BINARY_OPERATORS.set(' RSHIFT ', RShift);


const UNARY_OPERATORS = new Map<string, { new (operand: Expression): UnaryOperator }>();
UNARY_OPERATORS.set('NOT ', Not);

function parseExpression(expr: string): Expression {
    for (const [indicator, Operator] of UNARY_OPERATORS) {
        if (expr.startsWith(indicator)) {
            return new Operator(parseExpression(expr.slice(indicator.length)));
        }
    }
    for (const [indicator, Operator] of BINARY_OPERATORS) {
        const [lhs, ...rhs] = expr.split(indicator);
        if (lhs && rhs.length > 0) {
            return new Operator(
                parseExpression(lhs),
                parseExpression(rhs.join(indicator))
            );
        }
    }
    if (! isNaN(+expr)) {
        return new Literal(+expr);
    }
    return new Variable(expr);
}

function parseAssignment(assn: string): [string, Expression] {
    const [expr, variable, ...rest] = assn.split(' -> ')
    if (variable && expr && rest.length === 0) {
        return [variable, parseExpression(expr)];
    }
    throw new Error(`Unacceptable Assignment: ${assn}`);
}


function solution(lines: Array<string>): RESULT_TYPE {
    const scope: Scope = new Map(
        lines
            .filter(l => l.length > 0)
            .map(parseAssignment)
    );
    const a = scope.get('a');

    if (a) {
        return a.getResult(scope);
    }
    return -1;
}

const TEST_RESULTS: Array<RESULT_TYPE> = [
    72,
    507,
    492,
    114,
    65412,
    65079,
    123,
    456,
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
