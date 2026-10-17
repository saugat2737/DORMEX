import React, { createContext, useContext, useState, useEffect } from 'react';

export type Role = 'STUDENT' | 'PROCTOR' | 'WARDEN' | 'CHIEF_WARDEN' | 'HOSTEL_OFFICE' | 'SUPER_ADMIN';

export interface UserSession {
  userId: string;
  collegeId: string;
  fullName: string;
  role: Role;
  scopeType: string;
  scopeId: string | null;
  profileId: string | null;
}

export const DEV_USERS: Record<string, UserSession> = {
  demo1: {
    userId: 'usr_demo_001',
    collegeId: 'DEMO-001',
    fullName: 'Aarav Sharma (Rank #1)',
    role: 'STUDENT',
    scopeType: 'STUDENT',
    scopeId: null,
    profileId: 'prof_demo_001',
  },
  demo2: {
    userId: 'usr_demo_002',
    collegeId: 'DEMO-002',
    fullName: 'Diya Patel (Rank #2)',
    role: 'STUDENT',
    scopeType: 'STUDENT',
    scopeId: null,
    profileId: 'prof_demo_002',
  },
  demo3: {
    userId: 'usr_demo_003',
    collegeId: 'DEMO-003',
    fullName: 'Rohan Verma (Rank #3)',
    role: 'STUDENT',
    scopeType: 'STUDENT',
    scopeId: null,
    profileId: 'prof_demo_003',
  },
  demo10: {
    userId: 'usr_demo_010',
    collegeId: 'DEMO-010',
    fullName: 'Arjun Menon (Rank #10)',
    role: 'STUDENT',
    scopeType: 'STUDENT',
    scopeId: null,
    profileId: 'prof_demo_010',
  },
  demo29: {
    userId: 'usr_demo_029',
    collegeId: 'DEMO-029',
    fullName: 'Prisha Pandey (Pending Eligibility)',
    role: 'STUDENT',
    scopeType: 'STUDENT',
    scopeId: null,
    profileId: 'prof_demo_029',
  },
  demo30: {
    userId: 'usr_demo_030',
    collegeId: 'DEMO-030',
    fullName: 'Nikhil Saxena (Fee Pending)',
    role: 'STUDENT',
    scopeType: 'STUDENT',
    scopeId: null,
    profileId: 'prof_demo_030',
  },
  student1: {
    userId: 'usr_student_1',
    collegeId: 'USN202401',
    fullName: 'Aarav Patel (Test Alias)',
    role: 'STUDENT',
    scopeType: 'STUDENT',
    scopeId: null,
    profileId: 'prof_stu_1',
  },
  wardenBvb: {
    userId: 'usr_warden_bvb',
    collegeId: 'WRD001',
    fullName: 'Prof. Rao (Warden - BVB Block)',
    role: 'WARDEN',
    scopeType: 'BUILDING',
    scopeId: 'bld_bvb',
    profileId: null,
  },
  chiefWarden: {
    userId: 'usr_chief',
    collegeId: 'CW001',
    fullName: 'Dr. Sharma (Chief Warden)',
    role: 'CHIEF_WARDEN',
    scopeType: 'SYSTEM',
    scopeId: null,
    profileId: null,
  },
  hostelOffice: {
    userId: 'usr_office',
    collegeId: 'OFF001',
    fullName: 'Hostel Office Staff',
    role: 'HOSTEL_OFFICE',
    scopeType: 'SYSTEM',
    scopeId: null,
    profileId: null,
  },
  superAdmin: {
    userId: 'usr_admin',
    collegeId: 'ADM001',
    fullName: 'System Administrator (Super Admin)',
    role: 'SUPER_ADMIN',
    scopeType: 'SYSTEM',
    scopeId: null,
    profileId: null,
  },
};

interface AuthContextType {
  session: UserSession;
  setSession: (session: UserSession) => void;
  switchUser: (devKey: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  session: DEV_USERS.demo1,
  setSession: () => {},
  switchUser: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<UserSession>(() => {
    const saved = localStorage.getItem('dormex_dev_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return DEV_USERS.demo1;
  });

  const switchUser = (devKey: string) => {
    const target = DEV_USERS[devKey];
    if (target) {
      setSession(target);
      localStorage.setItem('dormex_dev_session', JSON.stringify(target));
    }
  };

  useEffect(() => {
    localStorage.setItem('dormex_dev_session', JSON.stringify(session));
  }, [session]);

  return (
    <AuthContext.Provider value={{ session, setSession, switchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export async function apiFetch(path: string, options: RequestInit = {}, session?: UserSession) {
  const headers = new Headers(options.headers || {});
  if (session) {
    headers.set('x-user-id', session.userId);
  } else {
    const saved = localStorage.getItem('dormex_dev_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        headers.set('x-user-id', parsed.userId);
      } catch (e) {}
    }
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  return res;
}
