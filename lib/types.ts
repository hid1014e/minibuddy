export type ChallengeStatus = 'active' | 'completed';
export type DayStatus = 'done' | 'not_done';
export type ReactionType = 'clap';

export type MiniChallenge = {
  id: string;
  owner_user_id: string;
  theme: string | null;
  started_at: string;
  completed_at: string | null;
  status: ChallengeStatus;
};

export type MiniChallengeDay = {
  id: string;
  mini_challenge_id: string;
  day_number: number;
  plan: string;
  status: DayStatus;
  next_step: string | null;
  updated_at: string;
};
