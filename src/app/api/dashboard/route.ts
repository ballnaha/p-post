import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Mock data for dashboard - คุณสามารถเปลี่ยนเป็นข้อมูลจริงจากฐานข้อมูลได้
    const dashboardData = {
      stats: {
        totalPatients: {
          count: 61923,
          admitted: 32303,
        },
        operationalCost: {
          total: 2923,
          avgPerOperation: 30.0,
        },
        avgPatientPerDoctor: {
          average: 30.4,
          available: 120,
        },
      },
      overview: {
        months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        admittedPatients: [2500, 2800, 3200, 3800, 4500, 5000, 3500, 2500, 3500, 1500, 2500, 3000, 3200],
        outPatients: [2200, 2500, 3000, 3500, 4200, 4600, 3200, 2200, 3200, 1200, 2200, 2800, 3000],
        cost: [2.5, 2.8, 3.2, 3.8, 4.5, 5.0, 3.5, 2.5, 3.5, 1.5, 2.5, 3.0, 3.2],
      },
      hospitalPerformance: {
        excellent: 47,
        good: 16,
        average: 40,
        poor: 3,
      },
      treatmentPlan: {
        stronglyAgree: 28,
        agree: 33,
        neutral: 61,
        disagree: 17,
        stronglyDisagree: 8,
      },
      manPower: {
        divisions: ['Cardiology', 'Orthopedics', 'Surgery', 'Dermatology', 'Neurology', 'Gynecology'],
        doctors: [65, 55, 75, 45, 50, 60],
        patientsPerDoctor: [70, 60, 80, 50, 55, 65],
      },
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
