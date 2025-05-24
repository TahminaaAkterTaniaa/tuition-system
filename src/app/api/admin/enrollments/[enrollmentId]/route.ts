import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { enrollmentId: string } }
) {
  try {
    const { enrollmentId } = params;
    console.log('===== ENROLLMENT DELETE =====');
    console.log('Attempting to delete enrollment with ID:', enrollmentId);
    
    // Get user session
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify the user is an admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can remove students from classes' }, { status: 403 });
    }
    
    // Find the enrollment first to get related data for logging
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: {
          include: {
            user: {
              select: { name: true }
            }
          }
        },
        class: {
          select: { name: true }
        }
      }
    });
    
    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }
    
    // Delete the enrollment
    console.log('Found enrollment, proceeding with deletion:', {
      id: enrollment.id,
      studentId: enrollment.studentId,
      classId: enrollment.classId,
      status: enrollment.status
    });
    
    try {
      await prisma.enrollment.delete({
        where: { id: enrollmentId }
      });
      console.log('Successfully deleted enrollment');
    } catch (deleteError) {
      console.error('Error in Prisma delete operation:', deleteError);
      throw deleteError;
    }
    
    // Log the activity
    await prisma.activityLog.create({
      data: {
        action: 'DELETE',
        entityType: 'ENROLLMENT',
        entityId: enrollmentId,
        description: `Removed student ${enrollment.student?.user?.name || enrollment.student.id} from class ${enrollment.class?.name || enrollment.classId}`,
        userId: session.user.id,
        metadata: JSON.stringify({
          studentId: enrollment.studentId,
          classId: enrollment.classId,
          role: session.user.role
        }),
      },
    });
    
    return NextResponse.json({ 
      message: 'Student removed successfully',
      studentName: enrollment.student?.user?.name || 'Student',
      className: enrollment.class?.name || 'Class'
    });
    
  } catch (error: any) {
    console.error('Error removing student from class:', error);
    return NextResponse.json(
      { error: 'Failed to remove student from class', message: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
