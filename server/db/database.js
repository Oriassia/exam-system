import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

let client = null;
let db = null;

export async function getDb() {
  /** Get database instance */
  if (db === null) {
    const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/';
    const dbName = process.env.DB_NAME || 'exam_system';
    client = new MongoClient(mongodbUri);
    await client.connect();
    db = client.db(dbName);
    console.log('Connected to MongoDB');
  }
  return db;
}

/** Sample questions used by initDb and rubric upserts. */
export const sampleQuestions = [
  {
    id: 1,
    text: "Explain the concept of polymorphism in object-oriented programming with an example.",
    rubric: {
      criteria: [
        { id: "overriding_overloading", description: "Mentions method overriding and/or overloading" },
        { id: "inheritance", description: "Links polymorphism to inheritance or shared interfaces" },
        { id: "different_forms", description: "Explains that the same interface can take different forms/behaviors" },
        { id: "example", description: "Provides a concrete code or real-world example" }
      ]
    }
  },
  {
    id: 2,
    text: "What are the main differences between SQL and NoSQL databases? When would you use each?",
    rubric: {
      criteria: [
        { id: "structure", description: "Contrasts schema (SQL) vs schemaless/flexible (NoSQL) structure" },
        { id: "scalability", description: "Mentions differences in scalability (e.g. vertical vs horizontal)" },
        { id: "use_cases", description: "Gives appropriate use cases for SQL and/or NoSQL" },
        { id: "examples", description: "Names example databases or technologies for each type" }
      ]
    }
  },
  {
    id: 3,
    text: "Describe how the HTTP protocol works and explain the difference between GET and POST requests.",
    rubric: {
      criteria: [
        { id: "request_response", description: "Describes the HTTP request-response cycle" },
        { id: "stateless", description: "Mentions that HTTP is stateless" },
        { id: "get", description: "States GET is used for retrieval/reading resources" },
        { id: "post", description: "States POST is used for submission/creating or sending data" }
      ]
    }
  },
  {
    id: 4,
    text: "What is the purpose of version control systems like Git? Explain branches and merging.",
    rubric: {
      criteria: [
        { id: "tracking_changes", description: "Mentions tracking changes to code over time" },
        { id: "collaboration", description: "Mentions enabling collaboration among developers" },
        { id: "branches", description: "Explains branches as isolated lines of work for features/fixes" },
        { id: "merging", description: "Explains merging as combining branch changes back together" }
      ]
    }
  },
  {
    id: 5,
    text: "Explain the concept of Big O notation and why it's important in algorithm analysis.",
    rubric: {
      criteria: [
        { id: "complexity", description: "Mentions time and/or space complexity" },
        { id: "scalability", description: "Explains that Big O describes how cost grows as input size grows" },
        { id: "comparing", description: "Notes it is used to compare algorithms independently of hardware" },
        { id: "notations", description: "Mentions common notations (e.g. O(1), O(n), O(n log n), O(n^2))" }
      ]
    }
  }
];

export async function initDb() {
  /** Initialize database with sample questions if empty */
  const db = await getDb();
  const questionsCollection = db.collection('questions');

  // Check if questions already exist
  const count = await questionsCollection.countDocuments({});

  if (count === 0) {
    await questionsCollection.insertMany(sampleQuestions);
    console.log(`Inserted ${sampleQuestions.length} sample questions into database`);
  } else {
    console.log(`Database already contains ${count} questions`);
  }
}
