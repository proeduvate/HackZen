import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  Calendar,
  Users,
  Award,
  ChevronRight,
  ExternalLink,
  Clock,
  Sparkles,
  MapPin,
  CheckCircle2
} from 'lucide-react';
import { useMentor } from '../../context/MentorContext';

export default function MentorHackathons() {
  const navigate = useNavigate();
  const { globalSearch } = useMentor();
  const [activeTab, setActiveTab] = useState('Active');

  const hackathons = [
    {
      id: 'hack-1',
      title: 'AI Innovation Hackathon 2025',
      organizer: 'Stanford AI Student Alliance & Google Cloud',
      category: 'Artificial Intelligence',
      status: 'Active',
      phase: 'Development Sprint (Day 4/7)',
      dates: 'Oct 22 - Oct 29, 2025',
      assignedTeamsCount: 4,
      role: 'Lead AI & Architecture Mentor',
      description: 'Global hackathon focusing on multimodal LLMs, agentic workflows, and real-time inference applications.',
      prizePool: '$45,000 USD',
    },
    {
      id: 'hack-2',
      title: 'HealthTech Global Hackathon',
      organizer: 'BioHealth Ventures & Johns Hopkins',
      category: 'Healthcare Tech',
      status: 'Active',
      phase: 'Prototype Verification',
      dates: 'Oct 15 - Nov 2, 2025',
      assignedTeamsCount: 2,
      role: 'Clinical AI Advisor',
      description: 'Building patient-centric diagnostic systems, medical robotics algorithms, and remote care pipelines.',
      prizePool: '$60,000 USD',
    },
    {
      id: 'hack-3',
      title: 'NextGen FinTech Challenge',
      organizer: 'Open Finance Collective',
      category: 'FinTech',
      status: 'Upcoming',
      phase: 'Orientation & Team Formation',
      dates: 'Nov 10 - Nov 17, 2025',
      assignedTeamsCount: 0,
      role: 'Invited Expert Mentor',
      description: 'Decentralized identity, zero-knowledge fraud detection, and algorithmic settlement networks.',
      prizePool: '$35,000 USD',
    },
    {
      id: 'hack-4',
      title: 'EcoTrack Climate Summit Hack',
      organizer: 'ClimateWorks & CleanTech Labs',
      category: 'Climate & IoT',
      status: 'Concluded',
      phase: 'Judging Completed',
      dates: 'Sep 12 - Sep 19, 2025',
      assignedTeamsCount: 3,
      role: 'Hardware & IoT Mentor',
      description: 'Distributed sensor telemetry, solar grid load balancing, and carbon footprint tracking models.',
      prizePool: '$25,000 USD',
    },
  ];

  const filteredHackathons = useMemo(() => {
    let list = hackathons;
    if (activeTab !== 'All') {
      list = list.filter((h) => h.status === activeTab);
    }
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase();
      list = list.filter(
        (h) =>
          h.title.toLowerCase().includes(q) ||
          h.category.toLowerCase().includes(q) ||
          h.organizer.toLowerCase().includes(q)
      );
    }
    return list;
  }, [hackathons, activeTab, globalSearch]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="p-6 sm:p-7 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            My Hackathons
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track active cohorts, timelines, and hackathons you are currently guiding.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10">
        {['Active', 'Upcoming', 'Concluded', 'All'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === tab
                ? 'border-[#5B45D9] text-[#5B45D9] dark:text-purple-300 dark:border-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            {tab} Hackathons
          </button>
        ))}
      </div>

      {/* Hackathons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredHackathons.map((hack) => {
          const isActive = hack.status === 'Active';
          const isUpcoming = hack.status === 'Upcoming';

          return (
            <div
              key={hack.id}
              className="p-6 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs hover:border-[#5B45D9]/40 transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Header & Badges */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-50 text-[#5B45D9] dark:bg-purple-950/40 dark:text-purple-300 border border-purple-100 dark:border-purple-800/40">
                    {hack.category}
                  </span>
                  <span
                    className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200'
                        : isUpcoming
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200'
                        : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                    }`}
                  >
                    {hack.status}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-[#5B45D9] transition-colors">
                  {hack.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Organized by <span className="font-semibold text-slate-700 dark:text-slate-300">{hack.organizer}</span>
                </p>

                <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 line-clamp-2 leading-relaxed">
                  {hack.description}
                </p>

                {/* Details Pill grid */}
                <div className="grid grid-cols-2 gap-2.5 mt-4 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-100 dark:border-white/5">
                    <span className="text-slate-400 text-[11px] block">Dates</span>
                    <span className="font-semibold text-slate-800 dark:text-white flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-[#5B45D9]" />
                      {hack.dates}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950 border border-slate-100 dark:border-white/5">
                    <span className="text-slate-400 text-[11px] block">Assigned Teams</span>
                    <span className="font-semibold text-slate-800 dark:text-white flex items-center gap-1 mt-0.5">
                      <Users className="w-3.5 h-3.5 text-[#5B45D9]" />
                      {hack.assignedTeamsCount} Teams Mentoring
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  Your Role: <span className="font-semibold text-slate-800 dark:text-white">{hack.role}</span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                <span className="text-xs font-bold text-[#5B45D9] dark:text-purple-300">
                  {hack.phase}
                </span>
                <button
                  onClick={() => navigate('/mentor/teams')}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-[#5B45D9] hover:text-white text-slate-800 dark:text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1"
                >
                  View Cohorts <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
