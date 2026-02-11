"use client";

import { HomeView } from "@/views/home_view";
import { useHomeViewModel } from "@/viewmodels";

export function HomePage(): React.ReactElement {
  const viewModel = useHomeViewModel();
  return (
    <HomeView
      title={viewModel.title}
      description={viewModel.description}
    />
  );
}
