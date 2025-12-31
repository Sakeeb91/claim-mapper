'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Grid,
  List,
  Share2,
  Settings
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { CollaborativeEditor } from '@/components/collaboration/CollaborativeEditor';
import { CollaborationSidebar } from '@/components/collaboration/CollaborationSidebar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { logger } from '@/utils/logger';
import { LOG_COMPONENTS, LOG_ACTIONS } from '@/constants/logging';

const collaborateLogger = logger.child({ component: LOG_COMPONENTS.COLLABORATE_PAGE });

interface CollaborationProject {
  id: string;
  title: string;
  description: string;
  activeUsers: number;
  totalClaims: number;
  lastActivity: Date;
  status: 'active' | 'completed' | 'draft';
  role: 'owner' | 'editor' | 'viewer';
}

export default function CollaboratePage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);

  const {
    user,
    initializeWebSocket,
    joinProject,
    isConnected,
    activeUsers,
    claims
  } = useAppStore();

  // Mock projects data
  const [projects] = useState<CollaborationProject[]>([
    {
      id: 'proj-1',
      title: 'Climate Change Evidence Analysis',
      description: 'Collaborative fact-checking of climate change claims and evidence',
      activeUsers: 5,
      totalClaims: 23,
      lastActivity: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      status: 'active',
      role: 'editor'
    },
    {
      id: 'proj-2',
      title: 'Medical Research Claims',
      description: 'Validating medical research claims and peer reviews',
      activeUsers: 3,
      totalClaims: 15,
      lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      status: 'active',
      role: 'owner'
    },
    {
      id: 'proj-3',
      title: 'Historical Facts Database',
      description: 'Building a comprehensive fact-checked historical database',
      activeUsers: 0,
      totalClaims: 45,
      lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      status: 'draft',
      role: 'viewer'
    }
  ]);

  useEffect(() => {
    // Initialize WebSocket connection when component mounts
    if (user && !isConnected) {
      // In a real app, you'd get the token from auth
      const mockToken = 'mock-jwt-token';
      initializeWebSocket(mockToken);
    }
  }, [user, isConnected, initializeWebSocket]);

  const handleJoinProject = (projectId: string) => {
    setSelectedProject(projectId);
    joinProject(projectId);
  };

  const handleCreateNewProject = () => {
    // TODO: Implement project creation
    collaborateLogger.debug('Create new project', { action: LOG_ACTIONS.CREATE });
  };

  const getStatusColor = (status: CollaborationProject['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: CollaborationProject['role']) => {
    switch (role) {
      case 'owner':
        return 'text-purple-600';
      case 'editor':
        return 'text-blue-600';
      case 'viewer':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedProject && selectedClaim) {
    return (
      <div className="flex h-full">
        <div className="flex-1">
          <CollaborativeEditor
            claimId={selectedClaim}
            initialContent="This is a sample claim that can be collaboratively edited..."
            onSave={(content) => {
              collaborateLogger.debug('Saved content', { action: LOG_ACTIONS.SAVE, claimId: selectedClaim, contentLength: content.length });
            }}
          />
        </div>
        {showSidebar && <CollaborationSidebar />}
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-background px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Collaborative Workspace</h1>
              <p className="text-muted-foreground">
                Work together on fact-checking and claim validation
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1 text-sm">
                <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-muted-foreground">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <Button onClick={handleCreateNewProject}>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="flex rounded-lg border border-border">
                <button
                  onClick={() => setView('grid')}
                  className={`p-2 ${view === 'grid' ? 'bg-accent' : ''}`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`p-2 ${view === 'list' ? 'bg-accent' : ''}`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSidebar(!showSidebar)}
              >
                <Users className="h-4 w-4 mr-2" />
                {showSidebar ? 'Hide' : 'Show'} Sidebar
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {view === 'grid' ? (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleJoinProject(project.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                      <span className={`text-xs font-medium ${getRoleColor(project.role)}`}>
                        {project.role}
                      </span>
                    </div>
                    <button className="p-1 hover:bg-accent rounded">
                      <Settings className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                    {project.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {project.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{project.activeUsers} active</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Share2 className="h-4 w-4 text-muted-foreground" />
                        <span>{project.totalClaims} claims</span>
                      </div>
                    </div>
                    <span className="text-muted-foreground">
                      {project.lastActivity.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleJoinProject(project.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-lg">{project.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                            {project.status}
                          </span>
                          <span className={`text-xs font-medium ${getRoleColor(project.role)}`}>
                            {project.role}
                          </span>
                        </div>
                        <p className="text-muted-foreground mb-3">
                          {project.description}
                        </p>
                        <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>{project.activeUsers} active users</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Share2 className="h-4 w-4" />
                            <span>{project.totalClaims} claims</span>
                          </div>
                          <span>Last activity: {project.lastActivity.toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-accent rounded">
                      <Settings className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredProjects.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No projects found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'Try adjusting your search terms' : 'Create your first collaboration project'}
              </p>
              <Button onClick={handleCreateNewProject}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Project
              </Button>
            </div>
          )}
        </div>

        {/* Mock project selection for demo */}
        {selectedProject && !selectedClaim && (
          <div className="border-t border-border p-6">
            <h3 className="text-lg font-semibold mb-4">Select a claim to edit:</h3>
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {['claim-1', 'claim-2', 'claim-3'].map((claimId) => (
                <button
                  key={claimId}
                  onClick={() => setSelectedClaim(claimId)}
                  className="text-left p-4 border border-border rounded-lg hover:bg-accent"
                >
                  <h4 className="font-medium">Sample Claim {claimId.split('-')[1]}</h4>
                  <p className="text-sm text-muted-foreground">
                    This is a sample claim for collaborative editing...
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {showSidebar && <CollaborationSidebar />}
    </div>
  );
}