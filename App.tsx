
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Vote, 
  MapPin, 
  BarChart3, 
  Settings, 
  LogOut, 
  Plus, 
  FileText, 
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Menu,
  X,
  Camera,
  BrainCircuit,
  Trash2,
  RefreshCcw,
  CheckCircle2,
  MinusCircle,
  KeyRound,
  RotateCcw,
  LayoutGrid,
  ChevronDown,
  Download,
  CreditCard,
  Crown
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { 
  User, 
  UserRole, 
  Election, 
  PollingStation, 
  Agent, 
  Result, 
  PaymentStatus,
  Candidate
} from './types';
import { getSmartAnalytics } from './services/geminiService';

// --- MOCK DATABASE HELPER ---
const STORAGE_KEY = 'kuralive_db';

const useKuraDB = () => {
  const [data, setData] = useState<{
    users: User[];
    elections: Election[];
    stations: PollingStation[];
    agents: Agent[];
    results: Result[];
    activeUser: User | null;
  }>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    return {
      users: [],
      elections: [],
      stations: [],
      agents: [],
      results: [],
      activeUser: null
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const login = (email: string, role: UserRole, pin?: string) => {
    if (role === UserRole.MANAGER) {
      let user = data.users.find(u => u.email === email && u.role === UserRole.MANAGER);
      if (!user) {
        user = {
          id: Math.random().toString(36).substr(2, 9),
          email,
          name: email.split('@')[0],
          role: UserRole.MANAGER,
          subsystemId: Math.random().toString(36).substr(2, 6).toUpperCase(),
          paymentStatus: PaymentStatus.TRIAL
        };
        setData(prev => ({ ...prev, users: [...prev.users, user!], activeUser: user! }));
      } else {
        setData(prev => ({ ...prev, activeUser: user! }));
      }
    } else {
      const agent = data.agents.find(a => a.pin === pin);
      if (agent) {
        const user: User = {
          id: agent.id,
          name: agent.name,
          email: `${agent.id}@agent.kuralive`,
          role: UserRole.AGENT,
          subsystemId: 'AGENT_SESSION',
          paymentStatus: PaymentStatus.PAID
        };
        setData(prev => ({ ...prev, activeUser: user }));
      } else {
        alert("Invalid PIN");
      }
    }
  };

  const logout = () => setData(prev => ({ ...prev, activeUser: null }));

  const upgradePayment = () => {
    if (!data.activeUser) return;
    setData(prev => {
      const updatedUsers = prev.users.map(u => 
        u.id === prev.activeUser?.id ? { ...u, paymentStatus: PaymentStatus.PAID } : u
      );
      return { 
        ...prev, 
        users: updatedUsers, 
        activeUser: { ...prev.activeUser!, paymentStatus: PaymentStatus.PAID } 
      };
    });
  };

  const addElection = (election: Omit<Election, 'id' | 'managerId'>) => {
    if (!data.activeUser) return;
    
    // Trial limits
    const managerElections = data.elections.filter(e => e.managerId === data.activeUser?.id);
    if (data.activeUser.paymentStatus === PaymentStatus.TRIAL && managerElections.length >= 1) {
      alert("TRIAL LIMIT: You can only create 1 election in the trial version. Please upgrade for $299 to unlock unlimited elections.");
      return null;
    }

    const newElection: Election = {
      ...election,
      id: Math.random().toString(36).substr(2, 9),
      managerId: data.activeUser.id
    };
    setData(prev => ({ ...prev, elections: [...prev.elections, newElection] }));
    return newElection.id;
  };

  const addStation = (station: Omit<PollingStation, 'id' | 'detailsSubmitted' | 'resultsSubmitted'>) => {
    if (!data.activeUser) return;

    // Trial limits
    const electionStations = data.stations.filter(s => s.electionId === station.electionId);
    if (data.activeUser.paymentStatus === PaymentStatus.TRIAL && electionStations.length >= 5) {
      alert("TRIAL LIMIT: You can only add up to 5 polling stations in the trial version. Please upgrade to the full version.");
      return;
    }

    const newStation: PollingStation = {
      ...station,
      id: Math.random().toString(36).substr(2, 9),
      detailsSubmitted: false,
      resultsSubmitted: false
    };
    setData(prev => ({ ...prev, stations: [...prev.stations, newStation] }));
  };

  const addAgent = (agent: Omit<Agent, 'id' | 'managerId' | 'status'>) => {
    if (!data.activeUser) return;
    const newAgent: Agent = {
      ...agent,
      id: Math.random().toString(36).substr(2, 9),
      managerId: data.activeUser.id,
      status: 'active'
    };
    setData(prev => ({ ...prev, agents: [...prev.agents, newAgent] }));
  };

  const resetStationDetails = (id: string) => {
    if (!confirm("RESET PROTOCOL: Are you sure? This will permanently delete all submitted result data for this station and allow re-entry.")) return;
    setData(prev => ({
      ...prev,
      stations: prev.stations.map(s => s.id === id ? { ...s, detailsSubmitted: false, resultsSubmitted: false } : s),
      results: prev.results.filter(r => r.stationId !== id)
    }));
  };

  const resetAgent = (id: string) => {
    if (!confirm("Confirm agent session reset? This clears the agent's current state.")) return;
    alert("Agent security context has been reset.");
  };

  const deleteEntity = (type: 'elections' | 'stations' | 'agents', id: string) => {
    if (!confirm(`Are you sure you want to delete this ${type.slice(0, -1)}?`)) return;
    setData(prev => ({
      ...prev,
      [type]: prev[type].filter((item: any) => item.id !== id),
      results: type === 'stations' ? prev.results.filter(r => r.stationId !== id) : prev.results,
      stations: type === 'elections' ? prev.stations.filter(s => s.electionId !== id) : prev.stations,
    }));
  };

  const submitResult = (result: Omit<Result, 'id' | 'timestamp'>) => {
    const newResult: Result = {
      ...result,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString()
    };
    setData(prev => {
      const updatedStations = prev.stations.map(s => 
        s.id === result.stationId ? { ...s, resultsSubmitted: true } : s
      );
      return { 
        ...prev, 
        results: [...prev.results, newResult], 
        stations: updatedStations 
      };
    });
  };

  return { data, login, logout, addElection, addStation, addAgent, resetStationDetails, resetAgent, deleteEntity, submitResult, upgradePayment };
};

// --- MODAL COMPONENTS ---

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
    <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-100">
      <div className="flex justify-between items-center p-8 border-b border-slate-50">
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h3>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition text-slate-400"><X size={24} /></button>
      </div>
      <div className="p-8 max-h-[80vh] overflow-y-auto">{children}</div>
    </div>
  </div>
);

const LandingPage: React.FC<{ onLogin: (role: UserRole) => void }> = ({ onLogin }) => (
  <div className="min-h-screen bg-slate-50 flex flex-col">
    <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
      <div className="flex items-center gap-2">
        <div className="bg-indigo-600 p-2 rounded-lg text-white">
          <Vote size={24} />
        </div>
        <span className="text-xl font-bold tracking-tight text-slate-900">KuraLive</span>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onLogin(UserRole.MANAGER)} className="px-5 py-2.5 text-indigo-600 font-bold hover:bg-indigo-50 rounded-2xl transition text-sm">Manager Access</button>
        <button onClick={() => onLogin(UserRole.AGENT)} className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition text-sm shadow-lg shadow-indigo-100">Agent Login</button>
      </div>
    </nav>
    <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto">
      <div className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-8">Secure Election Reporting Node</div>
      <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-8 leading-[1.1] tracking-tight">
        High Integrity <span className="text-indigo-600">Vote Reporting</span>
      </h1>
      <p className="text-lg md:text-xl text-slate-500 mb-12 max-w-2xl font-medium leading-relaxed">
        Isolated subsystems, real-time sync, and photographic evidence. KuraLive is the professional standard for multi-tenant election management.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
        <button onClick={() => onLogin(UserRole.MANAGER)} className="px-10 py-5 bg-slate-900 text-white text-lg font-black rounded-[32px] hover:bg-slate-800 transition shadow-2xl shadow-slate-200 flex items-center justify-center gap-2">Deploy Election <ChevronRight size={20} /></button>
        <button onClick={() => onLogin(UserRole.AGENT)} className="px-10 py-5 bg-white border-2 border-slate-100 text-slate-900 text-lg font-black rounded-[32px] hover:bg-slate-50 transition">Access Agent Node</button>
      </div>
    </main>
  </div>
);

const ManagerDashboard: React.FC<{ 
  user: User; 
  db: ReturnType<typeof useKuraDB>; 
  onLogout: () => void 
}> = ({ user, db, onLogout }) => {
  const [view, setView] = useState<'home' | 'elections' | 'stations' | 'agents' | 'results' | 'settings'>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [smartSummary, setSmartSummary] = useState<string>("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [activeModal, setActiveModal] = useState<'election' | 'station' | 'agent' | 'upgrade' | null>(null);

  const [modalCandidates, setModalCandidates] = useState<{ name: string; party: string }[]>([{ name: '', party: '' }]);

  const managerElections = useMemo(() => 
    db.data.elections.filter(e => e.managerId === user.id)
  , [db.data.elections, user.id]);

  const [selectedElectionId, setSelectedElectionId] = useState<string>(() => managerElections[0]?.id || "");
  
  const currentElection = useMemo(() => 
    managerElections.find(e => e.id === selectedElectionId) || managerElections[0]
  , [managerElections, selectedElectionId]);

  useEffect(() => {
    if (!selectedElectionId && managerElections.length > 0) {
      setSelectedElectionId(managerElections[0].id);
    }
  }, [managerElections]);

  const managerStations = useMemo(() => 
    db.data.stations.filter(s => s.electionId === currentElection?.id)
  , [db.data.stations, currentElection?.id]);

  const managerResults = useMemo(() => 
    db.data.results.filter(r => managerStations.some(s => s.id === r.stationId))
  , [db.data.results, managerStations]);

  const managerAgents = useMemo(() => 
    db.data.agents.filter(a => managerStations.some(s => s.id === a.stationId))
  , [db.data.agents, managerStations]);

  const stats = useMemo(() => {
    if (!currentElection) return { totalStations: 0, reportedStations: 0, registeredVoters: 0, totalVotesCast: 0, turnout: 0 };
    const totalStations = managerStations.length;
    const reportedStations = managerStations.filter(s => s.resultsSubmitted).length;
    const registeredVoters = managerStations.reduce((acc, s) => acc + s.registeredVoters, 0);
    const totalVotesCast = managerResults.reduce((acc, r) => {
      const candidateSum = (Object.values(r.candidateVotes) as number[]).reduce((a, b) => a + b, 0);
      return acc + candidateSum + r.spoiltVotes + r.rejectedVotes;
    }, 0);
    const turnout = registeredVoters > 0 ? (totalVotesCast / registeredVoters) * 100 : 0;

    return { totalStations, reportedStations, registeredVoters, totalVotesCast, turnout };
  }, [managerStations, managerResults, currentElection]);

  const chartData = useMemo(() => {
    if (!currentElection) return [];
    const candidatesMap: Record<string, number> = {};
    managerResults.forEach(r => {
      (Object.entries(r.candidateVotes) as [string, number][]).forEach(([cid, votes]) => {
        candidatesMap[cid] = (candidatesMap[cid] || 0) + votes;
      });
    });

    return currentElection.candidates.map(c => ({
      name: c.name,
      votes: candidatesMap[c.id] || 0,
      party: c.party
    }));
  }, [managerResults, currentElection]);

  const handleGenerateAI = async () => {
    if (!currentElection) return;
    setLoadingAI(true);
    const analysis = await getSmartAnalytics({
      election: currentElection.name,
      stats,
      results: chartData
    });
    setSmartSummary(analysis);
    setLoadingAI(false);
  };

  const handleExportCSV = () => {
    if (!currentElection) return;
    const headers = ['Polling Station', 'County', 'Ward', 'Agent', 'Timestamp', ...currentElection.candidates.map(c => c.name), 'Spoilt', 'Rejected', 'Turnout %'];
    const rows = managerResults.map(r => {
      const station = managerStations.find(s => s.id === r.stationId);
      const agent = db.data.agents.find(a => a.id === r.agentId);
      const voterCount = station?.registeredVoters || 1;
      const totalValid = (Object.values(r.candidateVotes) as number[]).reduce((a,b) => a+b, 0);
      const turnout = ((totalValid + r.spoiltVotes + r.rejectedVotes) / voterCount * 100).toFixed(2);
      
      return [
        station?.name,
        station?.county,
        station?.ward,
        agent?.name,
        new Date(r.timestamp).toLocaleString(),
        ...currentElection.candidates.map(c => r.candidateVotes[c.id] || 0),
        r.spoiltVotes,
        r.rejectedVotes,
        turnout
      ].join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${currentElection.name.replace(/\s+/g, '_')}_Results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const navItems = [
    { id: 'home', label: 'Overview', icon: <LayoutGrid size={20} /> },
    { id: 'elections', label: 'Elections', icon: <Vote size={20} /> },
    { id: 'stations', label: 'Stations', icon: <MapPin size={20} /> },
    { id: 'agents', label: 'Agents', icon: <Users size={20} /> },
    { id: 'results', label: 'Results', icon: <FileText size={20} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  const handleNavClick = (viewId: any) => {
    setView(viewId);
    setSidebarOpen(false);
  };

  const addModalCandidate = () => setModalCandidates([...modalCandidates, { name: '', party: '' }]);
  const removeModalCandidate = (index: number) => {
    if (modalCandidates.length > 1) {
      setModalCandidates(modalCandidates.filter((_, i) => i !== index));
    }
  };
  const updateModalCandidate = (index: number, field: 'name' | 'party', value: string) => {
    const newList = [...modalCandidates];
    newList[index][field] = value;
    setModalCandidates(newList);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 w-80 bg-white border-r border-slate-100 z-50 transition-transform duration-500 lg:translate-x-0 flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 flex items-center justify-between border-b border-slate-50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-100">
              <Vote size={24} />
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tight">KuraLive</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:bg-slate-50 rounded-full transition">
            <X size={24} />
          </button>
        </div>
        
        <nav className="p-6 space-y-2 overflow-y-auto flex-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id as any)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-[24px] transition-all duration-300 ${
                view === item.id 
                  ? 'bg-indigo-600 text-white font-black shadow-xl shadow-indigo-100 translate-x-1' 
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600 font-bold'
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-50 bg-white">
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-[24px] text-red-500 hover:bg-red-50 transition-all font-black text-sm border-2 border-transparent hover:border-red-100"
          >
            <LogOut size={20} className="shrink-0" />
            <span>Decommission Session</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-24 bg-white/80 backdrop-blur-md border-b border-slate-50 flex items-center justify-between px-6 lg:px-12 shrink-0 z-30 sticky top-0">
          <div className="flex items-center gap-6 min-w-0">
            <button onClick={() => setSidebarOpen(true)} className="p-3 lg:hidden text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-2xl transition shadow-sm">
              <Menu size={24} />
            </button>
            <div className="flex flex-col">
              <h1 className="text-2xl font-black text-slate-900 capitalize truncate tracking-tight">
                {view}
              </h1>
              {currentElection && (
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest truncate max-w-[200px]">{currentElection.name}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4 shrink-0">
            {user.paymentStatus === PaymentStatus.TRIAL && (
              <button 
                onClick={() => setActiveModal('upgrade')}
                className="hidden md:flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-200 transition"
              >
                <Crown size={14} /> Trial Version
              </button>
            )}
            {managerElections.length > 0 && (
              <div className="relative group hidden sm:block">
                <select 
                  value={selectedElectionId} 
                  onChange={(e) => setSelectedElectionId(e.target.value)}
                  className="bg-slate-100 border-none rounded-2xl px-6 py-3 pr-10 text-xs font-black text-slate-600 outline-none cursor-pointer hover:bg-slate-200 transition appearance-none"
                >
                  {managerElections.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              </div>
            )}
            <div className="h-12 w-12 rounded-[20px] bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-100 border-2 border-white ring-1 ring-indigo-50">
              {user.name[0]}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-12">
          <div className="max-w-7xl mx-auto space-y-8">
            {!currentElection && view !== 'elections' ? (
              <div className="flex flex-col items-center justify-center py-24 px-6 text-center bg-white rounded-[48px] border-2 border-dashed border-slate-200 shadow-sm animate-in fade-in duration-500">
                <div className="bg-indigo-50 p-10 rounded-[40px] mb-8">
                  <Vote size={64} className="text-indigo-600" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Welcome to KuraLive</h2>
                <p className="text-slate-500 max-w-md mx-auto mb-10 font-medium leading-relaxed">
                  To begin managing your vote reporting subsystems, you first need to create your first election instance.
                </p>
                <button 
                  onClick={() => setActiveModal('election')}
                  className="bg-indigo-600 text-white px-10 py-5 rounded-[32px] font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition active:scale-95 flex items-center gap-3"
                >
                  <Plus size={20} /> Initialize First Election
                </button>
              </div>
            ) : view === 'home' ? (
              <>
                {user.paymentStatus === PaymentStatus.TRIAL && (
                  <div className="bg-amber-50 border border-amber-100 p-6 rounded-[32px] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-amber-100 p-3 rounded-2xl text-amber-600"><AlertCircle size={24}/></div>
                      <div>
                        <p className="text-sm font-black text-amber-900">Trial Version Active</p>
                        <p className="text-xs font-bold text-amber-700/60 uppercase tracking-widest mt-1">Limit: 1 Election & 5 Polling Stations</p>
                      </div>
                    </div>
                    <button onClick={() => setActiveModal('upgrade')} className="bg-amber-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-amber-100 hover:bg-amber-700 transition">Upgrade for $299</button>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Total Stations', value: stats.totalStations, icon: <MapPin size={24} className="text-blue-600" />, color: 'bg-blue-50' },
                    { label: 'Reporting Rate', value: `${((stats.reportedStations / stats.totalStations) * 100 || 0).toFixed(1)}%`, icon: <CheckCircle2 size={24} className="text-emerald-600" />, color: 'bg-emerald-50' },
                    { label: 'Total Turnout', value: `${stats.turnout.toFixed(1)}%`, icon: <Users size={24} className="text-purple-600" />, color: 'bg-purple-50' },
                    { label: 'Voters Registered', value: stats.registeredVoters.toLocaleString(), icon: <Vote size={24} className="text-indigo-600" />, color: 'bg-indigo-50' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex items-center gap-6 group hover:shadow-xl hover:shadow-slate-100 transition-all">
                      <div className={`${stat.color} p-5 rounded-[24px] shrink-0 group-hover:scale-110 transition-transform`}>{stat.icon}</div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1 truncate">{stat.label}</p>
                        <p className="text-3xl font-black text-slate-900 truncate tracking-tight">{stat.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  <div className="lg:col-span-2 bg-white p-8 lg:p-12 rounded-[48px] border border-slate-100 shadow-sm flex flex-col">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
                      <div className="flex flex-col">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Performance Matrix</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Analyzing: {currentElection.name}</p>
                      </div>
                      <button 
                        onClick={handleGenerateAI} 
                        disabled={loadingAI || chartData.length === 0}
                        className="flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-[24px] text-sm font-black hover:bg-indigo-600 transition disabled:opacity-50"
                      >
                        <BrainCircuit size={20} /> {loadingAI ? 'Analyzing...' : 'AI Insights'}
                      </button>
                    </div>
                    <div className="flex-1 min-h-[400px]">
                      {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} />
                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)' }} />
                            <Bar dataKey="votes" fill="#4f46e5" radius={[12, 12, 0, 0]} barSize={48} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center border-[3px] border-dashed border-slate-50 rounded-[40px]">
                          <BarChart3 size={64} className="text-slate-200 mb-4 opacity-30" />
                          <p className="font-black text-slate-300 uppercase tracking-widest text-sm">Awaiting Election Data</p>
                        </div>
                      )}
                    </div>
                    {smartSummary && (
                      <div className="mt-8 p-8 bg-indigo-50 rounded-[32px] border border-indigo-100 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="flex items-center gap-2 mb-4 text-indigo-600 font-black text-sm uppercase tracking-widest">
                          <BrainCircuit size={18} />
                          Smart Analysis
                        </div>
                        <p className="text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{smartSummary}</p>
                      </div>
                    )}
                  </div>
                  <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm flex flex-col">
                    <h3 className="text-xl font-black text-slate-900 mb-8">Unit Ops</h3>
                    <div className="space-y-4">
                      <button onClick={() => setActiveModal('station')} className="w-full flex items-center justify-between p-5 rounded-[24px] bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 transition font-black text-sm">
                        <span>Add Polling Station</span>
                        <Plus size={20} />
                      </button>
                      <button onClick={() => setActiveModal('agent')} className="w-full flex items-center justify-between p-5 rounded-[24px] bg-slate-50 hover:bg-purple-50 hover:text-purple-700 transition font-black text-sm">
                        <span>Assign Field Agent</span>
                        <Plus size={20} />
                      </button>
                    </div>
                    <div className="mt-auto pt-10 border-t border-slate-50">
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Quick Switch Subsystem</p>
                       <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                         {managerElections.map(e => (
                           <button 
                            key={e.id}
                            onClick={() => setSelectedElectionId(e.id)}
                            className={`w-full text-left p-4 rounded-2xl text-xs font-bold transition flex items-center justify-between ${selectedElectionId === e.id ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                           >
                             <span className="truncate pr-2">{e.name}</span>
                             {selectedElectionId === e.id && <CheckCircle2 size={14} />}
                           </button>
                         ))}
                       </div>
                    </div>
                  </div>
                </div>
              </>
            ) : view === 'elections' ? (
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Election Directory</h2>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Configure independent subsystems</p>
                  </div>
                  <button onClick={() => setActiveModal('election')} className="bg-indigo-600 text-white px-10 py-5 rounded-[32px] font-black shadow-lg hover:bg-indigo-700 transition flex items-center gap-3">
                    <Plus size={20} /> New Election
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {managerElections.map(election => (
                    <div key={election.id} className={`bg-white p-10 rounded-[48px] border-2 transition-all relative group shadow-sm hover:shadow-xl ${selectedElectionId === election.id ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-slate-100'}`}>
                      <div className="flex justify-between items-start mb-8">
                        <div className={`p-4 rounded-3xl ${selectedElectionId === election.id ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                          <Vote size={32} />
                        </div>
                        <button onClick={() => db.deleteEntity('elections', election.id)} className="p-3 text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100">
                          <Trash2 size={24} />
                        </button>
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 mb-2 truncate">{election.name}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">{election.type} • {election.date}</p>
                      <div className="space-y-4 pt-6 border-t border-slate-50">
                        <div className="flex justify-between text-xs font-black text-slate-500">
                          <span>Candidates</span>
                          <span>{election.candidates.length}</span>
                        </div>
                        <button 
                          onClick={() => setSelectedElectionId(election.id)}
                          className={`w-full py-4 rounded-2xl font-black text-sm transition ${selectedElectionId === election.id ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                        >
                          {selectedElectionId === election.id ? 'Active Subsystem' : 'Switch To Node'}
                        </button>
                      </div>
                    </div>
                  ))}
                  {managerElections.length === 0 && (
                    <div className="col-span-full py-24 bg-white rounded-[48px] border-4 border-dashed border-slate-50 flex flex-col items-center justify-center text-slate-300 font-black uppercase tracking-widest">
                      No Election Instances
                    </div>
                  )}
                </div>
              </div>
            ) : view === 'stations' ? (
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Polling Matrix</h2>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Reporting units for {currentElection.name}</p>
                  </div>
                  <button onClick={() => setActiveModal('station')} className="bg-indigo-600 text-white px-10 py-5 rounded-[32px] font-black shadow-lg hover:bg-indigo-700 transition">
                    Register Node
                  </button>
                </div>
                <div className="bg-white rounded-[48px] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
                  <table className="w-full text-left min-w-[900px]">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Identification</th>
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Unit Stats</th>
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Status</th>
                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-right">Ops</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {managerStations.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50/50 transition group">
                          <td className="px-10 py-8">
                            <p className="font-black text-slate-900 text-lg">{s.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{s.county} / {s.ward}</p>
                          </td>
                          <td className="px-10 py-8 font-black text-indigo-600 text-xl">{s.registeredVoters.toLocaleString()}</td>
                          <td className="px-10 py-8">
                            <span className={`text-[10px] font-black px-4 py-2 rounded-2xl uppercase ${s.resultsSubmitted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {s.resultsSubmitted ? 'Reported' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-10 py-8 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                              <button onClick={() => db.resetStationDetails(s.id)} className="p-3 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-2xl transition" title="Reset Station Data (Delete Results)">
                                <RotateCcw size={20} />
                              </button>
                              <button onClick={() => db.deleteEntity('stations', s.id)} className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition" title="Delete Station">
                                <Trash2 size={20} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {managerStations.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-24 text-center font-black text-slate-300 uppercase tracking-widest">No stations registered for this election</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : view === 'agents' ? (
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                   <div className="flex flex-col">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Field Ops</h2>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Operational nodes for {currentElection.name}</p>
                  </div>
                  <button onClick={() => setActiveModal('agent')} className="bg-purple-600 text-white px-10 py-5 rounded-[32px] font-black shadow-lg hover:bg-purple-700 transition">
                    Deploy Agent
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {managerAgents.map(agent => (
                    <div key={agent.id} className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm relative group">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600">
                          <Users size={32} />
                        </div>
                        <div>
                          <p className="font-black text-xl text-slate-900 leading-none mb-2">{agent.name}</p>
                          <div className="flex items-center gap-1">
                            <KeyRound size={12} className="text-slate-300" />
                            <p className="font-mono text-[10px] font-black text-indigo-600 tracking-widest">{agent.pin}</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-6 pt-6 border-t border-slate-50">
                        <div>
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Assigned Station</p>
                          <p className="font-bold text-slate-700 truncate">{db.data.stations.find(s => s.id === agent.stationId)?.name || 'Unassigned'}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => db.resetAgent(agent.id)} className="flex-1 py-4 bg-slate-50 text-slate-600 font-black rounded-2xl hover:bg-amber-50 hover:text-amber-700 transition flex items-center justify-center gap-2">
                            <RefreshCcw size={16} /> Reset
                          </button>
                          <button onClick={() => db.deleteEntity('agents', agent.id)} className="flex-1 py-4 bg-slate-50 text-slate-600 font-black rounded-2xl hover:bg-red-50 hover:text-red-700 transition flex items-center justify-center gap-2">
                            <Trash2 size={16} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {managerAgents.length === 0 && (
                    <div className="col-span-full py-24 bg-white rounded-[48px] border-4 border-dashed border-slate-50 flex flex-col items-center justify-center text-slate-300 font-black uppercase tracking-widest">
                      No Agents Assigned to this Election
                    </div>
                  )}
                </div>
              </div>
            ) : view === 'results' ? (
                <div className="space-y-8">
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Transmission Logs</h2>
                          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Official returns for {currentElection.name}</p>
                      </div>
                      <button 
                        onClick={handleExportCSV}
                        className="bg-slate-900 text-white px-8 py-4 rounded-[24px] text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition flex items-center gap-3 shadow-xl shadow-slate-200"
                      >
                        <Download size={18} /> Export CSV
                      </button>
                    </div>
                    <div className="bg-white rounded-[48px] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
                        <table className="w-full text-left min-w-[1000px]">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Reporting Unit</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Tally Details</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Deployed Agent</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Evidence</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {managerResults.map(r => {
                                    const station = managerStations.find(s => s.id === r.stationId);
                                    const agent = db.data.agents.find(a => a.id === r.agentId);
                                    return (
                                        <tr key={r.id} className="hover:bg-slate-50/50 transition group">
                                            <td className="px-10 py-8">
                                                <p className="font-black text-slate-900">{station?.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">{station?.county} / {station?.ward}</p>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="flex flex-wrap gap-2">
                                                    {(Object.entries(r.candidateVotes) as [string, number][]).map(([cid, votes]) => {
                                                        const cand = currentElection.candidates.find(c => c.id === cid);
                                                        return (
                                                            <div key={cid} className="bg-slate-50 px-3 py-1 rounded-lg text-[10px] font-black border border-slate-100">
                                                                <span className="text-slate-400">{cand?.name}:</span> <span className="text-indigo-600">{votes}</span>
                                                            </div>
                                                        );
                                                    })}
                                                    <div className="bg-red-50 px-3 py-1 rounded-lg text-[10px] font-black border border-red-100">
                                                        <span className="text-red-300">S:</span> <span className="text-red-600">{r.spoiltVotes}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
                                                        {agent?.name[0]}
                                                    </div>
                                                    <p className="text-xs font-black text-slate-700">{agent?.name || 'Unknown Agent'}</p>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="w-16 h-12 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 cursor-zoom-in relative group/img" onClick={() => window.open(r.photoUrl, '_blank')}>
                                                    <img src={r.photoUrl} className="w-full h-full object-cover" alt="Form" />
                                                    <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition">
                                                        <FileText size={16} className="text-white" />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <p className="text-xs font-bold text-slate-400 whitespace-nowrap">{new Date(r.timestamp).toLocaleString()}</p>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {managerResults.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-24 text-center font-black text-slate-300 uppercase tracking-widest">Awaiting transmissions from field units</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : view === 'settings' ? (
              <div className="space-y-12">
                <div className="flex flex-col">
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight">Control Center</h2>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Manage node subsystem & subscription</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="bg-white p-12 rounded-[48px] border border-slate-100 shadow-sm space-y-8">
                    <h3 className="text-2xl font-black text-slate-900">Node Identity</h3>
                    <div className="space-y-6">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Manager Identifier</label>
                        <p className="font-black text-xl text-slate-900 bg-slate-50 p-6 rounded-3xl">{user.email}</p>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Assigned Subsystem ID</label>
                        <p className="font-mono text-xl font-black text-indigo-600 bg-indigo-50 p-6 rounded-3xl tracking-widest">{user.subsystemId}</p>
                      </div>
                    </div>
                  </div>

                  <div className={`p-12 rounded-[48px] border shadow-sm flex flex-col justify-between ${user.paymentStatus === PaymentStatus.PAID ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`}>
                    <div>
                      <div className="flex justify-between items-start mb-8">
                        <div className={`p-4 rounded-3xl ${user.paymentStatus === PaymentStatus.PAID ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-600'}`}>
                          {user.paymentStatus === PaymentStatus.PAID ? <ShieldCheck size={32}/> : <CreditCard size={32}/>}
                        </div>
                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${user.paymentStatus === PaymentStatus.PAID ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'}`}>
                          {user.paymentStatus} ACCESS
                        </span>
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 mb-4">
                        {user.paymentStatus === PaymentStatus.PAID ? 'Enterprise Grade Subsystem' : 'Trial Configuration'}
                      </h3>
                      <p className="text-slate-500 font-medium leading-relaxed mb-8">
                        {user.paymentStatus === PaymentStatus.PAID 
                          ? 'Your account is fully activated with unlimited election nodes and polling station matrix capabilities.'
                          : 'You are currently utilizing a trial node. Upgrade to unlock unlimited reporting subsystems and full data integrity features.'}
                      </p>
                    </div>
                    {user.paymentStatus === PaymentStatus.TRIAL && (
                      <button 
                        onClick={() => setActiveModal('upgrade')}
                        className="w-full py-6 bg-slate-900 text-white font-black text-lg rounded-[32px] shadow-2xl shadow-slate-200 hover:bg-indigo-600 transition flex items-center justify-center gap-4"
                      >
                        UPGRADE FOR $299 <Crown size={24} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white p-24 rounded-[64px] border border-dashed border-slate-100 text-center flex flex-col items-center justify-center shadow-sm">
                <div className="bg-slate-50 p-12 rounded-[48px] mb-10">
                  <Settings size={64} className="text-slate-200" />
                </div>
                <h3 className="text-2xl font-black text-slate-300 uppercase tracking-[0.3em]">{view} Configuration</h3>
                <p className="text-slate-400 font-bold mt-4 uppercase tracking-widest text-sm">System configuration active for {currentElection?.name}</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MODALS */}
      {activeModal === 'upgrade' && (
        <Modal title="Activate Full Subsystem" onClose={() => setActiveModal(null)}>
          <div className="space-y-8 py-4">
            <div className="bg-indigo-50 p-10 rounded-[40px] text-center border-2 border-indigo-100">
               <Crown size={64} className="text-indigo-600 mx-auto mb-6" />
               <p className="text-4xl font-black text-slate-900 tracking-tight">$299.00</p>
               <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mt-2">One-Time Activation Fee</p>
            </div>
            
            <ul className="space-y-4">
              {[
                'Unlimited Election Nodes',
                'Unlimited Polling Stations per Election',
                'Advanced AI Analytical Matrix',
                'Full CSV & PDF Audit Exports',
                'Priority Operational Support',
                'Zero Recurring Maintenance Fees'
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-4 font-bold text-slate-600">
                  <div className="bg-emerald-100 p-1 rounded-full text-emerald-600"><CheckCircle2 size={16}/></div>
                  {feature}
                </li>
              ))}
            </ul>

            <button 
              onClick={() => { db.upgradePayment(); setActiveModal(null); }}
              className="w-full py-6 bg-indigo-600 text-white font-black text-xl rounded-[32px] shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition"
            >
              Confirm Payment & Activate
            </button>
            <p className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">Secured by KuraLive Payment Node</p>
          </div>
        </Modal>
      )}

      {activeModal === 'election' && (
        <Modal title="Initialize Election Node" onClose={() => setActiveModal(null)}>
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const candidates: Candidate[] = modalCandidates.filter(c => c.name.trim()).map((c, i) => ({ id: `c-${i}-${Date.now()}`, name: c.name, party: c.party }));
            const id = db.addElection({
              name: fd.get('name') as string,
              date: fd.get('date') as string,
              type: fd.get('location') as string,
              regions: { counties: [], constituencies: [], wards: [] },
              candidates
            });
            if (id) {
              setSelectedElectionId(id);
              setActiveModal(null);
            }
          }} className="space-y-6">
            <input name="name" required className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-lg focus:border-indigo-600 transition outline-none" placeholder="Election Instance Name (e.g. 2025 Regional)" />
            <div className="grid grid-cols-2 gap-4">
              <input name="date" type="date" required className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none" />
              <select name="location" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black outline-none appearance-none">
                <option>Country</option><option>County</option><option>Constituency</option><option>Ward</option>
              </select>
            </div>
            <div className="space-y-4 pt-4">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Candidate Roster</p>
                <button type="button" onClick={addModalCandidate} className="text-indigo-600 font-black text-[10px] bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition">+ ADD ENTRY</button>
              </div>
              <div className="space-y-3">
                {modalCandidates.map((c, i) => (
                  <div key={i} className="flex gap-2 animate-in slide-in-from-right-2 duration-200">
                    <input value={c.name} onChange={(e) => updateModalCandidate(i, 'name', e.target.value)} required className="flex-1 p-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold outline-none" placeholder="Name" />
                    <input value={c.party} onChange={(e) => updateModalCandidate(i, 'party', e.target.value)} required className="flex-1 p-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold outline-none" placeholder="Party" />
                    {modalCandidates.length > 1 && (
                        <button type="button" onClick={() => removeModalCandidate(i)} className="p-2 text-slate-300 hover:text-red-500"><MinusCircle size={20} /></button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <button className="w-full py-6 bg-indigo-600 text-white font-black rounded-[28px] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition active:scale-95 mt-4">Activate Subsystem Node</button>
          </form>
        </Modal>
      )}

      {activeModal === 'station' && currentElection && (
        <Modal title="Register Polling Node" onClose={() => setActiveModal(null)}>
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            db.addStation({
              electionId: selectedElectionId,
              name: fd.get('name') as string,
              county: fd.get('county') as string,
              constituency: fd.get('constituency') as string,
              ward: fd.get('ward') as string,
              registeredVoters: parseInt(fd.get('voters') as string) || 0
            });
            setActiveModal(null);
          }} className="space-y-4">
             <div className="bg-indigo-50 p-4 rounded-2xl mb-4">
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Node Instance</p>
                <p className="text-sm font-black text-indigo-900 truncate">{currentElection.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input name="county" required className="p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-indigo-600 transition" placeholder="County" />
              <input name="constituency" required className="p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-indigo-600 transition" placeholder="Constituency" />
            </div>
            <input name="ward" required className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-indigo-600 transition" placeholder="Ward" />
            <input name="voters" type="number" required className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-indigo-600 transition" placeholder="Registered Voters" />
            <input name="name" required className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black outline-none focus:border-indigo-600 transition" placeholder="Polling Station Name" />
            <button className="w-full py-5 bg-indigo-600 text-white font-black rounded-[28px] mt-4">Deploy Unit</button>
          </form>
        </Modal>
      )}

      {activeModal === 'agent' && currentElection && (
        <Modal title="Onboard Operational Agent" onClose={() => setActiveModal(null)}>
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            db.addAgent({
              name: fd.get('name') as string,
              pin: fd.get('passkey') as string,
              stationId: fd.get('stationId') as string
            });
            setActiveModal(null);
          }} className="space-y-6">
            <input name="name" required className="w-full p-5 bg-slate-50 border-2 rounded-[24px] font-black text-lg outline-none focus:border-indigo-600 transition" placeholder="Agent Full Name" />
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-4">6-Digit Passkey</label>
                <input name="passkey" required maxLength={6} className="w-full p-5 bg-slate-50 border-2 rounded-[24px] text-center text-4xl font-black tracking-widest outline-none focus:border-indigo-600 transition" placeholder="000000" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-4">Station Link ({currentElection.name})</label>
              <select name="stationId" className="w-full p-5 bg-slate-50 border-2 rounded-[24px] font-black appearance-none outline-none focus:border-indigo-600 transition">
                {managerStations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                {managerStations.length === 0 && <option disabled>No stations registered</option>}
              </select>
            </div>
            <button className="w-full py-6 bg-indigo-600 text-white font-black rounded-[28px] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition active:scale-95">Issue Secure Credentials</button>
          </form>
        </Modal>
      )}
    </div>
  );
};

// --- AGENT DASHBOARD ---

const AgentDashboard: React.FC<{ 
  user: User; 
  db: ReturnType<typeof useKuraDB>; 
  onLogout: () => void 
}> = ({ user, db, onLogout }) => {
  const [step, setStep] = useState<'home' | 'details' | 'results'>('home');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const agent = db.data.agents.find(a => a.id === user.id);
  const station = db.data.stations.find(s => s.id === agent?.stationId);
  const election = db.data.elections.find(e => e.id === station?.electionId);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCapturedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleResultSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const candidateVotes: Record<string, number> = {};
    election?.candidates.forEach(c => {
      candidateVotes[c.id] = parseInt(formData.get(`votes_${c.id}`) as string || '0');
    });
    const spoilt = parseInt(formData.get('spoilt') as string || '0');
    const rejected = parseInt(formData.get('rejected') as string || '0');
    const totalVotes = Object.values(candidateVotes).reduce((a, b) => a + b, 0) + spoilt + rejected;
    if (totalVotes > (station?.registeredVoters || 0) * 1.1) {
      return alert("PROTOCOL ALERT: Tally exceeds registry buffer by more than 10%. Please verify entries.");
    }
    if (!capturedImage) return alert("Photo evidence required for transmission integrity.");
    db.submitResult({
      stationId: station!.id,
      agentId: user.id,
      candidateVotes,
      spoiltVotes: spoilt,
      rejectedVotes: rejected,
      photoUrl: capturedImage
    });
    setStep('home');
    alert("TRANSMISSION SUCCESS: Election results have been securely synced with the manager node.");
  };

  if (!station || !election) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8 text-center">
        <div className="max-w-md space-y-8">
            <div className="bg-red-500/10 p-10 rounded-[48px] border border-red-500/20 inline-block">
                <AlertCircle size={64} className="text-red-500 mx-auto" />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight">Assignment Error</h2>
            <p className="text-slate-400 font-medium leading-relaxed">Identity confirmed, but your tactical assignment is missing. Contact your election manager to link your account to a polling node.</p>
            <button onClick={onLogout} className="px-10 py-5 bg-white text-slate-900 font-black rounded-3xl hover:bg-slate-100 transition">Return to Auth</button>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-indigo-600 text-white p-6 sm:p-10 flex justify-between items-center shadow-2xl relative z-10">
        <div className="flex items-center gap-4">
            <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-md">
                <ShieldCheck size={28} />
            </div>
            <div>
                <h1 className="text-xl font-black tracking-tight leading-none">Field Ops Node</h1>
                <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mt-1.5">{station.name}</p>
            </div>
        </div>
        <button onClick={onLogout} className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition backdrop-blur-md border border-white/10">
            <LogOut size={24} />
        </button>
      </header>

      <main className="flex-1 p-6 sm:p-12 max-w-xl mx-auto w-full space-y-8 overflow-y-auto">
        {step === 'home' && (
          <div className="space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="bg-white p-10 rounded-[48px] border shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-full transition-transform group-hover:scale-125 duration-700"></div>
              <p className="text-[10px] font-black text-indigo-600 mb-4 tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                ACTIVE PROTOCOL: {election.name}
              </p>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-2">Polling Unit Hub</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{station.county} / {station.constituency}</p>
            </div>

            <div className="grid gap-6">
              <button 
                disabled={station.detailsSubmitted} 
                onClick={() => setStep('details')} 
                className={`p-10 rounded-[40px] border-2 font-black text-left flex items-center justify-between group transition-all duration-300 ${station.detailsSubmitted ? 'bg-emerald-50 border-emerald-100 text-emerald-700 opacity-80' : 'bg-white border-indigo-600 text-indigo-700 shadow-xl shadow-indigo-100 active:scale-95'}`}
              >
                <div>
                    <h3 className="text-xl leading-none">Node Setup</h3>
                    <p className="text-[10px] uppercase tracking-widest mt-2 opacity-60">{station.detailsSubmitted ? 'Verified' : 'Verify Registry'}</p>
                </div>
                {station.detailsSubmitted ? <CheckCircle2 size={32} /> : <ChevronRight size={32} className="group-hover:translate-x-2 transition-transform" />}
              </button>

              <button 
                disabled={station.resultsSubmitted} 
                onClick={() => setStep('results')} 
                className={`p-10 rounded-[40px] border-2 font-black text-left flex items-center justify-between group transition-all duration-300 ${station.resultsSubmitted ? 'bg-emerald-50 border-emerald-100 text-emerald-700 opacity-80' : 'bg-white border-emerald-600 text-emerald-700 shadow-xl shadow-emerald-100 active:scale-95'}`}
              >
                <div>
                    <h3 className="text-xl leading-none">Transmit Tally</h3>
                    <p className="text-[10px] uppercase tracking-widest mt-2 opacity-60">{station.resultsSubmitted ? 'Transmission Confirmed' : 'Enter Returns'}</p>
                </div>
                {station.resultsSubmitted ? <CheckCircle2 size={32} /> : <ChevronRight size={32} className="group-hover:translate-x-2 transition-transform" />}
              </button>
            </div>

            <div className="bg-slate-100 p-8 rounded-[40px] text-center border border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Authenticated Identity</p>
                <p className="text-sm font-black text-slate-600">{user.name}</p>
            </div>
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-8 animate-in slide-in-from-right duration-500">
            <button onClick={() => setStep('home')} className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest hover:gap-4 transition-all">
                <ChevronRight size={20} className="rotate-180" /> Cancel Verification
            </button>
            <div className="bg-white p-10 rounded-[48px] shadow-sm space-y-8 border border-slate-100">
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Node Verification</h3>
                <div className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-3xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Station Identity</p>
                        <p className="font-black text-xl text-slate-900">{station.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div className="bg-slate-50 p-6 rounded-3xl">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Voter Registry</p>
                            <p className="font-black text-xl text-slate-900">{station.registeredVoters.toLocaleString()}</p>
                        </div>
                         <div className="bg-slate-50 p-6 rounded-3xl">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Protocol</p>
                            <p className="font-black text-xl text-slate-900">{election.type}</p>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={() => { 
                        db.data.stations = db.data.stations.map(s => s.id === station.id ? {...s, detailsSubmitted: true} : s); 
                        setStep('home'); 
                    }} 
                    className="w-full py-6 bg-indigo-600 text-white font-black text-xl rounded-[32px] shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition"
                >
                    Confirm & Verify Node
                </button>
            </div>
          </div>
        )}

        {step === 'results' && (
          <form onSubmit={handleResultSubmit} className="space-y-10 animate-in slide-in-from-right duration-500 pb-20">
            <button type="button" onClick={() => setStep('home')} className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest hover:gap-4 transition-all">
                <ChevronRight size={20} className="rotate-180" /> Cancel Transmission
            </button>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Reporting Protocol</h2>
            
            <div className="space-y-8">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Official Returns</h3>
              {election.candidates.map(c => (
                <div key={c.id} className="space-y-3">
                  <div className="flex justify-between items-center px-4">
                      <label className="font-black text-sm text-slate-900 tracking-tight">{c.name}</label>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 py-1 bg-slate-100 rounded-md">{c.party}</span>
                  </div>
                  <input 
                    name={`votes_${c.id}`} 
                    type="number" 
                    required 
                    min="0"
                    className="w-full p-6 text-4xl font-black bg-white rounded-[32px] border-[3px] border-slate-50 shadow-inner focus:border-indigo-600 outline-none transition text-slate-900" 
                    placeholder="0"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-8 pt-10 border-t-4 border-dashed border-slate-100">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Integrity Matrix</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-800 ml-4">Spoilt</label>
                  <input name="spoilt" type="number" required min="0" className="w-full p-6 text-2xl font-black bg-white rounded-3xl border-2 text-center" placeholder="0" />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-800 ml-4">Rejected</label>
                  <input name="rejected" type="number" required min="0" className="w-full p-6 text-2xl font-black bg-white rounded-3xl border-2 text-center" placeholder="0" />
                </div>
              </div>
            </div>

            <div className="space-y-6 pt-10">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Evidence Log</h3>
              <input type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" id="camera" />
              <label htmlFor="camera" className="block w-full h-80 border-4 border-dashed border-slate-200 rounded-[56px] flex flex-col items-center justify-center cursor-pointer overflow-hidden bg-slate-50 group hover:bg-white hover:border-indigo-200 transition-all shadow-inner">
                {capturedImage ? (
                    <div className="relative w-full h-full">
                        <img src={capturedImage} className="w-full h-full object-cover" alt="Form Scan" />
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-black uppercase text-xs tracking-widest">Retake Image</div>
                    </div>
                ) : (
                    <>
                        <div className="p-8 bg-white rounded-[32px] text-indigo-600 shadow-2xl mb-6 group-hover:scale-110 transition-transform">
                            <Camera size={48} />
                        </div>
                        <p className="font-black text-slate-900 uppercase tracking-widest text-sm">Scan Form 34A</p>
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2">Physical proof mandatory</p>
                    </>
                )}
              </label>
            </div>

            <button 
                type="submit" 
                className="w-full py-8 bg-slate-900 text-white font-black text-2xl rounded-[40px] shadow-2xl shadow-slate-200 hover:bg-indigo-600 transition flex items-center justify-center gap-4 active:scale-[0.98]"
            >
                EXECUTE TRANSMISSION <ChevronRight size={32} />
            </button>
          </form>
        )}
      </main>
    </div>
  );
};

const AuthPage: React.FC<{ 
  role: UserRole; 
  onLogin: (email: string, role: UserRole, pin?: string) => void; 
  onCancel: () => void 
}> = ({ role, onLogin, onCancel }) => {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white p-12 sm:p-20 rounded-[64px] shadow-2xl relative border border-slate-100 animate-in fade-in zoom-in duration-500 overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600 group-hover:h-3 transition-all"></div>
        <button onClick={onCancel} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 transition"><X size={32} /></button>
        <div className="text-center mb-16">
          <div className="bg-indigo-600 w-24 h-24 rounded-[32px] text-white flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-100 ring-4 ring-white"><Vote size={48} /></div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2">{role === UserRole.MANAGER ? 'Manager Hub' : 'Agent Access'}</h2>
          <div className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            <ShieldCheck size={14} className="text-indigo-600" />
            Secure Authentication active
          </div>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onLogin(email, role, pin); }} className="space-y-10">
          {role === UserRole.MANAGER ? 
            <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Identifier</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full p-6 rounded-[32px] border-[3px] border-slate-50 focus:border-indigo-600 outline-none transition font-black text-xl bg-slate-50/50" placeholder="admin@node.io" />
            </div> :
            <div className="space-y-4 text-center">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tactical Passkey</label>
                <input type="password" required value={pin} onChange={e => setPin(e.target.value)} className="w-full p-8 rounded-[40px] border-[3px] border-slate-50 focus:border-indigo-600 outline-none transition text-center text-6xl tracking-[0.4em] font-black bg-slate-50/50" placeholder="••••" maxLength={6} />
            </div>
          }
          <button className="w-full py-8 bg-slate-900 text-white font-black rounded-[40px] text-2xl shadow-2xl shadow-slate-200 hover:bg-indigo-600 transition active:scale-[0.98]">Verify & Connect</button>
        </form>
        <div className="mt-16 pt-10 border-t border-slate-50 flex justify-center gap-6 grayscale opacity-30">
            <ShieldCheck size={24} />
            <KeyRound size={24} />
            <Settings size={24} />
        </div>
      </div>
      <p className="mt-12 text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">KuraLive Protocol v2.5.1</p>
    </div>
  );
};

export default function App() {
  const db = useKuraDB();
  const [authView, setAuthView] = useState<UserRole | null>(null);
  if (!db.data.activeUser) {
    if (authView) return <AuthPage role={authView} onLogin={db.login} onCancel={() => setAuthView(null)} />;
    return <LandingPage onLogin={setAuthView} />;
  }
  return db.data.activeUser.role === UserRole.MANAGER ? <ManagerDashboard user={db.data.activeUser} db={db} onLogout={db.logout} /> : <AgentDashboard user={db.data.activeUser} db={db} onLogout={db.logout} />;
}
