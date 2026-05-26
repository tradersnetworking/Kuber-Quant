
export default function BlankPage({ title }: { title: string }) {
  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">This section is currently under development.</p>
        </div>
        <div className="h-64 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground">
          Content coming soon
        </div>
      </div>
);
}
