import React, { useState } from 'react';
import { AuthLayout } from '@/components/layout';
import { TeamCard } from '@/components/cards';
import { AddTeamModal } from '@/components/modals';
import { Button, Spinner } from '@/components/common';
import { useTeams } from '@/hooks';
import { REGULATIONS } from '@/utils/constants';

const DashboardPage = () => {
  const [viewMode, setViewMode] = useState('grid');
  const [regulationFilter, setRegulationFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { teams, loading, createTeam } = useTeams(regulationFilter || null);

  const handleCreateTeam = async (teamData) => {
    try {
      await createTeam(teamData);
      setIsAddModalOpen(false);
    } catch (error) {
      // Error is already handled by useTeams hook (toast notification)
      console.error('Error creating team:', error);
    }
  };

  return (
    <AuthLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <h1 className="text-3xl font-bold text-emerald-500">My Teams</h1>

            <div className="flex items-center gap-4 flex-wrap">
              {/* Regulation Filter */}
              <div className="flex items-center gap-2">
                <label htmlFor="regulation-filter" className="text-sm text-gray-400">
                  Regulation:
                </label>
                <select
                  id="regulation-filter"
                  value={regulationFilter}
                  onChange={(e) => setRegulationFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All Regulations</option>
                  {REGULATIONS.map((reg) => (
                    <option key={reg} value={reg}>
                      {reg}
                    </option>
                  ))}
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-emerald-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  aria-label="Grid view"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    viewMode === 'list'
                      ? 'bg-emerald-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  aria-label="List view"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
              </div>

              {/* Add Team Button */}
              <Button onClick={() => setIsAddModalOpen(true)}>+ Add Team</Button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          )}

          {/* Empty State */}
          {!loading && teams.length === 0 && (
            <div className="card text-center py-12">
              <div className="mb-4">
                <svg
                  className="w-16 h-16 mx-auto text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-300 mb-2">No teams yet</h3>
              <p className="text-gray-500 mb-6">
                {regulationFilter
                  ? `No teams found for ${regulationFilter}`
                  : "Get started by creating your first team"}
              </p>
              <Button onClick={() => setIsAddModalOpen(true)}>+ Create Your First Team</Button>
            </div>
          )}

          {/* Teams Grid/List */}
          {!loading && teams.length > 0 && (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {teams.map((team) => (
                    <TeamCard key={team.id} team={team} viewMode="grid" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {teams.map((team) => (
                    <TeamCard key={team.id} team={team} viewMode="list" />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Team Modal */}
      <AddTeamModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateTeam}
      />
    </AuthLayout>
  );
};

export default DashboardPage;
