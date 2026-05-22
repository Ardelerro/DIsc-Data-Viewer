import type { FC } from "react";
import React from "react";
import type { StatProps } from "../../types/types";

const Stat: FC<StatProps> = ({ icon, label, value }) => (
  <div className="flex items-center gap-2.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2.5 hover:border-[var(--color-border-hover)] transition-colors duration-150">
    <div className="text-[var(--color-text-3)] shrink-0 [&>svg]:w-[16px] [&>svg]:h-[16px] [&>svg]:stroke-[1.75]">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs text-[var(--color-text-3)] mb-1 truncate leading-none">
        {label}
      </p>
      <p className="text-sm font-semibold text-[var(--color-text-1)] tabular-nums leading-none">
        {value}
      </p>
    </div>
  </div>
);

export default React.memo(Stat);
