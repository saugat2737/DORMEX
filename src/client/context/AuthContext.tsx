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
  student1: {
    userId: 'usr_student_1',
    collegeId: 'USN202401',
    fullName: 'Aarav Patel (Student)',
    role: 'STUDENT',
    scopeType: 'STUDENT',
    scopeId: null,
    profileId: 'prof_stu_1',
  },
  student2: {
    userId: 'usr_student_2',
    collegeId: 'USN202402',
    fullName: 'Diya Sen (Student)',
    role: 'STUDENT',
    scopeType: 'STUDENT',
    scopeId: null,
    profileId: 'prof_stu_2',
  },
  student3: {
    userId: 'usr_student_3',
    collegeId: 'USN202403',
    fullName: 'Rohan Verma (Student)',
    role: 'STUDENT',
    scopeType: 'STUDENT',
    scopeId: null,
    profileId: 'prof_stu_3',
  },
  wardenA: {
    userId: 'usr_warden_a',
    collegeId: 'WRD001',
    fullName: 'Prof. Rao (Warden - Aryabhata)',
    role: 'WARDEN',
    scopeType: 'BUILDING',
    scopeId: 'bld_aryabhata',
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
  session: DEV_USERS.student1,
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
    return DEV_USERS.student1;
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
