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
interface Ingredient {
    name: string;
    capacity: number;
    durability: number;
    flavor: number;
    texture: number;
    calories: number;
}

function parsedNumber(str: string | undefined): str is string {
    return !!str && !isNaN(+str);
}

function parse(line: string): Ingredient {
    const [ name, capacity, durability, flavor, texture, calories, ...rest] = 
        line.split(/[:,] (?:capacity|durability|flavor|texture|calories) /);

    if( !name
        || !parsedNumber(capacity)
        || !parsedNumber(durability)
        || !parsedNumber(flavor)
        || !parsedNumber(texture)
        || !parsedNumber(calories)
        || rest.length > 0
    ) {
        throw new Error(`Failed to parse: ${line}`);
    }
    return {
        name,
        capacity: +capacity,
        durability: +durability,
        flavor: +flavor,
        texture: +texture,
        calories: +calories,
    };
}

function divide(amount: number, piles: number): Array<Array<number>> {
    if (piles === 1) {
        return [[amount]]
    }
    return [...Array(amount + 1)].flatMap((_undef, curr) =>
        divide(amount - curr, piles - 1).map(rest => [curr, ...rest])
    );
}

function sum(l: number, r: number): number {
    return l + r;
}
function score(recipe: Array<number>, ingredients: Array<Ingredient>): number {
    const capacity = Math.max(0, ingredients
            .map(ingredient => ingredient.capacity)
            .map((capacity, i) => capacity * (recipe[i] ?? 0))
            .reduce(sum)
        );
    const durability = Math.max(0, ingredients
            .map(ingredient => ingredient.durability)
            .map((durability, i) => durability * (recipe[i] ?? 0))
            .reduce(sum)
        );
    const flavor = Math.max(0, ingredients
            .map(ingredient => ingredient.flavor)
            .map((flavor, i) => flavor * (recipe[i] ?? 0))
            .reduce(sum)
        );
    const texture = Math.max(0, ingredients
            .map(ingredient => ingredient.texture)
            .map((texture, i) => texture * (recipe[i] ?? 0))
            .reduce(sum)
        );

    return capacity * durability * flavor * texture;
}

function calories(recipe: Array<number>, ingredients: Array<Ingredient>): number {
    return ingredients.map(ingredient => ingredient.calories)
        .map((calories, i) => calories * (recipe[i] ?? 0))
        .reduce(sum);
}

const LIMIT = 100;
const CALORIE_TARGET = 500;

function solution(lines: Array<string>): RESULT_TYPE {
    const ingredients = lines.map(parse);
    const scores: Array<number> = divide(LIMIT, ingredients.length)
        .filter(recipe => calories(recipe, ingredients) === CALORIE_TARGET)
        .map(recipe => score(recipe, ingredients));
    return scores.reduce((l,r) => Math.max(l, r));
}

const TEST_RESULTS: Array<RESULT_TYPE> = [
    57600000 
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
