from flask import Blueprint, jsonify, request
from db.database import get_db
from datetime import datetime

submissions_bp = Blueprint('submissions', __name__)

@submissions_bp.route('/submit', methods=['POST'])
def submit_answers():
    """Submit student answers"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data or 'studentId' not in data or 'answers' not in data:
            return jsonify({
                "success": False,
                "error": "Missing required fields: studentId and answers"
            }), 400
        
        student_id = data['studentId']
        answers = data['answers']
        
        # Validate answers format
        if not isinstance(answers, list):
            return jsonify({
                "success": False,
                "error": "Answers must be an array"
            }), 400
        
        db = get_db()
        submissions_collection = db.submissions
        
        # Create submission document
        submission = {
            "studentId": student_id,
            "answers": answers,
            "submittedAt": datetime.utcnow(),
            "graded": False
        }
        
        # Insert into database
        result = submissions_collection.insert_one(submission)
        
        return jsonify({
            "success": True,
            "message": "Answers submitted successfully",
            "submissionId": str(result.inserted_id)
        }), 201
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

