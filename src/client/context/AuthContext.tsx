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

export interface AuthContextType {
  session: UserSession | null;
  isAuthenticated: boolean;
  currentPortal: 'STUDENT' | 'ADMIN' | 'HOSTEL_OFFICE' | null;
  setCurrentPortal: (portal: 'STUDENT' | 'ADMIN' | 'HOSTEL_OFFICE' | null) => void;
  login: (portal: 'STUDENT' | 'ADMIN' | 'HOSTEL_OFFICE', identityKey: string) => void;
  loginWithCredentials: (
    portal: 'STUDENT' | 'ADMIN' | 'HOSTEL_OFFICE',
    collegeIdOrEmail: string,
    passwordOrKey: string
  ) => void;
  logout: () => void;
  switchUser: (devKey: string) => void;
  isDevMode: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  isAuthenticated: false,
  currentPortal: null,
  setCurrentPortal: () => {},
  login: () => {},
  loginWithCredentials: () => {},
  logout: () => {},
  switchUser: () => {},
  isDevMode: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('dormex_auth_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return null;
  });

  const [currentPortal, setCurrentPortal] = useState<'STUDENT' | 'ADMIN' | 'HOSTEL_OFFICE' | null>(() => {
    return (localStorage.getItem('dormex_current_portal') as any) || null;
  });

  const isDevMode = typeof window !== 'undefined' && (
    window.location.search.includes('dev=true') || 
    localStorage.getItem('dormex_dev_mode') === 'true'
  );

  const login = (portal: 'STUDENT' | 'ADMIN' | 'HOSTEL_OFFICE', identityKey: string) => {
    const target = DEV_USERS[identityKey];
    if (target) {
      // Backend authority verification: Ensure selected portal matches authorized role
      if (portal === 'STUDENT' && target.role !== 'STUDENT') {
        throw new Error('Access Denied: This account is not a student');
      }
      if (portal === 'HOSTEL_OFFICE' && target.role !== 'HOSTEL_OFFICE') {
        throw new Error('Access Denied: This account is not authorized for Hostel Office');
      }
      if (portal === 'ADMIN' && !['SUPER_ADMIN', 'CHIEF_WARDEN', 'WARDEN'].includes(target.role)) {
        throw new Error('Access Denied: This account is not an administrative staff member');
      }

      setSession(target);
      setCurrentPortal(portal);
      localStorage.setItem('dormex_auth_session', JSON.stringify(target));
      localStorage.setItem('dormex_current_portal', portal);
    }
  };

  const loginWithCredentials = (
    portal: 'STUDENT' | 'ADMIN' | 'HOSTEL_OFFICE',
    collegeIdOrEmail: string,
    passwordOrKey: string
  ) => {
    const trimmedId = collegeIdOrEmail.trim().toLowerCase();
    const trimmedPw = passwordOrKey.trim();

    if (!trimmedId) {
      throw new Error('Please enter your Institutional ID or email address');
    }
    if (!trimmedPw) {
      throw new Error('Please enter your password or authorized credential');
    }

    // Find in seeded DEV_USERS or resolve match
    let matchKey: string | null = null;
    for (const [key, user] of Object.entries(DEV_USERS)) {
      if (
        user.collegeId.toLowerCase() === trimmedId ||
        user.userId.toLowerCase() === trimmedId ||
        key.toLowerCase() === trimmedId
      ) {
        matchKey = key;
        break;
      }
    }

    // If student USN format (e.g. 1SI21CS094, DEMO-001, etc.)
    if (!matchKey && portal === 'STUDENT') {
      const numMatch = trimmedId.match(/(\d+)/);
      if (numMatch) {
        const num = parseInt(numMatch[1], 10);
        if (num >= 1 && num <= 30) {
          const padded = String(num).padStart(3, '0');
          matchKey = `demo${num}`;
        }
      }
    }

    // Default portal fallback if matching admin / office
    if (!matchKey) {
      if (portal === 'ADMIN' && (trimmedId.includes('admin') || trimmedId.includes('warden') || trimmedId === 'adm001')) {
        matchKey = 'superAdmin';
      } else if (portal === 'HOSTEL_OFFICE' && (trimmedId.includes('office') || trimmedId.includes('hostel') || trimmedId === 'off001')) {
        matchKey = 'hostelOffice';
      }
    }

    if (!matchKey || !DEV_USERS[matchKey]) {
      throw new Error(`Authentication Failed: Institutional ID '${collegeIdOrEmail}' not recognized`);
    }

    login(portal, matchKey);
  };

  const logout = () => {
    setSession(null);
    setCurrentPortal(null);
    localStorage.removeItem('dormex_auth_session');
    localStorage.removeItem('dormex_current_portal');
    localStorage.removeItem('dormex_dev_session');
  };

  const switchUser = (devKey: string) => {
    const target = DEV_USERS[devKey];
    if (target) {
      setSession(target);
      localStorage.setItem('dormex_auth_session', JSON.stringify(target));
    }
  };

  useEffect(() => {
    if (session) {
      localStorage.setItem('dormex_auth_session', JSON.stringify(session));
    }
  }, [session]);

  return (
    <AuthContext.Provider
      value={{
        session,
        isAuthenticated: !!session,
        currentPortal,
        setCurrentPortal,
        login,
        loginWithCredentials,
        logout,
        switchUser,
        isDevMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export async function apiFetch(path: string, options: RequestInit = {}, session?: UserSession | null) {
  const headers = new Headers(options.headers || {});
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (session) {
    headers.set('x-user-id', session.userId);
  } else {
    const saved = localStorage.getItem('dormex_auth_session') || localStorage.getItem('dormex_dev_session');
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
