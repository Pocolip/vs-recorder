import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout';
import { Spinner, Button } from '@/components/common';
import { useTeamDetail } from '@/hooks';
import {
  ReplaysTab,
  GameByGameTab,
  MatchByMatchTab,
  UsageStatsTab,
  MatchupStatsTab,
  MoveUsageTab,
} from '@/components/tabs';

const TABS = [
  { id: 'replays', label: 'Replays', component: ReplaysTab },
  { id: 'game-by-game', label: 'Game by Game', component: GameByGameTab },
  { id: 'match-by-match', label: 'Match by Match', component: MatchByMatchTab },
  { id: 'usage', label: 'Usage Stats', component: UsageStatsTab },
  { id: 'matchups', label: 'Matchup Stats', component: MatchupStatsTab },
  { id: 'moves', label: 'Move Usage', component: MoveUsageTab },
];

const TeamDetailPage = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('replays');

  const {
    team,
    stats,
    replays,
    matches,
    loading,
    addReplay,
    updateReplay,
    deleteReplay,
    createMatch,
    updateMatch,
    deleteMatch,
    addReplayToMatch,
    removeReplayFromMatch,
    refetch,
  } = useTeamDetail(parseInt(teamId));

  if (loading) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center h-screen">
          <Spinner size="lg" />
        </div>
      </AuthLayout>
    );
  }

  if (!team) {
    return (
      <AuthLayout>
        <div className="p-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-gray-300 mb-4">Team Not Found</h1>
            <p className="text-gray-500 mb-6">The team you're looking for doesn't exist.</p>
            <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  const ActiveTabComponent = TABS.find((t) => t.id === activeTab)?.component;

  return (
    <AuthLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-400 hover:text-emerald-400 mb-4 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Dashboard
            </button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-emerald-500">{team.name}</h1>
                <div className="flex items-center gap-4 mt-2">
                  <span className="inline-block px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-sm">
                    {team.regulation}
                  </span>
                  {team.showdownUsernames && team.showdownUsernames.length > 0 && (
                    <span className="text-sm text-gray-400">
                      Showdown: {team.showdownUsernames.join(', ')}
                    </span>
                  )}
                </div>
              </div>

              {/* Stats Overview */}
              {stats && (
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-400">Win Rate</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      {stats.winRate != null ? `${stats.winRate.toFixed(1)}%` : 'N/A'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-400">Battles</p>
                    <p className="text-2xl font-bold text-white">{stats.gamesPlayed || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-400">Wins</p>
                    <p className="text-2xl font-bold text-emerald-400">{stats.wins || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-400">Losses</p>
                    <p className="text-2xl font-bold text-red-400">{stats.losses || 0}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-slate-700 mb-6">
            <div className="flex gap-1 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'text-emerald-400 border-b-2 border-emerald-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="min-h-[500px]">
            {ActiveTabComponent && (
              <ActiveTabComponent
                team={team}
                stats={stats}
                replays={replays}
                matches={matches}
                addReplay={addReplay}
                updateReplay={updateReplay}
                deleteReplay={deleteReplay}
                createMatch={createMatch}
                updateMatch={updateMatch}
                deleteMatch={deleteMatch}
                addReplayToMatch={addReplayToMatch}
                removeReplayFromMatch={removeReplayFromMatch}
                refetch={refetch}
              />
            )}
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default TeamDetailPage;
