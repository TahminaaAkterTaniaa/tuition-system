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

- [ ] Update parent registration form to include `student_id` input
- [ ] Validate student ID during parent registration
- [ ] Secure parent dashboard to only show his children(linked student's) data
- [ ] Add messaging system between parent and teacher(assigned teacher for child's enroled classes)
- [ ] Add payment status of  child's courses 
- [ ] Each course will have a cost . For each course enrollment a payment is needed. and payment status should be updated in the enrollment record.


-After Registration success redirect to login page is not working.
-on parent dashboard,under payment status  component data isn't updating correctly. 
 All status(total due, paid, pending) shows -0.00$  which should be showing based on  the total amount of the course . also shows-"no payment found" under all course
- the massage 


