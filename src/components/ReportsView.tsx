
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FaceApiService from '@/services/FaceApiService';
import { Loader2 } from 'lucide-react';

interface Student {
  id: string;
  name: string;
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

const ReportsView = () => {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const studentsData = await FaceApiService.getRegisteredStudents();
        const attendanceData = await FaceApiService.getAttendanceRecords();
        
        setStudents(studentsData);
        setAttendanceRecords(attendanceData);
        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          title: "Error",
          description: "Failed to load data. Please try again.",
          variant: "destructive"
        });
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getFilteredAttendance = () => {
    return attendanceRecords.filter(record => {
      const matchesCourse = selectedCourse === 'all' || record.course === selectedCourse;
      const matchesDate = !selectedDate || record.date.includes(selectedDate);
      return matchesCourse && matchesDate;
    });
  };

  const handleExport = () => {
    try {
      const records = getFilteredAttendance();
      if (records.length === 0) {
        toast({
          title: "No data",
          description: "There are no records to export with the current filters.",
          variant: "destructive"
        });
        return;
      }
      
      // Create CSV content
      let csvContent = "Course,Date,StudentID,StudentName,Time\n";
      
      records.forEach(record => {
        record.students.forEach(student => {
          csvContent += `${record.course},${record.date},${student.id},${student.name},${student.time}\n`;
        });
      });
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export successful",
        description: "Attendance report has been downloaded.",
      });
    } catch (error) {
      console.error("Error exporting data:", error);
      toast({
        title: "Export failed",
        description: "Failed to export attendance data.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="students">Registered Students</TabsTrigger>
          <TabsTrigger value="attendance">Attendance Records</TabsTrigger>
        </TabsList>
        
        <TabsContent value="students" className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-md max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : students.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left py-2">ID</th>
                    <th className="text-left py-2">Name</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => (
                    <tr key={index} className="border-t border-gray-200">
                      <td className="py-2">{student.id}</td>
                      <td className="py-2">{student.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-center text-gray-500 py-8">No students registered yet.</p>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="attendance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="courseFilter">Filter by Course</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger id="courseFilter">
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  <SelectItem value="CS101">CS101 - Introduction to Computer Science</SelectItem>
                  <SelectItem value="CS201">CS201 - Data Structures</SelectItem>
                  <SelectItem value="CS301">CS301 - Algorithms</SelectItem>
                  <SelectItem value="MATH101">MATH101 - Calculus I</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dateFilter">Filter by Date</Label>
              <Input 
                id="dateFilter" 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)} 
              />
            </div>
          </div>
          
          <Button 
            onClick={handleExport}
            disabled={loading || attendanceRecords.length === 0}
            className="w-full mb-4"
          >
            Export to CSV
          </Button>
          
          <div className="bg-gray-50 p-4 rounded-md max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : getFilteredAttendance().length > 0 ? (
              <div className="space-y-6">
                {getFilteredAttendance().map((record, index) => (
                  <div key={index} className="border border-gray-200 rounded-md p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">{record.course}</h3>
                      <span className="text-sm text-gray-500">{record.date}</span>
                    </div>
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="text-left py-1 text-sm">ID</th>
                          <th className="text-left py-1 text-sm">Name</th>
                          <th className="text-left py-1 text-sm">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {record.students.map((student, idx) => (
                          <tr key={idx} className="border-t border-gray-100">
                            <td className="py-1 text-sm">{student.id}</td>
                            <td className="py-1 text-sm">{student.name}</td>
                            <td className="py-1 text-sm">{student.time}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No attendance records found.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsView;
