import React, { useState, useEffect } from 'react';
import Navbar from './components/common/Navbar';
import ProjectsDashboard from './pages/ProjectsDashboard';
import CardStudioPage from './pages/CardStudioPage';
import { triggerWakeupPing } from './api/client';

export default function App() {
  const [selectedProject, setSelectedProject] = useState(null);

  // Silently wake up backend server on initial app mount
  useEffect(() => {
    triggerWakeupPing();
  }, []);

  // Sync with URL hash for easy bookmarking and refreshing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/project/')) {
        const id = hash.replace('#/project/', '');
        if (id) {
          setSelectedProject({ id });
        }
      } else {
        setSelectedProject(null);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleOpenProject = (project) => {
    setSelectedProject(project);
    window.location.hash = `#/project/${project.id}`;
  };

  const handleBackToDashboard = () => {
    setSelectedProject(null);
    window.location.hash = '';
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col font-sans">
      <Navbar
        currentProject={selectedProject}
        onBackToDashboard={handleBackToDashboard}
      />

      <main className="flex-1">
        {selectedProject ? (
          <CardStudioPage projectId={selectedProject.id} />
        ) : (
          <ProjectsDashboard onSelectProject={handleOpenProject} />
        )}
      </main>

      <footer className="py-6 border-t border-slate-200/80 bg-white text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center">
          <span>Wedding Card Personalized Bulk Generator • MVP V2.3</span>
        </div>
      </footer>
    </div>
  );
}
