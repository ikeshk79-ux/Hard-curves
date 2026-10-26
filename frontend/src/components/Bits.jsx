export const StatCard = ({ label, value, icon: Icon, accent, testId }) => (
  <div data-testid={testId} className={`hc-card p-4 sm:p-5 ${accent ? "border-hc-lime/40" : ""}`}>
    <div className="flex items-center justify-between">
      <span className="hc-label">{label}</span>
      {Icon && <Icon className="h-4 w-4 text-hc-lime" />}
    </div>
    <div className="mt-3 truncate font-mono text-2xl font-bold text-hc-text sm:text-3xl">{value}</div>
  </div>
);

export const SectionTitle = ({ children, action }) => (
  <div className="mb-3 flex items-center justify-between gap-3">
    <h2 className="hc-title text-xl text-hc-text sm:text-2xl">{children}</h2>
    {action}
  </div>
);

export const PageHeader = ({ eyebrow, title, children }) => (
  <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
    <div>
      {eyebrow && <div className="hc-label mb-2 text-hc-lime">{eyebrow}</div>}
      <h1 data-testid="page-title" className="hc-title text-4xl leading-none sm:text-5xl lg:text-6xl">{title}</h1>
    </div>
    {children}
  </div>
);

export const Empty = ({ children, testId }) => (
  <div data-testid={testId} className="rounded-xl border border-dashed border-hc-line px-4 py-8 text-center text-sm text-hc-muted">
    {children}
  </div>
);

export const Loading = () => (
  <div data-testid="loading" className="grid min-h-[40vh] place-items-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-hc-line border-t-hc-lime" />
  </div>
);
