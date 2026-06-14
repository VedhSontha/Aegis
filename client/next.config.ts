import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disabled: the scan dashboard opens a single EventSource and the Living Tree
  // owns a WebGL context — StrictMode's double-invoke duplicated both (double
  // scan stream, leaked GL contexts). Off here matches production behavior.
  reactStrictMode: false,
};

export default nextConfig;
