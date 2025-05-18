# Todo List for Tuition System Development

## 🎓 Student Management
- [ ] Build Student Profiles (view/edit guardian info, academic history)

- [x] Implement Enrollment Form (with document upload)
  - *Implemented in `/classes/enroll/[classId]/page.tsx` with multi-step enrollment process*

- [x] Setup Application Review Flow (approve/reject, auto email)
  - *Implemented in `/api/admin/enrollments/review/route.ts` for admin approval workflow*

- [ ] Integrate Payment Gateway (Stripe, PayPal, HitPay, PayNow)
  - *Basic payment form exists but needs real payment gateway integration*

- [x] Generate Enrollment Receipt
  - *Implemented in `EnrollmentReceipt` component with transaction details*

## 🕒 Attendance Tracking
- [x] Implement calendar/QR-based attendance marking
  - *Calendar view implemented in `/teacher/attendance/page.tsx`*
  - *Marking functionality in `/teacher/attendance/mark/[id]/page.tsx`*

- [x] Sync attendance with database in real-time
  - *API implemented in `/api/student/attendance/route.ts`*

- [ ] Setup absence alert system (triggered after 3 consecutive absences)
  - *Database model exists but notification system not implemented*

- [ ] Build parent-teacher communication module for absence discussion
  - *Message model exists but interface not implemented*

## 📊 Performance Tracking
- [x] Create Digital Gradebook for teachers
  - *Implemented in `/teacher/gradebook/class/[id]/page.tsx`*

- [ ] Generate progress reports (PDF/Excel) for students
  - *Basic grade display exists but export functionality missing*

## 🧑‍🏫 Class & Teacher Management
- [x] Create Class Setup (name, subject, schedule, capacity)
  - *Implemented in `/teacher/classes/create/page.tsx`*

- [x] Assign teachers to classes
  - *Implemented in class creation and management interfaces*

- [ ] Build Timetable Generator (drag-and-drop to avoid class schedule conflicts)
  - *Not implemented yet*

- [x] Create and manage Teacher Profiles (qualifications, availability)
  - *Teacher model implemented with qualification and experience fields*

- [x] Add Resource Sharing: teachers upload study material
  - *Resource model and API implemented in `/api/student/resources/route.ts`*

## 🔐 Authentication & Security
- [x] Implement Role-based user registration and login system.
  - *Enhanced registration form with role-specific fields for all user types*
  - *Updated API to handle role-specific profile information*

- [x] Role-based access control (Student, Teacher, Admin, Parent)
  - *Implemented with role-specific interfaces and API routes*

- [ ] Add two-factor authentication
  - *Not implemented yet*

## 📊 Admin Dashboard
- [ ] Create comprehensive analytics dashboard
  - *Basic admin view exists but lacks detailed analytics*

- [ ] Add financial reporting tools
  - *Payment model exists but reporting tools not implemented*


  ## Missing FEATURES
check are these are working for parent registration ?
- [ ] Update parent registration form to include `student_id` input
- [ ] Validate student ID during parent registration
- [ ] Update only 1 parent profile can be created for each student. if the student is already linked to a parent, the registration should be rejected and show error.

- [ ] Secure parent dashboard to only show his children(linked student's) data
- [ ] Add messaging system between parent and teacher(assigned teacher for child's enroled classes)
- [ ] Add payment status of  child's courses 
- [ ] Each course will have a cost . For each course enrollment a payment is needed. and payment status should be updated in the enrollment record.



## Tasks:(16may)
Profile Page:
Continue building the profile page with both View and Edit functionality for all user types — Admin, Teacher, Student, and Parent.

Messages Component:
Add a Messages component to the Teacher Dashboard, allowing communication between teachers and parents via a message modal.

Today's Classes (Teacher Dashboard):
Update the Today's Classes component to show only the classes scheduled for the current day, based on the logged-in teacher’s assigned classes.

Gradebook (Teacher Dashboard):
 update the gradebook component to show the grades of the students assigned to the logged-in teacher’s classes. Aslo teacher can add new assignment or task, upload csv/exel file for grades. Also can create grade Reports
 

Attendance (Teacher Dashboard):
[x] Implement the Attendance component to work with real-time data and accurately reflect the students assigned to each teacher's classes.
  - *Implemented in `/app/components/TeacherAttendance.tsx`*
  - *Added real-time attendance marking in `/teacher/attendance/mark/[classId]/page.tsx`*
  - *Created API endpoint for attendance management in `/api/teacher/attendance/route.ts`*
  - *Added API endpoint for deleting attendance records in `/api/teacher/attendance/[id]/route.ts`*
  - *Implemented class-specific attendance marking in `/api/teacher/classes/[classId]/attendance/route.ts`*

## NEW FEATURES
check are these are working for parent registration ?
- [ ] Update parent registration form to include `student_id` input
- [ ] Validate student ID during parent registration
- [ ] Update only 1 parent profile can be created for each student. if the student is already linked to a parent, the registration should be rejected and show error.

- [ ] Secure parent dashboard to only show his children(linked student's) data
- [ ] Add messaging system between parent and teacher(assigned teacher for child's enroled classes)
- [ ] Add payment status of  child's courses 
- [ ] Each course will have a cost . For each course enrollment a payment is needed. and payment status should be updated in the enrollment record.


## ------->Upcoming Tasks:(19may)

# Teacher
- Teachers should have the ability to give grades to students for their assigned classes.
- On the Gradebook page, under each class, the teacher should be able to select a student and enter or update their grade for a specific assessment (e.g. test, assignment).
- This grading functionality should work with real-time data — no dummy values — and must reflect immediately in the Gradebook, Recent Grades, and Student Performance sections.

# Student
“Withdraw” Option

On the Classes page (Student Dashboard), under the "✓ You are enrolled in this class" badge, a "Withdraw" button needs to be added.

This button should allow the student to unenroll from the class and update the backend and UI accordingly.

Parent Registration Logic

Need to enforce a rule where only one "Father" and one "Mother" profile can be registered per student.

During registration, if a parent of the same relation is already linked to that student, the request should be rejected with an error message (e.g., "Student is already linked to a Mother.").
