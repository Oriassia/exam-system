import { getDb } from './database.js';

/**
 * Additional CS exam questions, following the same shape as the sample
 * questions in `initDb()`: { id, text, rubric }.
 *
 * Run with: node db/seedCsQuestions.js
 */
const csQuestions = [
  {
    id: 6,
    text: "Explain the difference between a process and a thread. What is a race condition, and how can mutexes/locks prevent one?",
    rubric: "Should mention: processes have separate memory space vs threads share memory within a process, concurrency vs parallelism, race condition definition (unsynchronized access to shared data), mutex/lock as a synchronization mechanism"
  },
  {
    id: 7,
    text: "What is a hash table? Explain how it achieves average O(1) lookup time and how collisions are typically handled.",
    rubric: "Should mention: key-value storage, hash function mapping keys to buckets/indices, average O(1) vs worst-case O(n), collision handling strategies (chaining, open addressing/linear probing)"
  },
  {
    id: 8,
    text: "Explain the difference between stack memory and heap memory in program execution. What kinds of data live in each, and what happens on a stack overflow?",
    rubric: "Should mention: stack for function calls/local variables with automatic allocation/deallocation, heap for dynamically allocated memory managed manually or by GC, stack overflow from deep/unbounded recursion or excessive stack frames"
  },
  {
    id: 9,
    text: "Describe how a binary search tree (BST) works. Compare the time complexity of search, insertion, and deletion in a balanced BST versus a degenerate (unbalanced) BST.",
    rubric: "Should mention: BST ordering property (left < node < right), O(log n) for balanced trees, O(n) worst case for unbalanced/degenerate trees, mention of self-balancing trees (AVL/Red-Black) as a solution"
  },
  {
    id: 10,
    text: "What is TCP and how does the TCP three-way handshake establish a connection? Contrast this briefly with UDP.",
    rubric: "Should mention: SYN, SYN-ACK, ACK steps, connection-oriented and reliable nature of TCP, UDP as connectionless/unreliable but faster with no handshake"
  },
  {
    id: 11,
    text: "What is recursion? Explain the role of a base case and give an example of a recursive function. What can go wrong if the base case is missing or unreachable?",
    rubric: "Should mention: function calling itself, base case to stop recursion, example (e.g., factorial or Fibonacci), stack overflow / infinite recursion if base case is missing"
  },
  {
    id: 12,
    text: "Explain the difference between compiled and interpreted programming languages. Where does just-in-time (JIT) compilation fit in?",
    rubric: "Should mention: compiled languages translated to machine code ahead of time (e.g., C/C++), interpreted languages executed line-by-line by an interpreter (e.g., Python), JIT compiling hot code paths at runtime for a performance middle ground (e.g., JavaScript V8, Java JVM)"
  },
  {
    id: 13,
    text: "What is database normalization? Briefly describe the goals of the first, second, and third normal forms (1NF, 2NF, 3NF).",
    rubric: "Should mention: reducing data redundancy and avoiding update/insert/delete anomalies, 1NF (atomic values, no repeating groups), 2NF (no partial dependency on composite keys), 3NF (no transitive dependency on non-key attributes)"
  },
  {
    id: 14,
    text: "What is a deadlock in the context of concurrent programming? List the four necessary conditions for a deadlock to occur and describe one strategy to prevent it.",
    rubric: "Should mention: mutual exclusion, hold and wait, no preemption, circular wait as the four conditions, and a prevention strategy such as resource ordering, timeouts, or avoiding circular wait"
  },
  {
    id: 15,
    text: "Explain the four core principles of object-oriented programming: encapsulation, abstraction, inheritance, and polymorphism.",
    rubric: "Should mention: encapsulation (bundling data/behavior, hiding internal state), abstraction (exposing essential behavior, hiding complexity), inheritance (reusing/extending behavior from a parent class), polymorphism (same interface, different implementations)"
  },
  {
    id: 16,
    text: "How does HTTPS secure communication between a client and a server? Describe the role of TLS, certificates, and encryption at a high level.",
    rubric: "Should mention: TLS handshake for negotiating encryption and verifying identity, certificates issued by a trusted CA to authenticate the server, asymmetric encryption for key exchange and symmetric encryption for the actual data transfer"
  },
  {
    id: 17,
    text: "Compare stack and queue data structures. What ordering principle does each follow, and give a real-world use case for each.",
    rubric: "Should mention: stack is LIFO (e.g., undo functionality, call stack), queue is FIFO (e.g., task scheduling, print queue), correct identification of push/pop vs enqueue/dequeue operations"
  },
  {
    id: 18,
    text: "What is dynamic programming and how does it differ from plain recursion or divide-and-conquer? Illustrate with an example such as computing Fibonacci numbers or the knapsack problem.",
    rubric: "Should mention: breaking a problem into overlapping subproblems, memoization or tabulation to avoid recomputation, contrast with plain recursion's exponential blowup, a concrete worked example"
  },
  {
    id: 19,
    text: "Explain the CAP theorem and its implications for distributed systems. What do Consistency, Availability, and Partition tolerance mean, and why can a system only guarantee two of the three during a network partition?",
    rubric: "Should mention: definitions of consistency, availability, and partition tolerance, the theorem's claim that during a partition a system must trade off consistency vs availability, examples of CP vs AP systems"
  },
  {
    id: 20,
    text: "Compare quicksort and mergesort. Discuss their average and worst-case time complexity, stability, and space complexity.",
    rubric: "Should mention: both average O(n log n), quicksort worst case O(n^2) vs mergesort worst case O(n log n), mergesort is stable and quicksort typically is not, mergesort needs O(n) extra space vs quicksort's in-place partitioning"
  }
];

async function seed() {
  const db = await getDb();
  const questionsCollection = db.collection('questions');

  const existingIds = new Set(
    (await questionsCollection.find({}, { projection: { id: 1 } }).toArray()).map((q) => q.id)
  );

  const newQuestions = csQuestions.filter((q) => !existingIds.has(q.id));

  if (newQuestions.length === 0) {
    console.log('No new questions to insert — all ids already exist in the collection.');
    process.exit(0);
  }

  const result = await questionsCollection.insertMany(newQuestions);
  console.log(`Inserted ${result.insertedCount} CS exam question(s) into the questions collection.`);
  process.exit(0);
}

seed().catch((error) => {
  console.error('Failed to seed CS exam questions:', error);
  process.exit(1);
});
