import { getDb, sampleQuestions } from './database.js';

/**
 * Additional CS exam questions, following the same shape as the sample
 * questions in `initDb()`: { id, text, rubric: { criteria: [{ id, description }] } }.
 *
 * Run with: node db/seedCsQuestions.js
 * Upserts all sample + CS questions by id so existing DBs get structured rubrics.
 */
const csQuestions = [
  {
    id: 6,
    text: "Explain the difference between a process and a thread. What is a race condition, and how can mutexes/locks prevent one?",
    rubric: {
      criteria: [
        { id: "memory_space", description: "States processes have separate memory while threads share memory within a process" },
        { id: "concurrency", description: "Mentions concurrency and/or parallelism in this context" },
        { id: "race_condition", description: "Defines a race condition as unsynchronized access to shared data" },
        { id: "mutex", description: "Explains mutex/lock as a synchronization mechanism to prevent races" }
      ]
    }
  },
  {
    id: 7,
    text: "What is a hash table? Explain how it achieves average O(1) lookup time and how collisions are typically handled.",
    rubric: {
      criteria: [
        { id: "key_value", description: "Describes key-value storage" },
        { id: "hash_function", description: "Explains a hash function mapping keys to buckets/indices" },
        { id: "complexity", description: "States average O(1) lookup vs worst-case O(n)" },
        { id: "collisions", description: "Mentions collision handling (chaining and/or open addressing/linear probing)" }
      ]
    }
  },
  {
    id: 8,
    text: "Explain the difference between stack memory and heap memory in program execution. What kinds of data live in each, and what happens on a stack overflow?",
    rubric: {
      criteria: [
        { id: "stack_usage", description: "States stack holds function calls/local variables with automatic allocation/deallocation" },
        { id: "heap_usage", description: "States heap holds dynamically allocated memory managed manually or by GC" },
        { id: "stack_overflow", description: "Explains stack overflow from deep/unbounded recursion or excessive stack frames" }
      ]
    }
  },
  {
    id: 9,
    text: "Describe how a binary search tree (BST) works. Compare the time complexity of search, insertion, and deletion in a balanced BST versus a degenerate (unbalanced) BST.",
    rubric: {
      criteria: [
        { id: "ordering", description: "States BST ordering property (left < node < right)" },
        { id: "balanced", description: "States O(log n) for search/insert/delete in a balanced BST" },
        { id: "degenerate", description: "States O(n) worst case for an unbalanced/degenerate BST" },
        { id: "self_balancing", description: "Mentions self-balancing trees (e.g. AVL or Red-Black) as a solution" }
      ]
    }
  },
  {
    id: 10,
    text: "What is TCP and how does the TCP three-way handshake establish a connection? Contrast this briefly with UDP.",
    rubric: {
      criteria: [
        { id: "handshake", description: "Lists SYN, SYN-ACK, ACK steps of the three-way handshake" },
        { id: "tcp_nature", description: "States TCP is connection-oriented and reliable" },
        { id: "udp_contrast", description: "States UDP is connectionless/unreliable but faster with no handshake" }
      ]
    }
  },
  {
    id: 11,
    text: "What is recursion? Explain the role of a base case and give an example of a recursive function. What can go wrong if the base case is missing or unreachable?",
    rubric: {
      criteria: [
        { id: "self_call", description: "Defines recursion as a function calling itself" },
        { id: "base_case", description: "Explains the base case stops recursion" },
        { id: "example", description: "Gives an example (e.g. factorial or Fibonacci)" },
        { id: "missing_base", description: "States missing/unreachable base case causes stack overflow or infinite recursion" }
      ]
    }
  },
  {
    id: 12,
    text: "Explain the difference between compiled and interpreted programming languages. Where does just-in-time (JIT) compilation fit in?",
    rubric: {
      criteria: [
        { id: "compiled", description: "States compiled languages are translated to machine code ahead of time (e.g. C/C++)" },
        { id: "interpreted", description: "States interpreted languages are executed line-by-line by an interpreter (e.g. Python)" },
        { id: "jit", description: "Explains JIT compiles hot code paths at runtime (e.g. JavaScript V8, Java JVM)" }
      ]
    }
  },
  {
    id: 13,
    text: "What is database normalization? Briefly describe the goals of the first, second, and third normal forms (1NF, 2NF, 3NF).",
    rubric: {
      criteria: [
        { id: "goals", description: "Mentions reducing redundancy and avoiding update/insert/delete anomalies" },
        { id: "1nf", description: "Describes 1NF: atomic values, no repeating groups" },
        { id: "2nf", description: "Describes 2NF: no partial dependency on composite keys" },
        { id: "3nf", description: "Describes 3NF: no transitive dependency on non-key attributes" }
      ]
    }
  },
  {
    id: 14,
    text: "What is a deadlock in the context of concurrent programming? List the four necessary conditions for a deadlock to occur and describe one strategy to prevent it.",
    rubric: {
      criteria: [
        { id: "mutual_exclusion", description: "Lists mutual exclusion as a deadlock condition" },
        { id: "hold_and_wait", description: "Lists hold and wait as a deadlock condition" },
        { id: "no_preemption", description: "Lists no preemption as a deadlock condition" },
        { id: "circular_wait", description: "Lists circular wait as a deadlock condition" },
        { id: "prevention", description: "Describes a prevention strategy (resource ordering, timeouts, or avoiding circular wait)" }
      ]
    }
  },
  {
    id: 15,
    text: "Explain the four core principles of object-oriented programming: encapsulation, abstraction, inheritance, and polymorphism.",
    rubric: {
      criteria: [
        { id: "encapsulation", description: "Defines encapsulation as bundling data/behavior and hiding internal state" },
        { id: "abstraction", description: "Defines abstraction as exposing essential behavior while hiding complexity" },
        { id: "inheritance", description: "Defines inheritance as reusing/extending behavior from a parent class" },
        { id: "polymorphism", description: "Defines polymorphism as same interface with different implementations" }
      ]
    }
  },
  {
    id: 16,
    text: "How does HTTPS secure communication between a client and a server? Describe the role of TLS, certificates, and encryption at a high level.",
    rubric: {
      criteria: [
        { id: "tls", description: "Mentions TLS handshake for negotiating encryption and verifying identity" },
        { id: "certificates", description: "Explains certificates issued by a trusted CA authenticate the server" },
        { id: "encryption", description: "Mentions asymmetric encryption for key exchange and symmetric encryption for data transfer" }
      ]
    }
  },
  {
    id: 17,
    text: "Compare stack and queue data structures. What ordering principle does each follow, and give a real-world use case for each.",
    rubric: {
      criteria: [
        { id: "stack_lifo", description: "States stack is LIFO with a use case (e.g. undo, call stack)" },
        { id: "queue_fifo", description: "States queue is FIFO with a use case (e.g. task scheduling, print queue)" },
        { id: "operations", description: "Correctly identifies push/pop vs enqueue/dequeue operations" }
      ]
    }
  },
  {
    id: 18,
    text: "What is dynamic programming and how does it differ from plain recursion or divide-and-conquer? Illustrate with an example such as computing Fibonacci numbers or the knapsack problem.",
    rubric: {
      criteria: [
        { id: "subproblems", description: "Mentions breaking a problem into overlapping subproblems" },
        { id: "memoization", description: "Mentions memoization or tabulation to avoid recomputation" },
        { id: "vs_recursion", description: "Contrasts with plain recursion's exponential blowup" },
        { id: "example", description: "Gives a concrete worked example (e.g. Fibonacci or knapsack)" }
      ]
    }
  },
  {
    id: 19,
    text: "Explain the CAP theorem and its implications for distributed systems. What do Consistency, Availability, and Partition tolerance mean, and why can a system only guarantee two of the three during a network partition?",
    rubric: {
      criteria: [
        { id: "definitions", description: "Defines consistency, availability, and partition tolerance" },
        { id: "tradeoff", description: "States that during a partition a system must trade off consistency vs availability" },
        { id: "examples", description: "Gives examples of CP vs AP systems" }
      ]
    }
  },
  {
    id: 20,
    text: "Compare quicksort and mergesort. Discuss their average and worst-case time complexity, stability, and space complexity.",
    rubric: {
      criteria: [
        { id: "average", description: "States both average O(n log n)" },
        { id: "worst_case", description: "Contrasts quicksort worst O(n^2) vs mergesort worst O(n log n)" },
        { id: "stability", description: "States mergesort is stable and quicksort typically is not" },
        { id: "space", description: "Contrasts mergesort O(n) extra space vs quicksort in-place partitioning" }
      ]
    }
  }
];

async function seed() {
  const db = await getDb();
  const questionsCollection = db.collection('questions');
  const allQuestions = [...sampleQuestions, ...csQuestions];

  let upserted = 0;
  for (const question of allQuestions) {
    await questionsCollection.replaceOne({ id: question.id }, question, { upsert: true });
    upserted += 1;
  }

  console.log(`Upserted ${upserted} question(s) with structured rubrics.`);
  process.exit(0);
}

seed().catch((error) => {
  console.error('Failed to seed CS exam questions:', error);
  process.exit(1);
});
