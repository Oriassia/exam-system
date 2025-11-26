# Auto-Graded Exam Base Project

A minimal full-stack application for managing and submitting open-ended exam questions. This project serves as a foundation for a live interview.

## Features

- **Backend (Flask + MongoDB)**
  - Fetch exam questions from MongoDB
  - Submit student answers
- **Frontend (React + Vite)**
  - Display exam questions
  - Text input for answers
  - Submit all answers with student ID

## Tech Stack

- **Frontend**: React 18, Vite, Axios
- **Backend**: Python 3, Flask, PyMongo
- **Database**: MongoDB (local instance)

## Project Structure

```
StudyWiseInterview/
├── client/                 # React frontend
│   ├── src/
│   │   ├── api/           # API integration
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   └── styles/        # CSS files
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/                # Flask backend
│   ├── db/
│   │   └── database.py    # MongoDB connection & initialization
│   ├── routes/
│   │   ├── questions.py   # GET /questions endpoint
│   │   └── submissions.py # POST /submit endpoint
│   ├── app.py             # Flask app entry point
│   └── requirements.txt
└── README.md
```

## Prerequisites

Before running this project, make sure you have installed:

- **Node.js** (v16 or higher) and npm
- **Python** (v3.8 or higher) and pip
- **MongoDB** (v4.4 or higher)

### Installing MongoDB

**Windows:**

1. Download MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Run the installer and follow the setup wizard
3. MongoDB will start automatically as a Windows service

**macOS (using Homebrew):**

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu/Debian):**

```bash
sudo apt-get install mongodb
sudo systemctl start mongodb
```

Verify MongoDB is running:

```bash
# Should connect without errors
mongosh
```

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd StudyWiseInterview
```

### 2. Backend Setup

```bash
# Navigate to server directory
cd server

# Create a virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (if not exists)
# Copy the contents below or use .env.example
```

Create a `server/.env` file with:

```env
MONGODB_URI=mongodb://localhost:27017/
DB_NAME=exam_system
PORT=5000
```

### 3. Frontend Setup

```bash
# Navigate to client directory (from project root)
cd client

# Install dependencies
npm install
```

## Running the Application

### 1. Start MongoDB

Make sure MongoDB is running on your system:

```bash
# Check if MongoDB is running
mongosh

# If not running, start it:
# Windows: Should be running as a service
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongodb
```

### 2. Start the Backend Server

```bash
# From the server directory
cd server

# Activate virtual environment if not already active
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Run the Flask app
python app.py
```

The backend will start on `http://localhost:5000`

You should see output indicating:

- MongoDB connection successful
- Sample questions inserted (first run only)
- Flask server running

### 3. Start the Frontend

In a new terminal:

```bash
# From the client directory
cd client

# Start the Vite dev server
npm run dev
```

The frontend will start on `http://localhost:3000`

### 4. Access the Application

Open your browser and navigate to:

```
http://localhost:3000
```

## Usage

1. **Enter Student ID**: Type your student ID in the input field
2. **Answer Questions**: Each question has a text area for your answer
3. **Submit**: Click "Submit Exam" to submit all answers
4. **Confirmation**: A success message will appear upon successful submission


## Sample Questions

The application comes pre-loaded with 5 computer science questions:

1. Polymorphism in OOP
2. SQL vs NoSQL databases
3. HTTP protocol and request methods
4. Version control systems (Git)
5. Big O notation and algorithm analysis

## Troubleshooting

### MongoDB Connection Issues

**Error: "Connection refused"**

- Ensure MongoDB is running: `mongosh`
- Check if MongoDB is on the default port: 27017
- Verify `.env` file has correct `MONGODB_URI`

### Port Already in Use

**Backend (Port 5000):**

- Change `PORT` in `server/.env`
- Update `API_BASE_URL` in `client/src/api/examApi.js`

**Frontend (Port 3000):**

- Vite will automatically suggest another port
- Or change port in `client/vite.config.js`

### CORS Issues

The backend has CORS enabled for all origins. If you encounter CORS errors:

- Ensure both frontend and backend are running
- Check browser console for specific error messages

### Python Dependencies

If you encounter import errors:

```bash
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

## Development Notes

- The backend automatically initializes sample questions on first run
- Submissions are stored with timestamps for future reference
- No authentication is required (suitable for local development)

