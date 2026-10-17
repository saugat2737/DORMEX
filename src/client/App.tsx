import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { AppLayout } from './components/AppLayout.js';
import { FloorPlanEditor } from './components/FloorPlanEditor.js';
import { StudentAllocationView } from './components/StudentAllocationView.js';
import { AdminDashboard } from './components/AdminDashboard.js';
import { StudentRegistryView } from './components/StudentRegistryView.js';
import { ComplaintsView } from './components/ComplaintsView.js';

const AppContent: React.FC = () => {
  const { session } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>(
    session.role === 'STUDENT' ? 'student_allocation' : 'admin_overview'
  );

  return (
    <AppLayout currentTab={currentTab} setCurrentTab={setCurrentTab}>
      {currentTab === 'student_allocation' && <StudentAllocationView />}
      {currentTab === 'student_complaints' && <ComplaintsView />}
      {currentTab === 'admin_overview' && <AdminDashboard />}
      {currentTab === 'admin_students' && <StudentRegistryView />}
      {currentTab === 'admin_floor_editor' && <FloorPlanEditor />}
      {currentTab === 'admin_complaints' && <ComplaintsView />}
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
