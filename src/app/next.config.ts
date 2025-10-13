import type { NextConfig } from "next";

const config: NextConfig = {};
export default config;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();