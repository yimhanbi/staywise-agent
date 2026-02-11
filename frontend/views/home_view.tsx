"use client";

interface HomeViewProps {
  title: string;
  description: string;
}

export function HomeView({
  title,
  description,
}: HomeViewProps): React.ReactElement {
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
      <p className="mt-2 text-neutral-600">{description}</p>
    </div>
  );
}
