import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { method, email, password, token } = body;

    // Option 1: SSO Token from travelcaretours.in/invoice
    if (method === 'token') {
      if (!token || token.trim().length < 5) {
        return NextResponse.json(
          { success: false, message: 'Invalid or expired SSO token from invoice system.' },
          { status: 400 }
        );
      }

      const staffUser = {
        id: 'staff-sso-01',
        name: 'Senior Tour Consultant',
        email: 'operations@travelcaretours.in',
        role: 'Tour Planner Specialist',
        token,
        isAuthenticated: true,
      };

      const response = NextResponse.json({ success: true, user: staffUser });
      response.cookies.set('tct_staff_jwt', token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      return response;
    }

    // Option 2: Email & Password
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required.' },
        { status: 400 }
      );
    }

    // Accept valid staff account or demo
    const isAuthorized = 
      email.includes('@travelcaretours.in') || 
      email === 'travelcare598@gmail.com' ||
      password.length >= 6;

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized staff member. Please use Travel Care Tours staff account.' },
        { status: 401 }
      );
    }

    const staffUser = {
      id: `staff-${Date.now()}`,
      name: email === 'travelcare598@gmail.com' ? 'Operations Manager (TCT)' : email.split('@')[0].toUpperCase(),
      email,
      role: 'Authorized Staff Planner',
      token: `tct_jwt_${Date.now()}`,
      isAuthenticated: true,
    };

    const response = NextResponse.json({ success: true, user: staffUser });
    response.cookies.set('tct_staff_jwt', staffUser.token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
