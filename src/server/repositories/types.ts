import type {
  AssetClass,
  BankSnapshot,
  CryptoSnapshot,
  ISODate,
  InvestmentPosition,
  Sourced,
  Transaction,
} from "@/domain/types";

/**
 * Contratos da camada de dados. Os serviços só conhecem estas interfaces;
 * quem decide de onde vem o dado (API ao vivo, demo ou, no futuro,
 * Firebase) é a fábrica em ./index.ts.
 */

export interface BankRepository {
  getSnapshot(): Promise<Sourced<BankSnapshot>>;
}

export interface CryptoRepository {
  getSnapshot(): Promise<Sourced<CryptoSnapshot>>;
}

export interface InvestmentsRepository {
  getPositions(): Promise<Sourced<InvestmentPosition[]>>;
}

/** Foto diária do patrimônio — o que o Firebase vai guardar para gráficos de evolução. */
export type DailySnapshot = {
  date: ISODate;
  netWorth: number;
  byClass: Partial<Record<AssetClass, number>>;
  checkingBalance: number | null;
};

/**
 * Histórico. Hoje é um no-op (sem banco de dados); com o Firebase, a
 * implementação passa a gravar/ler do Firestore sem mudar os serviços.
 */
export interface HistoryRepository {
  readonly enabled: boolean;
  saveDailySnapshot(snapshot: DailySnapshot): Promise<void>;
  getSnapshots(from: ISODate, to: ISODate): Promise<DailySnapshot[]>;
  /** Guarda transações para manter histórico além dos ~12 meses do Open Finance. */
  archiveTransactions(transactions: Transaction[]): Promise<void>;
  getArchivedTransactions(from: ISODate, to: ISODate): Promise<Transaction[]>;
}

export type Repositories = {
  bank: BankRepository;
  crypto: CryptoRepository;
  investments: InvestmentsRepository;
  history: HistoryRepository;
};
