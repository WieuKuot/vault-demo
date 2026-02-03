import Image from "next/image";

export function VaultLogo({ size = 34 }: { size?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/20 bg-black/50 shadow-[0_0_24px_rgba(15,23,42,0.35)]" style={{ width: size, height: size }}>
      <Image src="/vault-logo.png" alt="Vault logo" width={size} height={size} className="h-full w-full object-cover" />
    </div>
  );
}
