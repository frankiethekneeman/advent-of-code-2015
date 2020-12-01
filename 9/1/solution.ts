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
type GPS = Map<string, Map<string, number>>;

class Path {
    seen: Set<string>;
    visits: Array<string>; // This got added because I couldn't believe how short my solution was.
    end: string;
    length: number;

    static forStartingPoint(start: string): Path {
        return new Path(
            [start],
            0
        );
    }

    constructor(visits: Array<string>, length: number) {
        this.seen = new Set(visits);
        this.visits = visits;
        const end = visits[visits.length - 1]
        if(!end) {
            throw new Error('A Path cannot be empty');
        }

        this.end = end;
        this.length = length;
    }

    extend(distance: GPS): Array<Path> {
        return [... distance.keys()]
            .filter(destination => !this.seen.has(destination))
            .map(destination => {
                const leg = distance.get(destination)?.get(this.end);
                if (!leg) {
                    throw new Error(`no distance from ${destination} to ${this.end}`);
                }
                return new Path(
                    [...this.visits, destination],
                    this.length + leg
                )
            });
    }

    isPreferableTo(other: Path): boolean {
        if (this.length === other.length) {
            // If the overall path length is equal, the one with more visited cities
            // is a better candidate for shortest hamiltonian path.
            // in case of a tie, prefer self over others.
            return this.seen.size >= other.seen.size;
        }
        return this.length < other.length;
    }
}

//A Minimum Priority Queue for the Paths
class PathQueue {
    storage: Array<Path> = [];
    insertPosition: number = 0;
    static calculateParent(location: number): number {
        return Math.floor((location - 1) / 2);
    }

    static calculateChildren(location: number): [number, number] {
        return [location * 2 + 1, location * 2 + 2];
    }
    
    safeGet(position: number): Path {
        const toReturn = this.storage[position];
        if (!toReturn) {
            throw new Error('Sparse Array detected in Priority Queue');
        }
        return toReturn;
    }

    insert(candidate: Path): void {
        this.storage[this.insertPosition] = candidate;
        this.insertPosition++;
        this.heapUp(this.insertPosition - 1);
    }

    heapUp(position: number): void {
        if (position === 0) {
            return //can't heapUp the root.
        }
        const target: Path = this.safeGet(position);
        const parentPosition = PathQueue.calculateParent(position);
        const parent: Path = this.safeGet(parentPosition);
        if(parent.isPreferableTo(target)) {
            return //Heap is satisfied.
        }
        // Heap is not satisfied, swap and recurse
        this.storage[position] = parent;
        this.storage[parentPosition] = target;
        this.heapUp(parentPosition);
    }

    getShortestPath(): Path {
        if (this.insertPosition === 0) {
            throw new Error('pop on empty priority queue');
        }

        const toReturn: Path = this.safeGet(0);

        this.insertPosition--;

        if (this.insertPosition !== 0) {
            //heap is not empty...
            this.storage[0] = this.safeGet(this.insertPosition);
            this.heapDown(0);
        }

        return toReturn;
    }

    getBestChild(position: number): [number, Path] | [] {
        const [leftChildPosition, rightChildPosition] = PathQueue.calculateChildren(position);
        if (leftChildPosition >= this.insertPosition) {
            return [] //No children
        }

        const leftChild = this.safeGet(leftChildPosition);
        if (rightChildPosition >= this.insertPosition) {
            //No right child, therefore left is automatically best
            return [leftChildPosition, leftChild];
        }

        const rightChild = this.safeGet(rightChildPosition);
        return leftChild.isPreferableTo(rightChild)
            ? [leftChildPosition, leftChild]
            : [rightChildPosition, rightChild];
    }

    heapDown(position: number): void {
        const target: Path = this.safeGet(position);
        const [bestChildPosition, bestChild] = this.getBestChild(position);

        if (bestChildPosition && bestChild?.isPreferableTo(target)) {
            this.storage[bestChildPosition] = target;
            this.storage[position] = bestChild;
            this.heapDown(bestChildPosition);
        }
    }
    
}

function parseDistance(entry: string): [string, string, number] {
    const [locations, distance, ...overflow1]  = entry.split(' = ')
    if (!locations || !distance || isNaN(+distance) || overflow1.length > 0) {
        throw new Error(`Malformed Line: ${entry}`);
    }

    const [start, end, ...overflow2] = locations.split(' to ');
    if (!start || !end || overflow2.length > 0) {
        throw new Error(`Malformed Line: ${entry}`);
    }

    return [start, end, +distance];
}

function addDistance(start: string, end: string, dist: number, gps: GPS): void {
    const destinations: Map<string, number> = gps.get(start) ?? new Map();
    destinations.set(end, dist);
    gps.set(start, destinations);
}

function solution(lines: Array<string>): RESULT_TYPE {
    const parsed = lines.filter(l => l.length > 0)
        .map(parseDistance);
    const gps: GPS = new Map();
    for (const [start, end, dist] of parsed) {
        addDistance(start, end, dist, gps);
        addDistance(end, start, dist, gps);
    }
    const queue = new PathQueue();
    [...gps.keys()]
        .map(Path.forStartingPoint)
        .forEach(p => queue.insert(p));
    let candidate = queue.getShortestPath();
    while(candidate.seen.size != gps.size) {
        candidate.extend(gps)
            .forEach(p => queue.insert(p));
        candidate = queue.getShortestPath();
    } 
    return candidate.length;
}

const TEST_RESULTS: Array<RESULT_TYPE> = [
  605
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
