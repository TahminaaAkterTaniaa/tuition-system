# Tuition System Data Calculation & Filter Logic

## Admin Dashboard Financial Overview

### Total Revenue (This Month)
- **Calculation**: Sum of `(class fee × number of enrolled students)` for all active classes within current month only
- **Formula**: `totalRevenueThisMonth = sum(class.fee × class.enrollments.length)` where enrollment date is in current month
- **Filter**: Enrollments are filtered by `enrollmentDate >= firstDayOfMonth && enrollmentDate <= lastDayOfMonth`
- **Implementation**: `src/app/api/admin/dashboard/route.ts`

### Top Earning Class
- **Definition**: Class with the highest revenue in the current month
- **Calculation**: For each class, count enrollments in current month × class fee, find maximum
- **Filter**: Same as Total Revenue - enrollments filtered by current month only
- **Returns**: Class name and its revenue amount

### Net Profit
- **Calculation**: `Total Revenue (This Month) - Expenses`
- **Expenses Formula**: Sum of all teacher salaries where:
  ```
  teacherSalary = (salaryPerClass × classesCount) + (extraPerSchedule × schedulesCount)
  ```

### Institution Activity Overview
- **Total Students**: Count of all entries in student table
- **Active Classes**: Count of classes where status is one of: 'active', 'Active', 'ACTIVE', 'APPROVED', 'Approved', 'approved'
- **Enrolled This Month**: Count of enrollments where enrollmentDate is in the current month
- **Withdrawn This Month**: Count of withdrawal requests with status 'Approved'/'APPROVED'/'approved' created in current month

## Admin Finance Page

### Total Revenue
- **Calculation**: Sum of `(class fee × number of enrolled students)` for all active classes across all time
- **Formula**: `totalRevenue = sum(class.fee × class.enrollments.length)` with no date filtering
- **Implementation**: `src/app/api/admin/finance/summary/route.ts`

### Top Paying Classes
- **Calculation**: For each class, multiply fee by total number of enrolled students (all time)
- **Formula**: `classRevenue = class.fee × class.enrollments.length`
- **Processing**: Values are rounded to 2 decimal places using `parseFloat(value.toFixed(2))`
- **Sort**: Classes are sorted by total revenue in descending order
- **Display**: Top 5 highest revenue classes are displayed
- **Example**:
  | Class Name | Fee ($) | All-Time Enrolled Students | Total Revenue |
  |------------|---------|----------------------------|---------------|
  | Introduction to Programming | $149.99 | 6 | $899.94 |

### Monthly Revenue Chart
- **Time Range**: Past 6 months
- **Data Points**: Monthly revenue aggregated by enrollment date
- **Calculation**: For each month, sum of `(class fee × enrollments in that month)`
- **Display**: Bar chart with months sorted chronologically, showing percentage of maximum value

### Payment History
- **Data**: All payments with their status (COMPLETED, PENDING, FAILED)
- **Filters**:
  - By Status: ALL, COMPLETED, PENDING, FAILED
  - By Date: Specific date filter
  - By Search: Student name, class name, or transaction ID

### Teacher Salary Management
- **Calculation**: `(salaryPerClass × number of classes) + (extraPerSchedule × number of schedules)`
- **Implementation**: `src/app/api/admin/finance/teachers/route.ts`

## Parent Dashboard

### Recent Grades
- **Data Source**: Connected student's grades with relations to classes
- **Sort Order**: By `gradedDate` descending (newest first)
- **Display Fields**:
  - DATE: `gradedDate` formatted as a date
  - CLASS: class name & subject
  - ASSESSMENT: `assessmentType` (fallback to title if missing)
  - SCORE: Weighted percentage calculated as `(score/maxScore) * weight * 100%`
- **Implementation**: `src/app/api/parent/linked-students/route.ts`

### Recent Attendance
- **Data Source**: Connected student's attendance records
- **Sort Order**: By `date` descending (newest first)
- **Limit**: 10 most recent records
- **Display Fields**: Date, Class, Status

## Data Filtering Logic

### Date Range Filtering
- **Current Month Filter**:
  ```typescript
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);
  ```

- **6-Month History Filter**:
  ```typescript
  const today = new Date();
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(today.getMonth() - 6);
  ```

### Status Filters
- **Active Status**: Case-insensitive match for 'active' or 'approved'
- **Payment Status**: 'COMPLETED', 'PENDING', 'FAILED' (case-sensitive)
- **Enrollment Status**: 'enrolled', 'pending', 'rejected'

### Numeric Calculations
- **Revenue**: Always rounded to 2 decimal places
- **Percentages**: Calculated using the formula `(value / total) * 100` and formatted with `toFixed(2)`
- **Weighted Grade**: `(score / maxScore) * weight * 100`