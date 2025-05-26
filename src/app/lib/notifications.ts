import { prisma } from './prisma';
import { v4 as uuidv4 } from 'uuid';

/**
 * Notification types for the application
 */
export type NotificationType = 'enrollment_request' | 'withdrawal_request' | 'class_creation_request' | 'class_approval' | 'class_rejection';

/**
 * Creates a notification for admins when a new request is created
 * 
 * @param type The type of request (enrollment_request, withdrawal_request, class_creation_request)
 * @param entityId The ID of the request entity
 * @param message The notification message
 * @returns The created notification
 */
export async function createAdminNotification(
  type: NotificationType,
  entityId: string,
  message: string
) {
  try {
    // Get all admin users
    const admins = await prisma.admin.findMany({
      select: {
        userId: true
      }
    });

    // Create notifications for each admin
    const notifications = [];
    for (const admin of admins) {
      try {
        // Generate a UUID for the notification
        const id = uuidv4();
        const now = new Date();
        
        // Create notification directly using Prisma with exact schema match
        const createdNotification = await prisma.notification.create({
          data: {
            id,
            userId: admin.userId,
            title: type,
            message: message,
            type: type, // Using the actual notification type instead of hardcoded 'admin_notification'
            relatedId: entityId,
            read: false,
            createdAt: now,
            updatedAt: now
          }
        });
        
        notifications.push(createdNotification);
      } catch (insertError) {
        console.error('Error creating notification for admin:', admin.userId, insertError);
        // Continue with other admins even if one fails
      }
    }

    return notifications;
  } catch (error) {
    console.error('Error creating admin notification:', error);
    throw error;
  }
}

/**
 * Creates a notification for a teacher when their class request is approved or rejected
 * 
 * @param teacherId The ID of the teacher to notify
 * @param type The type of notification (class_approval or class_rejection)
 * @param classId The ID of the class
 * @param message The notification message
 * @returns The created notification
 */
export async function createTeacherNotification(
  teacherId: string,
  type: 'class_approval' | 'class_rejection',
  classId: string,
  message: string
) {
  try {
    // Get the teacher's user ID
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { userId: true }
    });

    if (!teacher) {
      throw new Error(`Teacher with ID ${teacherId} not found`);
    }

    // Generate a UUID for the notification
    const id = uuidv4();
    const now = new Date();
    
    // Create notification for the teacher using the same structure as student notifications
    // This is important to ensure consistent display across all user types
    const notification = await prisma.notification.create({
      data: {
        id,
        userId: teacher.userId,
        title: type === 'class_approval' ? 'Class Approval' : 'Class Rejection',
        message: message,
        // Use the type exactly as shown in the student notifications system
        type: type, // This matches how student notifications are stored
        relatedId: classId,
        read: false,
        createdAt: now,
        updatedAt: now
      }
    });
    
    console.log('Created teacher notification:', {
      id: notification.id,
      userId: teacher.userId,
      title: type,
      type: type
    });
    
    return notification;
  } catch (error) {
    console.error('Error creating teacher notification:', error);
    throw error;
  }
}

/**
 * Creates a notification for a student about their enrollment or other actions
 * 
 * @param studentId The ID of the student to notify
 * @param type The type of notification
 * @param entityId The ID of the related entity
 * @param message The notification message
 * @returns The created notification
 */
export async function createStudentNotification(
  studentId: string,
  type: string,
  entityId: string,
  message: string
) {
  try {
    // Get the student's user ID
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { userId: true }
    });

    if (!student) {
      throw new Error(`Student with ID ${studentId} not found`);
    }

    // Generate a UUID for the notification
    const id = uuidv4();
    const now = new Date();
    
    // Create notification for the student
    const notification = await prisma.notification.create({
      data: {
        id,
        userId: student.userId,
        title: type,
        message: message,
        type: 'student_notification',
        relatedId: entityId,
        read: false,
        createdAt: now,
        updatedAt: now
      }
    });
    
    return notification;
  } catch (error) {
    console.error('Error creating student notification:', error);
    throw error;
  }
}

/**
 * Creates an activity log entry
 * 
 * @param userId The ID of the user who performed the action
 * @param action The action performed (e.g., 'create_enrollment_request')
 * @param description A description of the action
 * @param entityType The type of entity affected (e.g., 'enrollment_request')
 * @param entityId The ID of the entity affected
 * @param metadata Additional metadata (optional)
 * @returns The created activity log
 */
export async function createActivityLog(
  userId: string,
  action: string,
  description: string,
  entityType: string,
  entityId: string,
  metadata?: any
) {
  try {
    const activityLog = await prisma.activityLog.create({
      data: {
        userId,
        action,
        description,
        entityType,
        entityId,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });

    return activityLog;
  } catch (error) {
    console.error('Error creating activity log:', error);
    throw error;
  }
}
