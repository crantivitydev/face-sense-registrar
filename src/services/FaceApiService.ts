
import * as faceapi from 'face-api.js';

// Types
interface StudentDescriptor {
  id: string;
  name: string;
  descriptors: Float32Array[];
}

interface RecognizedFace {
  studentId: string;
  studentName: string;
  similarity: number;
}

interface AttendanceRecord {
  id: string;
  course: string;
  date: string;
  students: {
    id: string;
    name: string;
    time: string;
  }[];
}

class FaceApiService {
  private static instance: FaceApiService;
  private modelsLoaded = false;
  private students: StudentDescriptor[] = [];
  private attendanceRecords: AttendanceRecord[] = [];
  
  private constructor() {
    // Load stored data from localStorage
    this.loadStoredData();
  }
  
  public static getInstance(): FaceApiService {
    if (!FaceApiService.instance) {
      FaceApiService.instance = new FaceApiService();
    }
    return FaceApiService.instance;
  }
  
  private loadStoredData() {
    try {
      // Load students data
      const storedStudents = localStorage.getItem('students');
      if (storedStudents) {
        const parsedStudents = JSON.parse(storedStudents);
        
        // Convert back to proper format with Float32Array
        this.students = parsedStudents.map((student: any) => ({
          ...student,
          descriptors: student.descriptors.map((d: number[]) => new Float32Array(d))
        }));
      }
      
      // Load attendance records
      const storedAttendance = localStorage.getItem('attendance');
      if (storedAttendance) {
        this.attendanceRecords = JSON.parse(storedAttendance);
      }
    } catch (error) {
      console.error("Error loading stored data:", error);
      // Reset data if there's an error
      this.students = [];
      this.attendanceRecords = [];
    }
  }
  
  private saveStudentsToStorage() {
    try {
      // We need to convert Float32Array to regular arrays for JSON serialization
      const serializableStudents = this.students.map(student => ({
        ...student,
        descriptors: student.descriptors.map(d => Array.from(d))
      }));
      
      localStorage.setItem('students', JSON.stringify(serializableStudents));
    } catch (error) {
      console.error("Error saving students to storage:", error);
    }
  }
  
  private saveAttendanceToStorage() {
    try {
      localStorage.setItem('attendance', JSON.stringify(this.attendanceRecords));
    } catch (error) {
      console.error("Error saving attendance to storage:", error);
    }
  }
  
  public async loadModels() {
    if (this.modelsLoaded) return;
    
    try {
      // Use models from CDN to avoid weight file hosting issues
      const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
      
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      
      this.modelsLoaded = true;
      console.log("Face-api models loaded successfully");
    } catch (error) {
      console.error("Error loading face-api models:", error);
      throw error;
    }
  }
  
  public async loadRegisteredStudents() {
    // This is just a stub to load students from storage
    // In a real app, this would fetch from a database
    return this.students;
  }
  
  public async detectFaces(input: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement) {
    if (!this.modelsLoaded) {
      throw new Error("Models not loaded");
    }
    
    try {
      return await faceapi.detectAllFaces(input)
        .withFaceLandmarks()
        .withFaceDescriptors();
    } catch (error) {
      console.error("Error detecting faces:", error);
      throw error;
    }
  }
  
  public async registerStudent(id: string, name: string, images: string[]) {
    if (!this.modelsLoaded) {
      throw new Error("Models not loaded");
    }
    
    try {
      // Check if student ID already exists
      const existingIndex = this.students.findIndex(student => student.id === id);
      
      // Process all images and extract face descriptors
      const descriptors: Float32Array[] = [];
      
      for (const imageData of images) {
        const img = await this.createImageElement(imageData);
        const detections = await this.detectFaces(img);
        
        if (detections.length !== 1) {
          console.warn(`Skipping image with ${detections.length} faces`);
          continue;
        }
        
        descriptors.push(detections[0].descriptor);
      }
      
      if (descriptors.length === 0) {
        throw new Error("No valid face descriptors could be extracted");
      }
      
      // Store student data
      if (existingIndex >= 0) {
        // Update existing student
        this.students[existingIndex] = {
          id,
          name,
          descriptors
        };
      } else {
        // Add new student
        this.students.push({
          id,
          name,
          descriptors
        });
      }
      
      // Save to storage
      this.saveStudentsToStorage();
      
      return { success: true };
    } catch (error) {
      console.error("Error registering student:", error);
      throw error;
    }
  }
  
  private async createImageElement(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = dataUrl;
    });
  }
  
  public async recognizeFaces(input: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement): Promise<RecognizedFace[]> {
    if (!this.modelsLoaded) {
      throw new Error("Models not loaded");
    }
    
    if (this.students.length === 0) {
      return [];
    }
    
    try {
      const detections = await this.detectFaces(input);
      const recognizedFaces: RecognizedFace[] = [];
      
      for (const detection of detections) {
        const bestMatch = this.findBestMatch(detection.descriptor);
        if (bestMatch) {
          recognizedFaces.push(bestMatch);
        }
      }
      
      return recognizedFaces;
    } catch (error) {
      console.error("Error recognizing faces:", error);
      throw error;
    }
  }
  
  private findBestMatch(queryDescriptor: Float32Array): RecognizedFace | null {
    if (this.students.length === 0) return null;
    
    let bestMatchStudent: StudentDescriptor | null = null;
    let bestMatchDistance = Infinity;
    
    // For each student
    for (const student of this.students) {
      // For each descriptor of this student
      for (const descriptor of student.descriptors) {
        // Calculate distance
        const distance = faceapi.euclideanDistance(queryDescriptor, descriptor);
        
        // Update best match if this is better
        if (distance < bestMatchDistance) {
          bestMatchDistance = distance;
          bestMatchStudent = student;
        }
      }
    }
    
    // Check if the match is good enough (threshold)
    const RECOGNITION_THRESHOLD = 0.6;
    if (bestMatchDistance <= RECOGNITION_THRESHOLD && bestMatchStudent) {
      return {
        studentId: bestMatchStudent.id,
        studentName: bestMatchStudent.name,
        similarity: 1 - bestMatchDistance
      };
    }
    
    return null;
  }
  
  public saveAttendance(course: string, students: {id: string, name: string, time: string}[]) {
    const attendanceId = `${course}_${new Date().toISOString().split('T')[0]}_${Date.now()}`;
    
    this.attendanceRecords.push({
      id: attendanceId,
      course,
      date: new Date().toLocaleDateString(),
      students
    });
    
    this.saveAttendanceToStorage();
    return { success: true };
  }
  
  public getRegisteredStudents() {
    return this.students.map(student => ({
      id: student.id,
      name: student.name
    }));
  }
  
  public getAttendanceRecords() {
    return this.attendanceRecords;
  }
}

// Export singleton instance
export default FaceApiService.getInstance();
