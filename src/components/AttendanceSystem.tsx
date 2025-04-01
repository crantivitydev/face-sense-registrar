
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FaceApiService from '@/services/FaceApiService';
import { Loader2 } from 'lucide-react';

const AttendanceSystem = () => {
  const [isStarted, setIsStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [faceApiLoaded, setFaceApiLoaded] = useState(false);
  const [recognizedStudents, setRecognizedStudents] = useState<{id: string, name: string, time: string}[]>([]);
  const [course, setCourse] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoading(true);
        await FaceApiService.loadModels();
        await FaceApiService.loadRegisteredStudents();
        setFaceApiLoaded(true);
        setLoading(false);
      } catch (error) {
        console.error("Error loading face-api models or student data:", error);
        toast({
          title: "Error",
          description: "Failed to load face recognition data. Please refresh the page.",
          variant: "destructive"
        });
        setLoading(false);
      }
    };

    loadModels();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (recognitionIntervalRef.current) {
        window.clearInterval(recognitionIntervalRef.current);
      }
    };
  }, []);

  const startAttendance = async () => {
    if (!course) {
      toast({
        title: "Course required",
        description: "Please select a course before starting attendance.",
        variant: "destructive"
      });
      return;
    }

    try {
      if (!faceApiLoaded) {
        toast({
          title: "Models not loaded",
          description: "Please wait for face recognition models to load.",
          variant: "destructive"
        });
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStarted(true);
        setRecognizedStudents([]);
        
        // Start recognition process
        startFaceRecognition();
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({
        title: "Camera Error",
        description: "Failed to access camera. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopAttendance = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (recognitionIntervalRef.current) {
      window.clearInterval(recognitionIntervalRef.current);
      recognitionIntervalRef.current = null;
    }
    
    setIsStarted(false);
    
    if (recognizedStudents.length > 0) {
      // Save attendance records
      FaceApiService.saveAttendance(course, recognizedStudents);
      toast({
        title: "Attendance saved",
        description: `Recorded attendance for ${recognizedStudents.length} students.`,
      });
    }
  };

  const startFaceRecognition = () => {
    const processVideoFrame = async () => {
      if (!videoRef.current || !canvasRef.current) return;
      
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        if (!context || video.paused || video.ended) return;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Recognize faces in the current frame
        const recognizedFaces = await FaceApiService.recognizeFaces(canvas);
        
        // Update recognized students list without duplicates
        if (recognizedFaces.length > 0) {
          setRecognizedStudents(prev => {
            const newList = [...prev];
            
            recognizedFaces.forEach(face => {
              if (!newList.some(student => student.id === face.studentId)) {
                newList.push({
                  id: face.studentId,
                  name: face.studentName,
                  time: new Date().toLocaleTimeString()
                });
              }
            });
            
            return newList;
          });
        }
        
      } catch (error) {
        console.error("Error processing video frame:", error);
      }
    };
    
    // Process frames periodically
    recognitionIntervalRef.current = window.setInterval(processVideoFrame, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="course">Select Course</Label>
        <Select value={course} onValueChange={setCourse} disabled={isStarted || loading}>
          <SelectTrigger id="course">
            <SelectValue placeholder="Select course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CS101">CS101 - Introduction to Computer Science</SelectItem>
            <SelectItem value="CS201">CS201 - Data Structures</SelectItem>
            <SelectItem value="CS301">CS301 - Algorithms</SelectItem>
            <SelectItem value="MATH101">MATH101 - Calculus I</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-4">
        {!isStarted ? (
          <Button 
            onClick={startAttendance} 
            disabled={loading || !faceApiLoaded || !course}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading Data...
              </>
            ) : (
              "Start Attendance"
            )}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="relative w-full h-64 md:h-80 bg-gray-100 rounded-lg overflow-hidden">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            
            <Button 
              onClick={stopAttendance} 
              variant="destructive"
              className="w-full"
            >
              Stop & Save Attendance
            </Button>
          </div>
        )}
      </div>
      
      {recognizedStudents.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Recognized Students:</h3>
          <div className="bg-gray-50 p-4 rounded-md max-h-60 overflow-y-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left py-2">ID</th>
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {recognizedStudents.map((student, index) => (
                  <tr key={index} className="border-t border-gray-200">
                    <td className="py-2">{student.id}</td>
                    <td className="py-2">{student.name}</td>
                    <td className="py-2">{student.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceSystem;
