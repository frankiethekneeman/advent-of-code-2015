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

function step(input: string, translations: Array<[string, string]>): Array<string> {
    return translations.flatMap(
        ([toFind, toPlace]) => replace(toFind, toPlace, input)
    );
}

function distinct<T>(items: Array<T>): Array<T> {
    return [... new Set(items)];
}

function flip<T>([l, r]: [T, T]): [T, T] {
    return [r, l];
}

interface Synthesis {
    replacements: number;
    left: string
}

//A Minimum Priority Queue for the Paths
class SynthesisQueue {
    storage: Array<Synthesis> = [];
    insertPosition: number = 0;
    static calculateParent(location: number): number {
        return Math.floor((location - 1) / 2);
    }

    static calculateChildren(location: number): [number, number] {
        return [location * 2 + 1, location * 2 + 2];
    }
    
    safeGet(position: number): Synthesis {
        const toReturn = this.storage[position];
        if (!toReturn) {
            throw new Error('Sparse Array detected in Priority Queue');
        }
        return toReturn;
    }

    insert(candidate: Synthesis): void {
        this.storage[this.insertPosition] = candidate;
        this.insertPosition++;
        this.heapUp(this.insertPosition - 1);
    }

    heapUp(position: number): void {
        if (position === 0) {
            return //can't heapUp the root.
        }
        const target = this.safeGet(position);
        const parentPosition = SynthesisQueue.calculateParent(position);
        const parent = this.safeGet(parentPosition);
        if(parent.left.length < target.left.length) {
            return //Heap is satisfied.
        }
        // Heap is not satisfied, swap and recurse
        this.storage[position] = parent;
        this.storage[parentPosition] = target;
        this.heapUp(parentPosition);
    }

    getShortestCandidate(): Synthesis {
        if (this.insertPosition === 0) {
            throw new Error('pop on empty priority queue');
        }

        const toReturn = this.safeGet(0);

        this.insertPosition--;

        if (this.insertPosition !== 0) {
            //heap is not empty...
            this.storage[0] = this.safeGet(this.insertPosition);
            this.heapDown(0);
        }

        return toReturn;
    }

    getBestChild(position: number): [number, Synthesis] | [] {
        const [leftChildPosition, rightChildPosition] = SynthesisQueue.calculateChildren(position);
        if (leftChildPosition >= this.insertPosition) {
            return [] //No children
        }

        const leftChild = this.safeGet(leftChildPosition);
        if (rightChildPosition >= this.insertPosition) {
            //No right child, therefore left is automatically best
            return [leftChildPosition, leftChild];
        }

        const rightChild = this.safeGet(rightChildPosition);
        return leftChild.left.length < rightChild.left.length
            ? [leftChildPosition, leftChild]
            : [rightChildPosition, rightChild];
    }

    heapDown(position: number): void {
        const target = this.safeGet(position);
        const [bestChildPosition, bestChild] = this.getBestChild(position);

        if (bestChildPosition && bestChild && (bestChild.left.length < target.left.length)) {
            this.storage[bestChildPosition] = target;
            this.storage[position] = bestChild;
            this.heapDown(bestChildPosition);
        }
    }
    
}

function solution(lines: Array<string>): RESULT_TYPE {
    const targetMolecule = lines.pop();
    if (!targetMolecule) {
        throw new Error('Something is wrong with this Array');
    }
    const translations: Array<[string, string]> = lines.map(parse);
    const reverseTranslations: Array<[string, string]> = translations.map(flip);
    let queue = new SynthesisQueue();
    queue.insert({
        left: targetMolecule,
        replacements: 0,

    })
    let {left, replacements} = queue.getShortestCandidate();
    while(left !== 'e') {
        distinct(step(left, reverseTranslations))
            .forEach(s => queue.insert({
                left: s,
                replacements: replacements + 1
            }));
        ({left, replacements} = queue.getShortestCandidate());
    }
    return replacements;
}

const TEST_RESULTS: Array<RESULT_TYPE> = [
    3,
    6
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
