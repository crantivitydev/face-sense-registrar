
from flask import Flask, request, jsonify
from flask_cors import CORS
import face_recognition
import numpy as np
import base64
import json
import os
import uuid
from datetime import datetime
from PIL import Image
import io

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Data storage (in a production app, use a database instead)
students_data = {}
attendance_records = []

# Utility functions
def base64_to_image(base64_string):
    # Remove data URL prefix if present
    if 'data:image' in base64_string:
        base64_string = base64_string.split(',')[1]
    
    image_data = base64.b64decode(base64_string)
    image = Image.open(io.BytesIO(image_data))
    return np.array(image)

def find_best_match(face_encoding, threshold=0.6):
    if not students_data:
        return None
    
    best_match = None
    best_distance = 1.0  # Initialize with max distance
    
    for student_id, student in students_data.items():
        for descriptor in student["descriptors"]:
            # Convert the stored descriptor back to numpy array
            descriptor_array = np.array(descriptor)
            # Calculate face distance
            distance = face_recognition.face_distance([descriptor_array], face_encoding)[0]
            
            if distance < best_distance and distance < threshold:
                best_distance = distance
                best_match = {
                    "studentId": student_id,
                    "studentName": student["name"],
                    "similarity": 1 - distance
                }
    
    return best_match

# API routes
@app.route('/api/load-models', methods=['GET'])
def load_models():
    # Face recognition library loads models on demand
    return jsonify({"success": True, "message": "Models ready"})

@app.route('/api/register-student', methods=['POST'])
def register_student():
    data = request.json
    student_id = data.get('id')
    name = data.get('name')
    images = data.get('images', [])
    
    if not student_id or not name or not images:
        return jsonify({"success": False, "message": "Missing required data"}), 400
    
    descriptors = []
    
    for img_data in images:
        try:
            # Convert base64 to image
            image = base64_to_image(img_data)
            
            # Find face locations
            face_locations = face_recognition.face_locations(image)
            
            if len(face_locations) != 1:
                continue  # Skip images with no face or multiple faces
            
            # Compute face encodings
            face_encodings = face_recognition.face_encodings(image, face_locations)
            
            if face_encodings:
                # Convert numpy array to list for JSON serialization
                descriptors.append(face_encodings[0].tolist())
        except Exception as e:
            print(f"Error processing image: {e}")
    
    if not descriptors:
        return jsonify({"success": False, "message": "No valid face descriptors could be extracted"}), 400
    
    # Store student data
    students_data[student_id] = {
        "id": student_id,
        "name": name,
        "descriptors": descriptors
    }
    
    return jsonify({"success": True})

@app.route('/api/recognize-faces', methods=['POST'])
def recognize_faces():
    data = request.json
    image_data = data.get('image')
    
    if not image_data:
        return jsonify({"success": False, "message": "No image provided"}), 400
    
    try:
        # Convert base64 to image
        image = base64_to_image(image_data)
        
        # Find face locations
        face_locations = face_recognition.face_locations(image)
        
        if not face_locations:
            return jsonify({"success": True, "recognizedFaces": []})
        
        # Compute face encodings
        face_encodings = face_recognition.face_encodings(image, face_locations)
        
        recognized_faces = []
        for face_encoding in face_encodings:
            match = find_best_match(face_encoding)
            if match:
                recognized_faces.append(match)
        
        return jsonify({"success": True, "recognizedFaces": recognized_faces})
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/save-attendance', methods=['POST'])
def save_attendance():
    data = request.json
    course = data.get('course')
    students = data.get('students', [])
    
    if not course:
        return jsonify({"success": False, "message": "Course name is required"}), 400
    
    attendance_id = f"{course}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
    
    attendance_record = {
        "id": attendance_id,
        "course": course,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "students": students
    }
    
    attendance_records.append(attendance_record)
    
    return jsonify({"success": True})

@app.route('/api/get-students', methods=['GET'])
def get_students():
    students_list = [{"id": data["id"], "name": data["name"]} for data in students_data.values()]
    return jsonify(students_list)

@app.route('/api/get-attendance-records', methods=['GET'])
def get_attendance_records():
    return jsonify(attendance_records)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
