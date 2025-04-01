
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import StudentRegistration from '@/components/StudentRegistration';
import AttendanceSystem from '@/components/AttendanceSystem';
import ReportsView from '@/components/ReportsView';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Server } from "lucide-react";

const Index = () => {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  
  useEffect(() => {
    // Check if Flask backend is running
    const checkBackend = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/load-models', { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          setBackendStatus('connected');
        } else {
          setBackendStatus('disconnected');
        }
      } catch (error) {
        console.error("Backend connection error:", error);
        setBackendStatus('disconnected');
      }
    };
    
    checkBackend();
  }, []);
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-4 text-center">Face Recognition Attendance System</h1>
      
      {backendStatus === 'checking' && (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Checking backend connection</AlertTitle>
          <AlertDescription>
            Attempting to connect to the Flask backend...
          </AlertDescription>
        </Alert>
      )}
      
      {backendStatus === 'disconnected' && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Backend not connected</AlertTitle>
          <AlertDescription>
            The Flask backend is not running. Please start the Flask server with:
            <pre className="mt-2 p-2 bg-black/10 rounded">
              <code>python src/services/flask_backend.py</code>
            </pre>
            <p className="mt-2">For now, the system will use local storage as a fallback.</p>
          </AlertDescription>
        </Alert>
      )}
      
      {backendStatus === 'connected' && (
        <Alert variant="default" className="mb-4 bg-green-50 border-green-200">
          <Server className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Backend Connected</AlertTitle>
          <AlertDescription className="text-green-700">
            Successfully connected to the Flask backend.
          </AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue="register" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="register">Register Students</TabsTrigger>
          <TabsTrigger value="attendance">Take Attendance</TabsTrigger>
          <TabsTrigger value="records">View Records</TabsTrigger>
        </TabsList>
        
        <TabsContent value="register">
          <Card>
            <CardHeader>
              <CardTitle>Student Registration</CardTitle>
            </CardHeader>
            <CardContent>
              <StudentRegistration />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Attendance System</CardTitle>
            </CardHeader>
            <CardContent>
              <AttendanceSystem />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="records">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Records</CardTitle>
            </CardHeader>
            <CardContent>
              <ReportsView />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
