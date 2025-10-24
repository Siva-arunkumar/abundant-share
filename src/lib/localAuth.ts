const USERS_KEY = 'dev_users_v1';
const SESSIONS_KEY = 'dev_sessions_v1';

type LocalUser = {
  id: string;
  email: string;
  password: string; // stored in cleartext for dev only
  profile: any;
};

function readUsers(): LocalUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocalUser[];
  } catch (e) { return []; }
}

function writeUsers(users: LocalUser[]) {
  try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); } catch (e) {}
}

function readSessions(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '{}'); } catch (e) { return {}; }
}

function writeSessions(sessions: Record<string, string>) { try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions)); } catch (e) {} }

export async function localSignUp(email: string, password: string, profileData: any = {}) {
  const users = readUsers();
  const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (found) return { error: { message: 'Email already in use' } };
  const id = `local-user-${Date.now()}-${Math.floor(Math.random()*1000)}`;
  const user = { id, email, password, profile: { id: `local-profile-${id}`, user_id: id, full_name: profileData.full_name || '', phone: profileData.phone || '', role: (profileData.role || 'user'), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...profileData } };
  users.push(user);
  writeUsers(users);
  // create session
  const sessions = readSessions();
  sessions[id] = id;
  writeSessions(sessions);
  return { data: { user: { id: user.id, email: user.email }, session: { user: { id: user.id, email: user.email } }, profile: user.profile } };
}

export async function localSignIn(email: string, password: string) {
  const users = readUsers();
  const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!found) return { error: { message: 'Invalid credentials' } };
  const sessions = readSessions();
  sessions[found.id] = found.id;
  writeSessions(sessions);
  return { data: { user: { id: found.id, email: found.email }, session: { user: { id: found.id, email: found.email } }, profile: found.profile } };
}

export async function localSignOut(userId: string) {
  const sessions = readSessions();
  delete sessions[userId];
  writeSessions(sessions);
  return {};
}

export async function localGetProfile(userId: string) {
  const users = readUsers();
  const found = users.find(u => u.id === userId);
  return found ? found.profile : null;
}

export default { localSignUp, localSignIn, localSignOut, localGetProfile };
