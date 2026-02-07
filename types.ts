
export enum UserRole {
  MANAGER = 'MANAGER',
  AGENT = 'AGENT'
}

export enum PaymentStatus {
  TRIAL = 'TRIAL',
  PAID = 'PAID'
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  subsystemId: string;
  paymentStatus: PaymentStatus;
  name: string;
}

export interface Election {
  id: string;
  managerId: string;
  name: string;
  date: string;
  type: string;
  regions: {
    counties: string[];
    constituencies: string[];
    wards: string[];
  };
  candidates: Candidate[];
}

export interface Candidate {
  id: string;
  name: string;
  party: string;
  symbol?: string;
}

export interface PollingStation {
  id: string;
  electionId: string;
  county: string;
  constituency: string;
  ward: string;
  name: string;
  registeredVoters: number;
  detailsSubmitted: boolean;
  resultsSubmitted: boolean;
}

export interface Agent {
  id: string;
  managerId: string;
  stationId: string;
  name: string;
  pin: string;
  status: 'active' | 'inactive';
}

export interface Result {
  id: string;
  stationId: string;
  agentId: string;
  candidateVotes: Record<string, number>; // CandidateId -> Votes
  spoiltVotes: number;
  rejectedVotes: number;
  photoUrl: string;
  timestamp: string;
  // Computed fields (calculated at runtime)
  totalValidVotes?: number;
  totalCast?: number;
  turnoutPercentage?: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
  details: string;
}
