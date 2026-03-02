import { useEffect } from 'react';
import { useStore } from '../../lib/store';
import { auth, rtdb } from '../../lib/firebase';
import { signInAnonymously } from 'firebase/auth';
import { ref, onValue, set, onDisconnect } from 'firebase/database';
import { useLocation } from '../../hooks/useLocation';

export function SessionManager() {
  const user = useStore(state => state.user);
  const setUser = useStore(state => state.setUser);
  const crew = useStore(state => state.crew);
  const setCrew = useStore(state => state.setCrew);
  const setMembers = useStore(state => state.setMembers);
  
  const location = useLocation();

  // 1. Auth Init
  useEffect(() => {
    if (!auth) {
      // Mock User for Sim Mode if Firebase missing
      setUser({
        uid: 'sim-user-1',
        displayName: 'Racer X',
        avatarColor: '#00ffcc',
        isAnonymous: true,
        createdAt: Date.now()
      });
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      if (u) {
        setUser({
          uid: u.uid,
          displayName: u.displayName || `Driver ${u.uid.slice(0,4)}`,
          avatarColor: '#00ffcc',
          isAnonymous: u.isAnonymous,
          createdAt: parseInt(u.metadata.creationTime || '0')
        });
      } else {
        await signInAnonymously(auth);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Location Sync (Realtime DB)
  useEffect(() => {
    if (!user || !crew || !location || !rtdb) return;

    const userRef = ref(rtdb, `sessions/${crew.id}/${user.uid}`);
    
    // Update my position
    set(userRef, {
      ...location,
      displayName: user.displayName,
      lastSeen: Date.now()
    });

    // Remove on disconnect
    onDisconnect(userRef).remove();

  }, [location, crew, user]);

  // 3. Listen for Crew Updates
  useEffect(() => {
    if (!crew || !rtdb) return;

    const sessionRef = ref(rtdb, `sessions/${crew.id}`);
    const unsubscribe = onValue(sessionRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const newMembers: any = {};
        Object.entries(data).forEach(([uid, memberData]: [string, any]) => {
          if (uid !== user?.uid) {
            newMembers[uid] = {
              uid,
              displayName: memberData.displayName,
              location: {
                lat: memberData.lat,
                lng: memberData.lng,
                heading: memberData.heading,
                speed: memberData.speed,
                timestamp: memberData.timestamp
              },
              lastSeen: memberData.lastSeen,
              status: (Date.now() - memberData.lastSeen > 10000) ? 'offline' : 'online'
            };
          }
        });
        setMembers(newMembers);
      } else {
        setMembers({});
      }
    });

    return () => unsubscribe();
  }, [crew]);

  return null; // Headless component
}
