import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

interface GlobalStore {
  [key: string]: unknown;
}

interface GlobalStoreContextValue {
  store: GlobalStore;
  setStore: (key: string, value: unknown) => void;
  getStore: <T>(key: string) => T;
  removeStore: (key: string) => void;
  clearStore: () => void;
}

const GlobalStoreContext = createContext<GlobalStoreContextValue | undefined>(
  undefined
);

interface GlobalStoreProviderProps {
  children: ReactNode;
  initialStore?: GlobalStore;
}

export function GlobalStoreProvider({
  children,
  initialStore = {},
}: GlobalStoreProviderProps) {
  const [store, setStoreState] = useState<GlobalStore>(initialStore);

  const setStore = useCallback((key: string, value: unknown) => {
    setStoreState((prev) => {
      if (Object.is(prev[key], value)) return prev;
      return { ...prev, [key]: value };
    });
  }, []);

  const getStore = useCallback(
    <T,>(key: string): T => {
      return store[key] as T;
    },
    [store],
  );

  const removeStore = useCallback((key: string) => {
    setStoreState((prev) => {
      if (!(key in prev)) return prev;
      const newStore = { ...prev };
      delete newStore[key];
      return newStore;
    });
  }, []);

  const clearStore = useCallback(() => {
    setStoreState((prev) => (Object.keys(prev).length === 0 ? prev : {}));
  }, []);

  const value: GlobalStoreContextValue = useMemo(
    () => ({
      store,
      setStore,
      getStore,
      removeStore,
      clearStore,
    }),
    [store, setStore, getStore, removeStore, clearStore],
  );

  return (
    <GlobalStoreContext.Provider value={value}>
      {children}
    </GlobalStoreContext.Provider>
  );
}

export function useGlobalStore(): GlobalStoreContextValue {
  const context = useContext(GlobalStoreContext);

  if (context === undefined) {
    throw new Error("useGlobalStore must be used within a GlobalStoreProvider");
  }

  return context;
}
