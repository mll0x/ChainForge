import { WalletCard } from "@/components/WalletCard";
import { TransferForm } from "@/components/TransferForm";
import { ApproveForm } from "@/components/ApproveForm";
import { MintForm } from "@/components/MintForm";

export default function TokenPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Token 操作</h1>
      <WalletCard />

      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
          <h2 className="text-sm font-semibold text-brand uppercase tracking-wider">
            转账
          </h2>
          <TransferForm />
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
            授权
          </h2>
          <ApproveForm />
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
          <h2 className="text-sm font-semibold text-brand uppercase tracking-wider">
            增发 (Owner)
          </h2>
          <MintForm />
        </div>
      </div>
    </div>
  );
}
