export interface LocalNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type?: string;
  listing_id?: string;
  created_at: string;
  read?: boolean;
}

const KEY = 'dev_notifications_v1';

function readAll(): LocalNotification[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocalNotification[];
  } catch (e) {
    console.warn('Failed to read local notifications', e);
    return [];
  }
}

function writeAll(items: LocalNotification[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('localNotificationsUpdated'));
  } catch (e) {
    console.warn('Failed to write local notifications', e);
  }
}

async function createLocalNotification(payload: {
  user_id: string;
  title: string;
  message: string;
  type?: string;
  food_listing_id?: string;
}) {
  try {
    const items = readAll();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const note: LocalNotification = {
      id,
      user_id: payload.user_id,
      title: payload.title,
      message: payload.message,
      type: payload.type || 'generic',
      listing_id: payload.food_listing_id,
      created_at: new Date().toISOString(),
      read: false,
    };
    items.unshift(note);
    writeAll(items);
    return { data: note, error: null } as const;
  } catch (e) {
    console.error('createLocalNotification failed', e);
    return { data: null, error: e } as const;
  }
}

function fetchNotificationsForUser(userId: string) {
  try {
    const items = readAll().filter(n => n.user_id === userId);
    return { data: items, error: null } as const;
  } catch (e) {
    return { data: [], error: e } as const;
  }
}

function markAsRead(notificationId: string) {
  try {
    const items = readAll();
    const idx = items.findIndex(i => i.id === notificationId);
    if (idx === -1) return { data: null, error: new Error('not found') } as const;
    items[idx].read = true;
    writeAll(items);
    return { data: items[idx], error: null } as const;
  } catch (e) {
    return { data: null, error: e } as const;
  }
}

function clearAll() {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new Event('localNotificationsUpdated'));
  } catch (e) {
    console.warn('clearAll notifications failed', e);
  }
}

export default {
  createLocalNotification,
  fetchNotificationsForUser,
  markAsRead,
  clearAll,
};
