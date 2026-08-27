import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  animals as seedAnimals,
  allPredictions,
  buildAlerts,
  defaultRecommendations,
  type Animal,
  type Recommendation,
} from "./mock-data";

export type Role = "Farmer" | "Veterinarian" | "Cooperative Admin" | "Animal Health Authority";
export type DataSource = "mock" | "live";

export type LabRecord = {
  id: string;
  animal_id: string;
  type: "SCC lab result" | "Treatment";
  value: string;
  date: string;
  note: string;
};

type Store = {
  role: Role;
  setRole: (r: Role) => void;
  signedIn: boolean;
  setSignedIn: (v: boolean) => void;
  dataSource: DataSource;
  setDataSource: (d: DataSource) => void;
  animals: Animal[];
  upsertAnimal: (a: Animal) => void;
  predictions: ReturnType<typeof allPredictions>;
  alerts: ReturnType<typeof buildAlerts>;
  recommendations: Recommendation[];
  setRecommendations: (r: Recommendation[]) => void;
  records: LabRecord[];
  addRecords: (r: LabRecord[]) => void;
};

const Ctx = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("Farmer");
  const [signedIn, setSignedIn] = useState(false);
  const [dataSource, setDataSource] = useState<DataSource>("mock");
  const [animals, setAnimals] = useState<Animal[]>(seedAnimals);
  const [recommendations, setRecommendations] = useState<Recommendation[]>(defaultRecommendations);
  const [records, setRecords] = useState<LabRecord[]>([]);

  const predictions = useMemo(() => allPredictions(dataSource === "live"), [dataSource]);
  const alerts = useMemo(() => buildAlerts(predictions), [predictions]);

  const value: Store = {
    role,
    setRole,
    signedIn,
    setSignedIn,
    dataSource,
    setDataSource,
    animals,
    upsertAnimal: (a) =>
      setAnimals((prev) => {
        const i = prev.findIndex((x) => x.id === a.id);
        if (i === -1) return [...prev, a];
        const next = [...prev];
        next[i] = a;
        return next;
      }),
    predictions,
    alerts,
    recommendations,
    setRecommendations,
    records,
    addRecords: (r) => setRecords((prev) => [...r, ...prev]),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside AppStoreProvider");
  return v;
}
