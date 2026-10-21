import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { AppLayout } from './components/AppLayout.js';
import { FloorPlanEditor } from './components/FloorPlanEditor.js';
import { StudentAllocationView } from './components/StudentAllocationView.js';
import { AdminDashboard } from './components/AdminDashboard.js';
import { StudentRegistryView } from './components/StudentRegistryView.js';
import { ComplaintsView } from './components/ComplaintsView.js';
import { PortalSelectionView } from './components/PortalSelectionView.js';
import { StudentAdmissionManagementView } from './components/StudentAdmissionManagementView.js';
import { MessMenuView } from './components/MessMenuView.js';

const AppContent: React.FC = () => {
  const { session, isAuthenticated } = useAuth();

  // If not authenticated, show the 3 Login Portals Welcome Screen
  if (!isAuthenticated || !session) {
    return <PortalSelectionView />;
  }

  const [currentTab, setCurrentTab] = useState<string>(
    session.role === 'STUDENT' ? 'student_allocation' : 'admin_overview'
  );

  return (
    <AppLayout currentTab={currentTab} setCurrentTab={setCurrentTab}>
      {currentTab === 'student_allocation' && <StudentAllocationView />}
      {currentTab === 'student_complaints' && <ComplaintsView />}
      {currentTab === 'student_mess_menu' && <MessMenuView />}
      {currentTab === 'admin_overview' && <AdminDashboard />}
      {currentTab === 'admin_students' && <StudentRegistryView />}
      {currentTab === 'admin_floor_editor' && <FloorPlanEditor />}
      {currentTab === 'admin_complaints' && <ComplaintsView />}
      {currentTab === 'office_admissions' && <StudentAdmissionManagementView />}
      {currentTab === 'office_mess_menu' && <MessMenuView />}
    </AppLayout>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};
