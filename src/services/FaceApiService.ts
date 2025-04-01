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
  private readonly API_URL = 'http://localhost:5000/api';
  
  private constructor() {
    // Load stored data from localStorage as fallback
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
      // Call to Flask backend to initialize models
      const response = await fetch(`${this.API_URL}/load-models`);
      const data = await response.json();
      
      if (data.success) {
        this.modelsLoaded = true;
        console.log("Face recognition models loaded successfully");
        return true;
      } else {
        throw new Error("Failed to load models");
      }
    } catch (error) {
      console.error("Error loading face recognition models:", error);
      
      // Fallback: Set models as loaded to continue with local storage functionality
      this.modelsLoaded = true;
      
      throw error;
    }
  }
  
  public async loadRegisteredStudents() {
    try {
      // Try to fetch students from Flask backend
      const response = await fetch(`${this.API_URL}/get-students`);
      const data = await response.json();
      
      // Update local students list with basic info
      this.students = data.map((student: any) => ({
        id: student.id,
        name: student.name,
        descriptors: [] // We don't need descriptors for the UI display
      }));
      
      return this.students;
    } catch (error) {
      console.error("Error fetching students from backend:", error);
      // Return local storage data as fallback
      return this.students;
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
  
  public async registerStudent(id: string, name: string, images: string[]) {
    try {
      // Send data to Flask backend
      const response = await fetch(`${this.API_URL}/register-student`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          name,
          images
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || "Registration failed");
      }
      
      // If backend registration succeeded, update local storage too
      // Find if student already exists
      const existingIndex = this.students.findIndex(student => student.id === id);
      
      if (existingIndex >= 0) {
        // Update existing student
        this.students[existingIndex] = {
          ...this.students[existingIndex],
          name
        };
      } else {
        // Add new student
        this.students.push({
          id,
          name,
          descriptors: []  // We don't store actual descriptors locally anymore
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
  
  public async recognizeFaces(input: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement): Promise<RecognizedFace[]> {
    try {
      // Capture current frame from video/canvas/image
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error("Failed to get canvas context");
      }
      
      // Set canvas dimensions to match input
      canvas.width = input.width || 640;
      canvas.height = input.height || 480;
      
      // Draw current frame to canvas
      context.drawImage(input, 0, 0, canvas.width, canvas.height);
      
      // Get base64 data URL
      const imageData = canvas.toDataURL('image/jpeg');
      
      // Send to Flask backend
      const response = await fetch(`${this.API_URL}/recognize-faces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageData
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || "Face recognition failed");
      }
      
      return data.recognizedFaces || [];
    } catch (error) {
      console.error("Error recognizing faces:", error);
      return []; // Return empty array to not break the UI
    }
  }
  
  public async detectFaces(input: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement): Promise<any[]> {
    try {
      // Capture current frame from video/canvas/image
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error("Failed to get canvas context");
      }
      
      // Set canvas dimensions to match input
      canvas.width = input.width || 640;
      canvas.height = input.height || 480;
      
      // Draw current frame to canvas
      context.drawImage(input, 0, 0, canvas.width, canvas.height);
      
      // Get base64 data URL
      const imageData = canvas.toDataURL('image/jpeg');
      
      // Send to Flask backend for face detection
      const response = await fetch(`${this.API_URL}/recognize-faces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageData
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || "Face detection failed");
      }
      
      // Return the detected faces array
      // This should match what StudentRegistration component expects
      return data.recognizedFaces || [];
    } catch (error) {
      console.error("Error detecting faces:", error);
      return []; // Return empty array if there's an error
    }
  }
  
  public async saveAttendance(course: string, students: {id: string, name: string, time: string}[]) {
    try {
      // Send to Flask backend
      const response = await fetch(`${this.API_URL}/save-attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          course,
          students
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || "Failed to save attendance");
      }
      
      // Update local record too
      const attendanceId = `${course}_${new Date().toISOString().split('T')[0]}_${Date.now()}`;
      
      this.attendanceRecords.push({
        id: attendanceId,
        course,
        date: new Date().toLocaleDateString(),
        students
      });
      
      this.saveAttendanceToStorage();
      return { success: true };
    } catch (error) {
      console.error("Error saving attendance:", error);
      
      // Fallback: Save to local storage only
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
  }
  
  public async getRegisteredStudents() {
    try {
      // Try to fetch students from Flask backend
      const response = await fetch(`${this.API_URL}/get-students`);
      const data = await response.json();
      
      return data;
    } catch (error) {
      console.error("Error fetching students from backend:", error);
      // Return local storage data as fallback
      return this.students.map(student => ({
        id: student.id,
        name: student.name
      }));
    }
  }
  
  public async getAttendanceRecords() {
    try {
      // Try to fetch attendance records from Flask backend
      const response = await fetch(`${this.API_URL}/get-attendance-records`);
      const data = await response.json();
      
      // Update local records
      this.attendanceRecords = data;
      this.saveAttendanceToStorage();
      
      return data;
    } catch (error) {
      console.error("Error fetching attendance records from backend:", error);
      // Return local storage data as fallback
      return this.attendanceRecords;
    }
  }
}

// Export singleton instance
export default FaceApiService.getInstance();
