import { useState, useEffect } from 'react';
import { db, DatabaseSyncInfo } from '../services/storage';

export function useDatabaseStatus(): DatabaseSyncInfo {
  const [status, setStatus] = useState<DatabaseSyncInfo>(() => db.getSyncInfo());

  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      setStatus(db.getSyncInfo());
    });

    return () => unsubscribe();
  }, []);

  return status;
}
