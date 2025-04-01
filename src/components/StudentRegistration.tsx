
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import FaceApiService from '@/services/FaceApiService';
import { Loader2 } from 'lucide-react';

const StudentRegistration = () => {
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [faceApiLoaded, setFaceApiLoaded] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoading(true);
        await FaceApiService.loadModels();
        setFaceApiLoaded(true);
        setLoading(false);
      } catch (error) {
        console.error("Error loading face-api models:", error);
        toast({
          title: "Error",
          description: "Failed to load face recognition models. Please refresh the page.",
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
    };
  }, []);

  const startCamera = async () => {
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
        setIsCapturing(true);
        setCapturedImages([]);
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

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setIsCapturing(false);
    }
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Detect if there's a face in the captured image
      const detections = await FaceApiService.detectFaces(canvas);
      
      if (detections.length === 0) {
        toast({
          title: "No face detected",
          description: "Please ensure your face is visible to the camera.",
          variant: "destructive"
        });
        return;
      }
      
      if (detections.length > 1) {
        toast({
          title: "Multiple faces detected",
          description: "Please ensure only one person is in frame.",
          variant: "destructive"
        });
        return;
      }
      
      const imageDataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImages(prev => [...prev, imageDataUrl]);
      
      toast({
        title: "Image captured",
        description: `Captured ${capturedImages.length + 1} of 5 images`,
      });
      
    } catch (error) {
      console.error("Error capturing image:", error);
      toast({
        title: "Error",
        description: "Failed to capture image. Please try again.",
        variant: "destructive"
      });
    }
  };

  const registerStudent = async () => {
    if (studentId.trim() === '' || studentName.trim() === '') {
      toast({
        title: "Missing information",
        description: "Please provide student ID and name.",
        variant: "destructive"
      });
      return;
    }

    if (capturedImages.length < 3) {
      toast({
        title: "Not enough images",
        description: "Please capture at least 3 images for better recognition.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      // Process and store the descriptors
      await FaceApiService.registerStudent(studentId, studentName, capturedImages);
      
      toast({
        title: "Success",
        description: "Student registered successfully!",
      });
      
      // Reset form
      setStudentId('');
      setStudentName('');
      setCapturedImages([]);
      stopCamera();
      setLoading(false);
    } catch (error) {
      console.error("Error registering student:", error);
      toast({
        title: "Registration failed",
        description: "An error occurred while registering the student.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="studentId">Student ID</Label>
        <Input 
          id="studentId" 
          value={studentId} 
          onChange={(e) => setStudentId(e.target.value)} 
          placeholder="Enter student ID"
          disabled={isCapturing || loading}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="studentName">Student Name</Label>
        <Input 
          id="studentName" 
          value={studentName} 
          onChange={(e) => setStudentName(e.target.value)} 
          placeholder="Enter student name"
          disabled={isCapturing || loading}
        />
      </div>
      
      <div className="space-y-4">
        {!isCapturing ? (
          <Button 
            onClick={startCamera} 
            disabled={loading || !faceApiLoaded}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading Models...
              </>
            ) : (
              "Start Camera"
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
            
            <div className="flex space-x-2">
              <Button 
                onClick={captureImage} 
                variant="outline" 
                className="flex-1"
                disabled={capturedImages.length >= 5}
              >
                Capture Image ({capturedImages.length}/5)
              </Button>
              <Button 
                onClick={stopCamera} 
                variant="destructive"
                className="flex-1"
              >
                Stop Camera
              </Button>
            </div>
          </div>
        )}
        
        {capturedImages.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Captured Images:</h3>
            <div className="grid grid-cols-5 gap-2">
              {capturedImages.map((src, index) => (
                <div key={index} className="relative aspect-square rounded-md overflow-hidden">
                  <img 
                    src={src} 
                    alt={`Captured ${index + 1}`} 
                    className="object-cover w-full h-full"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        
        <Button 
          onClick={registerStudent} 
          disabled={loading || capturedImages.length < 3 || !studentId || !studentName}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Registering...
            </>
          ) : (
            "Register Student"
          )}
        </Button>
      </div>
    </div>
  );
};

export default StudentRegistration;
