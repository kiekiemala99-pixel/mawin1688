import { create } from "zustand";
import {
  createWallet,
  getAccount,
  placeFootballBet,
  placeFootballSlip as postFootballSlip,
  placeLotteryBet,
  placeLotterySlip as postLotterySlip,
  requestDeposit,
  requestWithdraw,
  reviewCashTxn,
  settleDueBets,
  type AccountView,
  type BetView,
  type TxnView,
  type WalletView,
} from "./wallet-server";

export type User = {
  username: string;
  phone: string;
  balance: number;
  bankName: string;
  bankAccount: string;
  isStaff: boolean;
  turnoverNeed: number;
  turnoverDone: number;
  turnoverRemain: number;
};

export type LotteryBet = {
  kind: "lottery";
  id: string;
  marketId: string;
  roundKey: string;
  marketName: string;
  play: string;
  number: string;
  rate: number;
  stake: number;
  status: "pending" | "won" | "lost" | "push";
  payout: number;
  createdAt: number;
};

export type FootballBet = {
  kind: "football";
  id: string;
  matchId: string;
  label: string;
  market: "1x2" | "hdp" | "ou";
  pick: string;
  line?: number;
  odds: number;
  stake: number;
  status: "pending" | "won" | "lost" | "push";
  payout: number;
  createdAt: number;
};

export type SlotBet = {
  kind: "slot";
  id: string;
  label: string;
  stake: number;
  status: "pending" | "won" | "lost" | "push";
  payout: number;
  createdAt: number;
};

export type MiniBet = {
  kind: "mini";
  id: string;
  label: string;
  stake: number;
  status: "pending" | "won" | "lost" | "push";
  payout: number;
  createdAt: number;
};

export type Bet = LotteryBet | FootballBet | SlotBet | MiniBet;
export type Txn = TxnView;

function toUser(w: WalletView): User {
  return {
    username: w.username,
    phone: w.phone,
    balance: w.balance,
    bankName: w.bankName,
    bankAccount: w.bankAccount,
    isStaff: w.isStaff,
    turnoverNeed: w.turnoverNeed,
    turnoverDone: w.turnoverDone,
    turnoverRemain: w.turnoverRemain,
  };
}

function toBet(row: BetView): Bet {
  const p = row.payload;
  if (row.kind === "lottery") {
    return {
      kind: "lottery",
      id: row.id,
      marketId: String(p.marketId ?? ""),
      roundKey: String(p.roundKey ?? ""),
      marketName: String(p.marketName ?? ""),
      play: String(p.play ?? ""),
      number: String(p.number ?? ""),
      rate: Number(p.rate ?? 0),
      stake: row.stake,
      status: row.status,
      payout: row.payout,
      createdAt: row.createdAt,
    };
  }
  if (row.kind === "slot") {
    return {
      kind: "slot",
      id: row.id,
      label: String(p.label ?? "สล็อต"),
      stake: row.stake,
      status: row.status,
      payout: row.payout,
      createdAt: row.createdAt,
    };
  }
  if (row.kind === "mini") {
    return {
      kind: "mini",
      id: row.id,
      label: String(p.label ?? "มินิเกม"),
      stake: row.stake,
      status: row.status,
      payout: row.payout,
      createdAt: row.createdAt,
    };
  }
  return {
    kind: "football",
    id: row.id,
    matchId: String(p.matchId ?? ""),
    label: String(p.label ?? ""),
    market: (p.market as FootballBet["market"]) ?? "1x2",
    pick: String(p.pick ?? ""),
    line: p.line === undefined ? undefined : Number(p.line),
    odds: Number(p.odds ?? 0),
    stake: row.stake,
    status: row.status,
    payout: row.payout,
    createdAt: row.createdAt,
  };
}

type Snapshot = AccountView;

let bootSnap: Snapshot | null = null;

function apply(set: (p: Partial<State>) => void, snap: Snapshot) {
  bootSnap = snap;
  set({
    hydrated: true,
    wallet: snap.wallet,
    bets: snap.bets.map(toBet),
    txns: snap.txns,
  });
}

function errMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  return "ทำรายการไม่สำเร็จ";
}

type State = {
  hydrated: boolean;
  wallet: WalletView | null;
  bets: Bet[];
  txns: Txn[];
  setHydrated: () => void;
  hydrateFromServer: (snap: AccountView) => void;
  refresh: () => Promise<string | null>;
  registerProfile: (u: { username: string; phone: string; bankName: string; bankAccount: string }) => Promise<string | null>;
  deposit: (amount: number, method: string, slipData: string, note: string) => Promise<string | null>;
  withdraw: (amount: number) => Promise<string | null>;
  reviewTxn: (id: string, action: "approve" | "reject") => Promise<string | null>;
  placeLottery: (input: {
    marketId: string;
    roundKey: string;
    marketName: string;
    play: "3top" | "3toad" | "2top" | "2bottom" | "runTop" | "runBottom";
    number: string;
    rate: number;
    stake: number;
  }) => Promise<string | null>;
  placeLotterySlip: (
    items: Array<{
      marketId: string;
      roundKey: string;
      marketName: string;
      play: "3top" | "3toad" | "2top" | "2bottom" | "runTop" | "runBottom";
      number: string;
      rate: number;
      stake: number;
    }>,
  ) => Promise<string | null>;
  placeFootball: (input: {
    matchId: string;
    label: string;
    market: "1x2" | "hdp" | "ou";
    pick: "home" | "draw" | "away" | "over" | "under";
    line?: number;
    odds: number;
    stake: number;
  }) => Promise<string | null>;
  placeFootballSlip: (
    items: Array<{
      matchId: string;
      label: string;
      market: "1x2" | "hdp" | "ou";
      pick: "home" | "draw" | "away" | "over" | "under";
      line?: number;
      odds: number;
      stake: number;
    }>,
  ) => Promise<string | null>;
  settle: () => Promise<void>;
  clear: () => void;
};

export const useStore = create<State>((set) => ({
  hydrated: false,
  wallet: null,
  bets: [],
  txns: [],
  setHydrated: () => set({ hydrated: true }),
  hydrateFromServer: (snap) => apply(set, snap),
  clear: () => set({ wallet: null, bets: [], txns: [], hydrated: true }),
  refresh: async () => {
    try {
      const snap =
        typeof window === "undefined"
          ? await getAccount()
          : await Promise.race([
              getAccount(),
              new Promise<never>((_, reject) => {
                window.setTimeout(() => reject(new Error("โหลดกระเป๋านานเกินไป")), 8000);
              }),
            ]);
      apply(set, snap);
      return null;
    } catch (e) {
      set({ hydrated: true, wallet: null, bets: [], txns: [] });
      return errMessage(e);
    }
  },
  registerProfile: async (u) => {
    try {
      await createWallet({ data: u });
      const snap = await getAccount();
      apply(set, snap);
      return null;
    } catch (e) {
      return errMessage(e);
    }
  },
  deposit: async (amount, method, slipData, note) => {
    try {
      const snap = await requestDeposit({
        data: { amount, method: method as "พร้อมเพย์" | "โอนธนาคาร" | "ทรูมันนี่", slipData, note },
      });
      apply(set, snap);
      return null;
    } catch (e) {
      return errMessage(e);
    }
  },
  withdraw: async (amount) => {
    try {
      const snap = await requestWithdraw({ data: { amount, note: "ถอนเครดิต" } });
      apply(set, snap);
      return null;
    } catch (e) {
      return errMessage(e);
    }
  },
  reviewTxn: async (id, action) => {
    try {
      const snap = await reviewCashTxn({ data: { id, action } });
      apply(set, snap);
      return null;
    } catch (e) {
      return errMessage(e);
    }
  },
  placeLottery: async (input) => {
    try {
      const snap = await placeLotteryBet({ data: input });
      apply(set, snap);
      return null;
    } catch (e) {
      return errMessage(e);
    }
  },
  placeLotterySlip: async (items) => {
    try {
      const snap = await postLotterySlip({ data: { items } });
      apply(set, snap);
      return null;
    } catch (e) {
      return errMessage(e);
    }
  },
  placeFootball: async (input) => {
    try {
      const snap = await placeFootballBet({ data: input });
      apply(set, snap);
      return null;
    } catch (e) {
      return errMessage(e);
    }
  },
  placeFootballSlip: async (items) => {
    try {
      const snap = await postFootballSlip({ data: { items } });
      apply(set, snap);
      return null;
    } catch (e) {
      return errMessage(e);
    }
  },
  settle: async () => {
    try {
      const snap = await settleDueBets();
      apply(set, snap);
    } catch {
      /* signed out */
    }
  },
}));

export function useSessionUser(): User | null {
  const w = useStore((s) => s.wallet);
  const src = w ?? bootSnap?.wallet ?? null;
  return src ? toUser(src) : null;
}
