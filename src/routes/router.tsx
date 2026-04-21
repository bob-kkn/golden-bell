import { createHashRouter } from "react-router-dom";
import { HomePage } from "./HomePage";
import { HostPage } from "./HostPage";
import { PlayPage } from "./PlayPage";
import { RouteErrorBoundary } from "./RouteErrorBoundary";
import { ScreenPage } from "./ScreenPage";
import { getHomePath, getHostPath, getPlayPath, getScreenPath } from "./routePaths";

export const router = createHashRouter([
  {
    path: getHomePath(),
    element: <HomePage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: getHostPath(":sessionId"),
    element: <HostPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: getPlayPath(":sessionId"),
    element: <PlayPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: getScreenPath(":sessionId"),
    element: <ScreenPage />,
    errorElement: <RouteErrorBoundary />,
  },
]);
