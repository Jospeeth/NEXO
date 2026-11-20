import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { loadAccounts } from '../accounts/repository';
import type { SavedAccount } from '../accounts/account';
import { loadAllMovements, type Movement } from './repository';

interface Ledger {
  accounts: SavedAccount[];
  movements: Movement[];
}

export function useLedger() {
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [failed, setFailed] = useState(false);
  const refresh = useCallback(async (active: () => boolean = () => true) => {
    try {
      const accounts = await loadAccounts();
      const movements = accounts.length > 0 ? await loadAllMovements() : [];
      if (active()) {
        setLedger({ accounts, movements });
        setFailed(false);
      }
    } catch {
      if (active()) setFailed(true);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    void refresh(() => active);
    return () => { active = false; };
  }, [refresh]));

  return { ledger, failed, refresh };
}
