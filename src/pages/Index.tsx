
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import StudentRegistration from '@/components/StudentRegistration';
import AttendanceSystem from '@/components/AttendanceSystem';
import ReportsView from '@/components/ReportsView';

const Index = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Face Recognition Attendance System</h1>
      
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
