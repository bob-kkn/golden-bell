import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

export function renderMemoryRoutes(
  routes: Array<{ path: string; element: JSX.Element }>,
  initialEntries: string[],
) {
  return render(
    <MemoryRouter
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      initialEntries={initialEntries}
    >
      <Routes>
        {routes.map((route) => (
          <Route element={route.element} key={route.path} path={route.path} />
        ))}
      </Routes>
    </MemoryRouter>,
  );
}
